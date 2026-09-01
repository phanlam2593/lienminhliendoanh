import { useEffect, useRef, useState } from "react";
import { requestPushPermission, canInstallNatively, isIOSDevice, isStandalone, triggerInstall } from "@/lib/pwa";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BellRing } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { VNFlag, UKFlag } from "@/components/FlagIcons";
import type { Business, BusinessType, Offer } from "@/lib/types";
import { BUSINESS_TYPES, MEMBERSHIP_ENABLED } from "@/lib/types";
import { MembershipCard } from "@/components/MembershipCard";
import {
  LogOut,
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
  Star,
  Settings,
  KeyRound,
  Bell,
  Moon,
  Sun,
  ArrowLeft,
  User as UserIcon,
  Briefcase,
  ChevronRight,
  HelpCircle,
  Globe,
  Phone,
  Smartphone,
  Store,
  Lock,
  Ban,
  ShieldCheck,
  MoreVertical,
  MessageSquare,
  UserPlus,
} from "lucide-react";

import { uploadImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { BusinessPhotoManager } from "@/components/BusinessPhotoManager";
import { Avatar } from "@/components/Avatar";
import { MemberLevelBadge } from "@/components/MemberLevelBadge";
import { TierLegendDialog } from "@/components/TierLegendDialog";
import { FollowListDialog } from "@/components/FollowListDialog";
import { FriendsListDialog } from "@/components/FriendsListDialog";
import { WallComposer } from "@/components/WallComposer";
import { RegularBusinessesDialog } from "@/components/RegularBusinessesDialog";
import { BusinessRegularsPanel } from "@/components/BusinessRegularsPanel";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { timeAgo } from "@/lib/time";
type View = "menu" | "personal" | "business" | "settings";

export default function Profile() {
  const { user, profile, role, refresh, signOut } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [bio, setBio] = useState("");
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
  const [statusMsg, setSM] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [quickStatusOpen, setQuickStatusOpen] = useState(false);
  const [tierLegendOpen, setTierLegendOpen] = useState(false);
  const [quickStatusMsg, setQuickStatusMsg] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFN(profile?.full_name ?? "");
    setPh(profile?.phone ?? "");
    setE(profile?.email ?? "");
    setBio((profile as any)?.bio ?? "");
    setSM((profile as any)?.status_message ?? "");
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
    const { data } = await supabase.from("businesses").select("*").eq("owner_id", user.id).range(0, 4999);
    setBiz((data ?? []) as Business[]);
  };

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">{t("profile.notLoggedIn")}</p>
        <Link
          to="/auth/login"
          className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          {t("common.login")}
        </Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, email, bio: bio.trim() || null, status_message: statusMsg.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("common.saved"));
    refresh();
  };

  const saveQuickStatus = async () => {
    if (!user) return;
    setQuickSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ status_message: quickStatusMsg.trim() || null })
      .eq("id", user.id);
    setQuickSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("common.saved"));
    setQuickStatusOpen(false);
    setSM(quickStatusMsg);
    refresh();
  };

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const path = await uploadImage(file, "avatars", user.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      toast.success(t("profile.avatarUpdated"));
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const Header = (
    <>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
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
            aria-label={t("profile.changeAvatar")}
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
          <div className="text-xs text-muted-foreground">@{profile?.username}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge s={profile?.status} />
            {profile && (
              <button type="button" onClick={() => setTierLegendOpen(true)}>
                <MemberLevelBadge points={(profile as any).points ?? 0} isAdmin={role === "admin"} />
              </button>
            )}
          </div>
          {uploadingAvatar && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{t("profile.uploadingImage")}</div>
          )}
        </div>
      </div>
      <TierLegendDialog open={tierLegendOpen} onOpenChange={setTierLegendOpen} points={(profile as any)?.points ?? 0} />
      <button
        type="button"
        onClick={() => {
          setQuickStatusMsg((profile as any)?.status_message ?? "");
          setQuickStatusOpen(true);
        }}
        className="mt-2 block text-left w-full"
      >
        {(profile as any)?.status_message ? (
          <div className="inline-block max-w-full px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm">
            <span className="text-xs text-primary font-semibold line-clamp-2">{(profile as any).status_message}</span>
          </div>
        ) : (
          <div className="inline-block px-3 py-1.5 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
            + {t("profile.addStatusLine")}
          </div>
        )}
        {(profile as any)?.bio && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{(profile as any).bio}</p>
        )}
      </button>
      <Dialog open={quickStatusOpen} onOpenChange={setQuickStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("profile.statusLine")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <textarea
              value={quickStatusMsg}
              onChange={(e) => setQuickStatusMsg(e.target.value.slice(0, 150))}
              placeholder={t("profile.statusPlaceholder")}
              rows={3}
              maxLength={150}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none"
            />
            <div className="text-[10px] text-muted-foreground text-right">{quickStatusMsg.length}/150</div>
            <button
              onClick={saveQuickStatus}
              disabled={quickSaving}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
            >
              {quickSaving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  const BackBar = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setView("menu")}
        className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
        aria-label={t("common.back")}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="font-bold text-base">{title}</h1>
    </div>
  );

  if (view === "personal") {
    return (
      <div className="p-4 space-y-5">
        <BackBar title={t("profile.personal")} />
        {Header}
        {(MEMBERSHIP_ENABLED || role === "admin") && (
          <MembershipCard
            points={(profile as any)?.points ?? 0}
            isMember={(profile as any)?.is_member ?? false}
            expiresAt={(profile as any)?.membership_expires_at ?? null}
          />
        )}
        <section className="space-y-2 bg-card rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-sm">{t("profile.personalInfo")}</h2>
          <input
            value={fullName}
            onChange={(e) => setFN(e.target.value)}
            placeholder={t("profile.fullName")}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <input
            value={email}
            onChange={(e) => setE(e.target.value)}
            placeholder={t("profile.email")}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPh(e.target.value)}
            placeholder={t("profile.phone")}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <Field label={t("profile.bioLabel")} hint={t("profile.bioHint")}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              rows={3}
              placeholder={t("profile.bioPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none"
            />
          </Field>
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
          >
            {saving ? t("common.loading") : t("profile.saveChanges")}
          </button>
        </section>
      </div>
    );
  }

  if (view === "business") {
    const editBizId = searchParams.get("edit");
    return (
      <div className="p-4 space-y-5">
        <BackBar title={t("profile.business")} />
        {biz.length === 0 ? (
          <div className="p-4 bg-card rounded-2xl text-center text-sm text-muted-foreground">
            {t("profile.noBusiness")}
          </div>
        ) : (
          <section className="space-y-3">
            {biz.map((b) => (
              <BusinessEditor
                key={b.id}
                biz={b}
                onSaved={loadBiz}
                initialOpen={b.id === editBizId}
                isMember={(profile as any)?.is_member ?? false}
              />
            ))}
          </section>
        )}
        <BusinessCreator
          ownerId={user.id}
          onCreated={loadBiz}
          hasExisting={biz.length > 0}
          isMember={(profile as any)?.is_member ?? false}
        />
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="p-4 space-y-5">
        <BackBar title={t("profile.settings")} />
        <SettingsSection userId={user.id} initialPrefs={(profile as any)?.notification_prefs} onPrefsSaved={refresh} />
      </div>
    );
  }

  // Default: menu view — trang cá nhân kiểu Facebook/Zalo
  return (
    <div className="pb-5">
      <div className="relative">
        <div className="h-28 bg-gradient-brand rounded-b-2xl" />
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white grid place-items-center backdrop-blur-sm"
              aria-label={t("profile.settings")}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="end">
            <MenuRow
              icon={<UserIcon className="w-4 h-4" />}
              label={t("profile.personal")}
              onClick={() => {
                setMenuOpen(false);
                setView("personal");
              }}
            />
            <MenuRow
              icon={<Briefcase className="w-4 h-4" />}
              label={biz.length > 0 ? t("profile.business") : t("profile.createBusiness")}
              onClick={() => {
                setMenuOpen(false);
                setView("business");
              }}
            />
            <MenuRow
              icon={<HelpCircle className="w-4 h-4" />}
              label={t("profile.guide")}
              onClick={() => {
                setMenuOpen(false);
                nav("/huong-dan");
              }}
            />
            <MenuRow
              icon={<Flag className="w-4 h-4" />}
              label={t("profile.myReports")}
              onClick={() => {
                setMenuOpen(false);
                nav("/bao-cao-cua-toi");
              }}
            />
            <MenuRow
              icon={<Phone className="w-4 h-4" />}
              label={t("settings.help")}
              onClick={() => {
                setMenuOpen(false);
                setHelpOpen(true);
              }}
            />
            <MenuRow
              icon={<Settings className="w-4 h-4" />}
              label={t("profile.settings")}
              onClick={() => {
                setMenuOpen(false);
                setView("settings");
              }}
            />
            <MenuRow
              icon={<LogOut className="w-4 h-4" />}
              label={t("common.logout")}
              danger
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
                nav("/");
              }}
            />
          </PopoverContent>
        </Popover>
        <div className="px-5 -mt-10 flex flex-col items-center text-center gap-2">
          <div className="relative ring-4 ring-background rounded-full">
            <Avatar
              path={profile?.avatar_url}
              name={profile?.full_name || profile?.username}
              size={88}
              onClick={() => avatarInput.current?.click()}
            />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-brand"
              aria-label={t("profile.changeAvatar")}
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
          <div>
            <div className="text-lg font-extrabold">{profile?.full_name}</div>
            <div className="text-xs text-muted-foreground">@{profile?.username}</div>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <StatusBadge s={profile?.status} />
              {profile && (
                <button type="button" onClick={() => setTierLegendOpen(true)}>
                  <MemberLevelBadge points={(profile as any).points ?? 0} isAdmin={role === "admin"} />
                </button>
              )}
            </div>
            {uploadingAvatar && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{t("profile.uploadingImage")}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setQuickStatusMsg((profile as any)?.status_message ?? "");
              setQuickStatusOpen(true);
            }}
            className="block text-center w-full"
          >
            {(profile as any)?.status_message ? (
              <div className="inline-block max-w-full px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm">
                <span className="text-xs text-primary font-semibold line-clamp-2">
                  {(profile as any).status_message}
                </span>
              </div>
            ) : (
              <div className="inline-block px-3 py-1.5 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                + {t("profile.addStatusLine")}
              </div>
            )}
            {(profile as any)?.bio && (
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto whitespace-pre-wrap">
                {(profile as any).bio}
              </p>
            )}
          </button>
        </div>
      </div>
      <TierLegendDialog open={tierLegendOpen} onOpenChange={setTierLegendOpen} points={(profile as any)?.points ?? 0} />
      <Dialog open={quickStatusOpen} onOpenChange={setQuickStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("profile.statusLine")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <textarea
              value={quickStatusMsg}
              onChange={(e) => setQuickStatusMsg(e.target.value.slice(0, 150))}
              placeholder={t("profile.statusPlaceholder")}
              rows={3}
              maxLength={150}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none"
            />
            <div className="text-[10px] text-muted-foreground text-right">{quickStatusMsg.length}/150</div>
            <button
              onClick={saveQuickStatus}
              disabled={quickSaving}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm"
            >
              {quickSaving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-4 mt-4">
        <FollowStats userId={user.id} />
      </div>

      <div className="px-4 mt-5">
        <OwnWall userId={user.id} />
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.help")}</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2.5">
            <p className="font-semibold text-muted-foreground">{t("settings.contactAdmin")}</p>
            <p>
              Email:{" "}
              <a href="mailto:lienminhliendoanh@gmail.com" className="text-primary font-semibold">
                lienminhliendoanh@gmail.com
              </a>
            </p>
            <p>
              Zalo:{" "}
              <a
                href="https://zalo.me/0339565246"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold"
              >
                0339565246
              </a>
            </p>
            <p>
              Facebook:{" "}
              <a
                href="https://www.facebook.com/profile.php?id=61590228346408"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold"
              >
                {t("app.name")}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
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

function BusinessEditor({
  biz,
  onSaved,
  initialOpen,
  isMember,
}: {
  biz: Business;
  onSaved: () => void;
  initialOpen?: boolean;
  isMember: boolean;
}) {
  const { t } = useLanguage();
  const navMembership = useNavigate();
  const [name, setName] = useState(biz.name);
  const [type, setType] = useState<BusinessType>(biz.type);
  const [stats, setStats] = useState({ reviews: 0, followers: 0, regulars: 0 });
  const [pin, setPin] = useState("");
  const [pinLoaded, setPinLoaded] = useState(false);
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [open_, setOpen_] = useState(biz.hours_open?.slice(0, 5) || "07:00");
  const [close_, setClose_] = useState(biz.hours_close?.slice(0, 5) || "22:00");
  const [isOnline, setIsOnline] = useState(biz.is_online ?? false);
  const [desc, setDesc] = useState(biz.description || "");
  const [fb, setFb] = useState(biz.facebook_url || "");
  const [web, setWeb] = useState(biz.website_url || "");
  const [tiktok, setTiktok] = useState(biz.tiktok_url || "");
  const [instagram, setInstagram] = useState(biz.instagram_url || "");
  const [youtube, setYoutube] = useState(biz.youtube_url || "");
  const [phone, setPhone] = useState(biz.phone || "");
  const [address, setAddress] = useState(biz.address || "");
  const [lat, setLat] = useState<number | null>(biz.latitude ?? null);
  const [lng, setLng] = useState<number | null>(biz.longitude ?? null);
  const [locating, setLocating] = useState(false);
  const [cover, setCover] = useState(biz.cover_url);
  const [offerText, setOfferText] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(!!initialOpen);
  const [regularsOpen, setRegularsOpen] = useState(false);

  const reloadOffers = async () => {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .range(0, 4999);
    setOffers((data ?? []) as Offer[]);
  };

  useEffect(() => {
    void reloadOffers();
    void (async () => {
      const [{ count: rv }, { count: fl }, { count: rg }, { data: pinRow }] = await Promise.all([
        supabase.from("reviews").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_business_id", biz.id),
        supabase.from("business_regulars").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
        supabase.from("business_pins").select("pin").eq("business_id", biz.id).maybeSingle(),
      ]);
      setStats({ reviews: rv ?? 0, followers: fl ?? 0, regulars: rg ?? 0 });
      setPin((pinRow as any)?.pin ?? "");
      setPinLoaded(true);
    })();
  }, [biz.id]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("bizForm.geoUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success(t("bizForm.geoGot"));
      },
      () => {
        setLocating(false);
        toast.error(t("bizForm.geoFail"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    if (!/^[A-Za-z0-9]{4,8}$/.test(pin)) {
      setPinError(true);
      toast.error(t("bizForm.pinRequired"));
      pinInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      pinInputRef.current?.focus();
      return;
    }
    setPinError(false);
    setSaving(true);
    const wasRejected = biz.status === "rejected";
    const [{ error }, { error: pinError }] = await Promise.all([
      supabase
        .from("businesses")
        .update({
          name,
          type,
          is_online: isOnline,
          hours_open: isOnline ? null : open_,
          hours_close: isOnline ? null : close_,
          description: desc,
          facebook_url: fb || null,
          website_url: web || null,
          tiktok_url: tiktok || null,
          instagram_url: instagram || null,
          youtube_url: youtube || null,
          phone: phone || null,
          address: address || null,
          latitude: lat,
          longitude: lng,
          ...(wasRejected ? { status: "pending", admin_note: null } : {}),
        })
        .eq("id", biz.id),
      supabase.from("business_pins").upsert({ business_id: biz.id, pin, updated_at: new Date().toISOString() }),
    ]);
    setSaving(false);
    if (error || pinError) {
      toast.error((error || pinError)?.message ?? t("common.errorOccurred"));
      return;
    }
    toast.success(wasRejected ? t("bizForm.savedResubmitted") : t("bizForm.saved"));
    onSaved();
  };
  const onCover = async (file: File) => {
    try {
      const path = await uploadImage(file, "covers");
      setCover(path);
      await supabase.from("businesses").update({ cover_url: path }).eq("id", biz.id);
      toast.success(t("bizForm.coverUpdated"));
    } catch (e: any) {
      toast.error(e.message);
    }
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
    toast.success(t("offerRow.added"));
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Header — luôn hiện */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          <StoredImage path={cover} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Link to={`/dn/${biz.id}`} className="font-semibold text-sm truncate">
              {name}
            </Link>
            <StatusBadge s={biz.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Star className="w-3 h-3 text-primary" /> {stats.reviews}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <Users className="w-3 h-3 text-primary" /> {stats.followers}
            </span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setRegularsOpen(true)}
              className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
            >
              <UserCheck className="w-3 h-3" /> {t("bizForm.regularsCount", { n: stats.regulars })}
            </button>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0"
        >
          {open ? t("common.collapse") : t("common.edit")}
        </button>
      </div>

      <Dialog open={regularsOpen} onOpenChange={setRegularsOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("regularsPanel.tierLoyal")}</DialogTitle>
          </DialogHeader>
          <BusinessRegularsPanel businessId={biz.id} />
        </DialogContent>
      </Dialog>

      {/* Form — chỉ hiện khi open */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {biz.status === "rejected" && biz.admin_note && (
            <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg p-3 space-y-1 border border-amber-200 dark:border-amber-900">
              <div className="font-bold">{t("bizForm.adminNoteTitle")}</div>
              <div>{biz.admin_note}</div>
              <div className="text-[10px] opacity-80">{t("bizForm.adminNoteHint")}</div>
            </div>
          )}
          <div className="relative">
            <div className="w-full h-32 rounded-xl overflow-hidden bg-muted">
              <StoredImage path={cover} alt={name} className="w-full h-full object-cover" />
            </div>
            <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded cursor-pointer">
              {t("bizForm.changeCover")}
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
          <BusinessPhotoManager businessId={biz.id} />

          <Field label={t("bizForm.nameLabel")} hint={t("bizForm.nameHint")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </Field>
          <Field label={t("bizForm.type")}>
            <div className="flex flex-wrap gap-1.5">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => setType(bt)}
                  className={`px-2.5 py-1 rounded-full text-xs border ${type === bt ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
                >
                  {t(`type.${bt}`)}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-accent/50 cursor-pointer">
            <span className="text-xs font-semibold">{t("online.toggleLabel")}</span>
            <button
              type="button"
              onClick={() => setIsOnline((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${isOnline ? "bg-primary" : "bg-muted"}`}
              aria-pressed={isOnline}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${isOnline ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>
          {!isOnline && (
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("bizForm.openLabel")} hint={t("bizForm.openHint")}>
                <input
                  type="time"
                  value={open_}
                  onChange={(e) => setOpen_(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
                />
              </Field>
              <Field label={t("bizForm.closeLabel")} hint={t("bizForm.closeHint")}>
                <input
                  type="time"
                  value={close_}
                  onChange={(e) => setClose_(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
                />
              </Field>
            </div>
          )}
          <Field label={t("bizForm.descLabel")}>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("bizForm.phoneLabel")}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </Field>
            <Field label={t("bizForm.addressLabel")}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </Field>
          </div>
          <Field label={t("bizForm.pinLabel")} hint={t("bizForm.pinHint")}>
            <input
              ref={pinInputRef}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8));
                setPinError(false);
              }}
              placeholder={pinLoaded && !pin ? t("bizForm.pinNotSet") : t("bizForm.pinExample")}
              maxLength={8}
              className={`w-full px-3 py-2 rounded-lg border bg-background text-sm tracking-[0.15em] font-mono ${
                pinError ? "border-destructive ring-2 ring-destructive/30" : ""
              }`}
            />
          </Field>
          {!isOnline && (
            <>
              {!lat && (
                <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg p-2.5">
                  {t("bizForm.mapBanner")}
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  📍 {locating ? t("bizForm.locating") : lat ? t("bizForm.locationPinned") : t("bizForm.pinLocation")}
                </button>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Facebook">
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="TikTok">
              <input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </Field>
            <Field label="Instagram">
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
            </Field>
          </div>
          <Field label="YouTube">
            <input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </Field>
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
          >
            <Save className="w-4 h-4" /> {saving ? t("common.saving") : t("bizForm.saveBusiness")}
          </button>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">{t("bizForm.offersSection")}</div>
            {offers.map((o) => (
              <OfferRow key={o.id} offer={o} onChanged={reloadOffers} />
            ))}
            {isMember ? (
              <div className="flex gap-2">
                <input
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder={t("bizForm.newOfferPlaceholder")}
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <button
                  onClick={addOffer}
                  className="px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {t("install.add")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navMembership("/ho-so?view=personal")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-left"
              >
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">{t("bizForm.offerMembershipRequired")}</span>
                <span className="text-xs font-semibold text-primary shrink-0">{t("bizForm.offerMembershipCta")}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferRow({ offer, onChanged }: { offer: Offer; onChanged: () => void }) {
  const { t } = useLanguage();
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
    toast.success(t("offerRow.saved"));
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
    toast.success(next === "active" ? t("offerRow.shown") : t("offerRow.hidden"));
    onChanged();
  };

  const remove = async () => {
    const { error } = await supabase.from("offers").delete().eq("id", offer.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("offerRow.deleted"));
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
    toast.success(t("offerRow.broadcastSent", { n: data ?? 0 }));
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
          placeholder={t("offerRow.descPlaceholder")}
          className="w-full px-2 py-1.5 rounded border bg-background text-xs"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold"
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setTitle(offer.title);
              setDesc(offer.description ?? "");
            }}
            className="flex-1 py-1.5 rounded border text-xs font-semibold"
          >
            {t("common.cancel")}
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
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {t("offerRow.claimsShort", { n: offer.claim_count ?? 0 })}
        </span>
      </div>
      {offer.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{offer.description}</div>}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setEditing(true)}
          className="px-2 py-1 rounded bg-card border text-[11px] font-semibold inline-flex items-center gap-1"
        >
          <Pencil className="w-3 h-3" /> {t("common.editShort")}
        </button>
        <button
          onClick={toggleStatus}
          className="px-2 py-1 rounded bg-card border text-[11px] font-semibold inline-flex items-center gap-1"
        >
          {offer.status === "active" ? (
            <>
              <EyeOff className="w-3 h-3" /> {t("offerRow.hide")}
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" /> {t("offerRow.show")}
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
              <Send className="w-3 h-3" /> {t("offerRow.broadcast")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("offerRow.broadcastTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("offerRow.broadcastDesc", { title: offer.title })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={broadcast}>{t("offerRow.sendNow")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirm dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="px-2 py-1 rounded bg-card border text-destructive text-[11px] font-semibold inline-flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> {t("common.delete")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("offerRow.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("offerRow.deleteDesc", { title: offer.title })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function FollowStats({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [regulars, setRegulars] = useState(0);
  const [open, setOpen] = useState<null | "followers" | "following" | "regulars">(null);

  const loadCounts = async () => {
    const [{ count: fc }, { count: gc }, { data: regRows }, { data: followBizRows }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", userId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)
        .not("followee_user_id", "is", null),
      supabase.from("business_regulars").select("business_id").eq("member_id", userId),
      supabase
        .from("follows")
        .select("followee_business_id")
        .eq("follower_id", userId)
        .not("followee_business_id", "is", null),
    ]);
    setFollowers(fc ?? 0);
    setFollowing(gc ?? 0);
    // Đếm gộp DN đã claim (business_regulars) + DN đang follow chưa claim, khớp với
    // danh sách thật sự hiện trong RegularBusinessesDialog.
    const regularIds = new Set([
      ...(regRows ?? []).map((r: any) => r.business_id),
      ...(followBizRows ?? []).map((r: any) => r.followee_business_id),
    ]);
    setRegulars(regularIds.size);
  };

  useEffect(() => {
    void loadCounts();
  }, [userId]);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setOpen("followers")}
          className="bg-card rounded-xl py-3 px-1 flex flex-col items-center gap-1 shadow-sm hover:bg-accent transition"
        >
          <span className="w-6 h-6 rounded-full bg-primary/10 grid place-items-center">
            <Users className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="text-base font-extrabold text-primary leading-none">{followers}</div>
          <div className="text-[11px] font-semibold text-muted-foreground leading-tight text-center">
            {t("profile.followers")}
          </div>
        </button>
        <button
          onClick={() => setOpen("following")}
          className="bg-card rounded-xl py-3 px-1 flex flex-col items-center gap-1 shadow-sm hover:bg-accent transition"
        >
          <span className="w-6 h-6 rounded-full bg-primary/10 grid place-items-center">
            <UserCheck className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="text-base font-extrabold text-primary leading-none">{following}</div>
          <div className="text-[11px] font-semibold text-muted-foreground leading-tight text-center">
            {t("messages.followingHeader")}
          </div>
        </button>
        <button
          onClick={() => setOpen("regulars")}
          className="bg-card rounded-xl py-3 px-1 flex flex-col items-center gap-1 shadow-sm hover:bg-accent transition"
        >
          <span className="w-6 h-6 rounded-full bg-primary/10 grid place-items-center">
            <Store className="w-3.5 h-3.5 text-primary" />
          </span>
          <div className="text-base font-extrabold text-primary leading-none">{regulars}</div>
          <div className="text-[11px] font-semibold text-muted-foreground leading-tight text-center">
            {t("regulars.title")}
          </div>
        </button>
      </div>
      <FollowListDialog
        open={open === "followers" || open === "following"}
        onOpenChange={(v) => !v && setOpen(null)}
        target={{ kind: "user", id: userId }}
        mode={open === "following" ? "following" : "followers"}
        onFollowChange={loadCounts}
      />
      <RegularBusinessesDialog userId={userId} open={open === "regulars"} onOpenChange={(v) => !v && setOpen(null)} />
    </>
  );
}

function OwnWall({ userId }: { userId: string }) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<"posts" | "reviews">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: postRows }, { data: reviewRows }] = await Promise.all([
        supabase
          .from("community_messages")
          .select("id, content, type, image_url, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("reviews")
          .select("id, rating, comment, image_url, created_at, businesses(id, name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setPosts(postRows ?? []);
      setReviews((reviewRows ?? []) as any);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div>
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "posts" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> {t("wall.posts")}
        </button>
        <button
          onClick={() => setTab("reviews")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "reviews" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          <Star className="w-3.5 h-3.5" /> {t("wall.reviews")}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-center text-xs text-muted-foreground py-8">{t("common.loading")}</p>
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">{t("wall.noPosts")}</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-card rounded-2xl p-3 shadow-sm space-y-1.5">
                <div className="text-[11px] text-muted-foreground">{timeAgo(post.created_at, lang)}</div>
                {post.type === "gif" ? (
                  <img src={post.content} alt="GIF" className="max-w-[180px] rounded-xl" loading="lazy" />
                ) : post.type === "image" ? (
                  <StoredImage path={post.image_url} alt={t("chat.imageAlt")} className="max-w-[220px] rounded-xl" />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                )}
              </div>
            ))
          )
        ) : reviews.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">{t("wall.noReviews")}</p>
        ) : (
          reviews.map((rv) => (
            <div key={rv.id} className="bg-card rounded-2xl p-3 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                {rv.businesses ? (
                  <Link to={`/dn/${rv.businesses.id}`} className="text-sm font-semibold hover:text-primary truncate">
                    🏢 {rv.businesses.name}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">{t("reports.contentDeleted")}</span>
                )}
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < rv.rating ? "fill-primary text-primary" : "text-muted"}`}
                    />
                  ))}
                </div>
              </div>
              {rv.comment && <p className="text-sm text-muted-foreground">{rv.comment}</p>}
              {rv.image_url && (
                <StoredImage path={rv.image_url} alt={t("biz.reviewImageAlt")} className="max-w-[200px] rounded-xl" />
              )}
              <div className="text-[11px] text-muted-foreground">{timeAgo(rv.created_at, lang)}</div>
            </div>
          ))
        )}
      </div>
    </div>
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
  const { t } = useLanguage();
  if (!s || s === "approved") return null;
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const lbl: Record<string, string> = {
    pending: t("status.pending"),
    approved: t("status.approved"),
    rejected: t("status.rejected"),
  };
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${map[s] || "bg-muted"}`}>
      {lbl[s] || s}
    </span>
  );
}

type NotifPrefs = {
  messages: boolean;
  follows: boolean;
  deals: boolean;
  regulars: boolean;
  mentions: boolean;
  admin: boolean;
};
const DEFAULT_PREFS: NotifPrefs = {
  messages: true,
  follows: true,
  deals: true,
  regulars: true,
  mentions: true,
  admin: true,
};
function SettingsSection({
  userId,
  initialPrefs,
  onPrefsSaved,
}: {
  userId: string;
  initialPrefs?: any;
  onPrefsSaved?: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState<null | "password" | "notif" | "install" | "theme" | "lang" | "blocked">(null);
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-sm flex items-center gap-1">
        <Settings className="w-4 h-4" /> {t("profile.settings")}
      </h2>
      <div className="bg-card rounded-2xl shadow-sm divide-y">
        <SettingRow
          icon={<KeyRound className="w-4 h-4" />}
          label={t("settings.changePassword")}
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
          label={t("settings.notifications")}
          onClick={() => setOpen(open === "notif" ? null : "notif")}
          active={open === "notif"}
        />
        {open === "notif" && (
          <div className="p-3 space-y-3">
            <PushPermissionButton />
            <NotificationPrefsForm userId={userId} initial={initialPrefs} onSaved={onPrefsSaved} />
          </div>
        )}
        <SettingRow
          icon={<Smartphone className="w-4 h-4" />}
          label={t("settings.installApp")}
          onClick={() => setOpen(open === "install" ? null : "install")}
          active={open === "install"}
        />
        {open === "install" && (
          <div className="p-3">
            <InstallAppButton />
          </div>
        )}
        <SettingRow
          icon={<Moon className="w-4 h-4" />}
          label={t("settings.theme")}
          onClick={() => setOpen(open === "theme" ? null : "theme")}
          active={open === "theme"}
        />
        {open === "theme" && (
          <div className="p-3">
            <ThemeToggle />
          </div>
        )}
        <SettingRow
          icon={<Globe className="w-4 h-4" />}
          label="Ngôn ngữ / Language"
          onClick={() => setOpen(open === "lang" ? null : "lang")}
          active={open === "lang"}
        />
        {open === "lang" && (
          <div className="p-3">
            <LanguageToggle />
          </div>
        )}
        <SettingRow
          icon={<Ban className="w-4 h-4" />}
          label={t("block.blockedUsers")}
          onClick={() => setOpen(open === "blocked" ? null : "blocked")}
          active={open === "blocked"}
        />
        {open === "blocked" && (
          <div className="p-3">
            <BlockedUsersList />
          </div>
        )}
      </div>
    </section>
  );
}

function BlockedUsersList() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; full_name: string; username: string; avatar_url: string | null }[]>(
    [],
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_blocked_users");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setUsers((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const unblock = async (id: string) => {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", (await supabase.auth.getUser()).data.user?.id)
      .eq("blocked_id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success(t("block.unblocked"));
  };

  if (loading) return <p className="text-xs text-center text-muted-foreground py-4">{t("common.loading")}</p>;
  if (users.length === 0)
    return <p className="text-xs text-center text-muted-foreground py-4">{t("block.noBlockedUsers")}</p>;

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-2 p-2 bg-accent/50 rounded-xl">
          <Avatar path={u.avatar_url} name={u.full_name} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{u.full_name}</div>
            <div className="text-[11px] text-muted-foreground truncate">@{u.username}</div>
          </div>
          <button
            onClick={() => unblock(u.id)}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> {t("block.unblock")}
          </button>
        </div>
      ))}
    </div>
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
  const { t } = useLanguage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 6) {
      toast.error(t("settings.pwTooShort"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("register.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email;
      if (!email) throw new Error(t("settings.pwNoAccount"));
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInErr) {
        toast.error(t("settings.pwWrongCurrent"));
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success(t("settings.pwChangeSuccess"));
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone();
    } catch (e: any) {
      toast.error(e.message || t("common.genericError"));
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
        placeholder={t("settings.currentPassword")}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder={t("settings.newPassword")}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t("settings.confirmNewPassword")}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
      >
        {busy ? t("terms.processing") : t("settings.updatePassword")}
      </button>
    </div>
  );
}

function NotificationPrefsForm({ userId, initial, onSaved }: { userId: string; initial?: any; onSaved?: () => void }) {
  const { t } = useLanguage();
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
    onSaved?.();
  };

  const items: { key: keyof NotifPrefs; label: string }[] = [
    { key: "messages", label: t("notifPrefs.newMessages") },
    { key: "follows", label: t("notifPrefs.newFollowers") },
    { key: "deals", label: t("notifPrefs.newDeals") },
    { key: "regulars", label: t("notifPrefs.regularsActivity") },
    { key: "mentions", label: t("notifPrefs.mentions") },
    { key: "admin", label: t("notifPrefs.adminNotif") },
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
      <p className="text-[11px] text-muted-foreground">{t("notifPrefs.footer")}</p>
    </div>
  );
}

function ThemeToggle() {
  const { t } = useLanguage();
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
        {dark ? t("theme.darkMode") : t("theme.lightMode")}
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

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-3 p-2">
      <span className="text-sm flex items-center gap-2">
        <Globe className="w-4 h-4" /> {lang === "vi" ? "Ngôn ngữ khung app" : "App interface language"}
      </span>
      <div className="flex rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => setLang("vi")}
          className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${lang === "vi" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
        >
          <VNFlag /> Tiếng Việt
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
        >
          <UKFlag /> English
        </button>
      </div>
    </div>
  );
}

function BusinessCreator({
  ownerId,
  onCreated,
  hasExisting,
  isMember,
}: {
  ownerId: string;
  onCreated: () => void;
  hasExisting: boolean;
  isMember: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("food");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [desc, setDesc] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [hoursOpen, setHO] = useState("07:00");
  const [hoursClose, setHC] = useState("22:00");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fbUrl, setFb] = useState("");
  const [webUrl, setWeb] = useState("");
  const [tiktokUrl, setTiktok] = useState("");
  const [instagramUrl, setInstagram] = useState("");
  const [youtubeUrl, setYoutube] = useState("");
  const [offerText, setOfferText] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("bizCreator.locationUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success(t("bizCreator.locationSuccess"));
      },
      () => {
        setLocating(false);
        toast.error(t("bizCreator.locationFail"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error(t("bizCreator.nameRequired"));
      return;
    }
    if (!/^[A-Za-z0-9]{4,8}$/.test(pin)) {
      toast.error(t("bizCreator.pinRequired"));
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
          latitude: lat,
          longitude: lng,
          description: desc || null,
          is_online: isOnline,
          hours_open: isOnline ? null : hoursOpen,
          hours_close: isOnline ? null : hoursClose,
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
      if (newBiz) {
        const { error: pinError } = await supabase.from("business_pins").insert({ business_id: newBiz.id, pin });
        if (pinError) throw pinError;
      }
      if (offerText.trim() && newBiz) {
        await supabase.from("offers").insert({
          business_id: newBiz.id,
          title: offerText.trim(),
          status: "active",
        });
      }
      toast.success(t("bizCreator.submitSuccess"));
      setOpen(false);
      setName("");
      setPhone("");
      setAddress("");
      setDesc("");
      setPin("");
      setCoverFile(null);
      setIsOnline(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? t("bizCreator.submitFail"));
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
        + {hasExisting ? t("bizCreator.addMore") : t("profile.createBusiness")}
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">{t("bizCreator.createNew")}</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          {t("common.cancel")}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2">
        {t("bizCreator.pendingPre")}
        <b>{t("bizCreator.pendingBold")}</b>
        {t("bizCreator.pendingPost")}
      </p>
      <Field label={t("bizForm.name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizForm.type")}>
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt}
              type="button"
              onClick={() => setType(bt)}
              className={`px-2.5 py-1 rounded-full text-xs border ${type === bt ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
            >
              {t(`type.${bt}`)}
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-accent/50 cursor-pointer">
        <span className="text-xs font-semibold">{t("online.toggleLabel")}</span>
        <button
          type="button"
          onClick={() => setIsOnline((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${isOnline ? "bg-primary" : "bg-muted"}`}
          aria-pressed={isOnline}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${isOnline ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </label>
      {!isOnline && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("bizForm.openTime")}>
            <input
              type="time"
              value={hoursOpen}
              onChange={(e) => setHO(e.target.value)}
              className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
            />
          </Field>
          <Field label={t("bizForm.closeTime")}>
            <input
              type="time"
              value={hoursClose}
              onChange={(e) => setHC(e.target.value)}
              className="w-full px-2 py-2 rounded-lg border bg-background text-sm"
            />
          </Field>
        </div>
      )}
      <Field label={t("profile.phone")}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("common.address")}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizCreator.pinLabelRequired")} hint={t("bizCreator.pinHint")}>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8))}
          placeholder="quan1234"
          maxLength={8}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm tracking-[0.15em] font-mono"
        />
      </Field>
      {!isOnline && (
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          📍 {locating ? t("bizCreator.locating") : lat ? t("bizCreator.locationPinned") : t("bizCreator.pinLocation")}
        </button>
      )}
      <Field label={t("bizForm.desc")}>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      {isMember ? (
        <Field label={t("bizCreator.offerLabel")} hint={t("bizCreator.offerHint2")}>
          <input
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
        </Field>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5">
          <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="text-xs text-muted-foreground">{t("bizForm.offerMembershipRequired")}</span>
        </div>
      )}
      <Field label={t("bizForm.facebook")}>
        <input
          value={fbUrl}
          onChange={(e) => setFb(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizForm.website")}>
        <input
          value={webUrl}
          onChange={(e) => setWeb(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizForm.tiktok")}>
        <input
          value={tiktokUrl}
          onChange={(e) => setTiktok(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizForm.instagram")}>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagram(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizForm.youtube")}>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutube(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        />
      </Field>
      <Field label={t("bizCreator.cover")}>
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
        {saving ? t("bizCreator.submitting") : t("bizCreator.submitForApproval")}
      </button>
    </div>
  );
}

function PushPermissionButton() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<NotificationPermission | "unsupported" | "checking">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setStatus("unsupported");
    } else {
      setStatus(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    const result = await requestPushPermission();
    setStatus(result);
    setBusy(false);
    if (result === "denied") toast.error(t("settings.pushDenied"));
    // Toast thành công/lỗi thực sự của việc đăng ký đã được hiện từ bên trong requestPushPermission()
  };

  if (status === "unsupported") return null;
  if (status === "granted") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
          <BellRing className="w-4 h-4" /> {t("push.enabled")}
        </div>
        <button
          onClick={handleEnable}
          disabled={busy}
          className="w-full py-2 rounded-lg border text-xs font-semibold text-muted-foreground disabled:opacity-50"
        >
          {busy ? t("push.resyncing") : t("push.resync")}
        </button>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
        {t("push.blocked")}
      </div>
    );
  }
  return (
    <button
      onClick={handleEnable}
      disabled={busy || status === "checking"}
      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
    >
      <BellRing className="w-4 h-4" /> {busy ? t("push.enabling") : t("push.enable")}
    </button>
  );
}

function InstallAppButton() {
  const { t } = useLanguage();
  const [installable, setInstallable] = useState(canInstallNatively());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onChange = () => setInstallable(canInstallNatively());
    window.addEventListener("lmld:install-available", onChange);
    return () => window.removeEventListener("lmld:install-available", onChange);
  }, []);

  if (isStandalone()) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
        <Smartphone className="w-4 h-4" /> {t("settings.installedAlready")}
      </div>
    );
  }

  if (installable) {
    return (
      <button
        onClick={async () => {
          setBusy(true);
          const accepted = await triggerInstall();
          setBusy(false);
          setInstallable(canInstallNatively());
          if (accepted) toast.success(t("settings.installSuccess"));
        }}
        disabled={busy}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Smartphone className="w-4 h-4" /> {busy ? t("settings.installOpening") : t("settings.installApp")}
      </button>
    );
  }

  if (isIOSDevice()) {
    return (
      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
        {t("settings.installIOSPre")}
        <b>{t("settings.installIOSShare")}</b>
        {t("settings.installIOSMid")}
        <b>{t("settings.installIOSAdd")}</b>
        {t("settings.installIOSPost")}
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-lg bg-muted text-muted-foreground text-xs">{t("settings.installUnsupported")}</div>
  );
}
