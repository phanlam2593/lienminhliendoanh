import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface Props {
  path?: string | null;
  name?: string | null;
  size?: number;
  onClick?: () => void;
  className?: string;
  ringClassName?: string;
}

export function Avatar({ path, name, size = 40, onClick, className, ringClassName }: Props) {
  const [url, setUrl] = useState<string>("");
  const [err, setErr] = useState(false);
  const initial = (name || "?").trim().slice(0, 1).toUpperCase();

  useEffect(() => {
    let cancel = false;
    setErr(false);
    if (!path) { setUrl(""); return; }
    if (/^https?:\/\//i.test(path)) { setUrl(path); return; }
    getSignedUrl(path).then(u => { if (!cancel) setUrl(u || ""); });
    return () => { cancel = true; };
  }, [path]);

  const interactive = !!onClick;
  const showImg = !!path && !err && !!url;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={interactive ? "Mở ảnh đại diện" : undefined}
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-full overflow-hidden grid place-items-center shrink-0 bg-gradient-brand text-primary-foreground font-bold select-none",
        interactive && "cursor-pointer hover:opacity-90 transition",
        !interactive && "cursor-default",
        ringClassName,
        className,
      )}
    >
      {showImg ? (
        <img src={url} alt={name || "avatar"} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <span style={{ fontSize: Math.max(10, Math.floor(size * 0.4)) }}>{initial}</span>
      )}
    </button>
  );
}
