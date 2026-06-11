import { Link } from "react-router-dom";
import { MapPin, Star, Tag } from "lucide-react";
import { Business } from "@/lib/types";
import { BUSINESS_TYPE_LABELS } from "@/lib/types";

export function BusinessCard({ b }: { b: Business }) {
  return (
    <Link
      to={`/dn/${b.id}`}
      className="block group rounded-3xl overflow-hidden bg-card border border-border shadow-card hover:shadow-float transition-all animate-float-up"
    >
      <div className="relative h-36 overflow-hidden">
        <img src={b.cover} alt={b.name} loading="lazy"
             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-background/95 text-[11px] font-bold text-primary">
          {BUSINESS_TYPE_LABELS[b.type]}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/95 text-[11px] font-bold">
          <Star className="w-3 h-3 fill-warning text-warning" /> {b.rating || "Mới"}
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-end gap-2">
          <img src={b.logo} alt="" className="w-11 h-11 rounded-xl border-2 border-background object-cover shadow-soft" />
          <div className="flex-1 text-white pb-0.5">
            <div className="font-bold text-base leading-tight drop-shadow line-clamp-1">{b.name}</div>
            <div className="text-[11px] opacity-90 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {b.city}
              {b.distanceKm != null && <span>· {b.distanceKm} km</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="px-3.5 py-2.5 flex items-center gap-2 bg-gradient-card">
        <div className="p-1.5 rounded-lg bg-gradient-brand text-primary-foreground">
          <Tag className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 text-xs font-semibold text-primary line-clamp-1">{b.offer}</div>
      </div>
    </Link>
  );
}
