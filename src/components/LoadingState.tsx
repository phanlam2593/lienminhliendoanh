import { ArrowLeft, SearchX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGoBack } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Màn hình CHỜ TẢI dùng chung (25/09) — thay cho dòng chữ "Đang tải…" trơn (nhìn giống
// lỗi/treo). `full` = chiếm gần hết màn hình (dùng khi cả trang đang chờ dữ liệu).
// NotFoundState = trang/nội dung không còn tồn tại (trước đây một số trang cứ hiện "Đang
// tải…" mãi mãi khi không tìm thấy).
// ─────────────────────────────────────────────────────────────────────────────

export function LoadingState({ full = false, label, className }: { full?: boolean; label?: string; className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 text-xs text-muted-foreground",
        full ? "min-h-[55vh] py-16" : "py-8",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

export function NotFoundState({ fallback = "/", message }: { fallback?: string; message?: string }) {
  const { t } = useLanguage();
  const goBack = useGoBack();
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 p-8 text-center">
      <SearchX className="w-10 h-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message ?? t("common.contentGone")}</p>
      <button
        type="button"
        onClick={() => goBack(fallback)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold hover:bg-accent"
      >
        <ArrowLeft className="w-4 h-4" /> {t("common.back")}
      </button>
    </div>
  );
}
