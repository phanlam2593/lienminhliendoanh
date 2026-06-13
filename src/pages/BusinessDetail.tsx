import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Business, CATEGORY_LABEL, Offer, Review } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { StoredImage } from "@/components/StoredImage";
import { ArrowLeft, Star, MapPin, Phone, Globe, Facebook, MessageCircle, Ticket, Plus, Trash2, Loader2, Camera, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT, uploadImage, validateImage } from "@/lib/upload";

export default function BusinessDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [b, setB] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [showOffer, setShowOffer] = useState(false);

  const load = async () => {
    if (!id) return;
    const [bz, of, rv] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase.from("offers").select("*").eq("business_id", id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }),
    ]);
    setB(bz.data as Business);
    setOffers((of.data as Offer[]) || []);
    setReviews((rv.data as Review[]) || []);
    const uids = Array.from(new Set((rv.data || []).map((r: any) => r.user_id)));
    if (uids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", uids);
      const map: Record<string, string> = {};
      (ps || []).forEach((p: any) => map[p.id] = p.full_name);
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!b) return <div className="p-10 text-center text-muted-foreground">Đang tải...</div>;
  const isOwner = user?.id === b.owner_id;
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const submitReview = async () => {
    if (!user) return toast.error("Vui lòng đăng nhập");
    if (!content.trim()) return toast.error("Nhập nội dung đánh giá");
    const { error } = await supabase.from("reviews").insert({
      business_id: b.id, user_id: user.id, rating, content,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã đăng đánh giá");
    setContent(""); setRating(5); load();
  };

  const deleteOffer = async (oid: string) => {
    if (!confirm("Xoá ưu đãi này?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", oid);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá"); load();
  };

  return (
    <div>
      <div className="relative">
        <StoredImage path={b.image_url} className="w-full h-52 object-cover" fallbackClassName="w-full h-52" alt={b.name} />
        <button onClick={() => nav(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/90 grid place-items-center shadow-soft backdrop-blur">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4">
        {b.featured && (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-gradient-brand text-white rounded-full shadow-brand mb-2">
            <Sparkles className="w-3 h-3" />Nổi bật cộng đồng
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{b.name}</h1>
            <div className="text-xs text-primary font-bold mt-0.5">{CATEGORY_LABEL[b.category]}</div>
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 text-warning text-sm">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-bold">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">({reviews.length})</span>
            </div>
          )}
        </div>
        {b.description && <p className="text-sm text-foreground mt-3">{b.description}</p>}

        <div className="space-y-2 mt-4 text-sm">
          {b.address && <Info icon={MapPin}>{b.address}</Info>}
          {b.phone && <Info icon={Phone}><a href={`tel:${b.phone}`} className="text-primary">{b.phone}</a></Info>}
          {b.website && <Info icon={Globe}><a href={b.website} target="_blank" rel="noopener noreferrer" className="text-primary">{b.website}</a></Info>}
          {b.facebook && <Info icon={Facebook}><a href={b.facebook} target="_blank" rel="noopener noreferrer" className="text-primary">Facebook</a></Info>}
          {b.zalo && <Info icon={MessageCircle}>Zalo: {b.zalo}</Info>}
        </div>

        {/* Offers */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-extrabold">Ưu đãi ({offers.length})</h2>
            {isOwner && b.status === "approved" && (
              <button onClick={() => setShowOffer(true)} className="text-xs font-bold text-primary flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />Thêm
              </button>
            )}
          </div>
          {offers.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl">Chưa có ưu đãi</div>
          ) : (
            <div className="space-y-2">
              {offers.map(o => (
                <div key={o.id} className="p-3 bg-card rounded-xl border border-border/60 shadow-soft">
                  <div className="flex items-start gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-brand grid place-items-center text-white shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{o.title}</div>
                      {o.description && <div className="text-xs text-muted-foreground mt-0.5">{o.description}</div>}
                      {(o.start_date || o.end_date) && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {o.start_date && new Date(o.start_date).toLocaleDateString("vi-VN")}
                          {o.start_date && o.end_date && " → "}
                          {o.end_date && new Date(o.end_date).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                    {isOwner && (
                      <button onClick={() => deleteOffer(o.id)} className="text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="mt-6">
          <h2 className="font-extrabold mb-2">Đánh giá ({reviews.length})</h2>
          {user ? (
            <div className="p-3 bg-card rounded-xl border border-border/60 shadow-soft mb-3">
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} type="button">
                    <Star className={`w-5 h-5 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={2} placeholder="Chia sẻ cảm nhận..."
                className="w-full p-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <button onClick={submitReview} className="w-full mt-2 bg-gradient-brand text-white text-sm font-bold py-2 rounded-lg">Đăng đánh giá</button>
            </div>
          ) : (
            <Link to="/auth/login" className="block p-3 text-xs text-center text-muted-foreground bg-muted/40 rounded-xl mb-3">
              Đăng nhập để viết đánh giá
            </Link>
          )}
          <div className="space-y-2">
            {reviews.map(r => (
              <div key={r.id} className="p-3 bg-card rounded-xl border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs">{profiles[r.user_id] || "Ẩn danh"}</div>
                  <div className="flex items-center gap-0.5 text-warning">
                    {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  </div>
                </div>
                {r.content && <p className="text-sm mt-1">{r.content}</p>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("vi-VN")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showOffer && <OfferModal businessId={b.id} onClose={() => { setShowOffer(false); load(); }} />}
    </div>
  );
}

function Info({ icon: Icon, children }: any) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function OfferModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [f, setF] = useState({ title: "", description: "", start_date: "", end_date: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!f.title) return toast.error("Nhập tiêu đề");
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImage(file, "offers");
      const { error } = await supabase.from("offers").insert({
        business_id: businessId, title: f.title, description: f.description,
        start_date: f.start_date || null, end_date: f.end_date || null, image_url,
      });
      if (error) throw error;
      toast.success("Đã tạo ưu đãi"); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-extrabold">Thêm ưu đãi</h2>
        <Fld label="Tiêu đề *" value={f.title} onChange={v => setF({ ...f, title: v })} />
        <Fld label="Mô tả" value={f.description} onChange={v => setF({ ...f, description: v })} textarea />
        <div className="grid grid-cols-2 gap-2">
          <Fld label="Ngày bắt đầu" type="date" value={f.start_date} onChange={v => setF({ ...f, start_date: v })} />
          <Fld label="Ngày kết thúc" type="date" value={f.end_date} onChange={v => setF({ ...f, end_date: v })} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Hình ảnh</div>
          <label className="block w-full h-24 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center cursor-pointer overflow-hidden">
            {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
            <input type="file" accept={ACCEPT} className="hidden" onChange={e => {
              const fl = e.target.files?.[0]; if (!fl) return;
              const err = validateImage(fl); if (err) return toast.error(err);
              setFile(fl); setPreview(URL.createObjectURL(fl));
            }} />
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-muted text-sm font-bold">Huỷ</button>
          <button onClick={submit} disabled={busy} className="flex-1 py-3 rounded-xl bg-gradient-brand text-white text-sm font-bold flex items-center justify-center gap-1">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}Tạo
          </button>
        </div>
      </div>
    </div>
  );
}

function Fld({ label, value, onChange, type = "text", textarea }: any) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{label}</div>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm" />
      )}
    </div>
  );
}
