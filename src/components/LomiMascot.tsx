import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// LINH VẬT "LOMI" (26/09) — bé "bánh bao" xanh ngọc (cùng kiểu với các bé trong màn chào mừng),
// trên đầu có mầm lá non (Đà Lạt, cộng đồng đang lớn). Mắt tự chớp, người nhún nhẹ.
// Dùng cho bong bóng Trợ lý AI và ảnh đại diện trong khung chat AI. SVG thuần, không tải ảnh.
//
// Biểu cảm (mood):
//   idle    — cười hiền, chớp mắt, thỉnh thoảng liếc (look)
//   wee     — đang bị kéo đi: mắt tròn xoe, miệng "Ô"
//   happy   — vừa được thả xuống: mắt cười ^ ^, miệng há vui
//   dizzy   — bị lắc qua lắc lại mạnh: mắt xoắn ốc, miệng méo, sao quay trên đầu
//   excited — được chạm vào: mắt lấp lánh, miệng há to, má đỏ hơn
//   sleepy  — lâu không ai đụng tới: nhắm mắt, "z z" bay lên
// ─────────────────────────────────────────────────────────────────────────────

export type LomiMood = "idle" | "wee" | "happy" | "dizzy" | "excited" | "sleepy";

export function LomiMascot({
  size = 56,
  className,
  animated = true,
  mood = "idle",
  look = 0,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
  mood?: LomiMood;
  /** Liếc mắt: -1 (trái) … 1 (phải). */
  look?: number;
}) {
  const lx = Math.max(-1, Math.min(1, look)) * 3.5;
  const blink = animated && (mood === "idle" || mood === "wee");
  const eye = (cx: number) => {
    if (mood === "happy" || mood === "excited")
      return mood === "happy" ? (
        <path d={`M${cx - 6},60 Q${cx},51 ${cx + 6},60`} stroke="#0f172a" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <ellipse cx={cx} cy={57} rx={6.5} ry={7.5} fill="#0f172a" />
          <circle cx={cx + 2.5} cy={54} r={2.6} fill="#fff" />
          <circle cx={cx - 2.2} cy={60} r={1.3} fill="#fff" />
        </g>
      );
    if (mood === "sleepy")
      return <path d={`M${cx - 6},59 Q${cx},64 ${cx + 6},59`} stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round" />;
    if (mood === "dizzy")
      return (
        <g className={animated ? "lomi-spin" : undefined} style={{ transformOrigin: `${cx}px 58px` }}>
          <circle cx={cx} cy={58} r={6} stroke="#0f172a" strokeWidth={2.2} fill="none" />
          <path d={`M${cx - 3},58 a3,3 0 1,1 3,3`} stroke="#0f172a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      );
    const big = mood === "wee";
    return (
      <g className={blink ? "lomi-eye" : undefined}>
        <ellipse cx={cx + lx} cy={58} rx={big ? 6.5 : 5.5} ry={big ? 7.5 : 6.5} fill="#0f172a" />
        <circle cx={cx + lx + 2} cy={55.5} r={2} fill="#fff" />
      </g>
    );
  };
  const mouth = () => {
    switch (mood) {
      case "wee":
        return <ellipse cx={50} cy={73} rx={4.5} ry={5.5} fill="#0f172a" />;
      case "happy":
      case "excited":
        return (
          <g>
            <path d="M41,69 Q50,83 59,69 Z" fill="#0f172a" />
            <path d="M45,74 Q50,79 55,74 Q50,76 45,74Z" fill="#fb7185" />
          </g>
        );
      case "dizzy":
        return <path d="M41,73 Q45.5,69 50,73 T59,73" stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round" />;
      case "sleepy":
        return <ellipse cx={50} cy={73} rx={3} ry={2.2} fill="#0f172a" />;
      default:
        return <path d="M43,70 Q50,78 57,70" stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round" />;
    }
  };
  return (
    <svg
      viewBox="0 -8 100 112"
      width={size}
      height={size * 1.12}
      className={cn(animated && mood !== "wee" && mood !== "dizzy" && "lomi-bob", "overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="lomi-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34e3c4" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      {/* bóng dưới chân */}
      <ellipse cx="50" cy="100" rx="26" ry="3.5" fill="#0f172a" opacity=".12" className={animated ? "lomi-shadow" : undefined} />
      {/* mầm lá */}
      <g className={animated && mood === "wee" ? "lomi-leaf" : undefined}>
        <path d="M50,20 C50,14 50,11 51,8" stroke="#059669" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d="M51,9 C56,1 67,2 68,7 C62,11 56,12 51,9Z" fill="#4ade80" />
        <path d="M50,11 C45,5 36,6 35,10 C40,14 46,14 50,11Z" fill="#22c55e" />
      </g>
      {/* thân */}
      <path d="M50,18 C74,18 92,36 92,62 C92,86 74,98 50,98 C26,98 8,86 8,62 C8,36 26,18 50,18Z" fill="url(#lomi-body)" />
      <path
        d="M50,18 C74,18 92,36 92,62 C92,86 74,98 50,98 C36,98 24,94 16,85 C38,92 76,84 78,54 C79,36 68,22 50,18Z"
        fill="#0369a1"
        opacity=".18"
      />
      {/* bóng sáng */}
      <ellipse cx="30" cy="36" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 30 36)" />
      {eye(36)}
      {eye(64)}
      {/* má hồng + miệng */}
      <ellipse cx="25" cy="69" rx="6" ry="3.6" fill="#fda4af" opacity={mood === "excited" || mood === "happy" ? 1 : 0.8} />
      <ellipse cx="75" cy="69" rx="6" ry="3.6" fill="#fda4af" opacity={mood === "excited" || mood === "happy" ? 1 : 0.8} />
      {mouth()}
      {/* tay: vẫy khi bình thường, giơ lên khi bị kéo / vui */}
      {mood === "wee" || mood === "happy" || mood === "excited" ? (
        <>
          <path d="M90,56 C97,48 98,40 95,36" stroke="#0ea5e9" strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d="M10,56 C3,48 2,40 5,36" stroke="#14d3b5" strokeWidth={5} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <path
          d="M90,60 C97,55 99,49 96,46"
          stroke="#0ea5e9"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          className={animated && mood === "idle" ? "lomi-wave" : undefined}
        />
      )}
      {/* sao quay khi chóng mặt */}
      {mood === "dizzy" && (
        <g className={animated ? "lomi-orbit" : undefined} style={{ transformOrigin: "50px 14px" }}>
          <path d="M30,12 l2,4 4,1 -3,3 1,4 -4,-2 -4,2 1,-4 -3,-3 4,-1Z" fill="#fde047" />
          <path d="M70,10 l1.6,3.2 3.2,.8 -2.4,2.4 .8,3.2 -3.2,-1.6 -3.2,1.6 .8,-3.2 -2.4,-2.4 3.2,-.8Z" fill="#fde047" />
        </g>
      )}
      {/* z z khi ngủ */}
      {mood === "sleepy" && (
        <g fill="#0ea5e9" fontWeight={800} fontFamily="sans-serif">
          <text x="74" y="22" fontSize="12" className={animated ? "lomi-z" : undefined}>z</text>
          <text x="84" y="10" fontSize="9" className={animated ? "lomi-z lomi-z2" : undefined}>z</text>
        </g>
      )}
      {/* lấp lánh khi được chạm */}
      {mood === "excited" && (
        <g fill="#fde047">
          <path d="M14,24 l1.5,4 4,1.5 -4,1.5 -1.5,4 -1.5,-4 -4,-1.5 4,-1.5Z" />
          <path d="M86,22 l1.2,3 3,1.2 -3,1.2 -1.2,3 -1.2,-3 -3,-1.2 3,-1.2Z" />
        </g>
      )}
    </svg>
  );
}
