import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Business, BusinessType, Offer } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES } from "@/lib/types";
import { LogOut, PlusCircle, MessageSquare, Save, Flag } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";

export default function Profile() {
  const { user, profile, role, refresh, signOut } = useAuth();
  const nav = useNavigate();
  const [biz, setBiz] = useState<Business[]>([]);
  const [fullName, setFN] = useState("");
  const [phone, setPh] = useState("");
  const [email, setE] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFN(profile?.full_name ?? "");
    setPh(profile?.phone ?? "");
    setE(profile?.email ?? "");
    void loadBiz();
  }, [user?.id, profile?.id]);

  const loadBiz = async () => {
    if (!user) return;
    const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id);
    setBiz((data ?? []) as Business[]);
  };

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Bạn chưa đăng nhập</p>
        <Link to="/auth/login" className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">Đăng nhập</Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, email }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã lưu");
    refresh();
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center text-2xl font-bold">
          {(profile?.full_name || profile?.username || "?").slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{profile?.full_name}</div>
          <div className="text-xs text-muted-foreground">@{profile?.username} · {role}</div>
          <StatusBadge s={profile?.status} />
        </div>
      </div>

      <section className="space-y-2 bg-card rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-sm">Thông tin cá nhân</h2>
        <input value={fullName} onChange={e => setFN(e.target.value)} placeholder="Họ tên" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input value={email} onChange={e => setE(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input value={phone} onChange={e => setPh(e.target.value)} placeholder="SĐT" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <button onClick={save} disabled={saving} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </section>

      {biz.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-sm">Doanh nghiệp của tôi</h2>
          {biz.map(b => <BusinessEditor key={b.id} biz={b} onSaved={loadBiz} />)}
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/de-xuat" className="flex items-center gap-2 p-3 bg-card rounded-xl shadow-sm text-sm font-semibold"><PlusCircle className="w-4 h-4" /> Đề xuất DN</Link>
        <Link to="/tin-nhan" className="flex items-center gap-2 p-3 bg-card rounded-xl shadow-sm text-sm font-semibold"><MessageSquare className="w-4 h-4" /> Tin nhắn</Link>
      </div>

      {biz.length > 0 && <ReportsInbox businessIds={biz.map(b => b.id)} />}

      <button onClick={async () => { await signOut(); nav("/"); }} className="w-full py-2.5 rounded-xl border text-destructive font-semibold flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Đăng xuất
      </button>
    </div>
  );
}

function BusinessEditor({ biz, onSaved }: { biz: Business; onSaved: () => void }) {
  const [name, setName] = useState(biz.name);
  const [type, setType] = useState<BusinessType>(biz.type);
  const [open, setOpen] = useState(biz.hours_open?.slice(0, 5) || "07:00");
  const [close, setClose] = useState(biz.hours_close?.slice(0, 5) || "22:00");
  const [desc, setDesc] = useState(biz.description || "");
  const [fb, setFb] = useState(biz.facebook_url || "");
  const [web, setWeb] = useState(biz.website_url || "");
  const [phone, setPhone] = useState(biz.phone || "");
  const [address, setAddress] = useState(biz.address || "");
  const [cover, setCover] = useState(biz.cover_url);
  const [offerText, setOfferText] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("offers").select("*").eq("business_id", biz.id).order("created_at", { ascending: false })
      .then(({ data }) => setOffers((data ?? []) as Offer[]));
  }, [biz.id]);

  const onCover = async (file: File) => {
    try {
      const path = await uploadImage(file, "covers");
      setCover(path);
      await supabase.from("businesses").update({ cover_url: path }).eq("id", biz.id);
      toast.success("Đã cập nhật ảnh bìa");
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name, type, hours_open: open, hours_close: close, description: desc,
      facebook_url: fb || null, website_url: web || null, phone: phone || null, address: address || null,
    }).eq("id", biz.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã lưu doanh nghiệp");
    onSaved();
  };

  const addOffer = async () => {
    if (!offerText.trim()) return;
    const { error } = await supabase.from("offers").insert({
      business_id: biz.id, title: offerText.trim(), status: "active",
    });
    if (error) { toast.error(error.message); return; }
    setOfferText("");
    const { data } = await supabase.from("offers").select("*").eq("business_id", biz.id).order("created_at", { ascending: false });
    setOffers((data ?? []) as Offer[]);
    toast.success("Đã thêm ưu đãi");
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Link to={`/dn/${biz.id}`} className="flex-1 font-semibold text-sm truncate">{name}</Link>
        <StatusBadge s={biz.status} />
      </div>

      <div className="relative">
        <div className="w-full h-32 rounded-xl overflow-hidden bg-muted">
          <StoredImage path={cover} alt={name} className="w-full h-full object-cover" />
        </div>
        <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded cursor-pointer">
          Đổi ảnh bìa
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void onCover(f); }} />
        </label>
      </div>

      <Field label="Tên DN">
        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
      </Field>
      <Field label="Loại hình">
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} className={`px-2.5 py-1 rounded-full text-xs border ${type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
              {BUSINESS_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Giờ mở"><input type="time" value={open} onChange={e => setOpen(e.target.value)} className="w-full px-2 py-2 rounded-lg border bg-background text-sm" /></Field>
        <Field label="Giờ đóng"><input type="time" value={close} onChange={e => setClose(e.target.value)} className="w-full px-2 py-2 rounded-lg border bg-background text-sm" /></Field>
      </div>
      <Field label="Mô tả"><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" /></Field>
      <Field label="SĐT"><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" /></Field>
      <Field label="Địa chỉ"><input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" /></Field>
      <Field label="Facebook URL"><input value={fb} onChange={e => setFb(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" /></Field>
      <Field label="Website"><input value={web} onChange={e => setWeb(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" /></Field>

      <button onClick={save} disabled={saving} className="w-full py-2 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1">
        <Save className="w-4 h-4" /> {saving ? "Đang lưu…" : "Lưu doanh nghiệp"}
      </button>

      <div className="border-t pt-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Ưu đãi / Deal</div>
        {offers.map(o => (
          <div key={o.id} className="text-xs p-2 bg-accent rounded flex justify-between items-center">
            <span className="truncate">{o.title}</span>
            <span className="text-[10px] text-muted-foreground">{o.claim_count ?? 0} lượt nhận</span>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={offerText} onChange={e => setOfferText(e.target.value)} placeholder="Thêm ưu đãi mới…" className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm" />
          <button onClick={addOffer} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Thêm</button>
        </div>
      </div>
    </div>
  );
}

function ReportsInbox({ businessIds }: { businessIds: string[] }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    if (!businessIds.length) return;
    supabase.from("reports").select("*").eq("send_to_business", true).eq("target_type", "business")
      .in("target_id", businessIds).order("created_at", { ascending: false })
      .then(({ data }) => setList(data ?? []));
  }, [businessIds.join(",")]);
  if (!list.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-sm flex items-center gap-1"><Flag className="w-4 h-4 text-destructive" /> Báo cáo gửi đến DN của bạn ({list.length})</h2>
      {list.map(r => (
        <div key={r.id} className="p-3 bg-card rounded-xl shadow-sm text-sm">
          <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("vi-VN")}</div>
          <div>{r.description}</div>
        </div>
      ))}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ s }: { s?: string }) {
  if (!s) return null;
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const lbl: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${map[s] || "bg-muted"}`}>{lbl[s] || s}</span>;
}
