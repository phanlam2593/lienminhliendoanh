import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Notification, Message } from "@/lib/types";

const rand = () => Math.random().toString(36).slice(2, 8);

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    // QUAN TRỌNG (hiệu năng ở quy mô lớn): trước đây MỌI sự kiện realtime (INSERT/UPDATE/DELETE)
    // đều gọi refresh() → chạy lại nguyên query 50 dòng. Với người dùng có nhiều hoạt động dồn dập
    // (nhiều follow/deal cùng lúc) sẽ tạo nhiều query lặp không cần thiết. Giờ cập nhật state
    // tăng dần theo đúng payload, không query lại toàn bộ.
    const ch = supabase
      .channel(`notif:${user.id}:${rand()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 50)));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setItems((prev) => prev.filter((n) => n.id !== oldRow.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const unread = items.filter((n) => !n.is_read).length;
  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    refresh();
  };
  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems(items.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const deleteAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id).eq("is_read", true);
    refresh();
  };

  return { items, unread, loading, refresh, markAllRead, markRead, deleteAllRead };
}

// Bong bóng avatar nổi lên khi có tin nhắn MỚI tới (kiểu "chat head" của Messenger) — lắng
// nghe đúng sự kiện INSERT tin nhắn gửi tới mình, lấy avatar người gửi để hiện bong bóng.
// Nhiều người nhắn cùng lúc → nhiều bong bóng cùng hiện (mỗi người 1 cái, không trùng),
// không tự tắt — chỉ tắt khi kéo vào vùng X hoặc bấm mở đúng đoạn chat đó.
export interface IncomingMsgPopup {
  senderId: string;
  name: string;
  avatar: string | null;
}

export function useNewMessagePopups() {
  const { user } = useAuth();
  const [popups, setPopups] = useState<IncomingMsgPopup[]>([]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`msgpopup:${user.id}:${rand()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as Message;
          if (row.type === "broadcast") return;
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("id", row.sender_id)
            .maybeSingle();
          setPopups((prev) => {
            if (prev.some((p) => p.senderId === row.sender_id)) return prev;
            return [
              ...prev,
              {
                senderId: row.sender_id,
                name: (prof as any)?.full_name || (prof as any)?.username || "?",
                avatar: (prof as any)?.avatar_url ?? null,
              },
            ];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const dismiss = (senderId: string) => setPopups((prev) => prev.filter((p) => p.senderId !== senderId));
  return { popups, dismiss };
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { count: c } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);
    setCount(c ?? 0);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`msg:${user.id}:${rand()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return count;
}
