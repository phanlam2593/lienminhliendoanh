import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Notification } from "@/lib/types";

type Achievement = { kind: "badge" | "level"; title: string; subtitle?: string };

/**
 * Listens to incoming achievement-style notifications (`badge_earned`, `level_up`)
 * and shows a full-screen overlay with confetti + bounce animation.
 * Auto-dismisses after 3s for badges, 2s for levels. Tap to dismiss earlier.
 */
export function AchievementOverlay() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const current = queue[0];

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`achv:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          if (n.type === "badge_earned") {
            setQueue((q) => [...q, { kind: "badge", title: n.title, subtitle: n.body ?? undefined }]);
          } else if (n.type === "level_up") {
            setQueue((q) => [...q, { kind: "level", title: n.title, subtitle: n.body ?? undefined }]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!current) return;
    const ms = current.kind === "badge" ? 3000 : 2000;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setQueue((q) => q.slice(1))}
    >
      {current.kind === "badge" && <Confetti />}
      <div className="bg-card rounded-3xl px-8 py-7 max-w-xs text-center shadow-2xl animate-scale-in relative overflow-hidden">
        {current.kind === "level" && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/20 animate-pulse pointer-events-none" />
        )}
        <div className="text-6xl mb-3 inline-block animate-[bounce_0.6s_ease-out]">
          {current.kind === "badge" ? "🏅" : "⬆️"}
        </div>
        <div className="font-extrabold text-base leading-snug">{current.title}</div>
        {current.subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{current.subtitle}</div>
        )}
        <div className="text-[10px] text-muted-foreground mt-3">Chạm để đóng</div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  const colors = ["#00c9a7", "#0891b2", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 1.4 + Math.random() * 1.2;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 6;
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: "-10px",
              width: size,
              height: size * 1.6,
              background: color,
              animation: `confetti-fall ${dur}s ${delay}s linear forwards`,
            }}
            className="absolute rounded-sm opacity-90"
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg);    opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
