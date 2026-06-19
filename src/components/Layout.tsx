import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  Clock,
  Users,
  Mail,
  Phone,
  Facebook,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import welcomeGuide from "@/assets/welcome-guide.jpg.asset.json";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME = "Liên Minh Liên Doanh";
const TAGLINE = "Một cộng đồng – Nhiều giá trị";

const PENDING_ALLOWED = ["/ho-so", "/thong-bao", "/tin-nhan"];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const hide = pathname.startsWith("/auth");

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
      {!hide && !showWelcome && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Logo size={36} withText asLink />
            <div className="flex items-center gap-1">
              {user ? (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <button className="rounded-full shadow-brand" aria-label="Mở menu tài khoản">
                      <Avatar path={profile?.avatar_url} name={profile?.full_name || profile?.username} size={36} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="px-2 py-1.5 border-b mb-1">
                      <div className="text-xs font-semibold truncate">{profile?.full_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">@{profile?.username}</div>
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        nav("/ho-so");
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4" /> Hồ sơ cá nhân
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
                    "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
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
    </div>
  );
}

function WelcomeScreen() {
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  useEffect(() => {
    (async () => {
      const [m, b, o] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setStats({ members: m.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0 });
    })();
  }, []);

  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-6">
      <Logo size={90} asLink />
      <div className="space-y-1.5">
        {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" */}
        <h1 className="text-2xl font-extrabold text-primary">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">{TAGLINE}</p>
      </div>

      <img
        src={welcomeGuide.url}
        alt="Sứ mệnh của Liên Minh Liên Doanh"
        className="w-full max-w-[240px] mx-auto rounded-2xl shadow-soft"
        style={{ borderRadius: 16 }}
      />

      <div className="w-full max-w-sm grid grid-cols-3 gap-2">
        {[
          { v: stats.members, l: "Thành viên" },
          { v: stats.businesses, l: "Doanh nghiệp" },
          { v: stats.offers, l: "Ưu đãi" },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-2xl p-3 shadow-soft">
            <div className="text-xl font-extrabold text-primary">{s.v}</div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        <Link
          to="/auth/register"
          className="block w-full py-3 rounded-xl font-semibold text-primary-foreground bg-gradient-brand shadow-brand"
        >
          Tham gia ngay
        </Link>
        <Link
          to="/auth/login"
          className="block w-full py-3 rounded-xl font-semibold border-2 border-primary text-primary"
        >
          Đăng nhập
        </Link>
      </div>

      <div className="pt-4 border-t w-full max-w-sm text-xs text-muted-foreground space-y-1.5">
        <div className="font-bold text-foreground text-sm">Liên hệ admin</div>
        <a
          href="mailto:lienminhliendoanh@gmail.com"
          className="flex items-center justify-center gap-2 hover:text-primary"
        >
          <Mail className="w-3.5 h-3.5" /> lienminhliendoanh@gmail.com
        </a>
        <a href="tel:0339565246" className="flex items-center justify-center gap-2 hover:text-primary">
          <Phone className="w-3.5 h-3.5" /> 0339565246
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61590228346408"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 hover:text-primary"
        >
          <Facebook className="w-3.5 h-3.5" /> Facebook
        </a>
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
