import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/time";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { items, unread, markAllRead, markRead, loading } = useNotifications();
  const nav = useNavigate();

  const tap = async (n: any) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === "new_offer" && n.related_id) nav(`/dn/${n.related_id}`);
    else if (n.type === "new_message" && n.related_id) nav(`/tin-nhan/${n.related_id}`);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Thông báo</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc
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
            {items.map(n => (
              <button key={n.id} onClick={() => tap(n)}
                className={cn("w-full text-left p-3 rounded-xl border", n.is_read ? "bg-card" : "bg-accent border-primary/30")}>
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
