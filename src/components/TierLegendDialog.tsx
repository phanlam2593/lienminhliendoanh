import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MEMBER_BADGE_TIERS } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export function TierLegendDialog({
  open,
  onOpenChange,
  points,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  points: number;
}) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("tierLegend.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{t("tierLegend.desc")}</p>
        <div className="space-y-1.5">
          {MEMBER_BADGE_TIERS.map((tier) => {
            const reached = points >= tier.threshold;
            return (
              <div
                key={tier.type}
                className={`flex items-center justify-between p-2.5 rounded-xl ${reached ? "bg-primary/10" : "bg-muted/50"}`}
              >
                <span
                  className={`text-sm font-semibold flex items-center gap-2 ${reached ? "text-primary" : "text-muted-foreground"}`}
                >
                  {tier.emoji} {t(`tier.${tier.type}`)}
                  {reached && <span className="text-[10px] font-bold text-primary">✓ {t("tierLegend.reached")}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("tierLegend.points", { n: tier.threshold.toLocaleString("vi-VN") })}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
