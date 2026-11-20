// Báo có bản mới (15/11, anh Kir duyệt). 20/11 (Kir: thanh nổi giữa trang "nhìn như bị lỗi") → đổi thành hộp thoại pop-up rõ ràng:
//   tiêu đề + 1 câu giải thích + nút "Cập nhật" (tải lại) / "Để sau" (ẩn tới lần mở app sau).
// lib/pwa.ts bắn sự kiện "pwa:update-ready" khi service worker MỚI vừa nắm quyền điều khiển trang (không bắn ở lần cài
// đầu tiên). Bản mới đã tải xong ngầm; trang đang mở vẫn chạy mã cũ tới khi tải lại → mời người dùng tải lại.
// Đang có cuộc gọi thì KHÔNG hiện (tải lại sẽ cắt cuộc gọi) — chờ cuộc gọi kết thúc rồi mới hiện.
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCall } from "@/lib/call";
import { useLanguage } from "@/lib/i18n";
import { isUpdateReady } from "@/lib/pwa";

export default function UpdatePrompt() {
  const { t } = useLanguage();
  const { state } = useCall();
  const [ready, setReady] = useState(isUpdateReady());
  const [later, setLater] = useState(false);

  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener("pwa:update-ready", on);
    return () => window.removeEventListener("pwa:update-ready", on);
  }, []);

  const open = ready && !later && state.status === "idle";
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && setLater(true)}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
        <AlertDialogHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full gradient-brand text-white">
            <RefreshCw className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">{t("pwa.updateTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">{t("pwa.updateDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <AlertDialogCancel className="mt-0">{t("pwa.updateLater")}</AlertDialogCancel>
          <AlertDialogAction className="gradient-brand text-white border-0" onClick={() => window.location.reload()}>
            {t("pwa.updateAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
