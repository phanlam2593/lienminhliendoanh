import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review, BusinessType } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "rating" | "offers";

export default function Businesses() {
  const [list, setList] = useState<BusinessCardData[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<BusinessType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const [{ data: biz }, { data: offers }, { data: reviews }] = await Promise.all([
      supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("offers").select("business_id, title, created_at, status").eq("status", "active"),
      supabase.from("reviews").select("business_id, rating"),
    ]);
    const offerMap = new Map<string, { count: number; latest: string | null; latestAt: number }>();
    (offers as Offer[] | null)?.forEach(o => {
      const cur = offerMap.get(o.business_id) || { count: 0, latest: null, latestAt: 0 };
      cur.count += 1;
      const t = new Date(o.created_at).getTime();
      if (t > cur.latestAt) { cur.latest = o.title; cur.latestAt = t; }
      offerMap.set(o.business_id, cur);
    });
    const revMap = new Map<string, { sum: number; n: number }>();
    (reviews as Review[] | null)?.forEach(r => {
      const cur = revMap.get(r.business_id) || { sum: 0, n: 0 };
      cur.sum += r.rating; cur.n += 1;
      revMap.set(r.business_id, cur);
    });
    setList(((biz as Business[]) ?? []).map(b => {
      const rv = revMap.get(b.id);
      const of = offerMap.get(b.id);
      return {
        ...b,
        rating: rv ? rv.sum / rv.n : 0,
        reviewCount: rv?.n ?? 0,
        offerCount: of?.count ?? 0,
        latestOffer: of?.latest ?? null,
      };
    }));
  };

  const filtered = useMemo(() => {
    let arr = list;
    if (type !== "all") arr = arr.filter(b => b.type === type);
    if (q.trim()) {
      const k = q.toLowerCase();
      arr = arr.filter(b => b.name.toLowerCase().includes(k) || (b.latestOffer ?? "").toLowerCase().includes(k));
    }
    if (sort === "rating") arr = [...arr].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === "offers") arr = [...arr].sort((a, b) => (b.offerCount ?? 0) - (a.offerCount ?? 0));
    return arr;
  }, [list, q, type, sort]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Khám phá</h1>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm doanh nghiệp, ưu đãi…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border bg-card" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(["all", ...BUSINESS_TYPES] as const).map(t => (
          <button key={t} onClick={() => setType(t as any)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border",
              type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>
            {t === "all" ? "Tất cả" : BUSINESS_TYPE_LABEL[t as BusinessType]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        {([["newest", "Mới nhất"], ["rating", "Đánh giá cao"], ["offers", "Nhiều ưu đãi"]] as [SortKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} className={cn("px-2.5 py-1 rounded-md font-medium", sort === k ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">Không tìm thấy doanh nghiệp</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map(b => <BusinessCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}
