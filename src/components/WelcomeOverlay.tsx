import { useEffect, useState } from "react";

const FLAG = "lmld:welcome";

export function triggerWelcomeOverlay() {
  try { sessionStorage.setItem(FLAG, "1"); } catch {}
  window.dispatchEvent(new Event("lmld:welcome"));
}

export function WelcomeOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        if (sessionStorage.getItem(FLAG) === "1") setOpen(true);
      } catch {}
    };
    check();
    window.addEventListener("lmld:welcome", check);
    return () => window.removeEventListener("lmld:welcome", check);
  }, []);

  if (!open) return null;

  const close = () => {
    try { sessionStorage.removeItem(FLAG); } catch {}
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[min(92vw,380px)] rounded-2xl border bg-card text-card-foreground shadow-xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="text-6xl leading-none">👋</div>
        <h2 className="text-xl font-bold">Chào mừng bạn đến với cộng đồng!</h2>
        <p className="text-sm text-muted-foreground">Chúc bạn một ngày tốt lành! (^^)/</p>
        <button
          onClick={close}
          className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold"
        >
          Bắt đầu →
        </button>
      </div>
    </div>
  );
}
