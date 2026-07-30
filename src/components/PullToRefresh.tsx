import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { forceRefreshCheck } from "@/lib/pwa";

const THRESHOLD = 70;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) {
        startY.current = null;
        return;
      }
      // Bỏ qua nếu đang có ô nhập liệu được focus — bàn phím ảo đóng lại khi submit làm
      // khung nhìn co lại đột ngột, dễ bị đọc nhầm thành cử chỉ kéo xuống và tự reload
      // trang ngoài ý muốn (đúng bug Kir gặp: gửi comment xong bị tải lại trang).
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPull(Math.min(dy, THRESHOLD * 1.6));
    };
    const onTouchEnd = () => {
      if (startY.current === null) return;
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        void forceRefreshCheck();
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing]);

  return (
    <div ref={containerRef}>
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: refreshing ? 40 : pull, opacity: pull > 10 || refreshing ? 1 : 0 }}
      >
        <RefreshCw className={`w-5 h-5 text-primary ${refreshing || pull >= THRESHOLD ? "animate-spin" : ""}`} />
      </div>
      <div
        style={
          pull > 0 || refreshing
            ? { transform: `translateY(${refreshing ? 0 : Math.min(pull, THRESHOLD) * 0.4}px)` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
