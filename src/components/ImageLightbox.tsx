import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { StoredImage } from "./StoredImage";
import { useLanguage } from "@/lib/i18n";
import { getSignedUrl } from "@/lib/upload";

// Lấy link thật của ảnh: link tuyệt đối / đường dẫn tĩnh dùng luôn, còn lại là path trong
// storage → xin signed URL (giống StoredImage).
async function resolveUrl(path: string): Promise<string | null> {
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return (await getSignedUrl(path)) || null;
}

async function downloadImage(path: string, failMsg: string) {
  try {
    const url = await resolveUrl(path);
    if (!url) throw new Error("no url");
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `lomi-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  } catch {
    toast.error(failMsg);
  }
}

/**
 * Trình xem ảnh toàn màn hình (điều khiển từ ngoài bằng open/onClose).
 * Render qua portal ra <body> để không bị kẹt trong Dialog/khung có transform, và vẫn
 * nằm trong "cây React" của Dialog cha nên bấm vào không làm Dialog cha tự đóng.
 */
export function ImageViewer({
  path,
  open,
  onClose,
  alt,
  download = false,
}: {
  path: string | null | undefined;
  open: boolean;
  onClose: () => void;
  alt?: string;
  download?: boolean;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !path) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/95 grid place-items-center p-4 animate-in fade-in duration-150"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        {download && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              if (busy) return;
              setBusy(true);
              await downloadImage(path, t("lightbox.downloadFailed"));
              setBusy(false);
            }}
            aria-label={t("lightbox.download")}
            className="w-10 h-10 rounded-full bg-white/15 text-white grid place-items-center disabled:opacity-50"
            disabled={busy}
          >
            <Download className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={t("common.close")}
          className="w-10 h-10 rounded-full bg-white/15 text-white grid place-items-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
        <StoredImage path={path} alt={alt ?? ""} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
      </div>
    </div>,
    document.body,
  );
}

/** Ảnh bấm vào là phóng to. `download` = hiện thêm nút tải ảnh khi đang phóng to. */
export function LightboxImage({
  path,
  alt,
  className,
  download = false,
  buttonClassName,
}: {
  path: string | null | undefined;
  alt?: string;
  className?: string;
  download?: boolean;
  buttonClassName?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (!path) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClassName ?? "block w-full h-full cursor-zoom-in"}
        aria-label={t("lightbox.viewLarge")}
      >
        <StoredImage path={path} alt={alt ?? ""} className={className} />
      </button>
      <ImageViewer path={path} open={open} onClose={() => setOpen(false)} alt={alt} download={download} />
    </>
  );
}
