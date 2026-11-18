// Thanh báo "Có bản mới — chạm để tải lại" (15/11, anh Kir duyệt).
// lib/pwa.ts bắn sự kiện "pwa:update-ready" khi service worker MỚI vừa nắm quyền điều khiển trang (không bắn ở lần cài
// đầu tiên). Bản mới đã tải xong ngầm; trang đang mở vẫn chạy mã cũ tới khi tải lại → mời người dùng chạm để tải lại.
// Đang có cuộc gọi thì KHÔNG hiện (tải lại sẽ cắt cuộc gọi) — chờ cuộc gọi kết thúc rồi mới hiện.
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCall } from "@/lib/call";
import { useLanguage } from "@/lib/i18n";
import { isUpdateReady } from "@/lib/pwa";

export default function UpdatePrompt() {
  const { t } = useLanguage();
  const { state } = useCall();
  const [ready, setReady] = useState(isUpdateReady());

  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener("pwa:update-ready", on);
    return () => window.removeEventListener("pwa:update-ready", on);
  }, []);

  if (!ready || state.status !== "idle") return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 rounded-full gradient-brand text-white text-sm font-medium px-4 py-2.5 shadow-lg active:scale-95 transition-transform max-w-[92vw]"
      style={{ bottom: "calc(var(--bottom-nav-h, 5rem) + 0.75rem)" }}
      aria-label={t("pwa.updateTitle")}
    >
      <RefreshCw className="w-4 h-4 shrink-0" />
      <span className="truncate">{t("pwa.updateBar")}</span>
    </button>
  );
}
