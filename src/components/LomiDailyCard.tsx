import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { lomiSound } from "@/lib/lomiSound";
import { cardImg } from "@/components/LomiTarot";
import { dailyMessage, dayKey } from "@/lib/tarot";

// Popup "Lá bài hôm nay" (30/09, theo ý Kir): mở Lomi lần đầu trong ngày → nền mờ dần, lá bài trượt lên,
// lật mặt, rồi hiện ý nghĩa + lời chúc. Mỗi người 1 lá cố định trong ngày (lib/tarot.ts → dailyDraw).
const seenKey = (uid: string) => `lomi-daily-seen:${uid}`;

export function shouldShowDaily(uid: string): boolean {
  try {
    return localStorage.getItem(seenKey(uid)) !== dayKey();
  } catch {
    return false;
  }
}

export function LomiDailyCard({ uid, name, onClose, onDetail }: { uid: string; name?: string; onClose: () => void; onDetail: () => void }) {
  const msg = dailyMessage(uid);
  // 0: vừa mở · 1: nền + lá hiện lên · 2: lật mặt · 3: hiện chữ · -1: đang đóng
  const [stage, setStage] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 30);
    const t2 = setTimeout(() => {
      setStage(2);
      lomiSound("pop");
    }, 750);
    const t3 = setTimeout(() => setStage(3), 1500);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);
  const close = (then?: () => void) => {
    try {
      localStorage.setItem(seenKey(uid), dayKey());
    } catch {
      /* bỏ qua */
    }
    setStage(-1);
    setTimeout(() => (then ?? onClose)(), 280);
  };
  const today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
  const open = stage >= 1;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-5 transition-all duration-300",
        open ? "bg-black/55 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0",
      )}
      onClick={() => close()}
    >
      <div
        className={cn(
          "relative w-full max-w-[340px] rounded-3xl bg-background p-5 text-center shadow-2xl transition-all duration-500 ease-out",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => close()} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground" aria-label="Đóng">
          <X className="h-4 w-4" />
        </button>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{today}</div>
        <div className="mt-0.5 text-base font-bold">
          {name ? `${name} ơi, lá bài hôm nay của bạn nè` : "Lá bài hôm nay của bạn nè"} ✨
        </div>

        {/* Lá bài lật 3D */}
        <div className="mx-auto mt-4 h-[200px] w-[120px]" style={{ perspective: 900 }}>
          <div
            className="relative h-full w-full transition-transform duration-700 ease-out"
            style={{ transformStyle: "preserve-3d", transform: stage >= 2 ? "rotateY(0deg)" : "rotateY(180deg)" }}
          >
            {/* mặt trước */}
            <div className="absolute inset-0 overflow-hidden rounded-xl border-2 border-primary/40 bg-muted shadow-lg" style={{ backfaceVisibility: "hidden" }}>
              {imgOk ? (
                <img
                  src={cardImg(msg.draw.id)}
                  alt={msg.name}
                  onError={() => setImgOk(false)}
                  className={cn("h-full w-full object-cover", msg.draw.rev && "rotate-180")}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-sm font-semibold">{msg.name}</div>
              )}
            </div>
            {/* mặt sau */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-xl gradient-brand text-3xl text-white shadow-lg"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              ✦
            </div>
          </div>
        </div>

        <div className={cn("transition-all duration-500", stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
          <div className="mt-3 text-lg font-bold text-primary">{msg.name}</div>
          <p className="mt-1 text-sm text-foreground/90">{msg.meaning}</p>
          <div className="mt-3 rounded-2xl bg-primary/10 px-3 py-2 text-sm">💚 {msg.wish}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => close(onDetail)} className="flex-1 rounded-full border border-primary/50 py-2 text-sm font-semibold text-primary active:scale-95 transition">
              Xem giải chi tiết
            </button>
            <button onClick={() => close()} className="flex-1 rounded-full gradient-brand py-2 text-sm font-semibold text-white active:scale-95 transition">
              Nhận lời chúc 💚
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
