import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Star, Phone, Globe, Facebook, MapPin, Flag, Tag, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review } from "@/lib/types";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import { StoredImage } from "@/components/StoredImage";
import { OpenBadge } from "@/components/OpenBadge";
import { useAuth } from "@/lib/auth";
import { ReportDialog } from "@/components/ReportDialog";
import { timeAgo } from "@/lib/time";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReviewMeta extends Review { profile?: { full_name: string; avatar_url: string | null } | null }

const makeCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export default function BusinessDetail() {
  const { id = "" } = useParams();
  const { user, isApproved } = useAuth();
  const [b, setB] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<ReviewMeta[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => { void load(); }, [id]);

  const load = async () => {
    const [{ data: bd }, { data: of }, { data: rv }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase.from("offers").select("*").eq("business_id", id).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }),
    ]);
    setB(bd as Business | null);
    setOffers((of ?? []) as Offer[]);
    const reviewsList = (rv ?? []) as Review[];
    const uids = [...new Set(reviewsList.map(r => r.user_id))];
    let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uids);
      (profs ?? []).forEach((p: any) => profMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    setReviews(reviewsList.map(r => ({ ...r, profile: profMap.get(r.user_id) ?? null })));
  };

  const submitReview = async () => {
    if (!user) return;
    const { error } = await supabase.from("reviews").insert({ user_id: user.id, business_id: id, rating, comment });
    if (error) { toast.error(error.message); return; }
    toast.success("Đã gửi đánh giá");
    setReviewOpen(false); setComment(""); setRating(5);
    load();
  };

  const messageOwner = async () => {
    if (!user || !b?.owner_id || b.owner_id === user.id) return;
    window.location.href = `/tin-nhan/${b.owner_id}`;
  };

  if (!b) return <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="pb-24">
      <div className="relative" style={{ height: 240 }}>
        <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold">{b.name}</h1>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full font-semibold">{BUSINESS_TYPE_LABEL[b.type]}</span>
            <OpenBadge open={b.hours_open} close={b.hours_close} showHours size="md" />
            {reviews.length > 0 && (
              <span className="text-xs bg-black/70 text-white px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {avg.toFixed(1)} ({reviews.length})
              </span>
            )}
          </div>
        </div>

        {b.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{b.description}</p>}

        <div className="space-y-2 text-sm">
          {b.phone && <Row icon={Phone}>{b.phone}</Row>}
          {b.website_url && <Row icon={Globe}><a href={b.website_url} target="_blank" rel="noreferrer" className="text-primary">{b.website_url}</a></Row>}
          {b.facebook_url && <Row icon={Facebook}><a href={b.facebook_url} target="_blank" rel="noreferrer" className="text-primary">Facebook</a></Row>}
          {b.address && <Row icon={MapPin}><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`} className="text-primary">{b.address}</a></Row>}
        </div>

        {offers.length > 0 && (
          <section>
            <h2 className="font-bold mb-2 flex items-center gap-1"><Tag className="w-4 h-4 text-primary" /> Ưu đãi</h2>
            <div className="space-y-2">
              {offers.map(o => (
                <div key={o.id} className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-100">
                  <div className="font-semibold text-sm">{o.title}</div>
                  {o.description && <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>}
                  {o.code && <div className="mt-2 inline-block bg-white border border-dashed px-3 py-1 rounded text-sm font-mono font-bold">{o.code}</div>}
                  {isApproved && <button className="mt-2 ml-2 text-xs px-3 py-1 rounded-full bg-gradient-brand text-primary-foreground font-semibold">Nhận ưu đãi</button>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Đánh giá ({reviews.length})</h2>
            {isApproved && <button onClick={() => setReviewOpen(true)} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold">Viết đánh giá</button>}
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đánh giá nào</p>
          ) : (
            <div className="space-y-2">
              {reviews.map(r => (
                <div key={r.id} className="p-3 rounded-xl bg-card shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-bold">{(r.profile?.full_name || "?").slice(0, 1)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{r.profile?.full_name || "Ẩn danh"}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</div>
                    </div>
                    <div className="flex text-yellow-500">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400" : "opacity-30"}`} />)}</div>
                  </div>
                  {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-2">
          {user && b.owner_id && b.owner_id !== user.id && (
            <button onClick={messageOwner} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1">
              <MessageCircle className="w-4 h-4" /> Nhắn tin
            </button>
          )}
          <button onClick={() => setReportOpen(true)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-destructive flex items-center justify-center gap-1">
            <Flag className="w-4 h-4" /> Báo cáo
          </button>
        </div>
      </div>

      {reviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={() => setReviewOpen(false)}>
          <div className="bg-card rounded-2xl p-4 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">Viết đánh giá</h3>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`w-7 h-7 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Nhận xét…" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            <button onClick={submitReview} className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold">Gửi</button>
          </div>
        </div>
      )}

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="business" targetId={b.id} />
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /> {children}</div>;
}
