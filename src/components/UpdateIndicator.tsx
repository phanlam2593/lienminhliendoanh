import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { applyUpdate, getUpdateStatus, onUpdateStatusChange, type UpdateStatus } from "@/lib/pwa";
import { useLanguage } from "@/lib/i18n";

export function UpdateIndicator() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<UpdateStatus>(getUpdateStatus());
  const [applying, setApplying] = useState(false);

  useEffect(() => onUpdateStatusChange(setStatus), []);

  const handleClick = () => {
    if (status !== "available" || applying) return;
    setApplying(true);
    applyUpdate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={status !== "available" || applying}
      title={applying ? t("update.applying") : status === "available" ? t("update.available") : t("update.current")}
      aria-label={
        applying ? t("update.applying") : status === "available" ? t("update.available") : t("update.current")
      }
      className="relative w-8 h-8 grid place-items-center shrink-0"
    >
      <RefreshCw className={`w-4 h-4 text-muted-foreground ${applying ? "animate-spin" : ""}`} />
      <span
        className={`absolute top-1 right-1 w-2 h-2 rounded-full ${status === "available" ? "bg-red-500" : "bg-emerald-500"}`}
      />
    </button>
  );
}
