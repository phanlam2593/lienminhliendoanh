import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/time";
import { Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Notifications() {
  const { items, unread, markAllRead, markRead, refresh, loading } = useNotifications();
  const nav = useNavigate();

  const tap = async (n: any) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === "new_offer" && n.related_id) nav(`/dn/${n.related_id}`);
    else if (n.type === "new_message" && n.related_id) nav(`/tin-nhan/${n.related_id}`);
  };

  const del = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    refresh();
  };

  const clearRead = async () => {
    const ids = items.filter(n => n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").delete().in("id", ids);
    refresh();
  };

  const readCount = items.length - unread;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-extrabold">Thông báo</h1>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc
            </button>
          )}
          {readCount > 0 && (
            <button onClick={clearRead} className="text-xs text-destructive font-semibold flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Xóa tất cả đã đọc
            </button>
          )}
        </div>
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
              <div key={n.id}
                className={cn("w-full flex items-start gap-2 p-3 rounded-xl border", n.is_read ? "bg-card" : "bg-accent border-primary/30")}>
                <button onClick={() => tap(n)} className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                </button>
                <button onClick={(e) => del(e, n.id)}
                  aria-label="Xóa thông báo"
                  className="w-7 h-7 rounded-full hover:bg-destructive/10 text-destructive grid place-items-center flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
