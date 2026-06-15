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

  const Comp: any = interactive ? "button" : "div";
  const extraProps = interactive
    ? { type: "button", onClick, "aria-label": "Mở ảnh đại diện" }
    : { "aria-hidden": true };

  return (
    <Comp
      {...extraProps}
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-full overflow-hidden grid place-items-center shrink-0 bg-gradient-brand text-primary-foreground font-bold select-none pointer-events-auto",
        interactive && "cursor-pointer hover:opacity-90 transition",
        ringClassName,
        className,
      )}
    >
      {showImg ? (
        <img src={url} alt={name || "avatar"} className="w-full h-full object-cover pointer-events-none" onError={() => setErr(true)} draggable={false} />
      ) : (
        <span style={{ fontSize: Math.max(10, Math.floor(size * 0.4)) }} className="pointer-events-none">{initial}</span>
      )}
    </Comp>
  );
}
