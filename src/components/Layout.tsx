import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  Search,
  Users,
  Settings,
  User as UserIcon,
  Briefcase,
  LogOut,
  Mail,
  Phone,
  Facebook,
  Clock,
  Tag,
  MessageCircle,
  Building2,
} from "lucide-react";
import { initInstallPrompt, triggerInstall, dismissInstallBanner } from "@/lib/pwa";
import { Download, X as XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { WelcomeOverlay } from "./WelcomeOverlay";
import { AchievementOverlay } from "./AchievementOverlay";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useNotifications, useUnreadMessages } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import welcomeGuide from "@/assets/welcome-guide.png.asset.json";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME = "Liên Minh Liên Doanh";
const TAGLINE = "Một cộng đồng – Nhiều giá trị";

const PENDING_ALLOWED = ["/ho-so", "/thong-bao", "/tin-nhan"];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const { unread } = useNotifications();
  const unreadMsgs = useUnreadMessages();
  const [open, setOpen] = useState(false);
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const hide = pathname.startsWith("/auth");

  useEffect(() => {
    if (!user) {
      setMyBusinessId(null);
      return;
    }
    supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setMyBusinessId(data?.id ?? null));
  }, [user?.id]);

  const baseTabs = [
    { to: "/", icon: Home, label: "Trang chủ" },
    { to: "/kham-pha", icon: Search, label: "Khám phá" },
    { to: "/cong-dong", icon: Users, label: "Cộng đồng" },
  ];
  const middleTab = isAdmin
    ? { to: "/admin", icon: Settings, label: "Admin" }
    : { to: "/thong-bao", icon: Bell, label: "Thông báo", badge: unread };
  const tabs = [...baseTabs, middleTab, { to: "/ho-so", icon: UserIcon, label: "Tôi" }];

  const showWelcome = !loading && !user && !hide;
  const isPending = profile?.status === "pending" && !isAdmin;
  const showPendingGate =
    !loading && user && isPending && !hide && !PENDING_ALLOWED.some((p) => pathname.startsWith(p));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      <WelcomeOverlay />
      <AchievementOverlay />
      {!hide && !showWelcome && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Logo size={36} withText asLink />
            <div className="flex items-center gap-1">
              {user ? (
                <>
                  <Link
                    to="/tin-nhan"
                    aria-label="Tin nhắn"
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
                    aria-label="Thông báo"
                    className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                  >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <button className="rounded-full shadow-brand" aria-label="Mở menu tài khoản">
                        <Avatar path={profile?.avatar_url} name={profile?.full_name || profile?.username} size={36} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="px-2 py-1.5 border-b mb-1">
                        <div className="text-xs font-semibold truncate">{profile?.full_name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">@{profile?.username}</div>
                      </div>
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/ho-so?view=personal");
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4" /> Hồ sơ cá nhân
                      </button>
                      {myBusinessId && (
                        <button
                          onClick={() => {
                            setOpen(false);
                            nav("/ho-so?view=business");
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                        >
                          <Briefcase className="w-4 h-4" /> Hồ sơ doanh nghiệp
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/tin-nhan");
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" /> Tin nhắn
                      </button>
                      <button
                        onClick={() => {
                          setOpen(false);
                          nav("/ho-so?view=settings");
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" /> Cài đặt
                      </button>

                      <button
                        onClick={async () => {
                          await signOut();
                          setOpen(false);
                          nav("/");
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent text-destructive flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </PopoverContent>
                  </Popover>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/auth/login"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-foreground"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/auth/register"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="pb-20">
        {showWelcome ? (
          <WelcomeScreen />
        ) : showPendingGate ? (
          <PendingScreen
            onSignOut={async () => {
              await signOut();
              nav("/");
            }}
          />
        ) : (
          <Outlet />
        )}
      </main>

      {!hide && !showWelcome && !showPendingGate && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-card border-t border-border safe-bottom">
          <div className="grid grid-cols-5">
            {tabs.map((t: any) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )
                }
              >
                <div className="relative">
                  <t.icon className="w-5 h-5" />
                  {t.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
                      {t.badge}
                    </span>
                  )}
                </div>
                <span>{t.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <InstallBanner />
    </div>
  );
}

function WelcomeScreen() {
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  useEffect(() => {
    (async () => {
      const { data: pub } = await supabase.rpc("get_public_stats").maybeSingle();
      setStats({
        members: (pub as any)?.members ?? 0,
        businesses: (pub as any)?.businesses ?? 0,
        offers: (pub as any)?.offers ?? 0,
      });
    })();
  }, []);

  return (
    <div className="px-5 py-5 flex flex-col items-center text-center gap-3">
      <Logo size={72} asLink />
      <div className="space-y-1">
        {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" */}
        <h1 className="text-xl font-extrabold text-primary">{APP_NAME}</h1>
        <p className="text-xs text-muted-foreground">{TAGLINE}</p>
      </div>
      <img
        src={welcomeGuide.url}
        alt="Hướng dẫn"
        loading="lazy"
        decoding="async"
        style={{ width: "100%", maxWidth: "400px", height: "auto" }}
        className="mx-auto rounded-xl"
      />
      <div className="w-full max-w-sm grid grid-cols-3 gap-2">
        {[
          { v: stats.members, l: "Thành viên", icon: Users },
          { v: stats.businesses, l: "Doanh nghiệp", icon: Building2 },
          { v: stats.offers, l: "Ưu đãi", icon: Tag },
        ].map(({ v, l, icon: Icon }) => (
          <div key={l} className="rounded-2xl p-3 text-center bg-card border border-primary/20 shadow-soft">
            <div className="w-8 h-8 rounded-full bg-gradient-brand mx-auto mb-1.5 grid place-items-center animate-pulse-ring">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-xl font-extrabold text-primary">{v}</div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{l}</div>
          </div>
        ))}
      </div>
      <div className="w-full max-w-sm space-y-2">
        <Link
          to="/auth/register"
          className="block w-full py-2.5 rounded-xl font-semibold text-primary-foreground bg-gradient-brand shadow-brand text-sm"
        >
          Tham gia ngay
        </Link>
        <Link
          to="/auth/login"
          className="block w-full py-2.5 rounded-xl font-semibold border-2 border-primary text-primary text-sm"
        >
          Đăng nhập
        </Link>
      </div>
      <div className="pt-2 border-t w-full max-w-sm">
        <div className="text-xs font-bold text-muted-foreground text-center mb-3 uppercase tracking-wider">
          Liên hệ ban quản trị
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
              <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
function PendingScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 rounded-full bg-yellow-100 grid place-items-center">
        <Clock className="w-8 h-8 text-yellow-600" />
      </div>
      <h1 className="text-xl font-bold">Tài khoản đang chờ duyệt</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Tài khoản của bạn đang chờ admin duyệt. Bạn sẽ nhận thông báo khi được chấp thuận.
      </p>
      <div className="flex gap-2">
        <Link to="/ho-so" className="px-4 py-2 rounded-xl bg-accent text-sm font-semibold">
          Hồ sơ
        </Link>
        <button onClick={onSignOut} className="px-4 py-2 rounded-xl border text-destructive text-sm font-semibold">
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
function InstallBanner() {
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
    <div className="fixed bottom-16 left-0 right-0 z-50 px-3 pb-2 max-w-md mx-auto animate-in slide-in-from-bottom">
      <div className="bg-gradient-brand text-white rounded-2xl shadow-brand p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">Thêm vào màn hình chính</div>
            {canPromptNative ? (
              <div className="text-[11px] opacity-90">Cài app để dùng nhanh hơn</div>
            ) : (
              <div className="text-[11px] opacity-90">Cài đặt trong 2 bước đơn giản</div>
            )}
          </div>
          {canPromptNative && (
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-white text-primary text-xs font-bold shrink-0"
            >
              Thêm
            </button>
          )}
          <button onClick={handleDismiss} className="p-1 shrink-0" aria-label="Đóng">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {!canPromptNative && (
          <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center font-bold shrink-0">1</span>
              <span>Nhấn icon</span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/20 shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v13m0-13l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="14" width="16" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>ở dưới màn hình Safari</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-white/20 grid place-items-center font-bold shrink-0">2</span>
              <span>Chọn "Thêm vào MH chính"</span>
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
