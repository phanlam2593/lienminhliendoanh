import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/time";
import {
  Bell,
  Check,
  X,
  UserPlus,
  Building2,
  Shield,
  UserCheck,
  UserX,
  Pin,
  Tag,
  Gift,
  MessageSquare,
  MessageCircle,
  Flag,
  Lightbulb,
  Trophy,
  Award,
  Clock,
  Flame,
  Car,
  Phone,
  PhoneMissed,
  Users,
  AtSign,
} from "lucide-react";

const ICONS: Record<string, typeof Bell> = {
  account_approved: UserCheck,
  account_rejected: UserX,
  business_approved: Building2,
  business_rejected: Building2,
  business_pinned: Pin,
  new_deal: Tag,
  new_offer: Gift,
  deal_claimed: Gift,
  new_follower: UserPlus,
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  new_message: MessageSquare,
  business_reply: MessageCircle,
  admin_message: Shield,
  report_submitted: Flag,
  report_received: Flag,
  report_resolved: Flag,
  report_reply: Flag,
  suggestion_approved: Lightbulb,
  suggestion_rejected: Lightbulb,
  level_up: Trophy,
  badge_earned: Award,
  pending_approval: Clock,
  swipe_match: Flame,
  ride_new: Car,
  ride_accepted: Car,
  ride_status: Car,
  driver_pending: Car,
  driver_approved: Car,
  driver_rejected: Car,
  business_regular: Award,
  business_needs_revision: Building2,
  account_needs_revision: UserX,
  mention: AtSign,
  incoming_call: Phone,
  missed_call: PhoneMissed,
};
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";
import { LoadingState } from "@/components/LoadingState";
import { useLanguage } from "@/lib/i18n";

// Tiêu đề thông báo được sinh từ trigger DB (tiếng Việt cứng). Với các nhóm có tiêu đề
// CỐ ĐỊNH (không chèn số/tên riêng), ta thay bằng bản dịch ở đây thay vì sửa DB.
// pending_approval/achievements (badge_earned) có SỐ/TÊN chèn vào nên KHÔNG override — giữ nguyên n.title gốc.
const NOTIF_TITLE_KEY_BY_CATEGORY: Record<string, string> = {
  messages: "notifTitle.messages",
  follows: "notifTitle.follows",
  deals_received: "notifTitle.dealsReceived",
  deals_new: "notifTitle.dealsNew",
  account_updates: "notifTitle.accountUpdates",
  reports: "notifTitle.reports",
  swipe_matches: "notifTitle.swipeMatches",
};

async function resolveRoute(n: Notification, isAdmin: boolean): Promise<string | null> {
  const id = n.target_id ?? undefined;

  // Nhóm đã gộp theo category (10 nhóm) — target_id giờ luôn là sự kiện MỚI NHẤT
  // (vd: DN vừa có người claim/follow/đăng ưu đãi gần nhất), dùng để dẫn tới đúng nơi.
  if (n.category) {
    switch (n.category) {
      case "messages":
        // Tin nhắn NHÓM: target_id = id nhóm → vào thẳng nhóm (nếu mình còn trong nhóm).
        // Tin 1-1 gộp chung 1 dòng (target_id NULL) → vào hộp thư.
        if (n.target_type === "group" && id) {
          const { data } = await (supabase as any).from("group_chats").select("id").eq("id", id).maybeSingle();
          if (data) return `/tin-nhan/nhom/${id}`;
        }
        return "/tin-nhan";
      case "follows":
        // Giờ CHỈ còn follow cá nhân (follow DN đã tách riêng category "follows_business" bên dưới).
        // Mở sẵn danh sách "Người theo dõi" ở Hồ sơ (trước đây vào /tin-nhan?tab=follows — hộp thư
        // không có tab này nên chỉ rơi vào hộp thư trống).
        return "/ho-so?followers=1";
      case "friend_requests":
        // Cơ chế lời mời kết bạn đã bỏ (#50) — thông báo cũ dẫn tới trang của người đó.
        return id ? `/ho-so/${id}` : "/ho-so";
      case "follows_business":
        if (id) {
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}?followers=1`;
        }
        return "/ho-so?followers=1";
      case "deals_received":
        // target_id giờ là offer_id của lần gần nhất — vào thẳng danh sách người đã nhận ưu đãi đó.
        if (id && n.target_type === "business") {
          // Thông báo cũ (trước khi đổi sang offer_id) — target là DN.
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}`;
        } else if (id) {
          const { data } = await supabase.from("offers").select("id, business_id").eq("id", id).maybeSingle();
          if (data) return `/dn/${data.business_id}?claims=${id}`;
        }
        return "/kham-pha";
      case "deals_new":
        // target_id là business_id của lần gần nhất — vào thẳng trang DN đó.
        if (id) {
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}`;
        }
        return "/kham-pha";
      case "featured":
      case "social":
        // "DN mới được ghim nổi bật" / "Bạn là khách quen" — target_id là DN → vào trang DN đó.
        if (id) {
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}`;
        }
        return "/";
      case "pending_approval":
        if (n.target_type === "ride_driver") return "/admin?tab=rides";
        return "/admin?tab=pending";
      case "rides":
        if (n.target_type === "ride_driver") return "/dua-don?tab=driver";
        return id ? `/dua-don?ride=${id}` : "/dua-don";
      case "account_updates":
        // target_type phân biệt: cập nhật cho DN hay cho chính tài khoản (vào Hồ sơ).
        // Với DN: nếu đang "cần bổ sung" (rejected) thì vào thẳng form sửa trong Hồ sơ
        // doanh nghiệp (tự mở sẵn) — nếu đã duyệt thì vào trang công khai của DN như cũ.
        if (n.target_type === "business" && id) {
          const { data } = await supabase.from("businesses").select("id, status").eq("id", id).maybeSingle();
          if (data?.status === "rejected" || data?.status === "needs_revision") return `/ho-so?view=business&edit=${id}`;
          if (data) return `/dn/${id}`;
        }
        return "/ho-so";
      case "reports":
        return isAdmin ? "/admin?tab=reports" : "/bao-cao-cua-toi";
      case "swipe_matches":
        return "/quet?tab=matches";
      case "calls":
        // "Đang gọi" (chuông còn sống) dẫn thẳng vào khung chat với người gọi — nếu
        // cuộc gọi vẫn còn hiệu lực, CallProvider (mount ở App root) sẽ tự phát hiện
        // và bật ngay màn hình Nghe/Từ chối đè lên bất kỳ trang nào. "Cuộc gọi nhỡ"
        // (đã kết thúc) thì vào thẳng Nhật ký cuộc gọi như cũ.
        if (n.target_type === "call_ringing" && id) return `/tin-nhan/${id}`;
        return "/cuoc-goi";
      default:
        return "/";
    }
  }

  // Fallback cho thông báo chưa có category (vd: admin_message từ tính năng Trao đổi, hoặc
  // level_up/badge_earned — 2 loại này CỐ Ý không có category vì không được phép gộp)
  switch (n.type) {
    case "level_up":
    case "badge_earned":
      return "/ho-so";
    case "mention":
      // Được nhắc tên (@) trong Cộng đồng.
      return "/cong-dong";
    case "admin_message": {
      if (n.target_type === "user" && id) return `/ho-so/${id}`;
      if (n.target_type === "business" && id) {
        const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
        return data ? `/dn/${id}` : "/admin";
      }
      return "/tin-nhan";
    }
    default:
      return "/";
  }
}

