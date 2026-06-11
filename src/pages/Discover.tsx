import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUSINESS_TYPE_LABELS, BusinessType } from "@/lib/types";
import { BusinessCard } from "@/components/BusinessCard";
import { cn } from "@/lib/utils";

export default function Discover() {
  const { businesses } = useStore();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<BusinessType | "all">("all");
  const [city, setCity] = useState<string>("all");
  const [maxKm, setMaxKm] = useState(50);
  const [onlyWithOffer, setOnlyWithOffer] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const cities = useMemo(() => Array.from(new Set(businesses.map(b => b.city))), [businesses]);

  const list = useMemo(() => businesses.filter(b => {
    if (b.status !== "approved") return false;
    if (type !== "all" && b.type !== type) return false;
    if (city !== "all" && b.city !== city) return false;
    if (b.distanceKm != null && b.distanceKm > maxKm) return false;
    if (onlyWithOffer && !b.offer) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!b.name.toLowerCase().includes(q) && !b.offer.toLowerCase().includes(q) && !b.description.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [businesses, type, city, maxKm, onlyWithOffer, query]);

  const types: ("all" | BusinessType)[] = ["all", "cafe", "nhahang", "spa", "homestay", "salon", "khac"];

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-extrabold mb-3">Khám phá doanh nghiệp</h1>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm tên, ưu đãi..."
            className="w-full pl-9 pr-3 py-3 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button onClick={() => setShowFilter(s => !s)}
          className={cn("w-12 h-12 rounded-2xl grid place-items-center border transition",
            showFilter ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border")}>
          <SlidersHorizontal className="w-4 h-4"/>
        </button>
      </div>

      {/* Type chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-3">
        {types.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition",
              type === t ? "bg-gradient-brand text-white border-transparent shadow-soft" : "bg-card text-muted-foreground border-border")}>
            {t === "all" ? "Tất cả" : BUSINESS_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {showFilter && (
        <div className="mb-4 p-4 rounded-2xl bg-card border border-border space-y-3 animate-float-up">
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Thành phố</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={city === "all"} onClick={() => setCity("all")}>Tất cả</Chip>
              {cities.map(c => <Chip key={c} active={city === c} onClick={() => setCity(c)}>{c}</Chip>)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5 flex justify-between">
              <span>Khoảng cách tối đa</span><span className="text-primary">{maxKm} km</span>
            </div>
            <input type="range" min={1} max={50} value={maxKm} onChange={e => setMaxKm(+e.target.value)} className="w-full accent-primary" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={onlyWithOffer} onChange={e => setOnlyWithOffer(e.target.checked)}
              className="w-4 h-4 accent-primary"/>
            Chỉ hiện DN có ưu đãi
          </label>
        </div>
      )}

      <div className="text-xs font-semibold text-muted-foreground mb-2">{list.length} kết quả</div>

      <div className="space-y-3 pb-4">
        {list.map(b => <BusinessCard key={b.id} b={b}/>)}
        {list.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <X className="w-8 h-8 mx-auto mb-2 opacity-50"/>
            Không tìm thấy doanh nghiệp phù hợp
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border",
        active ? "bg-gradient-brand text-white border-transparent" : "bg-background text-muted-foreground border-border")}>
      {children}
    </button>
  );
}
