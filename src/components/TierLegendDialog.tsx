import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MEMBER_BADGE_TIERS } from "@/lib/types";

export function TierLegendDialog({
  open,
  onOpenChange,
  points,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  points: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Các bậc thành viên</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Tích điểm bằng cách claim ưu đãi, được claim ưu đãi (nếu bạn có doanh nghiệp), hoặc hoàn thành Trao đổi giữa
          2 doanh nghiệp.
        </p>
        <div className="space-y-1.5">
          {MEMBER_BADGE_TIERS.map((t) => {
            const reached = points >= t.threshold;
            return (
              <div
                key={t.type}
                className={`flex items-center justify-between p-2.5 rounded-xl ${reached ? "bg-primary/10" : "bg-muted/50"}`}
              >
                <span
                  className={`text-sm font-semibold flex items-center gap-2 ${reached ? "text-primary" : "text-muted-foreground"}`}
                >
                  {t.emoji} {t.label}
                  {reached && <span className="text-[10px] font-bold text-primary">✓ Đã đạt</span>}
                </span>
                <span className="text-xs text-muted-foreground">{t.threshold.toLocaleString("vi-VN")} điểm</span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
