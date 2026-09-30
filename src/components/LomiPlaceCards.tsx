import { Link } from "react-router-dom";
import { MapPin, Star, Gift } from "lucide-react";
import type { PlaceCard } from "@/lib/lomiSearch";

// Thẻ doanh nghiệp THẬT trong khung chat Lomi (30/09) — bấm để mở trang doanh nghiệp.
export function LomiPlaceCards({ places }: { places: PlaceCard[] }) {
  if (!places.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-2 w-full max-w-[85%]">
      {places.map((p, i) => (
        <Link
          key={p.id}
          to={`/dn/${p.id}`}
          className="flex items-center gap-2.5 rounded-xl border bg-background p-2 active:scale-[0.98] transition animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg gradient-brand">
            {p.cover && <img src={p.cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            {p.offer && (
              <div className="flex items-center gap-1 truncate text-[11px] text-primary">
                <Gift className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.offer}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {p.rating > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {p.rating.toFixed(1)}
                </span>
              )}
              {p.distKm != null ? (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {p.distKm < 1 ? `${Math.round(p.distKm * 1000)}m` : `${p.distKm.toFixed(1)}km`}
                </span>
              ) : (
                p.area && <span className="truncate">{p.area}</span>
              )}
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">Xem ›</span>
        </Link>
      ))}
    </div>
  );
}
