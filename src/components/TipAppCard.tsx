import { useState } from "react";
import { Heart, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TIP ỦNG HỘ APP (25/09) — hiện sau khi hoàn thành 1 chuyến đưa đón / nhận 1 ưu đãi.
// Giai đoạn đầu CHỈ GHI NHẬN (bảng app_tips, status 'pledged') — app chưa thu tiền thật,
// chưa có cổng thanh toán. Mỗi chuyến / mỗi lần nhận ưu đãi chỉ tip được 1 lần (server chặn).
// "Để sau" chỉ ẩn trên máy này (localStorage), không ghi gì lên server.
// ─────────────────────────────────────────────────────────────────────────────

const AMOUNTS = [5000, 10000, 20000];
const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const dismissKey = (source: string, refId: string) => `lomi_tip_dismiss_${source}_${refId}`;

function isDismissed(source: string, refId: string) {
  try {
    return localStorage.getItem(dismissKey(source, refId)) === "1";
  } catch {
    return false;
  }
}

export function TipAppCard({
  source,
  refId,
  onDone,
  compact = false,
}: {
  source: "ride" | "offer_claim";
  refId: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(() => isDismissed(source, refId));
  const [busy, setBusy] = useState<number | null>(null);
  const [thanked, setThanked] = useState<number | null>(null);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(source, refId), "1");
    } catch {
      /* chế độ ẩn danh / chặn lưu trữ → chỉ ẩn tạm */
    }
    setHidden(true);
  };

  const tip = async (amount: number) => {
    if (busy) return;
    setBusy(amount);
    const { data, error } = await (supabase as any).rpc("record_app_tip", { _amount: amount, _source: source, _ref: refId });
    setBusy(null);
    const res = data as { ok: boolean; code?: string } | null;
    if (error || !res?.ok) {
      if (res?.code === "ALREADY_TIPPED") {
        setThanked(amount);
        onDone?.();
        return;
      }
      toast.error(error?.message ?? t("common.genericError"));
      return;
    }
    setThanked(amount);
    onDone?.();
  };

  if (thanked) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center space-y-1">
        <div className="text-sm font-bold text-primary flex items-center justify-center gap-1.5">
          <Heart className="w-4 h-4 fill-current" /> {t("tip.thanks", { amount: money(thanked) })}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("tip.pledgedNote")}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border bg-card relative", compact ? "p-2.5 space-y-2" : "p-3 space-y-2.5")}>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("tip.later")}
        className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <div className="w-8 h-8 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0">
          <Heart className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">{t("tip.title")}</div>
          <p className="text-[11px] text-muted-foreground">
            {source === "ride" ? t("tip.descRide") : t("tip.descOffer")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            disabled={busy !== null}
            onClick={() => void tip(a)}
            className="h-9 rounded-xl border border-primary/40 text-primary text-sm font-bold hover:bg-primary/10 disabled:opacity-50"
          >
            {busy === a ? "…" : money(a)}
          </button>
        ))}
      </div>
      {!compact && (
        <button type="button" onClick={dismiss} className="w-full text-xs text-muted-foreground">
          {t("tip.later")}
        </button>
      )}
    </div>
  );
}
