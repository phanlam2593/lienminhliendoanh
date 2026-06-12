import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Business, Review, Suggestion } from "@/lib/types";
import { ACCEPT, uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Camera, LogOut, Loader2, Store, Star, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [myBiz, setMyBiz] = useState<Business[]>([]);
  const [mySug, setMySug] = useState<Suggestion[]>([]);
  const [myRev, setMyRev] = useState<Review[]>([]);

  useEffect(() => {
    if (profile) { setName(profile.full_name); setPhone(profile.phone || ""); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [b, s, r] = await Promise.all([
        supabase.from("businesses").select("*").eq("owner_id", user.id),
        supabase.from("business_suggestions").select("*").eq("suggested_by", user.id),
        supabase.from("reviews").select("*").eq("user_id", user.id),
      ]);
      setMyBiz((b.data as Business[]) || []);
      setMySug((s.data as Suggestion[]) || []);
      setMyRev((r.data as Review[]) || []);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-muted-foreground mb-4">Vui lòng đăng nhập</p>
        <Link to="/auth/login" className="inline-block bg-gradient-brand text-white font-bold px-6 py-3 rounded-xl shadow-brand">Đăng nhập</Link>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật"); refreshProfile();
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const err = validateImage(f); if (err) return toast.error(err);
    setBusy(true);
    try {
      const path = await uploadImage(f, "avatars");
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      toast.success("Đã cập nhật ảnh đại diện"); refreshProfile();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-5 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} className="relative w-16 h-16 rounded-full bg-gradient-brand text-white font-bold text-xl grid place-items-center overflow-hidden">
          {profile?.avatar_url ? <StoredImage path={profile.avatar_url} className="w-full h-full object-cover" /> : (name || "?").slice(0, 1).toUpperCase()}
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-card grid place-items-center border-2 border-card">
            <Camera className="w-2.5 h-2.5 text-foreground" />
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onAvatar} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold truncate">{profile?.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        <button onClick={async () => { await signOut(); nav("/"); }} className="p-2 rounded-lg text-destructive">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 p-4 bg-card rounded-2xl border border-border/60 shadow-soft">
        <div className="text-xs font-bold uppercase text-muted-foreground">Thông tin cá nhân</div>
        <Fld label="Họ tên" value={name} onChange={setName} />
        <Fld label="Số điện thoại" value={phone} onChange={setPhone} />
        <button onClick={save} disabled={busy} className="w-full bg-gradient-brand text-white text-sm font-bold py-2.5 rounded-xl mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}Lưu thay đổi
        </button>
      </div>

      <Section title={`Doanh nghiệp của tôi (${myBiz.length})`} icon={Store}>
        {myBiz.length === 0 ? <Empty>Bạn chưa có doanh nghiệp</Empty> : (
          <div className="space-y-2">
            {myBiz.map(b => (
              <Link key={b.id} to={`/dn/${b.id}`} className="flex items-center gap-2 p-2 bg-card rounded-xl border border-border/60">
                <StoredImage path={b.image_url} className="w-12 h-12 rounded-lg object-cover" fallbackClassName="w-12 h-12 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{b.name}</div>
                  <div className={`text-[10px] font-bold uppercase ${b.status === "approved" ? "text-success" : b.status === "rejected" ? "text-destructive" : "text-warning"}`}>
                    {b.status === "approved" ? "Đã duyệt" : b.status === "rejected" ? "Bị từ chối" : "Chờ duyệt"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Đề xuất đã gửi (${mySug.length})`} icon={Lightbulb}>
        {mySug.length === 0 ? <Empty>Chưa có đề xuất</Empty> : (
          <div className="space-y-2">
            {mySug.map(s => (
              <div key={s.id} className="p-2 bg-card rounded-xl border border-border/60">
                <div className="font-bold text-sm">{s.name}</div>
                <div className={`text-[10px] font-bold uppercase ${s.status === "approved" ? "text-success" : s.status === "rejected" ? "text-destructive" : "text-warning"}`}>
                  {s.status === "approved" ? "Đã duyệt" : s.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Đánh giá đã viết (${myRev.length})`} icon={Star}>
        {myRev.length === 0 ? <Empty>Chưa có đánh giá</Empty> : (
          <div className="space-y-2">
            {myRev.map(r => (
              <Link key={r.id} to={`/dn/${r.business_id}`} className="block p-2 bg-card rounded-xl border border-border/60">
                <div className="flex items-center gap-0.5 text-warning">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                {r.content && <p className="text-xs mt-1 line-clamp-2">{r.content}</p>}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-primary" /><h2 className="font-extrabold text-sm">{title}</h2></div>
      {children}
    </div>
  );
}
function Empty({ children }: any) { return <div className="p-3 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl">{children}</div>; }
function Fld({ label, value, onChange }: any) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
    </div>
  );
}
