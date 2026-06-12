import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/upload";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string | null | undefined;
  fallbackClassName?: string;
}

export function StoredImage({ path, className, fallbackClassName, alt = "", ...rest }: Props) {
  const [url, setUrl] = useState<string>("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (!path) { setUrl(""); return; }
    getSignedUrl(path).then(u => { if (!cancel) setUrl(u || ""); });
    return () => { cancel = true; };
  }, [path]);

  if (!path || err) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", fallbackClassName || className)}>
        <ImageOff className="w-6 h-6 opacity-50" />
      </div>
    );
  }
  if (!url) return <div className={cn("bg-muted animate-pulse", className)} />;
  return <img src={url} alt={alt} className={className} onError={() => setErr(true)} {...rest} />;
}
