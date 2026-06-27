import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review, BusinessType } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "rating" | "offers";

// Item 7: derive areas dynamically from business addresses.
// Heuristic: take the last comma-separated segment (usually city / district),
// trim, collapse whitespace, fall back to "Khác".
const extractArea = (addr: string | null): string => {
  if (!addr) return "Khác";
  const parts = addr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || "Khác";
  return last.replace(/\s+/g, " ").slice(0, 40);
};

export default function Businesses() {
  const [list, setList] = useState<BusinessCardData[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<BusinessType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [area, setArea] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: biz }, { data: offers }, { data: reviews }] = await Promise.all([
      supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    const offersList = (offers as Offer[] | null) ?? [];
    const reviewsList = (reviews as Review[] | null) ?? [];

    const uids = [...new Set(reviewsList.map((r) => r.user_id))];
    let authorMap = new Map<string, string>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", uids);
      (profs ?? []).forEach((p: any) => authorMap.set(p.id, p.full_name));
    }

    setList(
      ((biz as Business[]) ?? []).map((b) => {
        const bOffers = offersList.filter((o) => o.business_id === b.id);
        const bReviews = reviewsList.filter((r) => r.business_id === b.id);
        const sum = bReviews.reduce((s, r) => s + r.rating, 0);
        const latestOffer = bOffers[0];
        const latestReview = bReviews[0];
        return {
          ...b,
          rating: bReviews.length ? sum / bReviews.length : 0,
          reviewCount: bReviews.length,
          offerCount: bOffers.length,
          latestOffer: latestOffer?.title ?? null,
          latestOfferClaims: latestOffer?.claim_count ?? 0,
          latestReview: latestReview
            ? {
                rating: latestReview.rating,
                comment: latestReview.comment,
                author: authorMap.get(latestReview.user_id) || "Ẩn danh",
              }
            : null,
        };
      }),
    );
    setLoading(false);
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
    let arr = list;
    if (type !== "all") arr = arr.filter((b) => b.type === type);
    if (area !== "all") arr = arr.filter((b) => extractArea(b.address) === area);
    if (q.trim()) {
      const k = q.toLowerCase();
      arr = arr.filter((b) => b.name.toLowerCase().includes(k) || (b.latestOffer ?? "").toLowerCase().includes(k));
    }
    if (sort === "rating") arr = [...arr].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === "offers") arr = [...arr].sort((a, b) => (b.offerCount ?? 0) - (a.offerCount ?? 0));
    return arr;
  }, [list, q, type, area, sort]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Khám phá</h1>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm doanh nghiệp trong cộng đồng..."
          className="w-full pl-9 pr-4 py-3 rounded-xl border bg-card"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(["all", ...BUSINESS_TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t as any)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border",
              type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card",
            )}
          >
            {t === "all" ? "Tất cả" : BUSINESS_TYPE_LABEL[t as BusinessType]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-semibold text-muted-foreground">Khu vực:</label>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="px-3 py-1.5 rounded-lg border bg-card text-xs font-medium"
        >
          <option value="all">Tất cả khu vực ({list.length})</option>
          {areaCounts.map(([a, n]) => (
            <option key={a} value={a}>
              {a} ({n})
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 text-xs">
        {(
          [
            ["newest", "Mới nhất"],
            ["rating", "Đánh giá cao"],
            ["offers", "Nhiều ưu đãi"],
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

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BusinessCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">Không tìm thấy kết quả phù hợp</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <BusinessCard key={b.id} b={b} />
          ))}
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
