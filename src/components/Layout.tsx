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
  Target,
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
import { useNotifications, useUnreadMessages, useNewMessagePopups } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

const PENDING_ALLOWED = ["/ho-so", "/thong-bao", "/tin-nhan"];

export function Layout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const { t } = useLanguage();
  const { unread } = useNotifications();
  const unreadMsgs = useUnreadMessages();
  const { popups: msgPopups, dismiss: dismissMsgPopup } = useNewMessagePopups();
  const hide = pathname.startsWith("/auth");
  // Đang mở đúng đoạn chat với người nào thì bong bóng của người đó khỏi hiện (dư thừa,
  // đang xem tin của họ rồi) — mấy bong bóng người khác vẫn hiện bình thường.
  const visibleMsgPopups = msgPopups.filter((p) => pathname !== `/tin-nhan/${p.senderId}`);

  const baseTabs = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/kham-pha", icon: Search, label: t("nav.explore") },
    { to: "/cong-dong", icon: Users, label: t("nav.community") },
  ];
  const tabs = isAdmin
    ? [
        { to: "/", icon: Home, label: t("nav.home") },
        { to: "/kham-pha", icon: Search, label: t("nav.explore") },
        { to: "/admin", icon: Settings, label: t("nav.admin") },
        { to: "/cong-dong", icon: Users, label: t("nav.community") },
        { to: "/questline", icon: Target, label: "Quest" },
      ]
    : baseTabs;
  const gridClass = tabs.length === 5 ? "grid-cols-5" : tabs.length === 4 ? "grid-cols-4" : "grid-cols-3";

  const showWelcome = !loading && !user && !hide;
  const isPending = profile?.status === "pending" && !isAdmin;
  const showPendingGate =
    !loading && user && isPending && !hide && !PENDING_ALLOWED.some((p) => pathname.startsWith(p));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background relative shadow-float">
      <WelcomeOverlay />
      <WelcomeOnboarding />
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
                  <Link to="/ho-so" aria-label="Hồ sơ" className="rounded-full shadow-brand">
                    <Avatar path={profile?.avatar_url} name={profile?.full_name || profile?.username} size={36} />
                  </Link>
                </>
              ) : (
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
          <PullToRefresh>
            <Outlet />
          </PullToRefresh>
        )}
      </main>

      {!hide && !showWelcome && !showPendingGate && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-card border-t border-border safe-bottom">
          <div className={`grid ${gridClass}`}>
            {tabs.map((tab: any) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/"}
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
      {visibleMsgPopups.map((p, i) => (
        <IncomingMessageBubble
          key={p.senderId}
          popup={p}
          stackIndex={i}
          onOpen={() => {
            dismissMsgPopup(p.senderId);
            nav(`/tin-nhan/${p.senderId}`);
          }}
          onDismiss={() => dismissMsgPopup(p.senderId)}
        />
      ))}
      <InstallBanner />
    </div>
  );
}

// ── Bong bóng avatar nổi khi có tin nhắn mới, kéo-thả tự do trong màn hình app (kiểu
// "chat head" Messenger/Zalo — chỉ khác là giới hạn trong app, không nổi ra ngoài được vì
// web app không có quyền hiển thị đè lên app khác như app native).
// - Bấm (không kéo) → mở đoạn chat.
// - Kéo đi đâu cũng được trong màn hình, thả ra thì dính lại (snap) vào cạnh trái/phải gần nhất.
// - Kéo xuống sát đáy màn hình sẽ hiện vùng tròn "X", thả vào đó là tắt bong bóng.
// - KHÔNG tự tắt — cứ hiện mãi cho tới khi bị kéo vào vùng X hoặc bấm mở đúng đoạn chat đó.
const BUBBLE_SIZE = 56;

function IncomingMessageBubble({
  popup,
  stackIndex,
  onOpen,
  onDismiss,
}: {
  popup: { senderId: string; name: string; avatar: string | null };
  stackIndex: number;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  // Vị trí ban đầu xếp chồng lên nhau theo thứ tự tới — bong bóng mới nhất nằm trên cùng,
  // các bong bóng cũ dạt dần lên trên, giống Messenger. Chỉ tính lúc mới hiện ra, sau đó
  // người dùng kéo đi đâu thì giữ nguyên đó, không tự sắp xếp lại.
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - BUBBLE_SIZE - 16,
    y: window.innerHeight - 180 - stackIndex * (BUBBLE_SIZE + 10),
  }));
  const [dragging, setDragging] = useState(false);
  const [overDropZone, setOverDropZone] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(
    null,
  );

  const isOverDropZone = (x: number, y: number) => y + BUBBLE_SIZE / 2 > window.innerHeight - 90;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragInfo.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
    setDragging(true);
  };

  // QUAN TRỌNG: gắn sự kiện move/up lên toàn `window` khi đang kéo (thay vì chỉ gắn lên
  // riêng cái nút) — cách này đáng tin cậy hơn hẳn `setPointerCapture` trên mobile/PWA,
  // tránh bị các thành phần khác (như kéo-để-làm-mới trang) giành mất sự kiện chạm giữa chừng.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      if (!dragInfo.current) return;
      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragInfo.current.moved = true;
      let nx = dragInfo.current.origX + dx;
      let ny = dragInfo.current.origY + dy;
      nx = Math.max(4, Math.min(window.innerWidth - BUBBLE_SIZE - 4, nx));
      ny = Math.max(60, Math.min(window.innerHeight - BUBBLE_SIZE - 4, ny));
      setPos({ x: nx, y: ny });
      setOverDropZone(isOverDropZone(nx, ny));
    };
    const onUp = () => {
      const info = dragInfo.current;
      dragInfo.current = null;
      setDragging(false);
      if (!info) return;
      if (!info.moved) {
        onOpen();
        return;
      }
      setPos((p) => {
        if (isOverDropZone(p.x, p.y)) {
          onDismiss();
          return p;
        }
        const snapX = p.x + BUBBLE_SIZE / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - BUBBLE_SIZE - 8;
        return { ...p, x: snapX };
      });
      setOverDropZone(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  return (
    <>
      {dragging && (
        <div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 bottom-4 z-50 w-16 h-16 rounded-full grid place-items-center transition-all",
            overDropZone ? "bg-destructive scale-125" : "bg-muted-foreground/60 scale-100",
          )}
        >
          <XIcon className="w-6 h-6 text-white" />
        </div>
      )}
      <button
        onPointerDown={onPointerDown}
        style={{ left: pos.x, top: pos.y, width: BUBBLE_SIZE, height: BUBBLE_SIZE, touchAction: "none" }}
        className={cn(
          "fixed z-50 rounded-full shadow-brand ring-4 ring-primary/30 overflow-hidden bg-card animate-in zoom-in-50 fade-in",
          dragging && overDropZone && "opacity-50 scale-90",
        )}
        aria-label={popup.name}
      >
        <Avatar path={popup.avatar} name={popup.name} size={BUBBLE_SIZE} />
      </button>
    </>
  );
}

function WelcomeScreen() {
  const { t, lang, setLang } = useLanguage();
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
            <div className="text-xl font-extrabold text-primary">{v}</div>
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
