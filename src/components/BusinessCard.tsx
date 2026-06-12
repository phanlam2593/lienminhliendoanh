import { Link } from "react-router-dom";
import { MapPin, Tag } from "lucide-react";
import { Business, CATEGORY_LABEL } from "@/lib/types";
import { StoredImage } from "./StoredImage";

export function BusinessCard({ b }: { b: Business }) {
  return (
    <Link to={`/dn/${b.id}`} className="block bg-card rounded-2xl shadow-card overflow-hidden border border-border/60 active:scale-[0.98] transition">
      <StoredImage path={b.image_url} className="w-full h-32 object-cover" fallbackClassName="w-full h-32" alt={b.name} />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <h3 className="font-bold text-sm flex-1 line-clamp-1">{b.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-semibold whitespace-nowrap">
            <Tag className="w-2.5 h-2.5 inline mr-0.5" />{CATEGORY_LABEL[b.category]}
          </span>
        </div>
        {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
        {b.address && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3" /><span className="line-clamp-1">{b.address}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
