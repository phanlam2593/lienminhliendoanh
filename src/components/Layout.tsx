import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Ticket, Settings, User as UserIcon, LogOut, Bell, MessageCircle, Clock, Store, Tag as TagIcon, Star, Mail, Phone, Facebook } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useNotifications, useUnreadMessages } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME = "Liên Minh Liên Doanh";
const TAGLINE = "Một cộng đồng – Nhiều giá trị";

const PENDING_ALLOWED = ["/ho-so", "/thong-bao", "/tin-nhan"];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const { unread } = useNotifications();
  const unreadMsg = useUnreadMessages();
  const [open, setOpen] = useState(false);
  const hide = pathname.startsWith("/auth");

  const tabs = [
    { to: "/", icon: Home, label: "Trang chủ" },
    { to: "/kham-pha", icon: Search, label: "Khám phá" },
    { to: "/uu-dai", icon: Ticket, label: "Ưu đãi" },
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Admin" }] : []),
    { to: "/ho-so", icon: UserIcon, label: "Tôi" },
  ];

  // Fix 8: gating
  const showWelcome = !loading && !user && !hide;
  const isPending = profile?.status === "pending" && !isAdmin;
  const showPendingGate =
    !loading && user && isPending && !hide && !PENDING_ALLOWED.some(p => pathname.startsWith(p));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      {!hide && !showWelcome && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Logo size={36} withText asLink />
            <div className="flex items-center gap-1">
              {user && (
                <>
                  <Link to="/thong-bao" className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">{unread}</span>}
                  </Link>
                  <Link to="/tin-nhan" className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent">
                    <MessageCircle className="w-5 h-5" />
                    {unreadMsg > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">{unreadMsg}</span>}
                  </Link>
                </>
              )}
              {user ? (
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger className="w-9 h-9 rounded-full bg-gradient-brand text-primary-foreground font-bold text-sm grid place-items-center shadow-brand">
                    {(profile?.full_name || profile?.username || "?").slice(0, 1).toUpperCase()}
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="end">
                    <div className="px-2 py-1.5 border-b mb-1">
                      <div className="text-xs font-semibold truncate">{profile?.full_name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">@{profile?.username}</div>
                      {profile?.status === "pending" && <div className="mt-1 text-[10px] inline-block bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Chờ duyệt</div>}
                      {profile?.status === "rejected" && <div className="mt-1 text-[10px] inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Từ chối</div>}
                      {profile?.status === "approved" && <div className="mt-1 text-[10px] inline-block bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Đã duyệt</div>}
                    </div>
                    <button onClick={() => { setOpen(false); nav("/ho-so"); }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />Hồ sơ cá nhân
                    </button>
                    <button onClick={async () => { await signOut(); setOpen(false); nav("/"); }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent text-destructive flex items-center gap-2">
                      <LogOut className="w-4 h-4" />Đăng xuất
                    </button>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link to="/auth/login" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-foreground">Đăng nhập</Link>
                  <Link to="/auth/register" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground">Đăng ký</Link>
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
          <PendingScreen onSignOut={async () => { await signOut(); nav("/"); }} />
        ) : (
          <Outlet />
        )}
      </main>

      {!hide && !showWelcome && !showPendingGate && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-card border-t border-border safe-bottom">
          <div className={cn("grid", tabs.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
            {tabs.map(t => (
              <NavLink key={t.to} to={t.to} end={t.to === "/"}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                <t.icon className="w-5 h-5" />
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
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center gap-6">
      <Logo size={96} asLink />
      <div className="space-y-2">
        {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" */}
        <h1 className="text-3xl font-extrabold text-gradient-brand">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">{TAGLINE}</p>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        <Link to="/auth/login" className="block w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold">Đăng nhập</Link>
        <Link to="/auth/register" className="block w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold">Đăng ký</Link>
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
        <Link to="/ho-so" className="px-4 py-2 rounded-xl bg-accent text-sm font-semibold">Hồ sơ</Link>
        <button onClick={onSignOut} className="px-4 py-2 rounded-xl border text-destructive text-sm font-semibold">Đăng xuất</button>
      </div>
    </div>
  );
}
