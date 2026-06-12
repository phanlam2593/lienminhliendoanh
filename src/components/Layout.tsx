import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Store, Ticket, Users, User as UserIcon, LogOut } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const tabs = [
  { to: "/", icon: Home, label: "Trang chủ" },
  { to: "/doanh-nghiep", icon: Store, label: "Doanh nghiệp" },
  { to: "/uu-dai", icon: Ticket, label: "Ưu đãi" },
  { to: "/thanh-vien", icon: Users, label: "Thành viên" },
  { to: "/ho-so", icon: UserIcon, label: "Hồ sơ" },
];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const hide = pathname.startsWith("/auth") || pathname.startsWith("/admin");

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      {!hide && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/"><Logo size={36} withText /></Link>
            {user ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger className="w-9 h-9 rounded-full bg-gradient-brand text-primary-foreground font-bold text-sm grid place-items-center shadow-brand">
                  {(profile?.full_name || user.email || "?").slice(0, 1).toUpperCase()}
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="end">
                  <div className="px-2 py-1.5 border-b mb-1">
                    <div className="text-xs font-semibold truncate">{profile?.full_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
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
        </header>
      )}

      <main className="pb-24"><Outlet /></main>

      {!hide && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 safe-bottom">
          <div className="mx-3 mb-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-float">
            <div className="grid grid-cols-5">
              {tabs.map(t => (
                <NavLink key={t.to} to={t.to} end={t.to === "/"}
                  className={({ isActive }) => cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                  {({ isActive }) => (
                    <>
                      <div className={cn("p-1.5 rounded-xl transition-all",
                        isActive && "bg-gradient-brand text-primary-foreground shadow-brand scale-110")}>
                        <t.icon className="w-4 h-4" />
                      </div>
                      <span>{t.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
