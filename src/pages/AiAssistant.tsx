import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBackToClose, useGoBack } from "@/lib/navigation";
import { ArrowLeft, Lock, Maximize2, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LomiMascot, type LomiMood } from "@/components/LomiMascot";

// ─────────────────────────────────────────────────────────────────────────────
// TRỢ LÝ AI (#18) — chỉ thành viên Membership còn hạn, 20 câu/ngày (giờ VN).
// Server: edge function "ai-assistant" + RPC consume_ai_chat_quota / get_my_ai_quota.
// Lịch sử chat chỉ lưu trên máy (localStorage, 30 tin gần nhất) — không lưu DB.
// ─────────────────────────────────────────────────────────────────────────────

type Msg = { role: "user" | "assistant"; content: string };
type Quota = { member: boolean; limit: number; used: number };

const db = supabase as any;
const histKey = (uid: string) => `ai-assistant-history:${uid}`;

function loadHistory(uid: string): Msg[] {
  try {
    const raw = localStorage.getItem(histKey(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(-30) : [];
  } catch {
    return [];
  }
}
function saveHistory(uid: string, msgs: Msg[]) {
  try {
    localStorage.setItem(histKey(uid), JSON.stringify(msgs.slice(-30)));
  } catch {
    /* bỏ qua */
  }
}

// Hiển thị câu trả lời: bỏ dấu ** của markdown, biến "/duong-dan" nội bộ thành link bấm được.
const ROUTE_RE = /(\/(?:kham-pha|uu-dai|quet|dua-don|cong-dong|tin-nhan|ho-so|thong-bao|huong-dan|bao-cao-cua-toi)(?:[/?][\w\-=&/]*)?)/g;
function RichText({ text }: { text: string }) {
  const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,4}\s+/gm, "");
  const parts = clean.split(ROUTE_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Link key={i} to={p} className="underline font-semibold">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Dòng "Trợ lý AI" ghim đầu hộp thư. */
export function AiAssistantRow() {
  const { t } = useLanguage();
  return (
    <Link to="/tro-ly-ai" className="flex items-center gap-3 p-3 rounded-xl active:bg-accent/60 transition-colors">
      <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
        <LomiMascot size={30} animated={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{t("ai.title")}</div>
        <div className="text-xs text-muted-foreground truncate">{t("ai.rowHint")}</div>
      </div>
    </Link>
  );
}

export default function AiAssistant() {
  const goBack = useGoBack();
  return (
    <AiChat
      onBack={() => goBack("/tin-nhan")}
      className="h-[calc(var(--vvh,100dvh)-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))] max-w-2xl mx-auto"
    />
  );
}

/** Khung chat AI dùng chung cho trang /tro-ly-ai và bảng nổi mở từ bong bóng. */
export function AiChat({
  onBack,
  onClose,
  onExpand,
  className,
}: {
  onBack?: () => void;
  onClose?: () => void;
  onExpand?: () => void;
  className?: string;
}) {
  const nav = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadQuota = async () => {
    const { data } = await db.rpc("get_my_ai_quota");
    if (data) setQuota(data as Quota);
  };

  useEffect(() => {
    if (!user) return;
    setMsgs(loadHistory(user.id));
    void loadQuota();
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;

  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setErr(null);
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    saveHistory(user.id, next);
    setInput("");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-assistant", { body: { messages: next.slice(-12) } });
    setBusy(false);
    let code: string | null = null;
    if (error) {
      try {
        const body = await (error as any).context?.json?.();
        code = body?.error ?? "AI_ERROR";
      } catch {
        code = "AI_ERROR";
      }
    } else if (!data?.reply) code = data?.error ?? "AI_ERROR";
    if (code) {
      setErr(
        code === "MEMBER_ONLY"
          ? t("ai.errMember")
          : code === "AI_LIMIT"
            ? t("ai.errLimit")
            : code === "AI_BUSY"
              ? t("ai.errBusy")
              : t("ai.errGeneric"),
      );
      void loadQuota();
      return;
    }
    const withReply: Msg[] = [...next, { role: "assistant", content: String(data.reply) }];
    setMsgs(withReply);
    saveHistory(user.id, withReply);
    if (quota && typeof data.remaining === "number") setQuota({ ...quota, used: quota.limit - data.remaining });
  };

  const clear = () => {
    setMsgs([]);
    saveHistory(user.id, []);
    setErr(null);
  };

  const locked = quota && !quota.member;
  const suggestions = [t("ai.s1"), t("ai.s2"), t("ai.s3"), t("ai.s4")];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 p-3 border-b">
        {onBack && (
          <button onClick={onBack} aria-label={t("common.back")}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <LomiMascot size={30} animated={false} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{t("ai.title")}</div>
          {quota?.member && left !== null && (
            <div className="text-[11px] text-muted-foreground">{t("ai.left", { n: String(left), limit: String(quota.limit) })}</div>
          )}
        </div>
        {msgs.length > 0 && (
          <button onClick={clear} aria-label={t("ai.clear")} className="p-2 text-muted-foreground">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {onExpand && (
          <button onClick={onExpand} aria-label={t("ai.expand")} className="p-2 text-muted-foreground">
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} aria-label={t("common.close")} className="p-2 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {locked ? (
          <div className="text-center py-12 px-6 space-y-3">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">{t("ai.lockedTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("ai.lockedDesc")}</p>
            <button
              onClick={() => nav("/ho-so?view=personal")}
              className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              {t("offers.viewMembership")}
            </button>
          </div>
        ) : msgs.length === 0 ? (
          <div className="py-8 space-y-4">
            <div className="text-center space-y-1 px-6">
              <LomiMascot size={72} className="mx-auto mb-1" />
              <p className="text-sm font-semibold">{t("ai.welcome")}</p>
              <p className="text-xs text-muted-foreground">{t("ai.welcomeDesc")}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border bg-card active:scale-95 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                )}
              >
                {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 text-sm text-muted-foreground animate-pulse">
              {t("ai.thinking")}
            </div>
          </div>
        )}
        {err && <div className="text-center text-xs text-destructive px-4">{err}</div>}
        <div ref={endRef} />
      </div>

      {!locked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="p-3 border-t flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={t("ai.placeholder")}
            disabled={left === 0}
            className="flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy || left === 0}
            aria-label={t("common.send")}
            className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BONG BÓNG LOMI (26/09 theo ý Kir) — linh vật Lomi nổi trên màn hình, chạm để mở khung chat AI
// dạng bảng trượt lên (không rời trang đang xem).
// • Kéo THẢ Ở ĐÂU CŨNG ĐƯỢC (trong vùng giữa thanh tiêu đề và thanh điều hướng) — không tự dính mép.
// • Thả SÁT MÉP trái/phải → Lomi nấp nửa người ở mép cho đỡ chiếm chỗ; chạm để ra lại.
// • Biểu cảm theo thao tác: bị kéo → mắt tròn, miệng "Ô", người nghiêng theo hướng kéo; lắc qua
//   lại mạnh → chóng mặt (mắt xoắn, sao quay); thả xuống → cười tít; chạm → mắt lấp lánh rồi mở
//   chat; để yên lâu → ngủ gật "z z"; thỉnh thoảng liếc mắt nhìn quanh.
// • Vị trí lưu trên máy (localStorage). Ẩn ở trang có ô nhập phía dưới (chat, cộng đồng) và màn quẹt.
// ─────────────────────────────────────────────────────────────────────────────
const BUBBLE_KEY = "lmld:lomi-bubble-v3";
const GREET_KEY = "lmld:lomi-greet-day";
type BubblePos = { x: number; y: number; tucked: false | "left" | "right" }; // x, y = tỉ lệ 0..1
const SIZE = 60;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function readPos(): BubblePos {
  try {
    const p = JSON.parse(localStorage.getItem(BUBBLE_KEY) || "null");
    if (p && typeof p.x === "number" && typeof p.y === "number")
      return { x: clamp01(p.x), y: clamp01(p.y), tucked: p.tucked === "left" || p.tucked === "right" ? p.tucked : false };
  } catch {
    /* bỏ qua */
  }
  return { x: 1, y: 1, tucked: false };
}

export function AiBubble() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const { pathname, search } = useLocation();
  const [pos, setPos] = useState<BubblePos>(readPos);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; tilt: number } | null>(null);
  const [mood, setMood] = useState<LomiMood>("idle");
  const [look, setLook] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const [hop, setHop] = useState(false);
  const [, force] = useState(0);
  const start = useRef<{
    px: number;
    py: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    dir: number;
    flips: number[];
    dizzy: boolean;
  } | null>(null);
  const moodTimer = useRef<number>();
  const lastTouch = useRef(Date.now());

  const setMoodFor = (m: LomiMood, ms: number) => {
    window.clearTimeout(moodTimer.current);
    setMood(m);
    moodTimer.current = window.setTimeout(() => setMood("idle"), ms);
  };
  const touch = () => {
    lastTouch.current = Date.now();
  };

  // Lời chào nhỏ mỗi ngày 1 lần.
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(GREET_KEY) === today) return;
      localStorage.setItem(GREET_KEY, today);
    } catch {
      return;
    }
    const a = window.setTimeout(() => {
      setSay(t("ai.greet"));
      setMoodFor("happy", 2500);
    }, 1500);
    const b = window.setTimeout(() => setSay(null), 6500);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Liếc mắt nhìn quanh + ngủ gật khi để yên lâu.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (start.current) return;
      const idleFor = Date.now() - lastTouch.current;
      setMood((m) => {
        if (idleFor > 45000 && m === "idle") return "sleepy";
        return m;
      });
      if (idleFor < 45000) {
        const r = Math.random();
        setLook(r < 0.33 ? -1 : r < 0.66 ? 1 : 0);
        window.setTimeout(() => setLook(0), 1400);
      }
    }, 7000);
    const onResize = () => force((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useBackToClose(open, () => setOpen(false));

  useEffect(() => {
    try {
      localStorage.setItem(BUBBLE_KEY, JSON.stringify(pos));
    } catch {
      /* bỏ qua */
    }
  }, [pos]);

  // Đổi trang → đóng khung chat.
  useEffect(() => setOpen(false), [pathname]);

  const hidden =
    !user ||
    pathname.startsWith("/tro-ly-ai") ||
    pathname.startsWith("/tin-nhan/") ||
    pathname.startsWith("/cong-dong") ||
    pathname.startsWith("/cuoc-goi") ||
    pathname.startsWith("/auth") ||
    (pathname.startsWith("/quet") && /tab=swipe/.test(search));
  if (hidden) return null;

  // Vùng được phép đặt Lomi: dưới thanh tiêu đề, trên thanh điều hướng, cách 2 mép 8px.
  const bounds = () => {
    const css = getComputedStyle(document.documentElement);
    const top = (parseFloat(css.getPropertyValue("--header-h")) || 56) + 8;
    const bottom = window.innerHeight - (parseFloat(css.getPropertyValue("--bottom-nav-h")) || 80) - SIZE - 8;
    const left = 8;
    const right = window.innerWidth - SIZE - 8;
    return { top, bottom: Math.max(top + 1, bottom), left, right: Math.max(left + 1, right) };
  };
  const b = bounds();
  const topPx = b.top + pos.y * (b.bottom - b.top);
  const leftPx =
    pos.tucked === "left"
      ? -SIZE / 2
      : pos.tucked === "right"
        ? window.innerWidth - SIZE / 2
        : b.left + pos.x * (b.right - b.left);

  const onDown = (e: React.PointerEvent) => {
    touch();
    start.current = {
      px: e.clientX,
      py: e.clientY,
      moved: false,
      lastX: e.clientX,
      lastT: performance.now(),
      dir: 0,
      flips: [],
      dizzy: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.px, e.clientY - s.py) < 6) return;
    if (!s.moved) {
      s.moved = true;
      window.clearTimeout(moodTimer.current);
      setMood("wee");
      setSay(null);
    }
    const now = performance.now();
    const dx = e.clientX - s.lastX;
    const dt = Math.max(1, now - s.lastT);
    const vx = dx / dt; // px/ms
    // Đếm số lần đổi hướng kéo ngang nhanh → lắc qua lắc lại thì chóng mặt.
    const dir = Math.abs(dx) > 3 ? Math.sign(dx) : 0;
    if (dir && s.dir && dir !== s.dir) s.flips.push(now);
    if (dir) s.dir = dir;
    s.flips = s.flips.filter((ts) => now - ts < 1400);
    if (!s.dizzy && s.flips.length >= 4) {
      s.dizzy = true;
      setMood("dizzy");
      setSay(t("ai.dizzy"));
      try {
        navigator.vibrate?.([15, 40, 15]);
      } catch {
        /* bỏ qua */
      }
    }
    s.lastX = e.clientX;
    s.lastT = now;
    const tilt = Math.max(-28, Math.min(28, vx * 22));
    setDrag({ x: e.clientX - SIZE / 2, y: e.clientY - SIZE / 2, tilt });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    touch();
    if (!s) return;
    if (!s.moved) {
      // Chạm: đang nấp mép → ra lại; đang ngủ → thức dậy; bình thường → vui rồi mở chat.
      setSay(null);
      if (pos.tucked) {
        setPos({ ...pos, tucked: false });
        setMoodFor("happy", 900);
        return;
      }
      if (mood === "sleepy") {
        setMoodFor("excited", 900);
        setSay(t("ai.wake"));
        window.setTimeout(() => setSay(null), 1800);
        return;
      }
      setMoodFor("excited", 700);
      setHop(true);
      window.setTimeout(() => {
        setHop(false);
        setOpen(true);
      }, 300);
      return;
    }
    const W = window.innerWidth;
    const { top, bottom, left, right } = bounds();
    const tucked = e.clientX < 22 ? "left" : e.clientX > W - 22 ? "right" : false;
    const x = clamp01((e.clientX - SIZE / 2 - left) / (right - left));
    const y = clamp01((e.clientY - SIZE / 2 - top) / (bottom - top));
    setPos({ x: tucked === "left" ? 0 : tucked === "right" ? 1 : x, y, tucked });
    setDrag(null);
    setHop(true);
    window.setTimeout(() => setHop(false), 300);
    if (s.dizzy) {
      setMoodFor("dizzy", 2200);
      window.setTimeout(() => setSay(null), 2200);
    } else {
      setMoodFor("happy", 1000);
    }
    try {
      navigator.vibrate?.(8);
    } catch {
      /* bỏ qua */
    }
  };

  const onRight = (drag ? drag.x : leftPx) > window.innerWidth / 2;
  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y, transition: "none" }
    : { left: leftPx, top: topPx };
  // Nấp mép: nghiêng đầu ló vào trong, mắt nhìn vào giữa màn hình.
  const peekTilt = pos.tucked === "left" ? 20 : pos.tucked === "right" ? -20 : 0;
  const lookNow = pos.tucked === "left" ? 1 : pos.tucked === "right" ? -1 : look;

  return (
    <>
      <button
        type="button"
        aria-label={t("ai.title")}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
          setMood("idle");
        }}
        style={{ ...style, width: SIZE, height: SIZE + 4, touchAction: "none" }}
        className={cn(
          "fixed z-40 grid place-items-center select-none drop-shadow-[0_6px_10px_rgba(8,145,178,0.35)] transition-[top,left,opacity] duration-300 ease-out",
          pos.tucked && !drag && "opacity-90",
          hop && "lomi-hop",
        )}
      >
        <span
          className="block transition-transform duration-200 ease-out"
          style={{
            transform: drag
              ? `rotate(${drag.tilt}deg) scale(1.08)`
              : `rotate(${peekTilt}deg)`,
          }}
        >
          <LomiMascot size={SIZE} mood={mood} look={lookNow} />
        </span>
        {say && !pos.tucked && (
          <span
            className={cn(
              "absolute bottom-full mb-2 w-max max-w-[180px] rounded-2xl bg-card border shadow-lg px-3 py-1.5 text-xs font-semibold text-foreground text-left animate-in fade-in zoom-in-95 duration-200 pointer-events-none",
              onRight ? "right-0 rounded-br-sm" : "left-0 rounded-bl-sm",
            )}
          >
            {say}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 animate-in fade-in duration-200" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md h-[min(78vh,calc(var(--vvh,100dvh)-3rem))] bg-background rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
          >
            <AiChat
              className="h-full"
              onClose={() => setOpen(false)}
              onExpand={() => {
                setOpen(false);
                nav("/tro-ly-ai");
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
