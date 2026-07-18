import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Phone, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoredImage } from "@/components/StoredImage";
import { BUSINESS_TYPE_LABEL, type BusinessType } from "@/lib/types";

interface QuickBiz {
  id: string;
  name: string;
  type: BusinessType;
  description: string | null;
  cover_url: string | null;
  address: string | null;
  phone: string | null;
  status: string;
  is_featured: boolean;
}

export function BusinessQuickView({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [b, setB] = useState<QuickBiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !businessId) return;
    setLoading(true);
    (async () => {
      const [{ data: biz }, { count: fc }, { data: reviews }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, type, description, cover_url, address, phone, status, is_featured")
          .eq("id", businessId)
          .maybeSingle(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_business_id", businessId),
        supabase.from("reviews").select("rating").eq("business_id", businessId),
      ]);
      setB(biz as QuickBiz);
      setFollowers(fc ?? 0);
      const list = reviews ?? [];
      setReviewCount(list.length);
      setAvgRating(list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : null);
      setLoading(false);
    })();
  }, [open, businessId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xem nhanh doanh nghiệp</DialogTitle>
        </DialogHeader>
        {loading || !b ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
        ) : (
          <div className="space-y-4">
            {b.cover_url && (
              <div className="h-32 rounded-xl overflow-hidden">
                <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <div className="font-bold text-base flex items-center gap-1.5">
                {b.is_featured && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                {b.name}
              </div>
              <div className="text-xs text-muted-foreground">{BUSINESS_TYPE_LABEL[b.type] || b.type}</div>
              {b.description && <p className="text-sm mt-1.5">{b.description}</p>}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-muted">{followers} theo dõi</span>
              <span className="px-2 py-0.5 rounded-full bg-muted">
                {avgRating ? `★ ${avgRating.toFixed(1)} (${reviewCount})` : "Chưa có đánh giá"}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              {b.address && (
                <div className="flex items-center gap-2 text-foreground/80">
                  <MapPin className="w-4 h-4" /> {b.address}
                </div>
              )}
              {b.phone && (
                <a href={`tel:${b.phone}`} className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                  <Phone className="w-4 h-4" /> {b.phone}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                to={`/dn/${b.id}`}
                target="_blank"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold text-center"
              >
                Mở trang đầy đủ
              </Link>
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> Đóng
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
