import { useEffect, useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, BusinessType } from "@/lib/types";
import { BUSINESS_TYPES } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { extractArea } from "@/lib/location";
import { BusinessMapView } from "@/components/BusinessMapView";
import { List, Map as MapIcon } from "lucide-react";

type SortKey = "newest" | "rating" | "offers" | "nearest";
type LocStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

const RADIUS_OPTIONS = [1, 5, 10] as const;
const PAGE_SIZE = 300;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Businesses() {
  const { t } = useLanguage();
  const [list, setList] = useState<BusinessCardData[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<BusinessType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [area, setArea] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<(typeof RADIUS_OPTIONS)[number]>(5);

  useEffect(() => {
    void load(0, false);
  }, []);

  // QUAN TRỌNG (hiệu năng ở quy mô lớn): trước đây tải TOÀN BỘ DN đã duyệt 1 lần,
  // không giới hạn — ở quy mô hàng nghìn DN sẽ tải hàng MB dữ liệu mỗi lần vào trang.
  // Giờ tải theo trang (PAGE_SIZE), có nút "Tải thêm" khi còn dữ liệu.
  // Lưu ý: sắp xếp "Gần đây" chỉ tìm trong số DN ĐÃ TẢI (chưa quét toàn bộ DB theo khoảng
  // cách) — đủ dùng ở quy mô hiện tại, có thể nâng cấp sau bằng truy vấn địa lý phía server.
  const load = async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);
    const rows = (biz as Business[]) ?? [];
    const ids = rows.map((b) => b.id);
    const { data: stats } = ids.length
      ? await supabase.from("business_card_stats").select("*").in("business_id", ids)
      : { data: [] as any[] };
    const sMap = new Map((stats ?? []).map((s: any) => [s.business_id, s]));
    const enriched = rows.map((b) => {
      const s: any = sMap.get(b.id);
      return {
        ...b,
        rating: Number(s?.rating ?? 0),
        reviewCount: s?.review_count ?? 0,
        offerCount: s?.offer_count ?? 0,
        totalClaims: s?.total_claims ?? 0,
        latestOffer: s?.latest_offer ?? null,
        latestOfferClaims: s?.latest_offer_claims ?? 0,
        latestReview:
          s?.latest_review_rating != null
            ? {
                rating: s.latest_review_rating,
                comment: s.latest_review_comment,
                author: s.latest_review_author || "Ẩn danh",
              }
            : null,
      };
    });
    setList((prev) => (append ? [...prev, ...enriched] : enriched));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
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

  const areaCounts = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((b) => {
      const a = extractArea(b.address);
      m.set(a, (m.get(a) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((x, y) => y[1] - x[1]);
  }, [list]);

  const filtered = useMemo(() => {
    let arr: (BusinessCardData & { distanceKm?: number })[] = list;
    if (type !== "all") arr = arr.filter((b) => b.type === type);
    if (q.trim()) {
      const k = q.toLowerCase();
      arr = arr.filter((b) => b.name.toLowerCase().includes(k) || (b.latestOffer ?? "").toLowerCase().includes(k));
    }

    if (sort === "nearest" && myPos) {
      arr = arr
        .filter((b) => b.latitude != null && b.longitude != null)
        .map((b) => ({ ...b, distanceKm: haversineKm(myPos.lat, myPos.lng, b.latitude!, b.longitude!) }))
        .filter((b) => b.distanceKm! <= radius)
        .sort((a, b) => a.distanceKm! - b.distanceKm!);
    } else {
      if (area !== "all") arr = arr.filter((b) => extractArea(b.address) === area);
      if (sort === "rating") arr = [...arr].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      else if (sort === "offers") arr = [...arr].sort((a: any, b: any) => (b.totalClaims ?? 0) - (a.totalClaims ?? 0));
    }
    return arr;
  }, [list, q, type, area, sort, myPos, radius]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">{t("nav.explore")}</h1>
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
        {(["all", ...BUSINESS_TYPES] as const).map((bt) => (
          <button
            key={bt}
            onClick={() => setType(bt as any)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border",
              type === bt ? "bg-primary text-primary-foreground border-primary" : "bg-card",
            )}
          >
            {bt === "all" ? t("common.all") : t(`type.${bt}`)}
          </button>
        ))}
      </div>
      {sort !== "nearest" && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-muted-foreground">{t("explore.area")}</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-card text-xs font-medium"
          >
            <option value="all">
              {t("explore.allAreas")} ({list.length})
            </option>
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

      {loading ? (
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
          {filtered.map((b: any) => (
            <div key={b.id} className="space-y-1">
              {sort === "nearest" && typeof b.distanceKm === "number" && (
                <div className="flex items-center gap-1 px-1 text-xs font-semibold text-primary">
                  <MapPin className="w-3 h-3" /> {b.distanceKm.toFixed(1)} km
                </div>
              )}
              <BusinessCard b={b} />
            </div>
          ))}
        </div>
      )}
      {!loading && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2.5 rounded-xl border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? t("common.loading") : t("common.loadMore")}
        </button>
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
