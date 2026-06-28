import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Business, BusinessType, Offer } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES } from "@/lib/types";
import {
  LogOut,
  MessageSquare,
  Save,
  Flag,
  Camera,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Send,
  Users,
  UserCheck,
  Settings,
  KeyRound,
  Bell,
  Moon,
  Sun,
  ArrowLeft,
  User as UserIcon,
  Briefcase,
  ChevronRight,
} from "lucide-react";

import { uploadImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Avatar } from "@/components/Avatar";
import { ReportRepliesPanel, ReportStatusBadge } from "@/components/ReportRepliesPanel";
import { FollowListDialog } from "@/components/FollowListDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
type View = "menu" | "personal" | "business" | "settings";

export default function Profile() {
  const { user, profile, role, refresh, signOut } = useAuth();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") as View) || "menu";
  const [view, setViewState] = useState<View>(
    ["menu", "personal", "business", "settings"].includes(initialView) ? initialView : "menu",
  );
  const setView = (v: View) => {
    setViewState(v);
    if (v === "menu") {
      searchParams.delete("view");
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set("view", v);
      setSearchParams(searchParams, { replace: true });
    }
  };

  const [biz, setBiz] = useState<Business[]>([]);
  const [fullName, setFN] = useState("");
  const [phone, setPh] = useState("");
  const [email, setE] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFN(profile?.full_name ?? "");
    setPh(profile?.phone ?? "");
    setE(profile?.email ?? "");
    void loadBiz();
  }, [user?.id, profile?.id]);

  // Sync state if URL changes (e.g., user clicks nav link while on /ho-so)
  useEffect(() => {
    const v = (searchParams.get("view") as View) || "menu";
    if (["menu", "personal", "business", "settings"].includes(v) && v !== view) {
      setViewState(v);
    }
  }, [searchParams]);

  const loadBiz = async () => {
    if (!user) return;
    const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id);
    setBiz((data ?? []) as Business[]);
  };

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Bạn chưa đăng nhập</p>
        <Link
          to="/auth/login"
          className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, email }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu");
    refresh();
  };

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const path = await uploadImage(file, "avatars", user.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      toast.success("Đã cập nhật ảnh đại diện");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const Header = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar
          path={profile?.avatar_url}
          name={profile?.full_name || profile?.username}
          size={64}
          onClick={() => avatarInput.current?.click()}
        />
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-brand"
          aria-label="Đổi ảnh đại diện"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <input
          ref={avatarInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAvatarChange(f);
            e.currentTarget.value = "";
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{profile?.full_name}</div>
        <div className="text-xs text-muted-foreground">
          @{profile?.username} · {role}
        </div>
        <StatusBadge s={profile?.status} />
        {uploadingAvatar && <div className="text-[10px] text-muted-foreground mt-0.5">Đang tải ảnh…</div>}
      </div>
    </div>
  );

  const BackBar = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setView("menu")}
        className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
        aria-label="Quay lại"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="font-bold text-base">{title}</h1>
    </div>
  );

  if (view === "personal") {
    return (
      <div className="p-4 space-y-5">
        <BackBar title="Hồ sơ cá nhân" />
        {Header}
        <section className="space-y-2 bg-card rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-sm">Thông tin cá nhân</h2>
          <input
            value={fullName}
            onChange={(e) => setFN(e.target.value)}
            placeholder="Họ tên"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <input
            value={email}
            onChange={(e) => setE(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPh(e.target.value)}
            placeholder="SĐT"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
          >
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </section>
      </div>
    );
  }

  if (view === "business") {
    return (
      <div className="p-4 space-y-5">
        <BackBar title="Hồ sơ doanh nghiệp" />
        {biz.length === 0 ? (
          <div className="p-4 bg-card rounded-2xl text-center text-sm text-muted-foreground">
            Bạn chưa có doanh nghiệp nào. Hãy tạo hồ sơ doanh nghiệp đầu tiên bên dưới.
          </div>
        ) : (
          <section className="space-y-3">
            {biz.map((b) => (
              <BusinessEditor key={b.id} biz={b} onSaved={loadBiz} />
            ))}
          </section>
        )}
        <BusinessCreator ownerId={user.id} onCreated={loadBiz} hasExisting={biz.length > 0} />
        {biz.length > 0 && <ReportsInbox businessIds={biz.map((b) => b.id)} />}
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="p-4 space-y-5">
        <BackBar title="Cài đặt" />
        <SettingsSection userId={user.id} initialPrefs={(profile as any)?.notification_prefs} />
      </div>
    );
  }

  // Default: menu view
  return (
    <div className="p-4 space-y-5">
      {Header}
      <FollowStats userId={user.id} />
      <div className="bg-card rounded-2xl shadow-sm divide-y overflow-hidden">
        <MenuRow icon={<UserIcon className="w-4 h-4" />} label="Hồ sơ cá nhân" onClick={() => setView("personal")} />
        <MenuRow
          icon={<Briefcase className="w-4 h-4" />}
          label={biz.length > 0 ? "Hồ sơ doanh nghiệp" : "Tạo hồ sơ doanh nghiệp"}
          onClick={() => setView("business")}
        />
        <MenuRow icon={<MessageSquare className="w-4 h-4" />} label="Tin nhắn" onClick={() => nav("/tin-nhan")} />
        <MenuRow icon={<Settings className="w-4 h-4" />} label="Cài đặt" onClick={() => setView("settings")} />
        <MenuRow
          icon={<LogOut className="w-4 h-4" />}
          label="Đăng xuất"
          danger
          onClick={async () => {
            await signOut();
            nav("/");
          }}
        />
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-sm font-semibold text-left hover:bg-accent transition ${danger ? "text-destructive" : ""}`}
    >
      <span className={`w-8 h-8 rounded-full grid place-items-center ${danger ? "bg-destructive/10" : "bg-accent"}`}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
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
  const [tiktok, setTiktok] = useState(biz.tiktok_url || "");
  const [instagram, setInstagram] = useState(biz.instagram_url || "");
  const [youtube, setYoutube] = useState(biz.youtube_url || "");
  const [phone, setPhone] = useState(biz.phone || "");
  const [address, setAddress] = useState(biz.address || "");
  const [cover, setCover] = useState(biz.cover_url);
  const [offerText, setOfferText] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [saving, setSaving] = useState(false);

  const reloadOffers = async () => {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false });
    setOffers((data ?? []) as Offer[]);
  };

  useEffect(() => {
    void reloadOffers();
  }, [biz.id]);

  const onCover = async (file: File) => {
    try {
      const path = await uploadImage(file, "covers");
      setCover(path);
      await supabase.from("businesses").update({ cover_url: path }).eq("id", biz.id);
      toast.success("Đã cập nhật ảnh bìa");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        type,
        hours_open: open,
        hours_close: close,
        description: desc,
        facebook_url: fb || null,
        website_url: web || null,
        tiktok_url: tiktok || null,
        instagram_url: instagram || null,
        youtube_url: youtube || null,
        phone: phone || null,
        address: address || null,
      })
      .eq("id", biz.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu doanh nghiệp");
    onSaved();
  };

  const addOffer = async () => {
    if (!offerText.trim()) return;
    const { error } = await supabase.from("offers").insert({
      business_id: biz.id,
      title: offerText.trim(),
      status: "active",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOfferText("");
    await reloadOffers();
    toast.success("Đã thêm ưu đãi");
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Link to={`/dn/${biz.id}`} className="flex-1 font-semibold text-sm truncate">
          {name}
        </Link>
        <StatusBadge s={biz.status} />
      </div>

      <div className="relative">
        <div className="w-full h-32 rounded-xl overflow-hidden bg-muted">
          <StoredImage path={cover} alt={name} className="w-full h-full object-cover" />
        </div>
        <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded cursor-pointer">
          Đổi ảnh bìa
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onCover(f);
            }}
          />
        </label>
      </div>

      <Field label="Tên DN" hint="Ví dụ: Nhà Hàng Hương Quê, Cafe Sương Mai">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Loại hình">
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-full text-xs border ${type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
            >
              {BUSINESS_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Giờ mở" hint="Ví dụ: 07:00">
          <input
            type="time"
            value={open}
            onChange={(e) => setOpen(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
          />
        </Field>
        <Field label="Giờ đóng" hint="Ví dụ: 22:00">
          <input
            type="time"
            value={close}
            onChange={(e) => setClose(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
          />
        </Field>
      </div>
      <Field label="Mô tả" hint="Mô tả ngắn gọn về không gian, phong cách, món đặc trưng">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="SĐT">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Địa chỉ">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Facebook URL">
        <input
          value={fb}
          onChange={(e) => setFb(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Website">
        <input
          value={web}
          onChange={(e) => setWeb(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="TikTok URL">
        <input
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
          placeholder="Link TikTok của bạn"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Instagram URL">
        <input
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="Link Instagram của bạn"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="YouTube URL">
        <input
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          placeholder="Link YouTube của bạn"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
      >
        <Save className="w-4 h-4" /> {saving ? "Đang lưu…" : "Lưu doanh nghiệp"}
      </button>

      <div className="border-t pt-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Ưu đãi / Deal</div>
        {offers.map((o) => (
          <OfferRow key={o.id} offer={o} onChanged={reloadOffers} />
        ))}
        <div className="flex gap-2">
          <input
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            placeholder="Thêm ưu đãi mới…"
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <button
            onClick={addOffer}
            className="px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferRow({ offer, onChanged }: { offer: Offer; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(offer.title);
  const [desc, setDesc] = useState(offer.description ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("offers")
      .update({ title: title.trim(), description: desc || null })
      .eq("id", offer.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu ưu đãi");
    setEditing(false);
    onChanged();
  };

  const toggleStatus = async () => {
    const next = offer.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("offers").update({ status: next }).eq("id", offer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "active" ? "Đã hiển thị ưu đãi" : "Đã tạm ẩn ưu đãi");
    onChanged();
  };

  const remove = async () => {
    const { error } = await supabase.from("offers").delete().eq("id", offer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa");
    onChanged();
  };

  const broadcast = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("broadcast_offer", { _offer_id: offer.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Đã gửi đến ${data ?? 0} thành viên`);
  };

  if (editing) {
    return (
      <div className="p-2 bg-accent rounded space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1.5 rounded border bg-background text-sm"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Mô tả (tuỳ chọn)"
          className="w-full px-2 py-1.5 rounded border bg-background text-xs"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold"
          >
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setTitle(offer.title);
              setDesc(offer.description ?? "");
            }}
            className="flex-1 py-1.5 rounded border text-xs font-semibold"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs p-2 bg-accent rounded space-y-1.5">
      <div className="flex justify-between items-center gap-2">
        <span className={`truncate flex-1 ${offer.status === "inactive" ? "line-through text-muted-foreground" : ""}`}>
          {offer.title}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{offer.claim_count ?? 0} lượt</span>
      </div>
      {offer.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{offer.description}</div>}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setEditing(true)}
          className="px-2 py-1 rounded bg-card border text-[11px] font-semibold inline-flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> Sửa
        </button>
        <button
          onClick={toggleStatus}
          className="px-2 py-1 rounded bg-card border text-[11px] font-semibold inline-flex items-center gap-1"
        >
          {offer.status === "active" ? (
            <>
              <EyeOff className="w-3 h-3" /> Tạm ẩn
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" /> Hiện lại
            </>
          )}
        </button>

        {/* Broadcast confirm dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={busy || offer.status !== "active"}
              className="px-2 py-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-3 h-3" /> Gửi thông báo
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gửi thông báo ưu đãi?</AlertDialogTitle>
              <AlertDialogDescription>
                Thông báo về <b>"{offer.title}"</b> sẽ được gửi đến tất cả thành viên đang theo dõi doanh nghiệp của
                bạn.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={broadcast}>Gửi ngay</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirm dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="px-2 py-1 rounded bg-card border text-destructive text-[11px] font-semibold inline-flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Xóa
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa ưu đãi này?</AlertDialogTitle>
              <AlertDialogDescription>
                Ưu đãi <b>"{offer.title}"</b> sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function FollowStats({ userId }: { userId: string }) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [open, setOpen] = useState<null | "followers" | "following">(null);
  useEffect(() => {
    (async () => {
      const [{ count: fc }, { count: gc }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      setFollowers(fc ?? 0);
      setFollowing(gc ?? 0);
    })();
  }, [userId]);
  return (
    <>
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setOpen("followers")}
          className="flex-1 bg-card rounded-xl p-3 text-center shadow-sm hover:bg-accent transition"
        >
          <div className="text-lg font-extrabold text-primary">{followers}</div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Người theo dõi
          </div>
        </button>
        <button
          onClick={() => setOpen("following")}
          className="flex-1 bg-card rounded-xl p-3 text-center shadow-sm hover:bg-accent transition"
        >
          <div className="text-lg font-extrabold text-primary">{following}</div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Đang theo dõi
          </div>
        </button>
      </div>
      <FollowListDialog
        open={open !== null}
        onOpenChange={(v) => !v && setOpen(null)}
        target={{ kind: "user", id: userId }}
        mode={open ?? "followers"}
      />
    </>
  );
}

function ReportsInbox({ businessIds }: { businessIds: string[] }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    if (!businessIds.length) return;
    supabase
      .from("reports")
      .select("*")
      .eq("send_to_business", true)
      .eq("target_type", "business")
      .in("target_id", businessIds)
      .order("created_at", { ascending: false })
      .then(({ data }) => setList(data ?? []));
  }, [businessIds.join(",")]);
  const onStatusChanged = (id: string, s: any) =>
    setList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: s, resolved: s === "resolved" || s === "closed" } : r)),
    );
  if (!list.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-sm flex items-center gap-1">
        <Flag className="w-4 h-4 text-destructive" /> Báo cáo gửi đến DN của bạn ({list.length})
      </h2>
      {list.map((r) => (
        <div key={r.id} className="p-3 bg-card rounded-xl shadow-sm text-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("vi-VN")}</div>
            <ReportStatusBadge s={r.status ?? "pending"} />
          </div>
          <div>{r.description}</div>
          <ReportRepliesPanel
            reportId={r.id}
            canChangeStatus
            currentStatus={(r.status ?? "pending") as any}
            onStatusChange={(s) => onStatusChanged(r.id, s)}
          />
        </div>
      ))}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${map[s] || "bg-muted"}`}>
      {lbl[s] || s}
    </span>
  );
}

type NotifPrefs = { messages: boolean; follows: boolean; deals: boolean; admin: boolean };
const DEFAULT_PREFS: NotifPrefs = { messages: true, follows: true, deals: true, admin: true };

function SettingsSection({ userId, initialPrefs }: { userId: string; initialPrefs?: any }) {
  const [open, setOpen] = useState<null | "password" | "notif" | "theme">(null);
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-sm flex items-center gap-1">
        <Settings className="w-4 h-4" /> Cài đặt
      </h2>
      <div className="bg-card rounded-2xl shadow-sm divide-y">
        <SettingRow
          icon={<KeyRound className="w-4 h-4" />}
          label="Đổi mật khẩu"
          onClick={() => setOpen(open === "password" ? null : "password")}
          active={open === "password"}
        />
        {open === "password" && (
          <div className="p-3">
            <ChangePasswordForm onDone={() => setOpen(null)} />
          </div>
        )}
        <SettingRow
          icon={<Bell className="w-4 h-4" />}
          label="Thông báo"
          onClick={() => setOpen(open === "notif" ? null : "notif")}
          active={open === "notif"}
        />
        {open === "notif" && (
          <div className="p-3">
            <NotificationPrefsForm userId={userId} initial={initialPrefs} />
          </div>
        )}
        <SettingRow
          icon={<Moon className="w-4 h-4" />}
          label="Giao diện"
          onClick={() => setOpen(open === "theme" ? null : "theme")}
          active={open === "theme"}
        />
        {open === "theme" && (
          <div className="p-3">
            <ThemeToggle />
          </div>
        )}
      </div>
    </section>
  );
}

function SettingRow({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold text-left ${active ? "bg-accent" : ""}`}
    >
      {icon} <span className="flex-1">{label}</span>
      <span className="text-xs text-muted-foreground">{active ? "▲" : "▼"}</span>
    </button>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 6) {
      toast.error("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }
    if (next !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) throw new Error("Không xác định được tài khoản");
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInErr) {
        toast.error("Mật khẩu hiện tại không đúng");
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Đổi mật khẩu thành công");
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Mật khẩu hiện tại"
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="Mật khẩu mới (≥ 6 ký tự)"
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Xác nhận mật khẩu mới"
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
      >
        {busy ? "Đang xử lý…" : "Cập nhật mật khẩu"}
      </button>
    </div>
  );
}

function NotificationPrefsForm({ userId, initial }: { userId: string; initial?: any }) {
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT_PREFS, ...(initial || {}) });
  const [saving, setSaving] = useState(false);

  const toggle = async (key: keyof NotifPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_prefs: next as any })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      setPrefs(prefs);
      return;
    }
  };

  const items: { key: keyof NotifPrefs; label: string }[] = [
    { key: "messages", label: "Tin nhắn mới" },
    { key: "follows", label: "Người theo dõi mới" },
    { key: "deals", label: "Ưu đãi mới từ doanh nghiệp đang theo dõi" },
    { key: "admin", label: "Thông báo từ admin" },
  ];

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <label
          key={it.key}
          className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
        >
          <span className="text-sm flex-1">{it.label}</span>
          <button
            type="button"
            onClick={() => toggle(it.key)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${prefs[it.key] ? "bg-primary" : "bg-muted"}`}
            aria-pressed={prefs[it.key]}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${prefs[it.key] ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>
      ))}
      <p className="text-[11px] text-muted-foreground">Thay đổi sẽ áp dụng cho các thông báo mới.</p>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    // Đọc từ localStorage trước, fallback sang class hiện tại
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {}
    return document.documentElement.classList.contains("dark");
  });

  const apply = (v: boolean) => {
    setDark(v);
    if (v) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("theme", v ? "dark" : "light");
    } catch {}
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2">
      <span className="text-sm flex items-center gap-2">
        {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        Chế độ {dark ? "tối" : "sáng"}
      </span>
      <button
        type="button"
        onClick={() => apply(!dark)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${dark ? "bg-primary" : "bg-muted"}`}
        aria-pressed={dark}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${dark ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function BusinessCreator({
  ownerId,
  onCreated,
  hasExisting,
}: {
  ownerId: string;
  onCreated: () => void;
  hasExisting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("food");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [desc, setDesc] = useState("");
  const [hoursOpen, setHO] = useState("07:00");
  const [hoursClose, setHC] = useState("22:00");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fbUrl, setFb] = useState("");
  const [webUrl, setWeb] = useState("");
  const [tiktokUrl, setTiktok] = useState("");
  const [instagramUrl, setInstagram] = useState("");
  const [youtubeUrl, setYoutube] = useState("");
  const [offerText, setOfferText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên doanh nghiệp");
      return;
    }
    setSaving(true);
    try {
      let cover_url: string | null = null;
      if (coverFile) {
        cover_url = await uploadImage(coverFile, "covers");
      }
      const { data: newBiz, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: ownerId,
          name: name.trim(),
          type,
          phone: phone || null,
          address: address || null,
          description: desc || null,
          hours_open: hoursOpen,
          hours_close: hoursClose,
          cover_url,
          facebook_url: fbUrl || null,
          website_url: webUrl || null,
          tiktok_url: tiktokUrl || null,
          instagram_url: instagramUrl || null,
          youtube_url: youtubeUrl || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      if (offerText.trim() && newBiz) {
        await supabase.from("offers").insert({
          business_id: newBiz.id,
          title: offerText.trim(),
          status: "active",
        });
      }
      if (error) throw error;
      toast.success("Đã gửi hồ sơ doanh nghiệp. Đang chờ admin duyệt.");
      setOpen(false);
      setName("");
      setPhone("");
      setAddress("");
      setDesc("");
      setCoverFile(null);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Không thể tạo doanh nghiệp");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-semibold text-sm hover:bg-primary/5 transition"
      >
        + {hasExisting ? "Tạo thêm doanh nghiệp" : "Tạo hồ sơ doanh nghiệp"}
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Tạo hồ sơ doanh nghiệp mới</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          Hủy
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2">
        Sau khi tạo, doanh nghiệp sẽ ở trạng thái <b>Chờ duyệt</b> và chỉ hiển thị công khai sau khi admin phê duyệt.
      </p>
      <Field label="Tên doanh nghiệp *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Loại hình">
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-full text-xs border ${type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
            >
              {BUSINESS_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Giờ mở">
          <input
            type="time"
            value={hoursOpen}
            onChange={(e) => setHO(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
          />
        </Field>
        <Field label="Giờ đóng">
          <input
            type="time"
            value={hoursClose}
            onChange={(e) => setHC(e.target.value)}
            className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
          />
        </Field>
      </div>
      <Field label="SĐT">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Địa chỉ">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Mô tả">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label="Ảnh bìa (tuỳ chọn)">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs"
        />
      </Field>
      <button
        onClick={submit}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm disabled:opacity-50"
      >
        {saving ? "Đang gửi…" : "Gửi để duyệt"}
      </button>
    </div>
  );
}
