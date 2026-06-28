import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BADGE_TIERS, type Badge } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Compact horizontal row of badge icons (earned + locked) for the business header.
 */
export function BadgeRow({ businessId, points }: { businessId: string; points: number }) {
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`badges:${businessId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "badges", filter: `business_id=eq.${businessId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [businessId]);

  const load = async () => {
    const { data } = await supabase.from("badges").select("badge_type").eq("business_id", businessId);
    setEarned(new Set((data ?? []).map((d: any) => d.badge_type)));
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1.5">
        {BADGE_TIERS.map((t) => {
          const has = earned.has(t.type);
          return (
            <Tooltip key={t.type}>
              <TooltipTrigger asChild>
                <div
                  className={`relative w-8 h-8 rounded-full grid place-items-center text-base ${
                    has
                      ? `bg-gradient-to-br ${t.color} text-white shadow-sm`
                      : "bg-muted text-muted-foreground/60"
                  }`}
                  aria-label={t.label}
                >
                  {has ? t.emoji : <Lock className="w-3.5 h-3.5" />}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {has ? (
                  <span>
                    {t.emoji} {t.label}
                  </span>
                ) : (
                  <span>
                    🔒 {t.label} · cần {t.threshold} điểm ({Math.min(points, t.threshold)}/{t.threshold})
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/**
 * Full badge collection grid for the "Huy hiệu" tab.
 */
export function BadgeCollection({ businessId, points }: { businessId: string; points: number }) {
  const [earned, setEarned] = useState<Map<string, Badge>>(new Map());

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("badges")
        .select("*")
        .eq("business_id", businessId)
        .order("earned_at");
      const m = new Map<string, Badge>();
      (data ?? []).forEach((b: any) => m.set(b.badge_type, b));
      setEarned(m);
    })();
  }, [businessId]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {BADGE_TIERS.map((t) => {
          const got = earned.get(t.type);
          const progress = Math.min(100, (points / t.threshold) * 100);
          return (
            <div
              key={t.type}
              className={`p-3 rounded-2xl border ${got ? "bg-card" : "bg-muted/40"} flex flex-col items-center text-center gap-1.5`}
            >
              <div
                className={`w-14 h-14 rounded-full grid place-items-center text-3xl ${
                  got ? `bg-gradient-to-br ${t.color} text-white shadow-md` : "bg-muted text-muted-foreground/60"
                }`}
              >
                {got ? t.emoji : <Lock className="w-6 h-6" />}
              </div>
              <div className="text-xs font-bold leading-tight">{t.label}</div>
              {got ? (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Đã nhận · {new Date(got.earned_at).toLocaleDateString("vi-VN")}
                </div>
              ) : (
                <>
                  <div className="text-[10px] text-muted-foreground">Cần {t.threshold} điểm</div>
                  <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
