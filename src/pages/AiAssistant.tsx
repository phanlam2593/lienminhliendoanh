import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBackToClose, useGoBack } from "@/lib/navigation";
import { ArrowLeft, BookOpen, Maximize2, Send, Sparkles, Trash2, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LomiMascot, type LomiMood } from "@/components/LomiMascot";
import { FAQS, FAQ_CATS, matchFaq, type Faq, type FaqCat } from "@/lib/lomiFaq";
import { BUSINESS_TYPES } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// TRỢ LÝ AI (#18) — chỉ thành viên Membership còn hạn, 20 câu/ngày (giờ VN).
// Server: edge function "ai-assistant" + RPC consume_ai_chat_quota / get_my_ai_quota.
// Lịch sử chat chỉ lưu trên máy (localStorage, 30 tin gần nhất) — không lưu DB.
// ─────────────────────────────────────────────────────────────────────────────

// local = câu hỏi/đáp trả lời ngay trên máy từ danh sách soạn sẵn (lomiFaq) — không gọi AI, không tính lượt,
// và không gửi kèm làm ngữ cảnh khi gọi AI. ask = câu gốc (để bấm "Hỏi Lomi AI" nếu muốn hỏi sâu hơn).
type Msg = {
  role: "user" | "assistant";
  content: string;
  local?: boolean;
  ask?: string;
  note?: "member" | "limit";
};
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

/** Mở Lomi (bảng nổi) từ bất kỳ đâu — vd mục "Hỏi Lomi · Hướng dẫn" trong menu. Không có bong bóng
 *  trên trang hiện tại (bị ẩn) → sang trang /tro-ly-ai. */
export function openLomi(nav: (to: string) => void) {
  const ev = new CustomEvent<{ handled: boolean }>("lomi:open", { detail: { handled: false } });
  window.dispatchEvent(ev);
  if (!ev.detail.handled) nav("/tro-ly-ai");
}

