import { Link } from "react-router-dom";
import { MapPin, Tag, Sparkles } from "lucide-react";
import { Business, CATEGORY_LABEL } from "@/lib/types";
import { StoredImage } from "./StoredImage";

export function BusinessCard({ b }: { b: Business }) {
  return (
    <Link to={`/dn/${b.id}`}
      className={`block bg-card rounded-2xl shadow-md overflow-hidden border active:scale-[0.98] transition ${b.featured ? "border-primary/60 ring-1 ring-primary/30" : "border-border/60"}`}>
      <div className="relative aspect-[16/9] w-full">
        <StoredImage path={b.image_url} className="w-full h-full object-cover" fallbackClassName="w-full h-full" alt={b.name} />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-foreground shadow-sm">
          <Tag className="w-2.5 h-2.5" />{CATEGORY_LABEL[b.category]}
        </span>
        {b.featured && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-brand text-white shadow-brand">
            <Sparkles className="w-2.5 h-2.5" />Nổi bật
          </span>
        )}
        <div className="absolute -bottom-4 left-2.5 w-11 h-11 rounded-xl bg-card border-2 border-card shadow-md overflow-hidden">
          <div className="w-full h-full bg-gradient-brand grid place-items-center text-white font-extrabold text-base">
            {b.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
      <div className="pt-5 pb-3 px-3">
        <h3 className="font-extrabold text-sm leading-tight line-clamp-1">{b.name}</h3>
        {b.address && (
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" /><span className="line-clamp-1">{b.address}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
