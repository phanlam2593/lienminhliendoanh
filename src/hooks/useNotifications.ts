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
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase.channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = items.filter(n => !n.is_read).length;
  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    refresh();
  };
  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems(items.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return { items, unread, loading, refresh, markAllRead, markRead };
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = async () => {
    if (!user) { setCount(0); return; }
    const { count: c } = await supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id).eq("is_read", false);
    setCount(c ?? 0);
  };

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase.channel(`msg:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return count;
}
