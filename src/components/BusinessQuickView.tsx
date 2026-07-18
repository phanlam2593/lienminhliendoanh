import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, MapPin, Phone, Star, UserCheck, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
  owner_id: string | null;
}

interface QuickReview {
  id: string;
  rating: number;
  comment: string | null;
}

export function BusinessQuickView({
  businessId,
  open,
  onOpenChange,
  onOpenAdmin,
}: {
  businessId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Nếu có (dùng trong Admin) — bấm "Mở trang đầy đủ" sẽ gọi cái này thay vì điều
  // hướng sang trang công khai /dn/:id.
  onOpenAdmin?: (ownerId: string) => void;
}) {
  const { user } = useAuth();
  const [b, setB] = useState<QuickBiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [reviews, setReviews] = useState<QuickReview[]>([]);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  useEffect(() => {
    if (!open || !businessId) return;
    setReviewsOpen(false);
    setLoading(true);
    (async () => {
      const [{ data: biz }, { count: fc }, { data: rv }, { data: rel }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, type, description, cover_url, address, phone, status, is_featured, owner_id")
          .eq("id", businessId)
          .maybeSingle(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_business_id", businessId),
        supabase.from("reviews").select("id, rating, comment").eq("business_id", businessId),
        user
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("followee_business_id", businessId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setB(biz as QuickBiz);
      setFollowers(fc ?? 0);
      setReviews((rv ?? []) as QuickReview[]);
      setFollowing(!!rel);
      setLoading(false);
    })();
  }, [open, businessId, user?.id]);

  const toggleFollow = async () => {
    if (!user || !businessId) return;
    setFollowBusy(true);
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_business_id", businessId);
      if (error) toast.error(error.message);
      else {
        setFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, followee_business_id: businessId });
      if (error) toast.error(error.message);
      else {
        setFollowing(true);
        setFollowers((n) => n + 1);
      }
    }
    setFollowBusy(false);
  };

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
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
              <button
                onClick={toggleFollow}
                disabled={!user || followBusy}
                className={`px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${following ? "bg-primary/10 text-primary" : "bg-muted"}`}
              >
                {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {followers} theo dõi
              </button>
              <button
                onClick={() => setReviewsOpen((o) => !o)}
                disabled={reviews.length === 0}
                className="px-2.5 py-1 rounded-full bg-muted font-semibold inline-flex items-center gap-1 disabled:opacity-60"
              >
                {avgRating ? `★ ${avgRating.toFixed(1)} (${reviews.length})` : "Chưa có đánh giá"}
                {reviews.length > 0 &&
                  (reviewsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
              </button>
            </div>

            {reviewsOpen && reviews.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {reviews.map((r) => (
                  <div key={r.id} className="p-2 bg-accent rounded-lg text-xs">
                    <div className="text-yellow-600">{"★".repeat(r.rating)}</div>
                    {r.comment && <div className="text-muted-foreground mt-0.5">{r.comment}</div>}
                  </div>
                ))}
              </div>
            )}

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
              <button
                onClick={() => {
                  if (onOpenAdmin && b.owner_id) {
                    onOpenAdmin(b.owner_id);
                    onOpenChange(false);
                  } else {
                    window.open(`/dn/${b.id}`, "_blank");
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold text-center"
              >
                {onOpenAdmin ? "Mở để chỉnh sửa" : "Mở trang đầy đủ"}
              </button>
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
