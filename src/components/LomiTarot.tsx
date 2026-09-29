import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { lomiSound } from "@/lib/lomiSound";
import {
  TAROT_SPREADS,
  TAROT_TOPICS,
  tarotCard,
  type TarotReading,
  type TarotSpread,
  type TarotTopic,
} from "@/lib/tarot";

// Giao diện bói Tarot trong khung chat Lomi (30/09) — xem lib/tarot.ts. Lá bài tự vẽ bằng CSS +
// emoji (không dùng ảnh bộ bài có bản quyền, không tốn dung lượng).

/** Chọn chủ đề + kiểu trải bài. */
export function TarotPicker({
  lang,
  initialTopic,
  onPick,
}: {
  lang: "vi" | "en";
  initialTopic?: TarotTopic;
  onPick: (topic: TarotTopic, spread: TarotSpread) => void;
}) {
  const [topic, setTopic] = useState<TarotTopic>(initialTopic ?? "general");
  const en = lang === "en";
  return (
    <div className="mt-2 w-full max-w-[85%] rounded-2xl border bg-card/80 p-3 space-y-2.5">
      <div className="text-[11px] font-semibold text-muted-foreground">{en ? "1. Pick a topic" : "1. Chọn chủ đề"}</div>
      <div className="flex flex-wrap gap-1.5">
        {TAROT_TOPICS.map((tp) => (
          <button
            key={tp.id}
            onClick={() => setTopic(tp.id)}
            className={cn(
              "text-[12px] px-2.5 py-1 rounded-full border transition active:scale-95",
              tp.id === topic ? "bg-primary text-primary-foreground border-primary" : "bg-background",
            )}
          >
            {tp.emoji} {en ? tp.en : tp.vi}
          </button>
        ))}
      </div>
      <div className="text-[11px] font-semibold text-muted-foreground">{en ? "2. Draw" : "2. Rút bài"}</div>
      <div className="flex flex-col gap-1.5">
        {TAROT_SPREADS.map((sp) => (
          <button
            key={sp.id}
            onClick={() => onPick(topic, sp.id)}
            className="w-full text-left text-[13px] font-semibold px-3 py-2 rounded-xl bg-gradient-brand text-white active:scale-[0.98] transition"
          >
            🔮 {en ? sp.en : sp.vi}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const sp = TAROT_SPREADS.find((s) => s.id === reading.spread);

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
              {reading.cards.length > 1 && sp && <div className="font-semibold">{en ? sp.pos[i].en : sp.pos[i].vi}</div>}
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
