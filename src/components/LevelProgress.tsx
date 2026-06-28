import { useEffect, useState } from "react";
import { BADGE_TIERS } from "@/lib/types";

/**
 * Animated points counter + level progress bar for a business.
 * - Animates from previous value to next on change.
 * - Shows "+1" floating pill when points increase.
 * - Progress towards next level (every 10 pts = 1 level).
 */
export function LevelProgress({
  points,
  level,
  className,
}: {
  points: number;
  level: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(points);
  const [pulse, setPulse] = useState<number | null>(null);

  useEffect(() => {
    if (display === points) return;
    const from = display;
    const to = points;
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(from + (to - from) * t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    if (to > from) {
      setPulse(to - from);
      const tm = setTimeout(() => setPulse(null), 1500);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(tm);
      };
    }
    return () => cancelAnimationFrame(raf);
  }, [points]);

  const inLevel = points % 10;
  const pct = (inLevel / 10) * 100;
  const remaining = 10 - inLevel;

  // Next badge tier
  const nextTier = BADGE_TIERS.find((t) => t.threshold > points);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs">
        <div className="font-bold">
          Lv.{level} <span className="text-muted-foreground font-medium">·</span>{" "}
          <span className="relative">
            <span className="text-primary font-extrabold tabular-nums">{display}</span>
            <span className="text-muted-foreground"> điểm</span>
            {pulse !== null && (
              <span className="absolute -top-4 left-full ml-1 text-emerald-500 font-bold text-xs animate-[float-up_1.4s_ease-out_forwards]">
                +{pulse}
              </span>
            )}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Còn {remaining} điểm đến Lv.{level + 1}
        </div>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/70 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextTier && (
        <div className="text-[10px] text-muted-foreground mt-1">
          Huy hiệu kế tiếp: {nextTier.emoji} {nextTier.label} ({points}/{nextTier.threshold})
        </div>
      )}
      <style>{`
        @keyframes float-up {
          0%   { opacity: 0; transform: translateY(4px); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-22px); }
        }
      `}</style>
    </div>
  );
}
