import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, MapPin, Phone, Star, Tag, Camera, Send, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUSINESS_TYPE_LABELS } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { businesses, reviews, currentUser, redeemOffer, addReview, deleteBusiness } = useStore();
  const b = businesses.find(x => x.id === id);
  const [stars, setStars] = useState(5);
  const [content, setContent] = useState("");
  const [code, setCode] = useState<string | null>(null);

  if (!b) return <div className="p-8 text-center text-sm">Không tìm thấy doanh nghiệp</div>;

  const bReviews = reviews.filter(r => r.businessId === b.id);
  const isOwner = currentUser?.id === b.ownerId;

  const handleRedeem = () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng ký/đăng nhập để nhận ưu đãi");
      nav("/dang-ky");
      return;
    }
    const u = redeemOffer(b.id);
    setCode(u.code);
  };

  const handleReview = () => {
    if (!currentUser?.isVerified) {
      toast.error("Cần xác thực số điện thoại để đánh giá");
      return;
    }
    if (!content.trim()) return toast.error("Vui lòng viết nội dung đánh giá");
    addReview({ userId: currentUser.id, businessId: b.id, stars, content });
    setContent(""); setStars(5);
    toast.success("Cảm ơn bạn đã đánh giá!");
  };

  return (
    <div>
      {/* Cover */}
      <div className="relative h-56">
        <img src={b.cover} className="w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"/>
        <button onClick={() => nav(-1)}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/95 backdrop-blur grid place-items-center shadow-soft">
          <ArrowLeft className="w-4 h-4"/>
        </button>
      </div>

      <div className="px-5 -mt-12 relative">
        <div className="flex items-end gap-3 mb-3">
          <img src={b.logo} className="w-20 h-20 rounded-2xl border-4 border-background object-cover shadow-card"/>
          <div className="pb-1 flex-1 min-w-0">
            <div className="text-[11px] font-bold text-primary uppercase">{BUSINESS_TYPE_LABELS[b.type]}</div>
            <h1 className="text-xl font-extrabold leading-tight">{b.name}</h1>
            <div className="flex items-center gap-1 text-xs mt-0.5">
              <Star className="w-3.5 h-3.5 fill-warning text-warning"/>
              <span className="font-bold">{b.rating || "—"}</span>
              <span className="text-muted-foreground">· {b.reviewCount} đánh giá · {b.usageCount} lượt</span>
            </div>
          </div>
          {isOwner && (
            <button onClick={() => {
              if (confirm(`Xóa doanh nghiệp "${b.name}"? Hành động này không thể hoàn tác.`)) {
                deleteBusiness(b.id);
                toast.success("Đã xóa doanh nghiệp");
                nav("/");
              }
            }} className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0 mb-1">
              <Trash2 className="w-4 h-4"/>
            </button>
          )}
        </div>

        {/* Offer banner */}
        <div className="rounded-2xl bg-gradient-brand text-white p-4 shadow-brand">
          <div className="flex items-start gap-2">
            <Tag className="w-5 h-5 shrink-0 mt-0.5"/>
            <div>
              <div className="text-[11px] uppercase font-bold opacity-90">Ưu đãi cộng đồng</div>
              <div className="font-bold text-sm mt-0.5">{b.offer}</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 space-y-2.5">
          <a href={`tel:${b.phone}`} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
            <Phone className="w-4 h-4 text-primary"/>
            <span className="text-sm font-semibold">{b.phone}</span>
          </a>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
             target="_blank" rel="noreferrer"
             className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
            <MapPin className="w-4 h-4 text-secondary"/>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">{b.address}</div>
              <div className="text-[11px] text-secondary font-bold mt-0.5">Mở Google Maps →</div>
            </div>
          </a>
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{b.description}</p>

        {/* Reviews */}
        <div className="mt-6">
          <h2 className="font-extrabold text-base mb-3">Đánh giá ({bReviews.length})</h2>
          {currentUser?.isVerified ? (
            <div className="p-3 rounded-2xl bg-card border border-border mb-3">
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setStars(s)}>
                    <Star className={cn("w-6 h-6", s <= stars ? "fill-warning text-warning" : "text-muted-foreground/40")}/>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm..."
                  className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
                <button className="w-10 h-10 rounded-xl bg-muted grid place-items-center text-muted-foreground" type="button">
                  <Camera className="w-4 h-4"/>
                </button>
                <button onClick={handleReview} className="w-10 h-10 rounded-xl bg-gradient-brand text-white grid place-items-center">
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ) : (
            <Link to="/dang-ky" className="block text-center text-xs font-semibold text-primary p-3 rounded-2xl bg-accent mb-3">
              Đăng ký & xác thực để đánh giá
            </Link>
          )}
          <div className="space-y-2.5">
            {bReviews.map(r => (
              <div key={r.id} className="p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm">{r.userName}</div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className={cn("w-3 h-3", s <= r.stars ? "fill-warning text-warning" : "text-muted-foreground/30")}/>)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.content}</p>
              </div>
            ))}
            {bReviews.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Chưa có đánh giá nào</div>}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-20 mx-5 mt-6 z-30">
        <button onClick={handleRedeem}
          className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand active:scale-95 transition text-base flex items-center justify-center gap-2">
          <Tag className="w-5 h-5"/> NHẬN ƯU ĐÃI
        </button>
      </div>

      {/* Code modal */}
      {code && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur grid place-items-center px-5" onClick={() => setCode(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-card rounded-3xl p-6 text-center animate-float-up shadow-float">
            <div className="w-16 h-16 rounded-full bg-gradient-brand text-white mx-auto grid place-items-center animate-pulse-ring">
              <CheckCircle2 className="w-8 h-8"/>
            </div>
            <div className="font-extrabold text-lg mt-3">Mã ưu đãi của bạn</div>
            <div className="text-xs text-muted-foreground">Trình mã này cho nhân viên {b.name}</div>
            <div className="my-4 p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-accent">
              <div className="text-3xl font-extrabold tracking-widest text-gradient-brand font-mono">{code}</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Đã copy mã"); }}
              className="w-full py-2.5 rounded-xl bg-muted font-semibold text-sm flex items-center justify-center gap-2 mb-2">
              <Copy className="w-4 h-4"/> Sao chép mã
            </button>
            <button onClick={() => setCode(null)} className="w-full py-2.5 rounded-xl bg-gradient-brand text-white font-bold text-sm">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
