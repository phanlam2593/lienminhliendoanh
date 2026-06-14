import { useEffect, useState } from "react";
import { isOpenNow, fmtTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export function OpenBadge({ open, close, size = "sm", showHours = false }: {
  open?: string | null; close?: string | null;
  size?: "sm" | "md"; showHours?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const status = isOpenNow(open, close);
  if (status === null) return null;
  const cls = size === "md" ? "text-sm px-3 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-semibold", cls,
      status ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
      <span className={cn("w-1.5 h-1.5 rounded-full bg-white", status && "animate-pulse")} />
      {status ? "Đang mở cửa" : "Đã đóng cửa"}
      {showHours && open && close && (
        <span className="opacity-90 font-normal ml-1">{fmtTime(open)}–{fmtTime(close)}</span>
      )}
    </span>
  );
}
