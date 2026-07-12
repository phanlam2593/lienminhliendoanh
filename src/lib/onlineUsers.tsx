import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceEntry {
  online_at: string;
  location?: string | null;
  topic?: string | null;
}

interface OnlineCtxValue {
  online: Map<string, PresenceEntry>;
  setMyChannel: (location: string | null, topic: string | null) => void;
}

const OnlineCtx = createContext<OnlineCtxValue>({
  online: new Map(),
  setMyChannel: () => {},
});

// Đăng ký "báo danh" 1 lần cho cả app (không chỉ riêng trang Cộng đồng) —
// "online" nghĩa là đang mở app, dùng Supabase Realtime Presence, không tốn ghi DB.
// Từ bản nâng cấp đa kênh: mỗi người online còn "báo danh" thêm đang ở kênh nào
// (location + topic) — Community.tsx cập nhật qua setMyChannel() mỗi khi đổi kênh.
export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState<Map<string, PresenceEntry>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myChannelRef = useRef<{ location: string | null; topic: string | null }>({ location: null, topic: null });

  useEffect(() => {
    if (!user) {
      setOnline(new Map());
      channelRef.current = null;
      return;
    }
    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<PresenceEntry>();
      const m = new Map<string, PresenceEntry>();
      Object.entries(state).forEach(([id, arr]) => {
        if (arr[0]) m.set(id, arr[0] as unknown as PresenceEntry);
      });
      setOnline(m);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
            location: myChannelRef.current.location,
            topic: myChannelRef.current.topic,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id]);

  const setMyChannel = (location: string | null, topic: string | null) => {
    myChannelRef.current = { location, topic };
    // Lúc mới vào app, presence channel đôi khi chưa kịp sẵn sàng (SUBSCRIBED) —
    // thử lại vài lần thay vì bỏ cuộc ngay. QUAN TRỌNG: mỗi lần thử lại phải đọc
    // myChannelRef.current MỚI NHẤT (không phải giá trị "chụp" lúc gọi lần đầu),
    // để không bị đè bởi dữ liệu cũ nếu người dùng đã đổi kênh trong lúc chờ.
    const tryTrack = (attemptsLeft: number) => {
      if (channelRef.current) {
        void channelRef.current.track({
          online_at: new Date().toISOString(),
          location: myChannelRef.current.location,
          topic: myChannelRef.current.topic,
        });
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryTrack(attemptsLeft - 1), 300);
      }
    };
    tryTrack(6);
  };

  return <OnlineCtx.Provider value={{ online, setMyChannel }}>{children}</OnlineCtx.Provider>;
}

// Giữ nguyên hành vi cũ: trả về Map (dùng .has(id) y hệt Set cũ) — không phá vỡ chỗ nào
// đang dùng useOnlineUsers() trước đây. Giờ Map còn hỗ trợ .get(id) để lấy location/topic.
export function useOnlineUsers() {
  return useContext(OnlineCtx).online;
}

export function useSetMyChannel() {
  return useContext(OnlineCtx).setMyChannel;
}
