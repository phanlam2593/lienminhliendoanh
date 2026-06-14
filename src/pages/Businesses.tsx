import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Business, CATEGORIES, CATEGORY_LABEL, BizCategory } from "@/lib/types";
import { StoredImage } from "@/components/StoredImage";
import { Search, SlidersHorizontal, MapPin, Star, Tag, Sparkles } from "lucide-react";

type Sort = "new" | "rated" | "offers";

export default function Businesses() {
  const [list, setList] = useState<Business[]>([]);
  const [counts, setCounts] = useState<Record<string, { rating: number; offers: number; offerTitle?: string }>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<BizCategory | "all">("all");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false });
      setList((data as Business[]) || []);
      const [rev, off] = await Promise.all([
        supabase.from("reviews").select("business_id, rating"),
        supabase.from("offers").select("business_id, title, created_at").order("created_at", { ascending: false }),
      ]);
      const c: Record<string, { count: number; sum: number; offers: number; offerTitle?: string }> = {};
      (rev.data || []).forEach((r: any) => {
        c[r.business_id] ??= { count: 0, sum: 0, offers: 0 };
        c[r.business_id].count++; c[r.business_id].sum += r.rating;
      });
      (off.data || []).forEach((o: any) => {
        c[o.business_id] ??= { count: 0, sum: 0, offers: 0 };
        c[o.business_id].offers++;
        if (!c[o.business_id].offerTitle) c[o.business_id].offerTitle = o.title;
      });
      const out: any = {};
      Object.keys(c).forEach(k => out[k] = {
        rating: c[k].count ? c[k].sum / c[k].count : 0,
        offers: c[k].offers,
        offerTitle: c[k].offerTitle,
      });
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
    <div className="px-4 py-4">
      <h1 className="text-xl font-extrabold mb-3">Khám phá doanh nghiệp</h1>
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

      <div className="mt-4 space-y-4">
        {filtered.map(b => <BusinessListCard key={b.id} b={b} info={counts[b.id]} />)}
      </div>
      {filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">Không có doanh nghiệp nào</div>
      )}
    </div>
  );
}

export function BusinessListCard({ b, info }: { b: Business; info?: { rating: number; offers: number; offerTitle?: string } }) {
  const rating = info?.rating || 0;
  return (
    <Link to={`/dn/${b.id}`}
      className={`block bg-card rounded-3xl overflow-hidden border border-border/60 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_-12px_rgba(22,163,115,0.15)] transition-all active:scale-[0.99] group ${b.featured ? "ring-1 ring-primary/40" : ""}`}>
      {/* Cover image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <StoredImage path={b.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackClassName="w-full h-full" alt={b.name} />

        {/* Category pill - top left (frosted white) */}
        <div className="absolute top-3 left-3 px-3 py-1.5 backdrop-blur-md bg-white/85 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20">
          <Tag className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{CATEGORY_LABEL[b.category]}</span>
        </div>

        {/* Rating pill - top right (frosted dark) */}
        {rating > 0 && (
          <div className="absolute top-3 right-3 px-2.5 py-1.5 backdrop-blur-md bg-black/40 rounded-full flex items-center gap-1.5 border border-white/10">
            <Star className="w-3 h-3 fill-warning text-warning" />
            <span className="text-[11px] font-bold text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {b.featured && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-gradient-brand text-white shadow-brand">
            <Sparkles className="w-2.5 h-2.5" />Nổi bật
          </div>
        )}

        {/* Logo avatar with gradient ring */}
        <div className="absolute -bottom-6 left-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand p-0.5 shadow-xl">
            <div className="w-full h-full bg-card rounded-[14px] grid place-items-center overflow-hidden border-2 border-card">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-brand">{b.name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-9 px-5 pb-5">
        <h3 className="text-lg font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">{b.name}</h3>

        {b.address && (
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs line-clamp-1">{b.address}</span>
          </div>
        )}

        {b.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-2 mb-4">{b.description}</p>
        )}

        {/* Community offer banner inside body */}
        {info?.offerTitle && (
          <div className="relative bg-gradient-brand rounded-2xl p-3.5 overflow-hidden shadow-brand mt-3">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center backdrop-blur-sm shrink-0">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase font-bold text-white/80 tracking-widest leading-none mb-1">Ưu đãi cộng đồng</span>
                  <span className="text-xs font-bold text-white leading-tight line-clamp-1">{info.offerTitle}</span>
                </div>
              </div>
              {info.offers > 1 && (
                <span className="text-[10px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full shrink-0">+{info.offers - 1}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
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
