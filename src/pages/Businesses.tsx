import { useEffect, useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessType } from "@/lib/types";
import { BUSINESS_TYPES } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { BusinessMapView } from "@/components/BusinessMapView";
import { List, Map as MapIcon } from "lucide-react";

type SortKey = "newest" | "rating" | "offers" | "nearest";
type LocStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

const RADIUS_OPTIONS = [1, 5, 10] as const;
const PAGE_SIZE = 20;

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt có dấu/không dấu — "bds", "BDS", "bất
// động sản" đều khớp được với tên DN có dấu đầy đủ như "BĐS Đà Lạt".
function normalizeVi(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// businesses_explore_view = businesses JOIN business_card_stats (rating/ưu đãi/review
// gộp sẵn) — cho phép lọc + sắp xếp thẳng ở tầng database, không cần tải hết về JS nữa.
function mapRow(b: any): BusinessCardData {
  return {
    ...b,
    rating: Number(b.rating ?? 0),
    reviewCount: b.review_count ?? 0,
    offerCount: b.offer_count ?? 0,
    totalClaims: b.total_claims ?? 0,
    latestOffer: b.latest_offer ?? null,
    latestOfferClaims: b.latest_offer_claims ?? 0,
    latestReview:
      b.latest_review_rating != null
        ? {
            rating: b.latest_review_rating,
            comment: b.latest_review_comment,
            author: b.latest_review_author || "Ẩn danh",
          }
        : null,
  };
}

export default function Businesses() {
  const { t } = useLanguage();
  const [items, setItems] = useState<(BusinessCardData & { distanceKm?: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filterKey, setFilterKey] = useState<BusinessType | "all" | "online">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [area, setArea] = useState<string>("all");
  const [areaCounts, setAreaCounts] = useState<[string, number][]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<(typeof RADIUS_OPTIONS)[number]>(5);
  const [mapItems, setMapItems] = useState<BusinessCardData[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    void supabase.rpc("business_area_counts").then(({ data }) => {
      setAreaCounts(((data ?? []) as any[]).map((r) => [r.area as string, Number(r.cnt)]));
    });
  }, []);

  // Câu lệnh lọc dùng chung cho cả list phân trang lẫn tập dữ liệu địa lý (map/gần đây) —
  // để 2 chế độ luôn khớp cùng 1 bộ lọc loại hình/online/tìm kiếm đang chọn.
  const applyFilters = (query: any) => {
    let q2 = query;
    if (filterKey === "online") q2 = q2.eq("is_online", true);
    else if (filterKey !== "all") q2 = q2.eq("type", filterKey);
    if (debouncedQ) q2 = q2.ilike("name_unaccent", `%${normalizeVi(debouncedQ)}%`);
    return q2;
  };

  const loadPage = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from("businesses_explore_view").select("*", { count: "exact" });
    query = applyFilters(query);
    if (area !== "all") query = query.eq("area", area);
    if (sort === "rating")
      query = query.order("rating", { ascending: false, nullsFirst: false }).order("id", { ascending: true });
    else if (sort === "offers")
      query = query.order("total_claims", { ascending: false }).order("id", { ascending: true });
    else query = query.order("created_at", { ascending: false }).order("id", { ascending: true });
    query = query.range(from, to);
    const { data, count } = await query;
    const mapped = ((data ?? []) as any[]).map(mapRow);
    setTotal(count ?? 0);
    setItems((prev) => (append ? [...prev, ...mapped] : mapped));
    setHasMore(mapped.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  // Chỉ dùng cho Bản đồ / Gần đây — 2 chế độ này cần biết TOÀN BỘ DN có ghim vị trí
  // (không phân trang được vì bản đồ/khoảng cách cần thấy hết), nhưng tập này tự nhiên
  // đã nhỏ hơn nhiều so với tổng số DN (chỉ những DN đã ghim vị trí), nên tải hết vẫn nhẹ.
  // Tải theo từng đợt 1000 để không bị Supabase âm thầm cắt bớt khi vượt "Max Rows".
  const loadGeoAll = async () => {
    let rows: any[] = [];
    let from = 0;
    const CHUNK = 1000;
    while (true) {
      let query = supabase
        .from("businesses_explore_view")
        .select("*")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .range(from, from + CHUNK - 1);
      query = applyFilters(query);
      const { data } = await query;
      const chunk = (data ?? []) as any[];
      rows = rows.concat(chunk);
      if (chunk.length < CHUNK) break;
      from += CHUNK;
    }
    return rows.map(mapRow);
  };

  // Tải lại trang 1 mỗi khi đổi bộ lọc (trừ khi đang ở chế độ "Gần đây" — có effect riêng)
  useEffect(() => {
    if (sort === "nearest") return;
    setPage(0);
    setLoading(true);
    void loadPage(0, false);
  }, [filterKey, area, debouncedQ, sort]);

  useEffect(() => {
    if (viewMode !== "map") return;
    setLoading(true);
    void loadGeoAll().then((rows) => {
      setMapItems(rows);
      setLoading(false);
    });
  }, [viewMode, filterKey, debouncedQ]);

  useEffect(() => {
    if (sort !== "nearest" || !myPos) return;
    setLoading(true);
    void loadGeoAll().then((rows) => {
      const withDist = rows
        .map((b) => ({ ...b, distanceKm: haversineKm(myPos.lat, myPos.lng, b.latitude!, b.longitude!) }))
        .filter((b) => b.distanceKm <= radius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setItems(withDist);
      setTotal(withDist.length);
      setHasMore(false);
      setLoading(false);
    });
  }, [sort, myPos, radius, filterKey, debouncedQ]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void loadPage(next, true);
  };

  const useNearestSort = () => {
    if (myPos) {
      setSort("nearest");
      return;
    }
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("granted");
        setSort("nearest");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">{t("nav.explore")}</h1>
      <div className="flex gap-1.5">
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5",
            viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card border",
          )}
        >
          <List className="w-3.5 h-3.5" /> {t("explore.viewList")}
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5",
            viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-card border",
          )}
        >
          <MapIcon className="w-3.5 h-3.5" /> {t("explore.viewMap")}
        </button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("explore.searchPlaceholder")}
          className="w-full pl-9 pr-4 py-3 rounded-xl border bg-card"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", ...BUSINESS_TYPES.filter((x) => x !== "other"), "online", "other"] as const).map((bt) => (
          <button
            key={bt}
            onClick={() => setFilterKey(bt as any)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border",
              filterKey === bt ? "bg-primary text-primary-foreground border-primary" : "bg-card",
            )}
          >
            {bt === "all" ? t("common.all") : bt === "online" ? t("online.badge") : t(`type.${bt}`)}
          </button>
        ))}
      </div>
      {filterKey !== "online" && sort !== "nearest" && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-muted-foreground">{t("explore.area")}</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-card text-xs font-medium"
          >
            <option value="all">{t("explore.allAreas")}</option>
            {areaCounts.map(([a, n]) => (
              <option key={a} value={a}>
                {a} ({n})
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 text-xs flex-wrap">
        <button
          onClick={useNearestSort}
          className={cn(
            "px-2.5 py-1 rounded-md font-medium",
            sort === "nearest" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
          )}
        >
          {locStatus === "requesting" ? t("sort.requestingLocation") : t("sort.nearby")}
        </button>
        {(
          [
            ["rating", t("sort.rating")],
            ["offers", t("sort.mostClaimed")],
            ["newest", t("sort.newest")],
          ] as [SortKey, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium",
              sort === k ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {sort === "nearest" && myPos && (
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border",
                radius === r ? "bg-primary text-primary-foreground border-primary" : "bg-card",
              )}
            >
              {t("explore.underKm", { r })}
            </button>
          ))}
        </div>
      )}

      {sort === "nearest" && locStatus === "denied" && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
          {t("explore.locationDenied")}
        </p>
      )}
      {sort === "nearest" && locStatus === "unsupported" && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{t("explore.locationUnsupported")}</p>
      )}

      {viewMode === "map" ? (
        <BusinessMapView businesses={mapItems} />
      ) : loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BusinessCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">
          {sort === "nearest" ? t("explore.noResultsRadius", { r: radius }) : t("explore.noResults")}
        </p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="space-y-1">
              {sort === "nearest" && typeof b.distanceKm === "number" && (
                <div className="flex items-center gap-1 px-1 text-xs font-semibold text-primary">
                  <MapPin className="w-3 h-3" /> {b.distanceKm.toFixed(1)} km
                </div>
              )}
              <BusinessCard b={b} />
            </div>
          ))}
          {sort !== "nearest" && hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {loadingMore ? t("common.loading") : t("common.loadMoreRemaining", { n: total - items.length })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function BusinessCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-36 bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}
