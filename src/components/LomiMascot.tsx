import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// LINH VẬT "LOMI" (26/09) — bé "bánh bao" xanh ngọc (cùng kiểu với các bé trong màn chào mừng),
// trên đầu có mầm lá non (Đà Lạt, cộng đồng đang lớn). Mắt tự chớp, người nhún nhẹ.
// Dùng cho bong bóng Trợ lý AI và ảnh đại diện trong khung chat AI. SVG thuần, không tải ảnh.
// ─────────────────────────────────────────────────────────────────────────────

export function LomiMascot({
  size = 56,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 104"
      width={size}
      height={size * 1.04}
      className={cn(animated && "lomi-bob", className)}
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
      <path d="M50,20 C50,14 50,11 51,8" stroke="#059669" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M51,9 C56,1 67,2 68,7 C62,11 56,12 51,9Z" fill="#4ade80" />
      <path d="M50,11 C45,5 36,6 35,10 C40,14 46,14 50,11Z" fill="#22c55e" />
      {/* thân */}
      <path d="M50,18 C74,18 92,36 92,62 C92,86 74,98 50,98 C26,98 8,86 8,62 C8,36 26,18 50,18Z" fill="url(#lomi-body)" />
      <path
        d="M50,18 C74,18 92,36 92,62 C92,86 74,98 50,98 C36,98 24,94 16,85 C38,92 76,84 78,54 C79,36 68,22 50,18Z"
        fill="#0369a1"
        opacity=".18"
      />
      {/* bóng sáng */}
      <ellipse cx="30" cy="36" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 30 36)" />
      {/* mắt */}
      <g className={animated ? "lomi-eye" : undefined}>
        <ellipse cx="36" cy="58" rx="5.5" ry="6.5" fill="#0f172a" />
        <circle cx="38" cy="55.5" r="2" fill="#fff" />
      </g>
      <g className={animated ? "lomi-eye" : undefined}>
        <ellipse cx="64" cy="58" rx="5.5" ry="6.5" fill="#0f172a" />
        <circle cx="66" cy="55.5" r="2" fill="#fff" />
      </g>
      {/* má hồng + miệng */}
      <ellipse cx="25" cy="69" rx="6" ry="3.6" fill="#fda4af" opacity=".8" />
      <ellipse cx="75" cy="69" rx="6" ry="3.6" fill="#fda4af" opacity=".8" />
      <path d="M43,70 Q50,78 57,70" stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* tay nhỏ vẫy */}
      <path d="M90,60 C97,55 99,49 96,46" stroke="#0ea5e9" strokeWidth={5} fill="none" strokeLinecap="round" className={animated ? "lomi-wave" : undefined} />
    </svg>
  );
}
