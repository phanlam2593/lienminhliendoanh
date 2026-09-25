import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoBack } from "@/lib/navigation";
import { ArrowLeft, Lock, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
      <div className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{t("ai.title")}</div>
        <div className="text-xs text-muted-foreground truncate">{t("ai.rowHint")}</div>
      </div>
    </Link>
  );
}

export default function AiAssistant() {
  const nav = useNavigate();
  const goBack = useGoBack();
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
    <div className="flex flex-col h-[calc(var(--vvh,100dvh)-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))] max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-3 border-b">
        <button onClick={() => goBack("/tin-nhan")} aria-label={t("common.back")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center">
          <Sparkles className="w-4 h-4" />
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