/** Bộ duyệt câu hỏi thường gặp: chip chủ đề + danh sách câu hỏi. */
function FaqBrowser({ onPick, onClose }: { onPick: (f: Faq) => void; onClose?: () => void }) {
  const { t, lang } = useLanguage();
  const [cat, setCat] = useState<FaqCat>("start");
  const [more, setMore] = useState(false);
  const all = FAQS.filter((f) => f.cat === cat);
  // Gọn: mỗi chủ đề hiện 3 câu đầu, bấm "Xem thêm" mới bung hết.
  const list = more ? all : all.slice(0, 3);
  return (
    <div className="rounded-2xl border bg-card/80 overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3">
        <BookOpen className="w-4 h-4 text-primary" />
        <div className="flex-1 text-xs font-bold">{t("ai.faqTitle")}</div>
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
          {t("ai.faqFree")}
        </span>
        {onClose && (
          <button onClick={onClose} aria-label={t("common.close")} className="p-1 -mr-1 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
        {FAQ_CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCat(c.id);
              setMore(false);
            }}
            className={cn(
              "shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition active:scale-95",
              c.id === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background",
            )}
          >
            {c.emoji} {lang === "en" ? c.en : c.vi}
          </button>
        ))}
      </div>
      <div className="divide-y border-t">
        {list.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f)}
            className="w-full text-left text-[13px] px-3 py-2 active:bg-accent/60 transition-colors flex items-center gap-2"
          >
            <span className="flex-1">{lang === "en" ? f.q.en : f.q.vi}</span>
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] font-semibold">
        {all.length > 3 ? (
          <button onClick={() => setMore((v) => !v)} className="text-primary">
            {more ? t("ai.faqLess") : t("ai.faqMore", { n: String(all.length - 3) })}
          </button>
        ) : (
          <span />
        )}
        <Link to="/huong-dan" className="text-muted-foreground">
          {t("ai.faqFullGuide")}
        </Link>
      </div>
    </div>
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
  const [showFaq, setShowFaq] = useState(false);
  const { lang } = useLanguage();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadQuota = async () => {
    const { data } = await db.rpc("get_my_ai_quota");
    if (data) setQuota(data as Quota);
  };

  useEffect(() => {
    if (!user) return;
    setMsgs(loadHistory(user.id));
    void loadQuota();
  }, [user?.id]);

  // Ô nhập tự cao theo nội dung (tối đa max-h-32) — câu gợi ý điền sẵn dài 2 dòng vẫn đọc được hết.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy, showFaq]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;

  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  const push = (add: Msg[]) => {
    const next = [...msgs, ...add];
    setMsgs(next);
    saveHistory(user.id, next);
    return next;
  };

  // Trả lời ngay từ danh sách soạn sẵn — không gọi AI, không tính lượt.
  const answerFaq = (f: Faq, asked?: string) => {
    setErr(null);
    setShowFaq(false);
    const q = asked ?? (lang === "en" ? f.q.en : f.q.vi);
    push([
      { role: "user", content: q, local: true },
      { role: "assistant", content: lang === "en" ? f.a.en : f.a.vi, local: true, ask: asked },
    ]);
  };

  const send = async (text: string, forceAi = false) => {
    const q = text.trim();
    if (!q || busy) return;
    setErr(null);
    setInput("");
    // 1) Câu hỏi thường gặp → trả lời tại chỗ (miễn phí).
    if (!forceAi) {
      const f = matchFaq(q);
      if (f) return answerFaq(f, q);
    }
    // 2) Không phải Membership / hết lượt → báo ngay, không gọi server.
    if (quota && !quota.member) {
      setShowFaq(false);
      push([
        { role: "user", content: q, local: true },
        { role: "assistant", content: t("ai.memberOnlyLocal"), local: true, note: "member" },
      ]);
      return;
    }
    if (left === 0) {
      setShowFaq(false);
      push([
        { role: "user", content: q, local: true },
        { role: "assistant", content: t("ai.limitLocal"), local: true, note: "limit" },
      ]);
      return;
    }
    // 3) Gọi Lomi AI (tính 1 lượt). Chỉ gửi phần hội thoại với AI, bỏ các câu trả lời soạn sẵn.
    setShowFaq(false);
    const next = push([{ role: "user", content: q }]);
    setBusy(true);
    const ctx = next.filter((m) => !m.local).slice(-12).map(({ role, content }) => ({ role, content }));
    const { data, error } = await supabase.functions.invoke("ai-assistant", { body: { messages: ctx } });
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

  const nonMember = !!quota && !quota.member;

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
          <button
            onClick={() => setShowFaq((v) => !v)}
            aria-label={t("ai.faqTitle")}
            className={cn("p-2 rounded-full", showFaq ? "text-primary bg-primary/10" : "text-muted-foreground")}
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}
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
        {msgs.length === 0 ? (
          <div className="py-3 space-y-4">
            <div className="text-center space-y-1 px-6">
              <LomiMascot size={60} className="mx-auto mb-1" />
              <p className="text-sm font-semibold">{t("ai.welcome")}</p>
              <p className="text-xs text-muted-foreground">{t(nonMember ? "ai.welcomeDescFree" : "ai.welcomeDesc")}</p>
            </div>
            <FaqBrowser onPick={(f) => answerFaq(f)} />
            {/* Gợi ý nhờ Lomi AI tư vấn ưu đãi theo loại hình — chỉ hiện với Membership (không chào mời
                Membership ngay khi mới mở; người chưa có chỉ được nhắc khi hỏi câu ngoài danh sách).
                Bấm = điền sẵn câu hỏi để người dùng tự viết thêm chi tiết, chưa gửi (chưa tính lượt). */}
            {quota?.member && (
              <div className="space-y-2 px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {t("ai.bizAdviceTitle")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BUSINESS_TYPES.map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setInput(t("ai.bizAdvicePrompt", { type: t(`type.${k}`).toLowerCase() }));
                        requestAnimationFrame(() => {
                          const el = inputRef.current;
                          if (!el) return;
                          el.focus();
                          el.setSelectionRange(el.value.length, el.value.length);
                        });
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full border bg-card active:scale-95 transition"
                    >
                      {t(`type.${k}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                )}
              >
                {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
              </div>
              {m.role === "assistant" && m.local && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 ml-1 text-[11px] text-muted-foreground">
                  {!m.note && (
                    <span className="inline-flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {t("ai.quickNote")}
                    </span>
                  )}
                  {m.note === "member" && (
                    <button onClick={() => nav("/ho-so?view=personal")} className="font-semibold text-primary">
                      {t("offers.viewMembership")} ›
                    </button>
                  )}
                  {!m.note && m.ask && quota?.member && left !== 0 && i === msgs.length - 1 && (
                    <button onClick={() => void send(m.ask!, true)} className="font-semibold text-primary">
                      {t("ai.askAi")}
                    </button>
                  )}
                  {(m.note || i === msgs.length - 1) && !showFaq && (
                    <button onClick={() => setShowFaq(true)} className="font-semibold text-primary">
                      {t("ai.moreFaq")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {showFaq && msgs.length > 0 && <FaqBrowser onPick={(f) => answerFaq(f)} onClose={() => setShowFaq(false)} />}
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

      {(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="p-3 border-t flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
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
            className="flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm max-h-32 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
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

  // Mục "Hỏi Lomi · Hướng dẫn" trong menu → mở bảng chat ngay tại trang đang xem.
  useEffect(() => {
    if (hidden) return;
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ handled: boolean }>).detail;
      if (d) d.handled = true;
      setOpen(true);
    };
    window.addEventListener("lomi:open", onOpen);
    return () => window.removeEventListener("lomi:open", onOpen);
  }, [hidden]);

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