export default function Notifications() {
  const { items, unread, markAllRead, markRead, deleteAllRead, refresh, loading } = useNotifications();
  const { role, user, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("open");

  // Bấm thông báo ĐẨY (push) → service worker mở /thong-bao?open=<id> → ở đây tra đúng thông
  // báo đó rồi chuyển thẳng tới nơi cần đến bằng CHÍNH logic resolveRoute như khi bấm trong
  // danh sách (trước đây push tự đoán URL riêng nên nhiều loại chỉ rơi về trang Thông báo).
  useEffect(() => {
    if (!openId || authLoading) return;
    if (!user) {
      nav("/", { replace: true });
      return;
    }
    let cancel = false;
    void (async () => {
      const { data } = await supabase.from("notifications").select("*").eq("id", openId).maybeSingle();
      if (cancel) return;
      if (!data) {
        nav("/thong-bao", { replace: true });
        return;
      }
      if (!data.is_read) await markRead(data.id);
      const route = await resolveRoute(data as Notification, role === "admin");
      if (!cancel) nav(route ?? "/", { replace: true });
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, authLoading, user?.id]);

  const tap = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    const route = await resolveRoute(n, role === "admin");
    if (route === null) {
      toast.message(t("notif.contentGone"));
      nav("/");
      return;
    }
    nav(route);
  };

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  };

  if (openId) return <LoadingState full />;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-extrabold">{t("notif.title")}</h1>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {t("notif.markAllRead")}
            </button>
          )}
          {items.some((n) => n.is_read) && (
            <button onClick={deleteAllRead} className="text-xs text-destructive font-semibold flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {t("notif.deleteRead")}
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground space-y-3">
          <Bell className="w-10 h-10 mx-auto opacity-30" />
          <p>{t("notif.empty")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((n) => {
            const Icon =
              n.type === "admin_message"
                ? n.target_type === "user"
                  ? UserPlus
                  : n.target_type === "business"
                    ? Building2
                    : Shield
                : n.type === "new_message" && n.target_type === "group"
                  ? Users
                  : (ICONS[n.type] ?? Bell);
            return (
              <div
                key={n.id}
                className={cn(
                  "w-full flex items-stretch gap-2 rounded-xl border bg-card overflow-hidden transition",
                  !n.is_read && "border-primary/30",
                )}
              >
                {!n.is_read && <span className="w-1 bg-primary" aria-hidden />}
                <button
                  onClick={() => tap(n)}
                  className={cn(
                    "flex-1 text-left min-w-0 flex items-start gap-3 p-3 hover:bg-accent/40",
                    n.is_read && "opacity-80",
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm", n.is_read ? "font-medium" : "font-bold")}>
                      {n.category && NOTIF_TITLE_KEY_BY_CATEGORY[n.category]
                        ? t(NOTIF_TITLE_KEY_BY_CATEGORY[n.category])
                        : n.title}
                    </div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body === "Nhấn để xem" ? t("notifBody.tapToView") : n.body}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at, lang)}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => del(e, n.id)}
                  aria-label={t("notif.deleteOne")}
                  className="w-9 grid place-items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
