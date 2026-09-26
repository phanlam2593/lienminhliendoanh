import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// LINH VẬT "LOMI" — bản robot vector (27/09 theo ý Kir, chọn kiểu B "Neon tương lai").
// Thân tối không viền, mặt là tấm kính đen, 2 mắt LED xanh ngọc phát sáng (to, không miệng).
// Ăng-ten có mầm lá phát sáng ở đầu (giữ "mầm lá" nhận diện của Lomi).
// Cả gương mặt nằm ở đôi mắt — biểu cảm kiểu robot vector:
//   idle    — mắt viên thuốc, tự chớp ngẫu nhiên, thỉnh thoảng chớp đôi / nheo nghi ngờ /
//             nháy 1 mắt / cười tít / mở to tò mò; mắt nhìn theo ngón tay/chuột (track)
//   wee     — đang bị kéo: mắt tròn xoe
//   happy   — mắt cười ^ ^
//   dizzy   — mắt xoắn ốc quay vòng
//   excited — mắt trái tim đập thình thịch
//   sleepy  — mắt nhắm thành vạch, "z z" bay lên
// SVG thuần, không tải ảnh. Chuyển động chỉ dùng transform (mượt trên iOS/Android).
// ─────────────────────────────────────────────────────────────────────────────

export type LomiMood = "idle" | "wee" | "happy" | "dizzy" | "excited" | "sleepy";
type Micro = null | "blink" | "double" | "squint" | "wink" | "joy" | "big";

const EYE = "#5eead4";
const L = { x: 37, y: 61 };
const R = { x: 63, y: 61 };

