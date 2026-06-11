import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Search, Ticket, Shield, User as UserIcon } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const tabs = [
  { to: "/", icon: Home, label: "Trang chủ" },
  { to: "/kham-pha", icon: Search, label: "Khám phá" },
  { to: "/uu-dai", icon: Ticket, label: "Ưu đãi" },
  { to: "/admin", icon: Shield, label: "Admin" },
  { to: "/toi", icon: UserIcon, label: "Tôi" },
];

export function Layout() {
  const { pathname } = useLocation();
  const { currentUser, session } = useStore();
  const showHeader = !["/dang-ky", "/dang-nhap"].includes(pathname);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      {showHeader && (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/"><Logo size={36} withText /></Link>
            <Link
              to={currentUser || session.isAdmin ? "/toi" : "/dang-nhap"}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-accent-foreground"
            >
              {session.isAdmin ? "Admin" : currentUser?.name?.split(" ").slice(-1)[0] || "Đăng nhập"}
            </Link>
          </div>
        </header>
      )}

      <main className="pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 safe-bottom">
        <div className="mx-3 mb-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-float">
          <div className="grid grid-cols-5">
            {tabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all",
                      isActive && "bg-gradient-brand text-primary-foreground shadow-brand scale-110"
                    )}>
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
    </div>
  );
}
