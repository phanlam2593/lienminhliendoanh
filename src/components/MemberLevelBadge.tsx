import { getMemberTierProgress } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export function MemberLevelBadge({
  points,
  isAdmin,
  size = "sm",
}: {
  points: number;
  isAdmin?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  if (isAdmin) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold text-primary shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}
      >
        👑 BQT
      </span>
    );
  }
  // 28/09 theo ý Kir: bỏ thanh tiến độ level ở mọi nơi — chỉ còn nhãn hạng.
  const { current } = getMemberTierProgress(points);
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
      {current ? (
        <span className="font-semibold text-primary">
          {current.emoji} {t(`tier.${current.type}`)}
        </span>
      ) : (
        <span className="text-muted-foreground">{t("level.newMember")}</span>
      )}
    </span>
  );
}
