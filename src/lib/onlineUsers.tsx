import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const OnlineCtx = createContext<Set<string>>(new Set());

// Đăng ký "báo danh" 1 lần cho cả app (không chỉ riêng trang Cộng đồng) —
// "online" nghĩa là đang mở app, dùng Supabase Realtime Presence, không tốn ghi DB.
export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnline(new Set());
      return;
    }
    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      const state = channel.presenceState();
      setOnline(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return <OnlineCtx.Provider value={online}>{children}</OnlineCtx.Provider>;
}

export function useOnlineUsers() {
  return useContext(OnlineCtx);
}
