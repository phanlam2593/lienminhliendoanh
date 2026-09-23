import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  Search,
  Users,
  Settings,
  Mail,
  Phone,
  Facebook,
  Clock,
  Tag,
  MessageCircle,
  Building2,
  Flame,
  User,
  Briefcase,
  HelpCircle,
  Flag,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { initInstallPrompt, triggerInstall, dismissInstallBanner } from "@/lib/pwa";
import { Download, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { WelcomeOverlay } from "./WelcomeOverlay";
import { WelcomeOnboarding } from "./WelcomeOnboarding";
import { AchievementOverlay } from "./AchievementOverlay";
import { PullToRefresh } from "./PullToRefresh";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { VNFlag, UKFlag } from "@/components/FlagIcons";
import { useNotifications, useUnreadMessages } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { isAdultDob } from "@/lib/types";

const PENDING_ALLOWED = ["/ho-so", "/thong-bao", "/tin-nhan"];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin, loading, refresh } = useAuth();
  const { t } = useLanguage();
  const { unread } = useNotifications();
  const unreadMsgs = useUnreadMessages();
  const hide = pathname.startsWith("/auth");
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const baseTabs = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/kham-pha", icon: Search, label: t("nav.explore") },
    { to: "/quet", icon: Flame, label: t("nav.quet") },
    { to: "/cong-dong", icon: Users, label: t("nav.community") },
    { to: "/ho-so", icon: User, label: t("nav.profileShort") },
  ];
  const tabs = isAdmin
    ? [
        { to: "/", icon: Home, label: t("nav.home") },
        { to: "/kham-pha", icon: Search, label: t("nav.explore") },
        { to: "/quet", icon: Flame, label: t("nav.quet") },
        { to: "/admin", icon: Settings, label: t("nav.admin") },
        { to: "/cong-dong", icon: Users, label: t("nav.community") },
        { to: "/ho-so", icon: User, label: t("nav.profileShort") },
      ]
    : baseTabs;
  const gridClass =
    tabs.length === 7
      ? "grid-cols-7"
      : tabs.length === 6
        ? "grid-cols-6"
        : tabs.length === 5
          ? "grid-cols-5"
          : tabs.length === 4
            ? "grid-cols-4"
            : "grid-cols-3";

  const showWelcome = !loading && !user && !hide;
  // Thiếu SĐT (đăng nhập Google lần đầu) HOẶC thiếu ngày sinh (tài khoản cũ trước khi có mục
  // này) → bắt bổ sung 1 lần, màn hình chỉ hỏi đúng những mục còn thiếu.
  const needsCompleteProfile = !!profile && (!profile.phone || !profile.date_of_birth);
  const showCompleteProfileGate = !loading && !!user && needsCompleteProfile && !hide;
  const isPending = profile?.status === "pending" && !isAdmin;
  const showPendingGate =
    !loading &&
    user &&
    isPending &&
    !hide &&
    !showCompleteProfileGate &&
    !PENDING_ALLOWED.some((p) => pathname.startsWith(p));
  // Trang Tin nhắn (1 đoạn chat cụ thể) và Cộng đồng tự tính chiều cao vừa khít màn hình
  // riêng (đã trừ sẵn phần header + nav) — không cần main cộng thêm pb-20 nữa, kẻo bị trừ
  // 2 lần, sinh khoảng trắng thừa + cuộn sai.
  const isFullHeightPage = /^\/tin-nhan\/.+/.test(pathname) || pathname === "/cong-dong";

  // Đo chiều cao THẬT của thanh điều hướng dưới cùng VÀ header trên cùng (khác nhau tuỳ
  // máy/kiểu điều hướng Android, cỡ chữ hệ thống...) thay vì đoán số cố định — số đoán sai
  // là nguyên nhân gây khoảng trắng thừa/cuộn sai ở các trang tự tính chiều cao vừa khít
  // màn hình (Tin nhắn, Cộng đồng).
  //
  // QUAN TRỌNG (xem QUY TẮC #44 trong knowledge -- đã từng bị lỗi này rồi): khi bàn phím
  // ảo mở lên, KHÔNG PHẢI trình duyệt/máy nào cũng tự co "layout viewport" theo bàn phím
  // (nhiều bản Android Chrome giữ nguyên window.innerHeight, chỉ visualViewport.height co
  // lại) -- lúc đó thanh nav "fixed bottom-0" bị đẩy khuất HẲN xuống dưới bàn phím, không
  // còn chiếm chỗ nào của khung nhìn đang thấy nữa. Nếu vẫn trừ cứng --bottom-nav-h bằng
  // offsetHeight TĨNH của nó (bug thực tế đã gặp), khung chat bị trừ dư ra đúng 1 khoảng =
  // chiều cao thanh nav, sinh khoảng đen trống giữa ô nhập và bàn phím. Fix bằng cách đo
  // THẬT phần thanh nav ĐANG THỰC SỰ chồng lên khung nhìn hiện tại (so getBoundingClientRect
  // với visualViewport), ra 0 khi nó bị khuất hẳn, ra đúng chiều cao khi hiện bình thường --
  // tự đúng cho mọi máy/mọi trình duyệt, không cần đoán riêng theo Android hay iOS.
  const navRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const navEl = navRef.current;
    const headerEl = headerRef.current;
    const vv = window.visualViewport;

    const update = () => {
      const viewportH = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--vvh", `${viewportH}px`);
      if (headerEl) {
        document.documentElement.style.setProperty("--header-h", `${headerEl.offsetHeight}px`);
      }
      if (navEl) {
        const rect = navEl.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
        document.documentElement.style.setProperty("--bottom-nav-h", `${overlap}px`);
      }
    };

    update();
    const roNav = navEl ? new ResizeObserver(update) : null;
    const roHeader = headerEl ? new ResizeObserver(update) : null;
    if (navEl) roNav!.observe(navEl);
    if (headerEl) roHeader!.observe(headerEl);
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      roNav?.disconnect();
      roHeader?.disconnect();
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [tabs.length, hide, showWelcome, showCompleteProfileGate, showPendingGate]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      <WelcomeOverlay />
      <WelcomeOnboarding />
      <AchievementOverlay />
      {!hide && !showWelcome && (
        <header
          ref={headerRef}
          className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60"
        >
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Logo size={36} withText asLink />
            <div className="flex items-center gap-1">
              {user ? (
                <>
                  <Link
                    to="/tin-nhan"
                    className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {unreadMsgs > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                        {unreadMsgs > 99 ? "99+" : unreadMsgs}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/thong-bao"
                    aria-label={t("nav.notifications")}
                    className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                  >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                  <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" aria-label={t("nav.profileShort")} className="rounded-full shadow-brand">
                        {profile ? (
                          <Avatar path={profile?.avatar_url} name={profile?.full_name || profile?.username} size={36} />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1" align="end">
                      <HeaderMenuRow
                        icon={<User className="w-4 h-4" />}
                        label={t("profile.personal")}
                        onClick={() => {
                          setMenuOpen(false);
                          nav("/ho-so?view=personal");
                        }}
                      />
                      <HeaderMenuRow
                        icon={<Briefcase className="w-4 h-4" />}
                        label={t("profile.business")}
                        onClick={() => {
                          setMenuOpen(false);
                          nav("/ho-so?view=business");
                        }}
                      />
                      <HeaderMenuRow
                        icon={<HelpCircle className="w-4 h-4" />}
                        label={t("profile.guide")}
                        onClick={() => {
                          setMenuOpen(false);
                          nav("/huong-dan");
                        }}
                      />
                      <HeaderMenuRow
                        icon={<Flag className="w-4 h-4" />}
                        label={t("profile.myReports")}
                        onClick={() => {
                          setMenuOpen(false);
                          nav("/bao-cao-cua-toi");
                        }}
                      />
                      <HeaderMenuRow
                        icon={<Phone className="w-4 h-4" />}
                        label={t("settings.help")}
                        onClick={() => {
                          setMenuOpen(false);
                          setHelpOpen(true);
                        }}
                      />
                      <HeaderMenuRow
                        icon={<Settings className="w-4 h-4" />}
                        label={t("profile.settings")}
                        onClick={() => {
                          setMenuOpen(false);
                          nav("/ho-so?view=settings");
                        }}
                      />
                      <HeaderMenuRow
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
                </>
              ) : loading ? null : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/auth/login"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-foreground"
                  >
                    {t("common.login")}
                  </Link>
                  <Link
                    to="/auth/register"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground"
                  >
                    {t("common.register")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

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

      <main style={isFullHeightPage ? undefined : { paddingBottom: "calc(var(--bottom-nav-h, 5rem) + 0.75rem)" }}>
        {showWelcome ? (
          <WelcomeScreen />
        ) : showCompleteProfileGate ? (
          <CompleteProfileScreen onDone={refresh} />
        ) : showPendingGate ? (
          <PendingScreen
            onSignOut={async () => {
              await signOut();
              nav("/");
            }}
          />
        ) : (
          <PullToRefresh>
            <Outlet />
          </PullToRefresh>
        )}
      </main>

      {!hide && !showWelcome && !showPendingGate && !showCompleteProfileGate && (
        <nav
          ref={navRef}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-card border-t border-border safe-bottom"
        >
          <div className={`grid ${gridClass}`}>
            {tabs.map((tab: any) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/" || tab.to === "/ho-so"}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <div className="relative">
                  <tab.icon className="w-5 h-5" />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <InstallBanner />
    </div>
  );
}

function HeaderMenuRow({
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

function WelcomeScreen() {
  const { t, lang, setLang } = useLanguage();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: pub } = await supabase.rpc("get_public_stats").maybeSingle();
      setStats({
        members: (pub as any)?.members ?? 0,
        businesses: (pub as any)?.businesses ?? 0,
        offers: (pub as any)?.offers ?? 0,
      });
      setStatsLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 py-5 flex flex-col items-center text-center gap-3">
      <Logo size={72} asLink />
      <div className="space-y-1">
        {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" — hiện t("app.name") để đổi theo ngôn ngữ */}
        <h1 className="text-xl font-extrabold text-primary">{t("app.name")}</h1>
        <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
      </div>
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center gap-3 bg-card border border-primary/20 rounded-2xl p-3.5 text-left shadow-soft">
          <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">{t("welcomeCards.memberTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("welcomeCards.memberDesc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-primary/20 rounded-2xl p-3.5 text-left shadow-soft">
          <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">{t("welcomeCards.bizTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("welcomeCards.bizDesc")}</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mb-1">{t("home.currentCommunity")}</p>
      <div className="w-full max-w-sm grid grid-cols-3 gap-2">
        {[
          { v: stats.members, l: t("stats.members"), icon: Users },
          { v: stats.businesses, l: t("stats.businesses"), icon: Building2 },
          { v: stats.offers, l: t("stats.offers"), icon: Tag },
        ].map(({ v, l, icon: Icon }) => (
          <div key={l} className="rounded-2xl p-3 text-center bg-card border border-primary/20 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-gradient-brand mx-auto mb-1.5 grid place-items-center animate-pulse-ring">
              <Icon className="w-4 h-4 text-white" />
            </div>
            {statsLoading ? (
              <div className="h-6 w-8 mx-auto mb-0.5 rounded bg-muted animate-pulse" />
            ) : (
              <div className="text-xl font-extrabold text-primary">{v}</div>
            )}
            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{l}</div>
          </div>
        ))}
      </div>
      <div className="w-full max-w-sm space-y-2">
        <Link
          to="/auth/register"
          className="block w-full py-2.5 rounded-xl font-semibold text-primary-foreground bg-gradient-brand shadow-brand text-sm"
        >
          {t("home.joinNow")}
        </Link>
        <Link
          to="/auth/login"
          className="block w-full py-2.5 rounded-xl font-semibold border-2 border-primary text-primary text-sm"
        >
          {t("common.login")}
        </Link>
      </div>
      <div className="pt-2 border-t w-full max-w-sm">
        <div className="text-xs font-bold text-muted-foreground text-center mb-3 uppercase tracking-wider">
          {t("home.contactAdmin")}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "mailto:lienminhliendoanh@gmail.com", icon: Mail, label: "Email" },
            { href: "tel:0339565246", icon: Phone, label: "Hotline" },
            { href: "https://www.facebook.com/profile.php?id=61590228346408", icon: Facebook, label: "Facebook" },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-card border border-primary/20 shadow-soft active:scale-95 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-brand grid place-items-center animate-pulse-ring">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="inline-flex rounded-full border overflow-hidden">
        <button
          type="button"
          onClick={() => setLang("vi")}
          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 ${lang === "vi" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
        >
          <VNFlag /> VI
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
        >
          <UKFlag /> EN
        </button>
      </div>
      <Footer />
    </div>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="w-full max-w-sm pt-4 text-center space-y-1.5">
      <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <Link to="/dieu-khoan" className="hover:text-primary underline">
          {t("termsPage.title")}
        </Link>
        <span>·</span>
        <Link to="/chinh-sach-bao-mat" className="hover:text-primary underline">
          {t("privacyPage.title")}
        </Link>
        <span>·</span>
        <Link to="/chinh-sach-cookie" className="hover:text-primary underline">
          {t("cookiePage.title")}
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} {t("app.name")} — {t("footer.location")}
      </p>
    </footer>
  );
}
function CompleteProfileScreen({ onDone }: { onDone: () => Promise<void> }) {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const needAccount = !profile?.phone;
  const needDob = !profile?.date_of_birth;
  const [username, setUsername] = useState(profile?.username?.startsWith("g_") ? "" : (profile?.username ?? ""));
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [dobErr, setDobErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkUnique = async (col: "username" | "phone", val: string) => {
    const { data, error } = await supabase.rpc("is_field_taken", { _field: col, _value: val });
    if (error) return false;
    return !data;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameErr(null);
    setPhoneErr(null);
    setDobErr(null);
    if (needAccount && !/^[a-z0-9_]{3,20}$/i.test(username)) {
      setUsernameErr(t("register.usernameHint"));
      return;
    }
    if (needAccount && !/^\d{8,15}$/.test(phone)) {
      setPhoneErr(t("register.invalid"));
      return;
    }
    if (needDob && !isAdultDob(dob)) {
      setDobErr(t("register.dobUnder18"));
      return;
    }
    if (needDob && !adultConfirmed) {
      setDobErr(t("register.confirmBelow"));
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const update: { username?: string; phone?: string; date_of_birth?: string } = {};
    if (needAccount) {
      const lowerUsername = username.toLowerCase();
      const [usernameFree, phoneFree] = await Promise.all([
        lowerUsername === profile?.username ? true : checkUnique("username", lowerUsername),
        checkUnique("phone", phone),
      ]);
      if (!usernameFree) {
        setSubmitting(false);
        setUsernameErr(t("register.taken"));
        return;
      }
      if (!phoneFree) {
        setSubmitting(false);
        setPhoneErr(t("register.taken"));
        return;
      }
      update.username = lowerUsername;
      update.phone = phone;
    }
    if (needDob) update.date_of_birth = dob;
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    setSubmitting(false);
    if (error) {
      if (String(error.message).includes("DOB_UNDER_18")) setDobErr(t("register.dobUnder18"));
      else if (needAccount) setPhoneErr(t("register.fillValidInfo"));
      else setDobErr(t("register.fillValidInfo"));
      return;
    }
    await onDone();
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center gap-5">
      <h1 className="text-xl font-bold">{t("completeProfile.title")}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        {needAccount ? t("completeProfile.subtitle", { app: t("app.name") }) : t("completeProfile.dobSubtitle")}
      </p>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3 text-left">
        {needAccount && (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">{t("register.username")}</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("register.usernamePlaceholder")}
                autoCapitalize="none"
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
              {usernameErr ? (
                <p className="text-xs text-destructive">{usernameErr}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("register.usernameHint")}</p>
              )}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">{t("register.phone")}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
              {phoneErr && <p className="text-xs text-destructive">{phoneErr}</p>}
            </label>
          </>
        )}
        {needDob && (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">{t("register.dob")}</span>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
              {dobErr ? (
                <p className="text-xs text-destructive">{dobErr}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("register.dobHint")}</p>
              )}
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={adultConfirmed}
                onChange={(e) => setAdultConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>{t("terms.ageConfirm")}</span>
            </label>
          </>
        )}
        <button
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
        >
          {submitting ? t("completeProfile.submitting") : t("completeProfile.submit")}
        </button>
      </form>
    </div>
  );
}

function PendingScreen({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-yellow-100 grid place-items-center">
        <Clock className="w-8 h-8 text-yellow-600" />
      </div>
      <h1 className="text-xl font-bold">{t("pending.title")}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">{t("pending.body")}</p>
      <div className="flex gap-2">
        <Link to="/ho-so" className="px-4 py-2 rounded-xl bg-accent text-sm font-semibold">
          {t("nav.profileShort")}
        </Link>
        <button onClick={onSignOut} className="px-4 py-2 rounded-xl border text-destructive text-sm font-semibold">
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
function InstallBanner() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [canPromptNative, setCanPromptNative] = useState(false);

  useEffect(() => {
    initInstallPrompt((canPrompt) => {
      setCanPromptNative(canPrompt);
      setShow(true);
    });
  }, []);

  if (!show) return null;

  const handleInstall = async () => {
    if (canPromptNative) {
      await triggerInstall();
      setShow(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallBanner();
    setShow(false);
  };

  return (
    <div
      className="fixed left-0 right-0 z-50 px-3 pb-2 max-w-md mx-auto animate-in slide-in-from-bottom"
      style={{ bottom: "calc(var(--bottom-nav-h, 5rem) + 0.5rem)" }}
    >
      <div className="bg-gradient-brand text-white rounded-2xl shadow-brand p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">{t("install.title")}</div>
            {canPromptNative ? (
              <div className="text-[11px] opacity-90">{t("install.subtitleNative")}</div>
            ) : (
              <div className="text-[11px] opacity-90">{t("install.subtitleManual")}</div>
            )}
          </div>
          {canPromptNative && (
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-white text-primary text-xs font-bold shrink-0"
            >
              {t("install.add")}
            </button>
          )}
          <button onClick={handleDismiss} className="p-1 shrink-0" aria-label={t("common.close")}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {!canPromptNative && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center font-bold shrink-0">1</span>
              <span>{t("install.step1")}</span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/20 shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v13m0-13l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="14" width="16" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{t("install.step1b")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center font-bold shrink-0">2</span>
              <span>{t("install.step2")}</span>
            </div>
            <div className="flex justify-center pt-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 animate-bounce" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 5v14m0 0l-6-6m6 6l6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
