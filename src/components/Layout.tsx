import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Ticket, Settings, User as UserIcon, LogOut, Bell, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useNotifications, useUnreadMessages } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
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

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      {!hide && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <Link to="/"><Logo size={32} withText /></Link>
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

      <main className="pb-20"><Outlet /></main>

      {!hide && (
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
