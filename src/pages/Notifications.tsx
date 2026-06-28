import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/time";
import {
  Bell, Check, X, CheckCircle2, XCircle, Star, UserPlus,
  Tag, Ticket, MessageCircle, Shield, Flag, Lightbulb, Award, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";

const ICONS: Record<string, any> = {
  account_approved: CheckCircle2, account_rejected: XCircle,
  business_approved: CheckCircle2, business_rejected: XCircle,
  business_pinned: Star, new_follower: UserPlus,
  new_deal: Tag, new_offer: Tag, deal_claimed: Ticket,
  new_message: MessageCircle, business_reply: MessageCircle, admin_message: Shield,
  report_submitted: Flag, report_received: Flag, report_resolved: Flag, report_reply: Flag,
  suggestion_approved: Lightbulb, suggestion_rejected: Lightbulb,
  badge_earned: Award, level_up: TrendingUp,
};

async function resolveRoute(n: Notification): Promise<string | null> {
  const id = n.target_id ?? undefined;
  switch (n.type) {
    case "account_approved": return "/";
    case "account_rejected": return "/auth/register";
    case "business_approved":
    case "business_pinned":
    case "new_deal":
    case "new_offer":
    case "deal_claimed": {
      if (!id) return "/";
      const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
      return data ? `/dn/${id}` : null;
    }
    case "business_rejected": return "/ho-so";
    case "new_follower": return id ? `/ho-so/${id}` : "/ho-so";
    case "new_message":
    case "business_reply": {
      if (!id) return "/tin-nhan";
      const { data } = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
      return data ? `/tin-nhan/${id}` : null;
    }
    case "admin_message": {
      // Admins clicking new-member / new-business notifications: route to the entity
      if (n.target_type === "user" && id) return `/ho-so/${id}`;
      if (n.target_type === "business" && id) {
        const { data } = await supabase.from("businesses").select("id").eq("id", id).maybeSingle();
        return data ? `/dn/${id}` : "/admin";
      }
      return "/tin-nhan/admin";
    }
    case "report_submitted":
    case "report_received": return "/admin?tab=reports";
    case "report_resolved":
    case "report_reply": return "/ho-so";
    case "suggestion_approved": return "/kham-pha";
    case "suggestion_rejected": return "/ho-so";
    default: return "/";
  }
}

export default function Notifications() {
  const { items, unread, markAllRead, markRead, refresh, loading } = useNotifications();
  const nav = useNavigate();

  const tap = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id);
    const route = await resolveRoute(n);
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
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Đang tải…</p> :
        items.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground space-y-2">
            <Bell className="w-10 h-10 mx-auto opacity-30" />
            <p>Không có thông báo mới</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map(n => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "w-full flex items-stretch gap-2 rounded-xl border bg-card overflow-hidden transition",
                    !n.is_read && "border-primary/30"
                  )}
                >
                  {!n.is_read && <span className="w-1 bg-primary" aria-hidden />}
                  <button
                    onClick={() => tap(n)}
                    className={cn(
                      "flex-1 text-left min-w-0 flex items-start gap-3 p-3 hover:bg-accent/40",
                      n.is_read && "opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full grid place-items-center flex-shrink-0",
                      n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}>
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
