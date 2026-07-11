import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Star,
  Phone,
  Globe,
  Facebook,
  MapPin,
  Flag,
  Tag,
  MessageCircle,
  Users,
  Clock,
  UserPlus,
  UserCheck,
  Trash2,
  Reply,
  Send,
  Music2,
  Instagram,
  Youtube,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review, OfferClaim, ReviewReply } from "@/lib/types";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import { StoredImage } from "@/components/StoredImage";
import { LightboxImage } from "@/components/ImageLightbox";
import { OpenBadge } from "@/components/OpenBadge";
import { uploadImage, validateImage } from "@/lib/upload";
import { Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ReportDialog } from "@/components/ReportDialog";
import { timeAgo } from "@/lib/time";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { ProfileQuickView } from "@/components/ProfileQuickView";
import { FollowListDialog } from "@/components/FollowListDialog";
import { ExchangeSection } from "@/components/ExchangeSection";
import { BusinessGallery } from "@/components/BusinessGallery";
import { useLanguage } from "@/lib/i18n";

interface ReviewMeta extends Review {
  profile?: { full_name: string; avatar_url: string | null } | null;
}
interface ReplyMeta extends ReviewReply {
  profile?: { full_name: string; avatar_url: string | null } | null;
}

export default function BusinessDetail() {
  const { id = "" } = useParams();
  const { user, isApproved, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [b, setB] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<ReviewMeta[]>([]);
  const [replies, setReplies] = useState<Map<string, ReplyMeta[]>>(new Map());
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImage, setReviewImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [reviewUploading, setReviewUploading] = useState(false);
  const reviewFileRef = useRef<HTMLInputElement>(null);

  const [claimOffer, setClaimOffer] = useState<Offer | null>(null);
  const [claim, setClaim] = useState<OfferClaim | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [quickViewUser, setQuickViewUser] = useState<string | null>(null);
  const [claimsListOffer, setClaimsListOffer] = useState<Offer | null>(null);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewHasMore, setReviewHasMore] = useState(true);
  const [reviewLoadingMore, setReviewLoadingMore] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const REVIEW_PAGE_SIZE = 10;

  useEffect(() => {
    void load();
  }, [id]);

  const load = async () => {
    const [{ data: bd }, { data: of }, { data: stats }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("offers")
        .select("*")
        .eq("business_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase.from("business_card_stats").select("rating, review_count").eq("business_id", id).maybeSingle(),
    ]);
    setB(bd as Business | null);
    setOffers((of ?? []) as Offer[]);
    setAvgRating(Number((stats as any)?.rating ?? 0));
    setReviewPage(0);
    void loadReviews(0, false);
  };

  const loadReviews = async (pageNum: number, append: boolean) => {
    setReviewLoadingMore(true);
    const from = pageNum * REVIEW_PAGE_SIZE;
    const to = from + REVIEW_PAGE_SIZE - 1;
    const { data: rv, count } = await supabase
      .from("reviews")
      .select("*", { count: "exact" })
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);
    setReviewTotal(count ?? 0);
    const reviewsList = (rv ?? []) as Review[];
    const uids = [...new Set(reviewsList.map((r) => r.user_id))];
    let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uids);
      (profs ?? []).forEach((p: any) => profMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    const newReviews = reviewsList.map((r) => ({ ...r, profile: profMap.get(r.user_id) ?? null }));
    setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews));

    // load replies for this page's reviews
    const reviewIds = reviewsList.map((r) => r.id);
    if (reviewIds.length) {
      const { data: reps } = await supabase
        .from("review_replies")
        .select("*")
        .in("review_id", reviewIds)
        .order("created_at");
      const repList = (reps ?? []) as ReviewReply[];
      const repUids = [...new Set(repList.map((r) => r.user_id).filter((u) => !profMap.has(u)))];
      if (repUids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", repUids);
        (profs ?? []).forEach((p: any) => profMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
      }
      setReplies((prevMap) => {
        const map = append ? new Map(prevMap) : new Map<string, ReplyMeta[]>();
        repList.forEach((r) => {
          const arr = map.get(r.review_id) ?? [];
          arr.push({ ...r, profile: profMap.get(r.user_id) ?? null });
          map.set(r.review_id, arr);
        });
        return map;
      });
    } else if (!append) {
      setReplies(new Map());
    }
    setReviewHasMore(newReviews.length === REVIEW_PAGE_SIZE);
    setReviewLoadingMore(false);
  };

  const loadMoreReviews = () => {
    const next = reviewPage + 1;
    setReviewPage(next);
    void loadReviews(next, true);
  };

  const openClaim = (o: Offer) => {
    if (!user || !isApproved) return;
    setClaimOffer(o);
    setClaim(null);
    setPinInput("");
  };

  const submitClaim = async () => {
    if (!claimOffer || pinInput.length < 4) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_offer", {
      _offer_id: claimOffer.id,
      _pin: pinInput,
    });
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setClaim(data as unknown as OfferClaim);
    load();
  };

  const submitReview = async () => {
    if (!user) return;
    setReviewUploading(true);
    try {
      let image_url: string | null = null;
      if (reviewImage) {
        image_url = await uploadImage(reviewImage.file, "reviews", user.id);
      }
      const { error } = await supabase
        .from("reviews")
        .insert({ user_id: user.id, business_id: id, rating, comment, image_url });
      if (error) throw error;
      toast.success("Đã gửi đánh giá");
      setReviewOpen(false);
      setComment("");
      setRating(5);
      if (reviewImage) URL.revokeObjectURL(reviewImage.previewUrl);
      setReviewImage(null);
      setReviewPage(0);
      void loadReviews(0, false);
    } catch (e: any) {
      toast.error(e.message || "Gửi đánh giá thất bại");
    } finally {
      setReviewUploading(false);
    }
  };

  const deleteReview = async (rid: string) => {
    if (!confirm("Xóa đánh giá này?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", rid);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa");
    setReviewPage(0);
    void loadReviews(0, false);
  };

  const deleteReply = async (rid: string) => {
    if (!confirm("Xóa phản hồi?")) return;
    const { error } = await supabase.from("review_replies").delete().eq("id", rid);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReviewPage(0);
    void loadReviews(0, false);
  };

  const messageOwner = async () => {
    if (!user || !b?.owner_id || b.owner_id === user.id) return;
    window.location.href = `/tin-nhan/${b.owner_id}`;
  };

  if (!b) return <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>;

  const isOwner = !!user && user.id === b.owner_id;

  const ReviewsBlock = (
    <section className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">
          {t("biz.reviews")} ({reviewTotal})
        </h2>
        {isApproved && (
          <button
            onClick={() => setReviewOpen(true)}
            className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold"
          >
            {t("biz.writeReview")}
          </button>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("biz.noReviews")}</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              r={r}
              replies={replies.get(r.id) ?? []}
              isOwner={isOwner}
              isAdmin={isAdmin}
              myId={user?.id}
              onOpenUser={(uid) => setQuickViewUser(uid)}
              onDelete={() => deleteReview(r.id)}
              onDeleteReply={(rid) => deleteReply(rid)}
              onReplied={() => {
                setReviewPage(0);
                void loadReviews(0, false);
              }}
            />
          ))}
          {reviewHasMore && (
            <button
              onClick={loadMoreReviews}
              disabled={reviewLoadingMore}
              className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {reviewLoadingMore ? t("common.loading") : `${t("common.loadMore")} (${reviewTotal - reviews.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="pb-24">
      <div className="relative" style={{ height: 240 }}>
        <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold">{b.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full font-semibold">
              {BUSINESS_TYPE_LABEL[b.type]}
            </span>
            <OpenBadge open={b.hours_open} close={b.hours_close} showHours size="md" />
            {reviewTotal > 0 && (
              <span className="text-xs bg-black/70 text-white px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {avgRating.toFixed(1)} ({reviewTotal})
              </span>
            )}
          </div>
        </div>

        <BusinessGallery businessId={b.id} coverPath={b.cover_url} />

        <>
          {b.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{b.description}</p>}

          <div className="space-y-2 text-sm">
            {b.phone && <Row icon={Phone}>{b.phone}</Row>}
            {b.address && (
              <Row icon={MapPin}>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                  className="text-primary"
                >
                  {b.address}
                </a>
              </Row>
            )}
          </div>

          {(b.website_url || b.facebook_url || b.tiktok_url || b.instagram_url || b.youtube_url) && (
            <div className="flex items-center gap-2 flex-wrap">
              {b.website_url && (
                <a
                  href={b.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 grid place-items-center hover:opacity-80"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {b.facebook_url && (
                <a
                  href={b.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-blue-600 text-white grid place-items-center hover:opacity-80"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {b.tiktok_url && (
                <a
                  href={b.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-9 h-9 rounded-full bg-black text-white grid place-items-center hover:opacity-80"
                >
                  <Music2 className="w-4 h-4" />
                </a>
              )}
              {b.instagram_url && (
                <a
                  href={b.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white grid place-items-center hover:opacity-80"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {b.youtube_url && (
                <a
                  href={b.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-red-600 text-white grid place-items-center hover:opacity-80"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          <FollowBusinessButton businessId={b.id} ownerId={b.owner_id} />

          {offers.length > 0 && (
            <section>
              <h2 className="font-bold mb-2 flex items-center gap-1">
                <Tag className="w-4 h-4 text-primary" /> {t("biz.offers")}
              </h2>
              <div className="space-y-2">
                {offers.map((o) => (
                  <div
                    key={o.id}
                    className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30 border border-emerald-100 dark:border-emerald-900"
                  >
                    <div className="font-semibold text-sm">{o.title}</div>
                    {o.description && <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>}
                    {isOwner ? (
                      <button
                        onClick={() => setClaimsListOffer(o)}
                        className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1 hover:underline"
                      >
                        <Users className="w-3 h-3" /> {t("biz.claimsCount", { n: o.claim_count ?? 0 })} ·{" "}
                        {t("biz.viewList")}
                      </button>
                    ) : (
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t("biz.claimsCount", { n: o.claim_count ?? 0 })}
                      </div>
                    )}
                    {isApproved && (
                      <button
                        onClick={() => openClaim(o)}
                        className="mt-2 text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold"
                      >
                        {t("biz.claimOffer")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <ExchangeSection business={b} />

          {ReviewsBlock}
        </>

        <div className="flex gap-2">
          {user && b.owner_id && b.owner_id !== user.id && (
            <button
              onClick={messageOwner}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1"
            >
              <MessageCircle className="w-4 h-4" /> {t("biz.message")}
            </button>
          )}
          <button
            onClick={() => setReportOpen(true)}
            className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-destructive flex items-center justify-center gap-1"
          >
            <Flag className="w-4 h-4" /> {t("biz.report")}
          </button>
        </div>
      </div>

      {reviewOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4"
          onClick={() => setReviewOpen(false)}
        >
          <div className="bg-card rounded-2xl p-4 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">{t("biz.writeReviewTitle")}</h3>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star
                    className={`w-7 h-7 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={t("biz.commentPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
            <input
              ref={reviewFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const err = validateImage(f);
                if (err) {
                  toast.error(err);
                  return;
                }
                setReviewImage({ file: f, previewUrl: URL.createObjectURL(f) });
                e.currentTarget.value = "";
              }}
            />
            {reviewImage ? (
              <div className="relative inline-block">
                <img
                  src={reviewImage.previewUrl}
                  alt="Xem trước"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(reviewImage.previewUrl);
                    setReviewImage(null);
                  }}
                  aria-label="Hủy ảnh"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white grid place-items-center text-xs leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => reviewFileRef.current?.click()}
                className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" /> {t("biz.addPhoto")}
              </button>
            )}
            <button
              onClick={submitReview}
              disabled={reviewUploading}
              className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
            >
              {reviewUploading ? t("common.loading") : t("common.send")}
            </button>
          </div>
        </div>
      )}

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="business" targetId={b.id} />

      <Dialog
        open={!!claimOffer}
        onOpenChange={(v) => {
          if (!v) {
            setClaimOffer(null);
            setClaim(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{claimOffer?.title}</DialogTitle>
          </DialogHeader>
          {claimOffer && (
            <div className="space-y-3">
              {claimOffer.description && <p className="text-sm text-muted-foreground">{claimOffer.description}</p>}
              {!claim ? (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">{t("biz.pinInstructions")}</p>
                  <input
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8))}
                    onKeyDown={(e) => e.key === "Enter" && submitClaim()}
                    placeholder={t("biz.enterPin")}
                    maxLength={8}
                    autoFocus
                    className="w-full text-center text-2xl tracking-[0.3em] font-mono py-3 rounded-xl border bg-background"
                  />
                  <button
                    onClick={submitClaim}
                    disabled={claiming || pinInput.length < 4}
                    className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
                  >
                    {claiming ? t("biz.checking") : t("common.confirm")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl p-5 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{t("biz.yourCode")}</div>
                    <div className="text-4xl font-mono font-extrabold tracking-widest text-emerald-700 dark:text-emerald-400">
                      {claim.code}
                    </div>
                  </div>
                  <Countdown expiresAt={claim.expires_at} />
                  <p className="text-xs text-center text-muted-foreground">{t("biz.showCode")}</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProfileQuickView
        userId={quickViewUser}
        open={!!quickViewUser}
        onOpenChange={(v) => !v && setQuickViewUser(null)}
      />

      <Dialog open={!!claimsListOffer} onOpenChange={(v) => !v && setClaimsListOffer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Người đã nhận "{claimsListOffer?.title}"</DialogTitle>
          </DialogHeader>
          {claimsListOffer && <OfferClaimsList offerId={claimsListOffer.id} onOpenUser={setQuickViewUser} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface OfferClaimRow {
  user_id: string;
  claimed_at: string;
  full_name: string;
  avatar_url: string | null;
}

function OfferClaimsList({ offerId, onOpenUser }: { offerId: string; onOpenUser: (uid: string) => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState<OfferClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: claims } = await supabase
        .from("offer_claims")
        .select("user_id, claimed_at")
        .eq("offer_id", offerId)
        .order("claimed_at", { ascending: false });
      const ids = [...new Set((claims ?? []).map((c: any) => c.user_id))];
      const [{ data: profs }, { data: mine }] = await Promise.all([
        ids.length
          ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
          : Promise.resolve({ data: [] as any[] }),
        user
          ? supabase
              .from("follows")
              .select("followee_user_id")
              .eq("follower_id", user.id)
              .not("followee_user_id", "is", null)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setMyFollowing(new Set((mine ?? []).map((r: any) => r.followee_user_id)));
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setRows(
        (claims ?? []).map((c: any) => ({
          user_id: c.user_id,
          claimed_at: c.claimed_at,
          full_name: pMap.get(c.user_id)?.full_name ?? "Ẩn danh",
          avatar_url: pMap.get(c.user_id)?.avatar_url ?? null,
        })),
      );
      setLoading(false);
    })();
  }, [offerId, user?.id]);

  const toggleFollow = async (uid: string) => {
    if (!user) return;
    setBusyId(uid);
    const isFollowing = myFollowing.has(uid);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followee_user_id", uid);
      setMyFollowing((s) => {
        const n = new Set(s);
        n.delete(uid);
        return n;
      });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: uid });
      setMyFollowing((s) => new Set(s).add(uid));
    }
    setBusyId(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-6">Đang tải…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Chưa có ai nhận</p>;

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto">
      {rows.map((r, i) => {
        const isMe = user?.id === r.user_id;
        const isFollowing = myFollowing.has(r.user_id);
        return (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
            <button onClick={() => onOpenUser(r.user_id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <Avatar path={r.avatar_url} name={r.full_name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{r.full_name}</div>
                <div className="text-[11px] text-muted-foreground">{timeAgo(r.claimed_at)}</div>
              </div>
            </button>
            {!isMe && user && (
              <button
                onClick={() => toggleFollow(r.user_id)}
                disabled={busyId === r.user_id}
                className={`shrink-0 h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${
                  isFollowing ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" /> Đang theo dõi
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> Follow
                  </>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewItem({
  r,
  replies,
  isOwner,
  isAdmin,
  myId,
  onOpenUser,
  onDelete,
  onDeleteReply,
  onReplied,
}: {
  r: ReviewMeta;
  replies: ReplyMeta[];
  isOwner: boolean;
  isAdmin: boolean;
  myId?: string;
  onOpenUser: (uid: string) => void;
  onDelete: () => void;
  onDeleteReply: (id: string) => void;
  onReplied: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submitReply = async () => {
    const t = text.trim();
    if (!t || !myId) return;
    setBusy(true);
    const { error } = await supabase.from("review_replies").insert({ review_id: r.id, user_id: myId, content: t });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    setReplyOpen(false);
    toast.success("Đã gửi phản hồi");
    onReplied();
  };

  return (
    <div className="p-3 rounded-xl bg-card shadow-sm space-y-2">
      <div className="flex items-center gap-2">
        <Avatar
          path={r.profile?.avatar_url}
          name={r.profile?.full_name}
          size={32}
          onClick={() => onOpenUser(r.user_id)}
        />
        <button onClick={() => onOpenUser(r.user_id)} className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold truncate hover:text-primary">{r.profile?.full_name || "Ẩn danh"}</div>
          <div className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</div>
        </button>
        <div className="flex text-yellow-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400" : "opacity-30"}`} />
          ))}
        </div>
        {isAdmin && (
          <button
            onClick={onDelete}
            aria-label="Xóa đánh giá"
            className="text-destructive p-1 rounded hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
      {r.image_url && (
        <div className="h-40 rounded-lg overflow-hidden bg-muted">
          <LightboxImage path={r.image_url} alt="Ảnh đánh giá" className="w-full h-full object-cover" />
        </div>
      )}

      {replies.length > 0 && (
        <div className="space-y-1.5 ml-6 border-l-2 border-accent pl-2">
          {replies.map((rep) => (
            <div key={rep.id} className="text-xs space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Avatar path={rep.profile?.avatar_url} name={rep.profile?.full_name} size={20} />
                <span className="font-semibold truncate">{rep.profile?.full_name || "Chủ DN"}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(rep.created_at)}</span>
                {(isAdmin || rep.user_id === myId) && (
                  <button
                    onClick={() => onDeleteReply(rep.id)}
                    aria-label="Xóa phản hồi"
                    className="ml-auto text-destructive p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-muted-foreground pl-6">{rep.content}</div>
            </div>
          ))}
        </div>
      )}

      {isOwner && !replyOpen && (
        <button
          onClick={() => setReplyOpen(true)}
          className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"
        >
          <Reply className="w-3 h-3" /> Trả lời
        </button>
      )}
      {isOwner && replyOpen && (
        <div className="flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitReply();
            }}
            placeholder="Trả lời đánh giá…"
            className="flex-1 px-2 py-1.5 rounded border bg-background text-xs"
          />
          <button
            onClick={submitReply}
            disabled={busy}
            className="px-2 rounded bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setReplyOpen(false);
              setText("");
            }}
            className="px-2 rounded border text-xs"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [ms, setMs] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMs(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (ms <= 0) return <div className="text-center text-sm font-semibold text-destructive">Mã đã hết hạn</div>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
      <Clock className="w-4 h-4" />
      Còn lại {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" /> {children}
    </div>
  );
}

function FollowBusinessButton({ businessId, ownerId }: { businessId: string; ownerId: string | null }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count: c }, { data: rel }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_business_id", businessId),
        user
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("followee_business_id", businessId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setCount(c ?? 0);
      setFollowing(!!rel);
    })();
  }, [businessId, user?.id]);

  const { t } = useLanguage();
  const countButton = (
    <button
      onClick={() => setListOpen(true)}
      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
    >
      <Users className="w-3 h-3" /> {t("biz.followers", { n: count })}
    </button>
  );

  const toggle = async () => {
    if (!user) return;
    setBusy(true);
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_business_id", businessId);
      if (!error) {
        setFollowing(false);
        setCount((n) => Math.max(0, n - 1));
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, followee_business_id: businessId });
      if (!error) {
        setFollowing(true);
        setCount((n) => n + 1);
      }
    }
    setBusy(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {user && user.id !== ownerId && (
          <button
            onClick={toggle}
            disabled={busy}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${following ? "bg-muted text-foreground" : "bg-gradient-brand text-primary-foreground"}`}
          >
            {following ? (
              <>
                <UserCheck className="w-3.5 h-3.5" /> {t("biz.following")}
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" /> {t("biz.follow")}
              </>
            )}
          </button>
        )}
        {countButton}
      </div>
      <FollowListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        target={{ kind: "business", id: businessId }}
        mode="followers"
      />
    </>
  );
}
