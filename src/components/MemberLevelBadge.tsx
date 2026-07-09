import { getMemberTierProgress } from "@/lib/types";

export function MemberLevelBadge({
  points,
  isAdmin,
  size = "sm",
}: {
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
  const { current, pct } = getMemberTierProgress(points);
  const barWidth = size === "sm" ? "w-8" : "w-12";
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
      {current ? (
        <span className="font-semibold text-primary">
          {current.emoji} {current.label}
        </span>
      ) : (
        <span className="text-muted-foreground">Thành viên mới</span>
      )}
      <span className={`h-1.5 ${barWidth} rounded-full bg-muted overflow-hidden shrink-0`}>
        <span className="h-full block rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
