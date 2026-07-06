import { getTopMemberBadge } from "@/lib/types";

export function MemberLevelBadge({
  level,
  points,
  isAdmin,
  size = "sm",
}: {
  level: number;
  points: number;
  isAdmin?: boolean;
  size?: "sm" | "md";
}) {
  if (isAdmin) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold text-primary shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}
      >
        👑 BQT
      </span>
    );
  }
  const badge = getTopMemberBadge(points);
  const progress = points % 10;
  const barWidth = size === "sm" ? "w-8" : "w-12";
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
      <span className="font-semibold text-primary">Lv.{level}</span>
      <span className={`h-1.5 ${barWidth} rounded-full bg-muted overflow-hidden shrink-0`}>
        <span className="h-full block rounded-full bg-primary" style={{ width: `${(progress / 10) * 100}%` }} />
      </span>
      {badge && <span title={badge.label}>{badge.emoji}</span>}
    </span>
  );
}
