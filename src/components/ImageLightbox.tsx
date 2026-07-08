import { useState } from "react";
import { X } from "lucide-react";
import { StoredImage } from "./StoredImage";

export function LightboxImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!path) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full h-full cursor-zoom-in" aria-label="Xem ảnh cỡ lớn">
        <StoredImage path={path} alt={alt ?? ""} className={className} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white grid place-items-center"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
            <StoredImage path={path} alt={alt ?? ""} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </>
  );
}
