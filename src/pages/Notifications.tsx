import { useNavigate } from "react-router-dom";
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
};
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";

async function resolveRoute(n: Notification, isAdmin: boolean): Promise<string | null> {
  const id = n.target_id ?? undefined;

  // Nhóm đã gộp theo category (10 nhóm) — target_id giờ luôn là sự kiện MỚI NHẤT
  // (vd: DN vừa có người claim/follow/đăng ưu đãi gần nhất), dùng để dẫn tới đúng nơi.
  if (n.category) {
    switch (n.category) {
      case "messages":
        return "/tin-nhan";
      case "follows":
        // Luôn vào tab "Theo dõi" trong Tin nhắn — không dẫn tới 1 người/DN cụ thể vì
        // đây là gộp chung cả follow cá nhân lẫn follow doanh nghiệp.
        return "/tin-nhan?tab=follows";
      case "deals_received":
      case "deals_new":
        // target_id là business_id của lần gần nhất — vào thẳng trang DN đó.
        if (id) {
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}`;
        }
        return "/kham-pha";
      case "featured":
        return "/kham-pha?featured=1";
      case "pending_approval":
        return "/admin";
      case "account_updates":
        // target_type phân biệt: cập nhật cho DN (vào thẳng trang DN) hay cho chính tài khoản (vào Hồ sơ).
        if (n.target_type === "business" && id) {
          const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
          if (data) return `/dn/${id}`;
        }
        return "/ho-so";
      case "reports":
        return isAdmin ? "/admin?tab=reports" : "/bao-cao-cua-toi";
      case "suggestions":
        return "/bao-cao-cua-toi";
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
  const { role } = useAuth();
  const nav = useNavigate();

  const tap = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    const route = await resolveRoute(n, role === "admin");
    if (route === null) {
      toast.message("Nội dung không còn tồn tại");
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

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-extrabold">Thông báo</h1>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đánh dấu tất cả đã đọc
            </button>
          )}
          {items.some((n) => n.is_read) && (
            <button onClick={deleteAllRead} className="text-xs text-destructive font-semibold flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Xóa đã đọc
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground space-y-2">
          <Bell className="w-10 h-10 mx-auto opacity-30" />
          <p>Không có thông báo mới</p>
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
                    <div className={cn("text-sm", n.is_read ? "font-medium" : "font-bold")}>{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => del(e, n.id)}
                  aria-label="Xóa thông báo"
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
