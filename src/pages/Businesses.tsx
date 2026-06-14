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
      className={`block bg-card rounded-2xl shadow-md overflow-hidden border active:scale-[0.99] transition ${b.featured ? "border-primary/60 ring-1 ring-primary/30" : "border-border/60"}`}>
      {/* Hero image */}
      <div className="relative aspect-[16/9] w-full">
        <StoredImage path={b.image_url} className="w-full h-full object-cover" fallbackClassName="w-full h-full" alt={b.name} />
        {/* Category pill - top left */}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-foreground shadow-sm">
          <Tag className="w-2.5 h-2.5" />{CATEGORY_LABEL[b.category]}
        </span>
        {/* Rating pill - top right */}
        {rating > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-foreground shadow-sm">
            <Star className="w-3 h-3 fill-warning text-warning" />{rating.toFixed(1)}
          </span>
        )}
        {b.featured && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-brand text-white shadow-brand">
            <Sparkles className="w-2.5 h-2.5" />Nổi bật
          </span>
        )}
        {/* Logo avatar overlapping */}
        <div className="absolute -bottom-5 left-3 w-14 h-14 rounded-xl bg-card border-2 border-card shadow-md overflow-hidden grid place-items-center">
          <div className="w-full h-full bg-gradient-brand grid place-items-center text-white font-extrabold text-lg">
            {b.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-6 pb-3 px-3">
        <h3 className="font-extrabold text-base leading-tight line-clamp-1">{b.name}</h3>
        {b.address && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" /><span className="line-clamp-1">{b.address}</span>
          </div>
        )}
        {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
      </div>

      {/* Offer banner */}
      {info?.offerTitle && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-accent border-t border-primary/20">
          <div className="w-6 h-6 rounded-full bg-primary grid place-items-center text-white shrink-0">
            <Tag className="w-3 h-3" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-primary">Ưu đãi cộng đồng</div>
            <div className="text-xs font-bold text-accent-foreground line-clamp-1">{info.offerTitle}</div>
          </div>
          {info.offers > 1 && (
            <span className="text-[10px] font-bold text-primary">+{info.offers - 1}</span>
          )}
        </div>
      )}
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
