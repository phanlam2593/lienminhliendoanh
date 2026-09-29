import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { lomiSound } from "@/lib/lomiSound";
import { TAROT_SPREADS, tarotCard, type TarotReading } from "@/lib/tarot";

// Giao diện bói Tarot trong khung chat Lomi (30/09) — xem lib/tarot.ts. Lá bài tự vẽ bằng CSS +
// emoji (không dùng ảnh bộ bài có bản quyền, không tốn dung lượng).

/** Hàng lá bài. animate = lật lần lượt từng lá (chỉ với lượt vừa rút, lịch sử cũ hiện ngửa sẵn). */
export function TarotCards({
  reading,
  lang,
  animate,
  children,
  onDone,
}: {
  reading: TarotReading;
  lang: "vi" | "en";
  animate: boolean;
  children?: React.ReactNode; // lời giải — chỉ hiện sau khi lật xong hết các lá
  onDone?: () => void; // lật xong (để khung chat cuộn xuống lời giải)
}) {
  const en = lang === "en";
  const [shown, setShown] = useState(animate ? 0 : reading.cards.length);
  useEffect(() => {
    if (!animate) return;
    const timers = reading.cards.map((_, i) =>
      window.setTimeout(() => {
        setShown(i + 1);
        lomiSound(i === reading.cards.length - 1 ? "happy" : "pop");
      }, 450 + i * 650),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Nhãn vị trí: lượt bói mới lưu sẵn reading.pos; lịch sử cũ (trước 30/09 r2) tra theo spread.
  const pos = reading.pos ?? TAROT_SPREADS.find((s) => s.id === reading.spread)?.pos ?? [];

  const done = shown >= reading.cards.length;
  useEffect(() => {
    if (animate && done) window.setTimeout(() => onDone?.(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <>
    <div className="flex justify-center gap-2 py-1 mb-2">
      {reading.cards.map((d, i) => {
        const c = tarotCard(d.id);
        const up = i < shown;
        const major = c.suit === "major";
        return (
          <div key={i} className="flex flex-col items-center gap-1 w-[76px]">
            <div className="w-[76px] h-[118px] [perspective:600px]">
              <div
                className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: up ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* Mặt sau */}
                <div className="absolute inset-0 rounded-lg bg-gradient-brand shadow-md [backface-visibility:hidden] grid place-items-center border-2 border-white/70">
                  <div className="absolute inset-1.5 rounded-md border border-white/40" />
                  <span className="text-white/90 text-2xl">✦</span>
                </div>
                {/* Mặt trước */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 overflow-hidden",
                    major ? "border-amber-400 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/60 dark:to-card" : "border-primary/60 bg-card",
                  )}
                >
                  <div
                    className="w-full h-full flex flex-col items-center justify-between py-1.5 px-1"
                    style={{ transform: d.rev ? "rotate(180deg)" : undefined }}
                  >
                    <span className={cn("text-[10px] font-bold", major ? "text-amber-600 dark:text-amber-400" : "text-primary")}>
                      {c.corner}
                    </span>
                    <span className="text-[30px] leading-none">{c.symbol}</span>
                    <span className="text-[9px] font-semibold leading-tight text-center text-foreground line-clamp-2">
                      {en ? c.name.en : c.name.vi}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-center leading-tight min-h-[24px]">
              {reading.cards.length > 1 && pos[i] && <div className="font-semibold line-clamp-2">{en ? pos[i].en : pos[i].vi}</div>}
              {up && d.rev && <div className="text-rose-500">{en ? "Reversed" : "Ngược"}</div>}
            </div>
          </div>
        );
      })}
    </div>
    {done ? (
      <div className={cn(animate && "animate-in fade-in duration-500")}>{children}</div>
    ) : (
      <div className="text-center text-xs text-muted-foreground animate-pulse">{en ? "Flipping the cards…" : "Lomi đang lật bài…"}</div>
    )}
    </>
  );
}
