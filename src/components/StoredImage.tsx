import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/upload";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string | null | undefined;
  fallbackClassName?: string;
}

const MAX_AUTO_RETRIES = 2;

export function StoredImage({ path, className, fallbackClassName, alt = "", ...rest }: Props) {
  const [url, setUrl] = useState<string>("");
  const [err, setErr] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    setErr(false);
    setUrl("");
    if (!path) return;
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }

    // QUAN TRỌNG: lấy link ảnh (signed URL) đôi khi thất bại tạm thời (mạng chập chờn,
    // API timeout...) — trước đây nếu thất bại thì kẹt mãi ở trạng thái "đang tải", không
    // bao giờ báo lỗi hay tự thử lại. Giờ tự thử lại tối đa 2 lần, cách nhau 1.2s, mới
    // thật sự báo lỗi (hiện icon ảnh vỡ, bấm vào để thử lại thủ công).
    const tryLoad = async (attemptsLeft: number) => {
      const u = await getSignedUrl(path);
      if (cancel) return;
      if (u) {
        setUrl(u);
        return;
      }
      if (attemptsLeft > 0) {
        setTimeout(() => {
          if (!cancel) void tryLoad(attemptsLeft - 1);
        }, 1200);
      } else {
        setErr(true);
      }
    };
    void tryLoad(MAX_AUTO_RETRIES);
    return () => {
      cancel = true;
    };
  }, [path, retryKey]);

  if (!path) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName || className,
        )}
      >
        <ImageOff className="w-6 h-6 opacity-50" />
      </div>
    );
  }

  if (err) {
    return (
      <button
        type="button"
        onClick={() => setRetryKey((k) => k + 1)}
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName || className,
        )}
      >
        <ImageOff className="w-6 h-6 opacity-50" />
      </button>
    );
  }

  if (!url) {
    return <div className={cn("min-w-[64px] min-h-[64px] bg-muted animate-pulse", className)} />;
  }

  return <img src={url} alt={alt} className={className} onError={() => setErr(true)} {...rest} />;
}
