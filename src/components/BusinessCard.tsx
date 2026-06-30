import { Link } from "react-router-dom";
import { Star, Tag, Users } from "lucide-react";
import type { Business } from "@/lib/types";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import { OpenBadge } from "./OpenBadge";
import { StoredImage } from "./StoredImage";
import { fmtTime } from "@/lib/time";

export interface BusinessCardData extends Business {
  rating?: number;
  reviewCount?: number;
  offerCount?: number;
  latestOffer?: string | null;
  latestOfferClaims?: number;
  latestReview?: { rating: number; comment: string | null; author: string } | null;
}

export function BusinessCard({ b }: { b: BusinessCardData }) {
  return (
    <Link
      to={`/dn/${b.id}`}
      className="block rounded-2xl overflow-hidden bg-card shadow-md hover:shadow-lg transition active:scale-[0.99]"
    >
      <div className="relative w-full" style={{ height: 200 }}>
        <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
        <span className="absolute top-2 left-2 inline-flex items-center bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
          {BUSINESS_TYPE_LABEL[b.type]}
        </span>
        {typeof b.rating === "number" && b.reviewCount! > 0 && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700 z-10">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {b.rating?.toFixed(1)}
          </span>
        )}
        <div className="absolute bottom-2 left-2">
          <OpenBadge open={b.hours_open} close={b.hours_close} />
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-bold text-base leading-tight line-clamp-1">{b.name}</h3>
        {b.hours_open && b.hours_close && (
          <p className="text-xs text-muted-foreground">
            {fmtTime(b.hours_open)} – {fmtTime(b.hours_close)}
          </p>
        )}
        {b.latestOffer && (
          <div className="mt-2 flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-full">
            <Tag className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium line-clamp-1">{b.latestOffer}</span>
          </div>
        )}
        {typeof b.latestOfferClaims === "number" && b.latestOfferClaims > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> Đã có {b.latestOfferClaims} lượt nhận
          </p>
        )}
        {b.latestReview && (
          <div className="mt-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1 mb-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < b.latestReview!.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground opacity-40"}`}
                />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1 truncate">— {b.latestReview.author}</span>
            </div>
            {b.latestReview.comment && (
              <p className="text-xs text-muted-foreground line-clamp-2">{b.latestReview.comment}</p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
