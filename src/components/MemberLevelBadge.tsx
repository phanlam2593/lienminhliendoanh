import { getTopMemberBadge } from "@/lib/types";

export function MemberLevelBadge({
  level,
  points,
  size = "sm",
}: {
  level: number;
  points: number;
  size?: "sm" | "md";
}) {
  const badge = getTopMemberBadge(points);
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold text-primary shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}
    >
      <span>Lv.{level}</span>
      {badge && <span title={badge.label}>{badge.emoji}</span>}
    </span>
  );
}
