import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Business, CATEGORIES, CATEGORY_LABEL, BizCategory } from "@/lib/types";
import { BusinessCard } from "@/components/BusinessCard";
import { Search, SlidersHorizontal } from "lucide-react";

type Sort = "new" | "rated" | "offers";

export default function Businesses() {
  const [list, setList] = useState<Business[]>([]);
  const [counts, setCounts] = useState<Record<string, { rating: number; offers: number }>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<BizCategory | "all">("all");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false });
      const businesses = (data as Business[]) || [];
      setList(businesses);
      // load aggregate counts
      const [rev, off] = await Promise.all([
        supabase.from("reviews").select("business_id, rating"),
        supabase.from("offers").select("business_id"),
      ]);
      const c: Record<string, { rating: number; offers: number; count: number; sum: number }> = {};
      (rev.data || []).forEach((r: any) => {
        c[r.business_id] ??= { rating: 0, offers: 0, count: 0, sum: 0 };
        c[r.business_id].count++; c[r.business_id].sum += r.rating;
      });
      (off.data || []).forEach((o: any) => {
        c[o.business_id] ??= { rating: 0, offers: 0, count: 0, sum: 0 };
        c[o.business_id].offers++;
      });
      const out: any = {};
      Object.keys(c).forEach(k => out[k] = { rating: c[k].count ? c[k].sum / c[k].count : 0, offers: c[k].offers });
      setCounts(out);
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = list;
    if (cat !== "all") r = r.filter(b => b.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(b => b.name.toLowerCase().includes(s) || (b.description || "").toLowerCase().includes(s));
    }
    if (sort === "rated") r = [...r].sort((a, b) => (counts[b.id]?.rating || 0) - (counts[a.id]?.rating || 0));
    else if (sort === "offers") r = [...r].sort((a, b) => (counts[b.id]?.offers || 0) - (counts[a.id]?.offers || 0));
    return r;
  }, [list, q, cat, sort, counts]);

  return (
    <div className="px-5 py-4">
      <h1 className="text-xl font-extrabold mb-3">Doanh nghiệp</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>Tất cả</Chip>
        {CATEGORIES.map(c => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</Chip>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs">
        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        {([["new", "Mới nhất"], ["rated", "Đánh giá cao"], ["offers", "Nhiều ưu đãi"]] as [Sort, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)}
            className={`px-2.5 py-1 rounded-full font-semibold ${sort === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {filtered.map(b => <BusinessCard key={b.id} b={b} />)}
      </div>
      {filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">Không có doanh nghiệp nào</div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${active ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border text-muted-foreground"}`}>
      {children}
    </button>
  );
}