export function LomiMascot({
  size = 56,
  className,
  animated = true,
  mood = "idle",
  look = 0,
  track = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
  mood?: LomiMood;
  /** Liếc mắt: -1 (trái) … 1 (phải) — dùng khi không có ngón tay/chuột để nhìn theo. */
  look?: number;
  /** Mắt nhìn theo vị trí chạm / con trỏ trên màn hình. */
  track?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number; t: number } | null>(null);
  const [micro, setMicro] = useState<Micro>(null);

  // Nhìn theo ngón tay / chuột (giới hạn trong khung kính).
  useEffect(() => {
    if (!track || !animated) return;
    let raf = 0;
    const onPt = (e: PointerEvent) => {
      if (raf) return;
      const { clientX, clientY } = e;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = svgRef.current?.getBoundingClientRect();
        if (!r) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.55;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 160);
        setGaze({ x: (dx / d) * k, y: (dy / d) * k, t: Date.now() });
      });
    };
    window.addEventListener("pointermove", onPt, { passive: true });
    window.addEventListener("pointerdown", onPt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPt);
      window.removeEventListener("pointerdown", onPt);
      cancelAnimationFrame(raf);
    };
  }, [track, animated]);

  // Hết nhìn theo sau 2,5 giây không có chuyển động → quay về liếc tự do.
  useEffect(() => {
    if (!gaze) return;
    const id = window.setTimeout(() => setGaze(null), 2500);
    return () => window.clearTimeout(id);
  }, [gaze]);

  // Cử chỉ nhỏ ngẫu nhiên khi rảnh: chớp, chớp đôi, nheo, nháy mắt, cười tít, mở to.
  useEffect(() => {
    if (!animated || mood !== "idle") {
      setMicro(null);
      return;
    }
    let t1 = 0;
    let t2 = 0;
    const next = () => {
      t1 = window.setTimeout(
        () => {
          const r = Math.random();
          const m: Micro =
            r < 0.5 ? "blink" : r < 0.65 ? "double" : r < 0.75 ? "squint" : r < 0.83 ? "wink" : r < 0.92 ? "joy" : "big";
          setMicro(m);
          const hold = m === "blink" ? 140 : m === "double" ? 420 : m === "wink" ? 380 : 1100;
          t2 = window.setTimeout(() => {
            setMicro(null);
            next();
          }, hold);
        },
        2200 + Math.random() * 3200,
      );
    };
    next();
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [animated, mood]);

  const g = gaze ?? { x: Math.max(-1, Math.min(1, look)), y: 0 };
  const off = mood === "idle" || mood === "wee" ? { x: g.x * 8, y: g.y * 5.5 } : { x: 0, y: 0 };
  const glow = `url(#lg${uid})`;

  // Mắt viên thuốc (idle/wee) — biến hình bằng scale để chuyển mượt.
  const pill = (c: { x: number; y: number }, side: "l" | "r") => {
    let sx = 1;
    let sy = 1;
    if (mood === "wee") {
      sx = 1.18;
      sy = 0.94;
    } else if (micro === "blink" || (micro === "wink" && side === "l")) sy = 0.08;
    else if (micro === "squint") sy = 0.5;
    else if (micro === "big") {
      sx = 1.15;
      sy = 1.12;
    }
    // Liếc hẳn sang 1 bên: mắt phía xa hơi nhỏ lại (cảm giác xoay đầu).
    if (mood === "idle" && !micro) {
      const far = (side === "l" && g.x > 0.5) || (side === "r" && g.x < -0.5);
      if (far) sy *= 0.9;
    }
    return (
      <g
        style={{
          transform: `translate(${off.x}px, ${off.y}px)`,
          transition: animated ? "transform 160ms ease-out" : undefined,
        }}
      >
        <rect
          x={c.x - 8}
          y={c.y - 13}
          width={16}
          height={26}
          rx={8}
          fill={EYE}
          filter={glow}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: `scale(${sx}, ${sy})`,
            transition: animated ? `transform ${micro === "double" ? 90 : 130}ms ease-out` : undefined,
          }}
          className={micro === "double" ? "lomi-dblink" : undefined}
        />
      </g>
    );
  };

  const eye = (c: { x: number; y: number }, side: "l" | "r") => {
    if (mood === "happy" || (mood === "idle" && micro === "joy"))
      return (
        <path
          d={`M${c.x - 9},${c.y + 4} Q${c.x},${c.y - 10} ${c.x + 9},${c.y + 4}`}
          stroke={EYE}
          strokeWidth={5.5}
          fill="none"
          strokeLinecap="round"
          filter={glow}
        />
      );
    if (mood === "sleepy")
      return (
        <path
          d={`M${c.x - 8},${c.y + 5} Q${c.x},${c.y + 9} ${c.x + 8},${c.y + 5}`}
          stroke={EYE}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
          filter={glow}
          opacity={0.85}
        />
      );
    if (mood === "dizzy")
      return (
        <g
          filter={glow}
          className={animated ? "lomi-spin" : undefined}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <path
            d={`M${c.x},${c.y} m-2,0 a2,2 0 1,1 4,0 a4.5,4.5 0 1,1 -9,0 a7,7 0 1,1 14,0`}
            stroke={EYE}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    if (mood === "excited")
      return (
        <g
          filter={glow}
          className={animated ? "lomi-beat" : undefined}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <path
            d={`M${c.x},${c.y + 9} C${c.x - 13},${c.y} ${c.x - 9},${c.y - 11} ${c.x},${c.y - 5} C${c.x + 9},${c.y - 11} ${c.x + 13},${c.y} ${c.x},${c.y + 9}Z`}
            fill="#f472b6"
          />
        </g>
      );
    return pill(c, side);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 -8 100 112"
      width={size}
      height={size * 1.12}
      className={cn(animated && mood !== "wee" && mood !== "dizzy" && "lomi-bob", "overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`lb${uid}`} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#24405e" />
          <stop offset="100%" stopColor="#0a1220" />
        </linearGradient>
        <linearGradient id={`lv${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02060c" />
          <stop offset="100%" stopColor="#0a1626" />
        </linearGradient>
        <filter id={`lg${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* bóng dưới chân */}
      <ellipse cx="50" cy="100" rx="26" ry="3.5" fill="#22d3ee" opacity=".16" className={animated ? "lomi-shadow" : undefined} />
      {/* ăng-ten + mầm lá phát sáng */}
      <g className={animated && mood === "wee" ? "lomi-leaf" : undefined}>
        <path d="M50,20 C50,13 52,9 56,6" stroke="#2dd4bf" strokeWidth={2.6} fill="none" strokeLinecap="round" filter={glow} />
        <path d="M55,7 C57,0 65,-2 68,1 C65,6 60,8 55,7Z" fill="#34f5c5" filter={glow} />
      </g>
      {/* thân — không viền */}
      <path d="M50,18 C74,18 92,36 92,62 C92,86 74,98 50,98 C26,98 8,86 8,62 C8,36 26,18 50,18Z" fill={`url(#lb${uid})`} />
      <ellipse cx="32" cy="32" rx="11" ry="5" fill="#fff" opacity=".1" transform="rotate(-28 32 32)" />
      {/* mặt kính */}
      <rect x="14" y="38" width="72" height="46" rx="23" fill={`url(#lv${uid})`} />
      {eye(L, "l")}
      {eye(R, "r")}
      {/* z z khi ngủ */}
      {mood === "sleepy" && (
        <g fill={EYE} fontWeight={800} fontFamily="sans-serif" filter={glow}>
          <text x="76" y="22" fontSize="12" className={animated ? "lomi-z" : undefined}>
            z
          </text>
          <text x="86" y="10" fontSize="9" className={animated ? "lomi-z lomi-z2" : undefined}>
            z
          </text>
        </g>
      )}
    </svg>
  );
}
