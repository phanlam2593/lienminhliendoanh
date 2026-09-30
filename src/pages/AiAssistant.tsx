import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useBackToClose, useGoBack } from "@/lib/navigation";
import { ArrowLeft, Maximize2, Send, Smile, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LomiMascot, type LomiMood } from "@/components/LomiMascot";
import {
  POPULAR_FAQ_IDS,
  faqById,
  matchFaq,
  normalizeVi,
  relatedFaqs,
  suggestFaqs,
  type Faq,
} from "@/lib/lomiFaq";
import { LomiPlaceCards } from "@/components/LomiPlaceCards";
import { LomiStickerGrid } from "@/components/LomiStickerGrid";
import { parseStickerToken, stickerReply, stickerToken, stickerUrl } from "@/lib/lomiStickers";
import { LomiDailyCard, shouldShowDaily } from "@/components/LomiDailyCard";
import {
  SIT_REPLY,
  clearMem,
  displayName,
  forgetBiz,
  isAskMemory,
  isForgetMemory,
  learnFromText,
  loadMem,
  memorySummary,
  rememberBiz,
  situationContext,
} from "@/lib/lomiMemory";
import { detectSearch, runSearch, type PlaceCard, type SearchIntent } from "@/lib/lomiSearch";
import { learnAnswer, learnKey, logUnanswered, lookupLearned } from "@/lib/lomiLearn";
import { isAffirm, isDecline } from "@/lib/lomiChat";
import { GENERIC, heartContinue, heartOpen, heartStart, heartThemeOf, type HeartReply } from "@/lib/lomiHeart";
import { analyzeBody, analyzeMind } from "@/lib/lomiSymptoms";
import { chitChat, crisisReply, expandTeen, friendlyFallback, isAppish, looksLikeQuestion } from "@/lib/lomiChat";
import { BUSINESS_TYPES } from "@/lib/types";
import {
  TOPIC_CHIPS,
  bizAiPrompt,
  bizAnswer,
  detectBizKind,
  detectBizTopic,
  followUpChips,
  isMoreIdeas,
  isThanks,
  looksLikeBizQuestion,
  nounFor,
  topicFromChip,
  type BizCtx,
  type BizTopic,
} from "@/lib/bizAdvisor";
import { lomiSound, lomiSoundOn, onLomiSoundChange, setLomiSound } from "@/lib/lomiSound";
import {
  TAROT_ASK,
  TAROT_MODE,
  dailyDraw,
  questionTopic,
  tarotFollowUps,
  TAROT_CANCEL,
  TAROT_SUGGEST,
  detectTarot,
  drawClarifier,
  drawForQuestion,
  isDailyAsk,
  isTarotCancel,
  isTarotMore,
  isTarotRedo,
  readingAiPrompt,
  readingText,
  type TarotReading,
} from "@/lib/tarot";
import { TarotCards } from "@/components/LomiTarot";

// ─────────────────────────────────────────────────────────────────────────────
// TRỢ LÝ AI (#18) — chỉ thành viên Membership còn hạn. 30/09: bỏ giới hạn 20 câu/ngày theo ý Kir
// (server chỉ còn chốt chống spam 200 câu/ngày, không hiện trên giao diện).
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
  tarot?: TarotReading; // bói Tarot (30/09) — chạy trên máy, không tính lượt
  // Hội thoại nhiều bước (30/09 r2) — cờ đặt trên tin Lomi CUỐI CÙNG, tin kế tiếp của người dùng
  // sẽ được hiểu theo ngữ cảnh đó:
  tarotAwait?: boolean; // Lomi vừa hỏi "bạn muốn hỏi bài điều gì?"
  bizPick?: boolean; // Lomi vừa hỏi loại hình doanh nghiệp (tư vấn kinh doanh)
  biz?: BizCtx; // đang trong cuộc tư vấn kinh doanh (loại hình, tên chỗ, chủ đề vừa nói)
  bizTopicPick?: boolean; // Lomi vừa hỏi "muốn gợi ý về chuyện gì?"
  quick?: string[]; // gợi ý trả lời nhanh (chip nhỏ dưới tin Lomi cuối)
  aiContent?: string; // nội dung THẬT gửi cho AI (khác chữ hiển thị), vd kèm loại hình DN
  places?: PlaceCard[]; // thẻ doanh nghiệp thật (Lomi tìm chỗ / "hôm nay ăn gì") — lib/lomiSearch
  search?: SearchIntent; // lần tìm vừa rồi (để "Đổi món khác" bốc lại chỗ khác)
  tarotSpread?: "five" | "celtic"; // người dùng vừa chọn trải 5 / 10 lá, đang chờ câu hỏi
  sticker?: string; // Lomi đáp lại bằng sticker (id trong lib/lomiStickers) — hiện phía trên câu chữ
  heart?: string; // đang tâm sự với Lomi (chủ đề) — lib/lomiHeart
  heartListen?: boolean; // người dùng chỉ muốn được nghe, Lomi không khuyên
  sx?: string[]; // triệu chứng cơ thể đã kể (cộng dồn qua các tin) — lib/lomiSymptoms
  mood?: string[]; // cảm giác đã kể (cộng dồn) — lib/lomiSymptoms
  heartDepth?: number; // số lượt đã tâm sự (để đổi cách đáp, nhắc gặp chuyên gia khi cần)
  unk?: string; // câu Lomi vừa bí — nếu tin kế tiếp trúng câu hỏi thường gặp thì Lomi tự học (lib/lomiLearn)
};
type Quota = { member: boolean; limit: number; used: number };

const db = supabase as any;
// 30/09 (theo ý Kir: không phụ thuộc Lovable): Lomi trả lời hoàn toàn trên máy — thư viện hỏi–đáp về app,
// tư vấn kinh doanh, bói Tarot. TẮT gọi AI qua edge function "ai-assistant" (số dư AI của Lovable).
// Khi có key Gemini riêng (xem supabase/functions/ai-assistant) thì đổi thành true để bật lại cho Membership.
const AI_ENABLED = false;
// Trải 3 lá theo buổi cho hôm nay (nút dưới lá bài hôm nay).
const DAY3_Q = "Hôm nay của mình sẽ thế nào?";
const DAY3_ASK = "Bói 3 lá: hôm nay của mình sẽ thế nào?";
const pickOne = (a: string[]) => a[Math.floor(Math.random() * a.length)];
// FAQ về CÁCH DÙNG app — luôn ưu tiên hơn tư vấn kinh doanh khi cả hai cùng khớp.
const APP_HOWTO_FAQ = new Set([
  "claim", "pin", "claimexp", "offerlocked", "offerlist", "offerbad", "bizcreate", "bizoffer", "bizbroadcast", "bizpin",
  "bizedit", "bizphotos", "bizlocation", "bizonline", "bizmulti", "bizstatus", "reviewreply", "bizreports", "review",
]);
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

// Hiển thị câu trả lời: chữ **đậm** giữ in đậm; đường dẫn nội bộ không hiện "/kham-pha" thô nữa mà thành
// tên mục in đậm bấm được — "Vào Khám phá (/kham-pha)" → "Vào **Khám phá**" (bấm để mở).
const ROUTES = "kham-pha|uu-dai|quet|dua-don|cong-dong|tin-nhan|ho-so|thong-bao|huong-dan|bao-cao-cua-toi";
const RICH_RE = new RegExp(`( ?\\((\\/(?:${ROUTES})(?:[/?][\\w\\-=&/]*)?)\\))|(\\/(?:${ROUTES})(?:[/?][\\w\\-=&/]*)?)|\\*\\*(.+?)\\*\\*`, "g");
// Tên các mục (dài trước ngắn) — [tiếng Việt, tiếng Anh].
const ROUTE_LABEL: Record<string, [string[], string[]]> = {
  "/kham-pha": [["Khám phá"], ["Explore"]],
  "/uu-dai": [["Ưu đãi"], ["Offers"]],
  "/quet": [["Quẹt"], ["Swipe"]],
  "/dua-don": [["Đưa đón & Giao hàng", "Đưa đón"], ["Rides & Delivery", "Rides"]],
  "/cong-dong": [["Cộng đồng"], ["Community"]],
  "/tin-nhan": [["Tin nhắn"], ["Messages"]],
  "/ho-so": [["Hồ sơ"], ["Profile"]],
  "/thong-bao": [["Thông báo"], ["Notifications"]],
  "/huong-dan": [["Hướng dẫn"], ["Guide"]],
  "/bao-cao-cua-toi": [["Báo cáo của tôi"], ["My reports"]],
};
const LINK_CLS = "font-bold text-primary underline-offset-2 hover:underline";
function RichText({ text }: { text: string }) {
  const { lang } = useLanguage();
  const src = text.replace(/^#{1,4}\s+/gm, "");
  const out: React.ReactNode[] = [];
  let buf = "";
  let last = 0;
  const flush = () => {
    if (buf) out.push(<span key={out.length}>{buf}</span>);
    buf = "";
  };
  for (const m of src.matchAll(RICH_RE)) {
    buf += src.slice(last, m.index);
    last = (m.index ?? 0) + m[0].length;
    if (m[4] !== undefined) {
      flush();
      out.push(<strong key={out.length}>{m[4]}</strong>);
      continue;
    }
    const path = m[2] ?? m[3];
    const base = "/" + path.split(/[/?]/)[1];
    const [vi, enL] = ROUTE_LABEL[base] ?? [[], []];
    const all = [...vi, ...enL];
    const hit = m[2] ? all.find((l) => buf.toLowerCase().endsWith(l.toLowerCase())) : undefined;
    const name = (lang === "en" ? enL[0] : vi[0]) ?? path;
    if (hit) {
      // Tên mục đã có ngay trước "(/…)" → biến chính tên đó thành link, bỏ phần đường dẫn.
      const shown = buf.slice(buf.length - hit.length);
      buf = buf.slice(0, buf.length - hit.length);
      flush();
      out.push(<Link key={out.length} to={path} className={LINK_CLS}>{shown}</Link>);
    } else {
      if (m[2]) buf += " (";
      flush();
      out.push(<Link key={out.length} to={path} className={LINK_CLS}>{name}</Link>);
      if (m[2]) buf += ")";
    }
  }
  buf += src.slice(last);
  flush();
  return <>{out}</>;
}

/** Mở Lomi (bảng nổi) từ bất kỳ đâu — vd mục "Hỏi Lomi · Hướng dẫn" trong menu. Không có bong bóng
 *  trên trang hiện tại (bị ẩn) → sang trang /tro-ly-ai. */
export function openLomi(nav: (to: string) => void) {
  const ev = new CustomEvent<{ handled: boolean }>("lomi:open", { detail: { handled: false } });
  window.dispatchEvent(ev);
  if (!ev.detail.handled) nav("/tro-ly-ai");
}

/** Chip trả lời nhanh dưới tin nhắn của Lomi — bấm = gửi đúng chữ đó như tự gõ. */
function QuickReplies({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
      {items.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="text-[12px] px-2.5 py-1 rounded-full border border-primary/40 text-primary bg-background active:scale-95 transition"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

/** Thẻ gợi ý lớn trên màn chào của Lomi (Bói Tarot, Tư vấn ưu đãi). */
function StarterCard({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-2xl border border-border/70 bg-card/60 backdrop-blur p-3 text-left shadow-sm hover:border-primary/50 active:scale-[0.97] transition"
    >
      <span className="w-9 h-9 rounded-xl bg-gradient-brand grid place-items-center text-lg shadow-sm group-hover:scale-105 transition-transform">{emoji}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight">{title}</span>
        <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{desc}</span>
      </span>
    </button>
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
  const { user, profile } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(lomiSoundOn);
  useEffect(() => onLomiSoundChange(setSoundOn), []);
  const { lang } = useLanguage();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Tin người dùng gõ teen code ("nyc có quay lại khum") → Lomi hiểu bằng bản chữ chuẩn, nhưng khung chat
  // vẫn hiện đúng chữ họ gõ: push() đổi lại nội dung tin của người dùng từ bản chuẩn về bản gốc.
  const shownRef = useRef<{ from: string; to: string } | null>(null);
  // Lượt bói rút SAU thời điểm mở khung chat mới có hiệu ứng lật bài (lịch sử cũ hiện ngửa sẵn).
  const openedAt = useRef(Date.now());
  // Popup "Lá bài hôm nay" — mở Lomi lần đầu trong ngày (components/LomiDailyCard).
  const [daily, setDaily] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  const loadQuota = async () => {
    const { data } = await db.rpc("get_my_ai_quota");
    if (data) setQuota(data as Quota);
  };

  useEffect(() => {
    if (!user) return;
    setMsgs(loadHistory(user.id));
    void loadQuota();
    setDaily(shouldShowDaily(user.id));
  }, [user?.id]);

  // Ô nhập tự cao theo nội dung (tối đa max-h-32) — câu gợi ý điền sẵn dài 2 dòng vẫn đọc được hết.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    // Chỉ hiện thanh cuộn khi vượt max-h-32 (128px) — trước đây luôn lòi ▲▼ dù mới 1 dòng.
    el.style.overflowY = el.scrollHeight > 128 ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, busy]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;

  const left = quota ? Math.max(0, quota.limit - quota.used) : null;

  const push = (add: Msg[]) => {
    const sh = shownRef.current;
    if (sh) add = add.map((m) => (m.role === "user" && m.content === sh.from ? { ...m, content: sh.to } : m));
    const next = [...msgs, ...add];
    setMsgs(next);
    saveHistory(user.id, next);
    return next;
  };

  // Trả lời ngay từ danh sách soạn sẵn (lomiFaq) — không gọi AI. 30/09: bỏ mục "Câu hỏi thường gặp"
  // trên giao diện theo ý Kir, nhưng vẫn âm thầm dùng để trả lời nhanh + đúng các câu về cách dùng app.
  const answerFaq = (f: Faq, asked?: string) => {
    setErr(null);
    const q = asked ?? (lang === "en" ? f.q.en : f.q.vi);
    // Gợi ý 2 câu liên quan (cùng nhóm) để hỏi tiếp cho mượt.
    const rel = relatedFaqs(f, 2).map((x) => (lang === "en" ? x.q.en : x.q.vi));
    push([
      { role: "user", content: q, local: true },
      { role: "assistant", content: lang === "en" ? f.a.en : f.a.vi, local: true, ask: AI_ENABLED ? asked : undefined, quick: rel },
    ]);
    lomiSound("msg");
  };

  const en = lang === "en";
  const bizLabel = (k: string) => t(`type.${k}`);

  // ── Bói Tarot kiểu hỏi – đáp (30/09 r2) ──
  // Chưa có câu hỏi → Lomi hỏi lại bằng lời (kèm vài gợi ý nhỏ), tin kế tiếp được hiểu là câu hỏi.
  const askTarot = (asked?: string) => {
    setErr(null);
    push([
      ...(asked ? [{ role: "user" as const, content: asked, local: true }] : []),
      {
        role: "assistant",
        content: en ? TAROT_ASK.en : TAROT_ASK.vi,
        local: true,
        tarotAwait: true,
        quick: TAROT_SUGGEST.map((x) => (en ? x.en : x.vi)).filter(Boolean),
      },
    ]);
    lomiSound("pop");
  };
  // Rút bài cho câu hỏi (rỗng = thông điệp hôm nay) và trả lời ngay trên máy.
  const doTarot = (question: string, asked: string, context?: string) => {
    setErr(null);
    // Câu gõ đầy đủ (kể cả phần kể chuyện trước chữ "bói") giúp Lomi hiểu tâm trạng người hỏi.
    let ctx = context ?? (question && asked.length > question.length ? asked : undefined);
    // Câu hỏi chung chung ("bao giờ mọi chuyện ổn hơn") → ghép thêm hoàn cảnh Lomi nhớ (vd đang tìm việc).
    const sit = situationContext(loadMem(user.id));
    if (question && sit && questionTopic(question) === "general") ctx = `${ctx ?? asked}. ${sit}`;
    const r = drawForQuestion(question, ctx);
    // Thông điệp hôm nay = đúng lá của popup "Lá bài hôm nay" (cố định trong ngày).
    if (!question) r.cards = [dailyDraw(user.id)];
    push([
      { role: "user", content: asked, local: true },
      // Gợi ý bói tiếp theo đúng bối cảnh (vd tìm việc → "hợp ngành gì", "thu nhập có ổn không").
      { role: "assistant", content: readingText(r, lang), local: true, tarot: r, ask: readingAiPrompt(r, lang), quick: en ? undefined : tarotFollowUps(r) },
    ]);
  };
  const moreTarot = (prev: TarotReading, asked: string) => {
    setErr(null);
    const r = drawClarifier(prev);
    push([
      { role: "user", content: asked, local: true },
      { role: "assistant", content: readingText(r, lang), local: true, tarot: r, ask: readingAiPrompt(r, lang) },
    ]);
  };
  const localReply = (asked: string, reply: Msg) => {
    setErr(null);
    push([{ role: "user", content: asked, local: true }, reply]);
    lomiSound("msg");
  };

  // ── Tư vấn kinh doanh (30/09 r4) — chạy trên máy như Tarot (lib/bizAdvisor.ts), ai cũng dùng được ──
  // Hỏi loại hình → hỏi chủ đề → trả lời từ thư viện, xoay vòng ý để không lặp; hỏi nối "thêm ý khác".
  const askBiz = (asked?: string, pending?: BizTopic, force = false) => {
    // Lomi nhớ loại hình người dùng đã nói lần trước → vào thẳng gợi ý, không hỏi lại.
    const mb = force ? undefined : loadMem(user.id).biz;
    if (mb?.type) {
      const ctx: BizCtx = { type: mb.type, noun: mb.noun };
      const tp = pending ?? "offer";
      return push([
        ...(asked ? [{ role: "user" as const, content: asked, local: true }] : []),
        {
          role: "assistant",
          content: `Lomi nhớ bạn đang kinh doanh ${nounFor(ctx.type, ctx.noun)} nè 😊 (khác thì bấm “Đổi loại hình” nha)\n\n${bizAnswer(ctx, tp, false)}`,
          local: true,
          biz: { ...ctx, topic: tp },
          quick: [...followUpChips(tp), "Đổi loại hình"],
          ask: bizAiPrompt(ctx, tp),
        },
      ]);
    }
    return push([
      ...(asked ? [{ role: "user" as const, content: asked, local: true }] : []),
      {
        role: "assistant",
        content: pending
          ? "Lomi giúp liền nha! Chỗ của bạn kinh doanh gì nè? 😊 Chọn bên dưới hoặc gõ luôn, kiểu “quán cà phê”, “homestay”, “tiệm nail”…"
          : "Okie! Chỗ của bạn kinh doanh gì nè? 😊 Chọn bên dưới hoặc gõ luôn, kiểu “quán cà phê”, “homestay”, “tiệm nail”…",
        local: true,
        bizPick: true,
        ...(pending ? { biz: { topic: pending } } : {}),
        quick: BUSINESS_TYPES.map(bizLabel),
      },
    ]);
  };
  const bizReply = (asked: string, ctx: BizCtx, topic: BizTopic, more = false) => {
    rememberBiz(user.id, ctx);
    return localReply(asked, {
      role: "assistant",
      content: bizAnswer(ctx, topic, more),
      local: true,
      biz: { type: ctx.type, noun: ctx.noun, topic },
      quick: followUpChips(topic),
      ask: bizAiPrompt(ctx, topic),
    });
  };

  // Người dùng gửi sticker → Lomi đáp lại bằng sticker hợp cảm xúc + một câu ngắn (lib/lomiStickers).
  const sendSticker = (id: string) => {
    setShowStickers(false);
    const r = stickerReply(id);
    push([
      { role: "user", content: stickerToken(id), local: true },
      { role: "assistant", content: r.text, local: true, sticker: r.sticker, quick: r.quick },
    ]);
    lomiSound("msg");
  };

  // Tâm sự cùng Lomi (30/09) — lắng nghe, an ủi, tư vấn tình cảm/tâm lý nhẹ (lib/lomiHeart, chạy trên máy).
  const heartMsg = (h: HeartReply, depth: number, keep?: Msg): Msg => ({
    role: "assistant",
    content: h.text,
    local: true,
    quick: h.quick.length ? h.quick : undefined,
    // Giữ lại triệu chứng / cảm giác đã kể để lần sau cộng dồn.
    ...(h.end ? {} : { heart: h.theme, heartListen: h.listen, heartDepth: depth, sx: keep?.sx, mood: keep?.mood }),
  });
  const askHeart = () => {
    setErr(null);
    push([heartMsg(heartOpen(), 0)]);
    lomiSound("pop");
  };

  const send = async (text: string, forceAi = false) => {
    const raw = text.trim();
    if (!raw || busy) return;
    const stk = parseStickerToken(raw);
    if (stk) {
      setInput("");
      return sendSticker(stk);
    }
    let q = expandTeen(raw);
    shownRef.current = q !== raw ? { from: q, to: raw } : null;
    setErr(null);
    setInput("");
    const last = msgs[msgs.length - 1];
    const lastA = last?.role === "assistant" ? last : undefined;
    let memLearn: ReturnType<typeof learnFromText> | null = null;

    // Lomi vừa mời ("rút một lá cho nhẹ lòng không?") kèm nút gợi ý → người dùng gõ "ok / ờ / có"
    // thì làm luôn gợi ý đầu tiên (khung chat vẫn hiện đúng chữ họ gõ); "không / thôi" thì đáp nhẹ nhàng.
    if (!forceAi && !en && lastA?.quick?.length && !lastA.bizPick && !lastA.bizTopicPick && !lastA.tarotAwait && !lastA.heart) {
      // Chỉ khi tin trước thật sự là lời mời (có câu hỏi + động từ mời), tránh "ok" sau câu chào bị hiểu nhầm.
      const offered = /\?/.test(lastA.content) && /(muốn|thử|để Lomi|rút|bói|chọn giùm|chỉ cách|xem thử)/i.test(lastA.content);
      if (offered && isAffirm(q)) {
        // Chọn đúng nút ứng với lời mời: mời "rút/bói" → nút có chữ Bói; mời "tìm quán" → nút Tìm/ăn.
        const qk = lastA.quick;
        const chip =
          (/(rút|bói)/i.test(lastA.content) && qk.find((x) => /bói/i.test(x))) ||
          (/(quán|tìm)/i.test(lastA.content) && qk.find((x) => /(tìm|ăn gì)/i.test(x))) ||
          qk[0];
        const pickQ = expandTeen(chip);
        shownRef.current = { from: pickQ, to: raw };
        q = pickQ;
      } else if (isDecline(q) && /\?/.test(lastA.content)) {
        return localReply(q, {
          role: "assistant",
          content: pickOne(["Okie, không sao nè 😊 Khi nào cần cứ gọi Lomi nha!", "Dạ, vậy để lúc khác nha 🌿 Lomi vẫn ở đây nè.", "Hihi okie, bạn muốn nói chuyện gì khác cũng được nha 😄"]),
          local: true,
        });
      }
    }

    if (!forceAi) {
      // 0) Người dùng nói muốn làm hại bản thân → ưu tiên hỗ trợ trước mọi luồng khác.
      const cr = crisisReply(q, lang);
      // Sau đó Lomi ở lại chế độ tâm sự (lắng nghe) để người dùng kể tiếp.
      if (cr) return localReply(q, { role: "assistant", content: cr.text, local: true, ...(en ? {} : { heart: "sad", heartDepth: 1 }) });
      // 0a) Trí nhớ: người dùng kể tên / hoàn cảnh → Lomi ghi nhớ; hỏi "Lomi nhớ gì về mình?", "quên hết đi".
      if (isForgetMemory(q)) {
        clearMem(user.id);
        return localReply(q, { role: "assistant", content: "Okie, Lomi quên hết rồi nha 🙈 Mình làm quen lại từ đầu nè!", local: true });
      }
      if (isAskMemory(q)) {
        const mm = loadMem(user.id);
        return localReply(q, { role: "assistant", content: memorySummary(mm, mm.biz ? nounFor(mm.biz.type, mm.biz.noun) : undefined), local: true });
      }
      memLearn = learnFromText(user.id, q);
      if (memLearn.newName && q.split(/\s+/).length <= 10)
        return localReply(q, {
          role: "assistant",
          content: `Rất vui được làm quen với ${memLearn.newName} 😊 Lomi nhớ rồi nha! Hôm nay ${memLearn.newName} cần Lomi giúp gì nè?`,
          local: true,
          quick: ["Bói một lá cho hôm nay", "Hôm nay ăn gì? 🎲"],
        });
      if (normalizeVi(q) === "doi loai hinh") {
        forgetBiz(user.id);
        return askBiz(q, lastA?.biz?.topic, true);
      }
      // a) Lomi vừa hỏi loại hình → nhận loại hình (chip hoặc gõ tự do), rồi hỏi chủ đề
      //    (hoặc trả lời luôn nếu đã có chủ đề đang chờ / trong câu có sẵn chủ đề).
      if (lastA?.bizPick && !detectTarot(q)) {
        const nq = normalizeVi(q);
        const key = BUSINESS_TYPES.find((k) => normalizeVi(bizLabel(k)) === nq);
        const kind = detectBizKind(q);
        const ctx: BizCtx = { type: key ?? kind.type ?? "other", noun: kind.noun ?? (key ? undefined : q.length <= 30 ? q : undefined) };
        const tp = lastA.biz?.topic ?? detectBizTopic(q);
        if (tp) return bizReply(q, ctx, tp);
        const n = nounFor(ctx.type, ctx.noun);
        return localReply(q, {
          role: "assistant",
          content: `${n.charAt(0).toUpperCase() + n.slice(1)} hả, hay quá! Bạn muốn Lomi gợi ý về chuyện gì nè? Chọn bên dưới, hoặc kể tự nhiên kiểu “buổi sáng vắng khách quá” cũng được nha 😊`,
          local: true,
          biz: ctx,
          bizTopicPick: true,
          quick: TOPIC_CHIPS,
        });
      }
      // b) Đang trong cuộc tư vấn → hiểu tin này theo ngữ cảnh (chủ đề mới, "thêm ý khác", kể thêm chi tiết…).
      if (lastA?.biz && !lastA.bizPick && !detectTarot(q)) {
        const b = lastA.biz;
        if (isThanks(q))
          return localReply(q, {
            role: "assistant",
            content: [
              "Không có gì nè 😊 Chúc chỗ của bạn đông khách nha! Cần thêm ý thì cứ hỏi Lomi.",
              "Lomi vui vì giúp được bạn 💚 Muốn tìm hiểu thêm chủ đề nào cứ chọn bên dưới nha.",
              "Hihi, có gì cứ hỏi tiếp nha, Lomi luôn ở đây 😊",
            ][Math.floor(Math.random() * 3)],
            local: true,
            biz: b,
            quick: followUpChips(b.topic ?? "offer"),
          });
        const kind = detectBizKind(q);
        const ctx: BizCtx = { ...b, ...(kind.type ? kind : {}) };
        const more = !topicFromChip(q) && isMoreIdeas(q);
        const tp = topicFromChip(q) ?? (more ? (b.topic ?? "offer") : detectBizTopic(q));
        if (tp) return bizReply(q, ctx, tp, more);
        if (lastA.bizTopicPick || kind.type) return bizReply(q, ctx, "offer");
      }

      // c) Lomi vừa hỏi "muốn hỏi bài điều gì?" → tin này chính là câu hỏi.
      if (lastA?.tarotAwait) {
        if (isTarotCancel(q)) return localReply(q, { role: "assistant", content: en ? TAROT_CANCEL.en : TAROT_CANCEL.vi, local: true });
        // Chế độ bói: chủ đề → bói luôn; "một người cụ thể" / trải 5–10 lá → hỏi tiếp câu hỏi.
        const mode = TAROT_MODE[raw];
        if (mode?.q) return doTarot(mode.q, q, lastA.tarotSpread ? `${mode.q} ${lastA.tarotSpread === "five" ? "5 lá" : "10 lá"}` : undefined);
        if (mode?.ask)
          return localReply(q, {
            role: "assistant",
            content: mode.ask,
            local: true,
            tarotAwait: true,
            tarotSpread: mode.spread ?? lastA.tarotSpread,
            quick: mode.quick ?? ["❤️ Tình yêu", "💼 Công việc", "💰 Tài chính", "🔮 Tương lai gần"],
          });
        const d = detectTarot(q);
        if (d && !d.question && !d.daily) return askTarot(q);
        const qq = d ? d.question : isDailyAsk(q) ? "" : q;
        // Đã chọn trải 5 / 10 lá ở bước trước → ghép vào ngữ cảnh để rút đúng số lá.
        return doTarot(qq, q, qq && lastA.tarotSpread ? `${q} ${lastA.tarotSpread === "five" ? "5 lá" : "10 lá"}` : undefined);
      }
      // d) Vừa bói xong → "rút thêm" / "bói lại" / hỏi nối ("thế còn tình cảm thì sao?").
      if (lastA?.tarot) {
        const prev = lastA.tarot;
        if (isTarotMore(q)) return moreTarot(prev, q);
        if (isTarotRedo(q)) {
          if (!prev.question && !en) return doTarot(DAY3_Q, q);
          return doTarot(prev.question ?? "", q, prev.context);
        }
        if (/(?<![a-z])(thi sao|the con|vay con|con chuyen|con ve)(?![a-z])/.test(normalizeVi(q)) && !detectTarot(q)) return doTarot(q, q);
      }
      // e) Câu có ý muốn bói → bói luôn nếu đã có câu hỏi, chưa có thì Lomi hỏi lại.
      //    Kiểm tra TRƯỚC FAQ/AI để câu kiểu "bói tarot tư vấn giúp mình" không bị chuyển sang AI.
      {
        const d = detectTarot(q);
        if (d) return d.question || d.daily ? doTarot(d.question, q) : askTarot(q);
      }
      // f0) Kể triệu chứng / cảm giác → tra từ điển (lib/lomiSymptoms): triệu chứng A, B, C → bệnh hay gặp,
      //     nên làm / kiêng gì / khám khoa nào; cảm giác G, J, K → trạng thái tâm lý → nên làm gì.
      //     Cộng dồn với những gì đã kể ở tin trước khi đang tâm sự.
      if (!en && !(looksLikeQuestion(q) && isAppish(q) && matchFaq(q))) {
        const inTalk = !!lastA?.heart;
        const depth = (lastA?.heartDepth ?? 0) + 1;
        const body = analyzeBody(q, inTalk ? (lastA?.sx ?? []) : []);
        if (body)
          return localReply(q, { role: "assistant", content: body.text, local: true, heart: "health", heartDepth: depth, sx: body.sx, mood: inTalk ? lastA?.mood : undefined });
        const th = heartThemeOf(q);
        const mind = !th || GENERIC.has(th) ? analyzeMind(q, inTalk ? (lastA?.mood ?? []) : []) : null;
        if (mind)
          return localReply(q, {
            role: "assistant",
            content: mind.text,
            local: true,
            heart: inTalk && lastA?.heart !== "open" && lastA?.heart !== "health" ? lastA!.heart : "sad",
            heartDepth: depth,
            mood: mind.mood,
            sx: inTalk ? lastA?.sx : undefined,
          });
      }
      // f) Đang tâm sự → hiểu tin này là kể tiếp (trừ khi rõ ràng hỏi cách dùng app / tìm quán).
      // Chỉ nhường cho tìm quán khi người dùng hỏi tìm RÕ RÀNG (vd "quán nào gần đây", "ăn gì giờ").
      const wantSearch = !!detectSearch(q) && /\b(tim|kiem|goi y|an gi|uong gi|o dau|gan day|gan minh|quan nao|di dau|cho nao)\b/.test(normalizeVi(q));
      if (lastA?.heart && !en && !wantSearch && !(looksLikeQuestion(q) && isAppish(q) && matchFaq(q))) {
        const depth = (lastA.heartDepth ?? 0) + 1;
        return localReply(q, heartMsg(heartContinue(q, lastA.heart, !!lastA.heartListen, depth), depth, lastA));
      }
    }
    // 1) Câu hỏi thường gặp → trả lời tại chỗ (miễn phí).
    //    Riêng câu hỏi chuyện kinh doanh (vd "làm sao giữ khách quen cho spa") thì ưu tiên tư vấn kinh
    //    doanh (1b), trừ khi FAQ khớp đúng câu hỏi về CÁCH DÙNG app (nhận/đăng ưu đãi, tạo doanh nghiệp…).
    // 0b) Chào hỏi, cảm ơn, tạm biệt… → đáp lại tự nhiên.
    // 0c) Tìm chỗ / ưu đãi THẬT trong app, "hôm nay ăn gì?" (đổi món → bốc chỗ khác, không trùng chỗ cũ).
    if (!forceAi && !en) {
      const it = detectSearch(q);
      if (it) {
        const prevIds = lastA?.search?.mode === it.mode ? (lastA.places ?? []).map((p) => p.id) : [];
        const intent = it.mode !== "find" && lastA?.search && lastA.search.mode !== "find" && /doi|khac|lai/.test(normalizeVi(q)) ? lastA.search : it;
        setBusy(true);
        const shown = shownRef.current;
        let res;
        try {
          res = await runSearch(intent, prevIds);
        } finally {
          setBusy(false);
        }
        shownRef.current = shown;
        return localReply(q, { role: "assistant", content: res.text, local: true, places: res.places, search: intent, quick: res.quick });
      }
    }
    if (!forceAi) {
      // Bắt đầu tâm sự ("tâm sự với mình nha", "cãi nhau với người yêu mệt quá"…) — trước chuyện phiếm.
      // Người dùng vừa kể hoàn cảnh để Lomi nhớ (vd "mình đang thất nghiệp") thì để phần dưới đáp.
      if (!en && !memLearn?.newSits.length) {
        const h = heartStart(q, looksLikeQuestion(q) && isAppish(q) && !!matchFaq(q));
        if (h) return localReply(q, heartMsg(h, 1));
      }
      const cc = chitChat(q, lang, displayName(loadMem(user.id), profile?.full_name));
      if (cc)
        return localReply(q, {
          role: "assistant",
          content: cc.text,
          local: true,
          quick: cc.quick,
        });
      // Người dùng vừa kể hoàn cảnh ("mình đang thất nghiệp") → Lomi đáp lại và nhớ.
      const ns = memLearn?.newSits[0];
      if (ns && !en && q.split(/\s+/).length <= 14 && !matchFaq(q)) {
        const sr = SIT_REPLY[ns];
        return localReply(q, { role: "assistant", content: sr.text, local: true, quick: sr.quick });
      }
    }
    const faq = forceAi ? null : matchFaq(q);
    const bizQ = !forceAi && looksLikeBizQuestion(q);
    // Câu hỏi xin LỜI KHUYÊN kinh doanh (giữ khách, hút khách lúc vắng, giá, khai trương, dịp lễ, bài đăng)
    // thì để tư vấn kinh doanh trả lời — trừ FAQ về cách dùng app rõ ràng (APP_HOWTO_FAQ).
    const advisory = bizQ && ["loyal", "slow", "newcust", "price", "opening", "holiday", "post", "offer"].includes(detectBizTopic(q) ?? "");
    if (faq && (!advisory || APP_HOWTO_FAQ.has(faq.id))) {
      // Lomi vừa bí câu trước, giờ người dùng chọn gợi ý / hỏi lại trúng → ghi nhớ để lần sau trả lời luôn.
      if (lastA?.unk && learnKey(lastA.unk) !== learnKey(q)) learnAnswer(lastA.unk, faq.id);
      return answerFaq(faq, q);
    }
    // 1b) Hỏi chuyện kinh doanh (vd "làm sao hút khách cho quán cà phê buổi sáng") → tư vấn tại chỗ.
    if (bizQ) {
      const kind = detectBizKind(q);
      const tp = detectBizTopic(q) ?? "offer";
      if (!kind.type && (tp === "offer" || tp === "post")) return askBiz(q, tp);
      return bizReply(q, kind, tp);
    }
    // 1c) Chưa chắc hiểu câu hỏi → gợi ý vài câu gần nhất (không gọi AI, không trả lời bừa).
    if (!AI_ENABLED && !forceAi) {
      // Câu này Lomi đã từng "học" (người dùng trước đã chỉ ra đúng câu hỏi) → trả lời luôn.
      const learned = await lookupLearned(q);
      const lf = learned ? faqById(learned) : undefined;
      if (lf) return answerFaq(lf, q);
      logUnanswered(q);
      // Chỉ gợi ý FAQ khi tin có dáng câu hỏi hoặc là vài từ khoá ngắn (vd "điểm thưởng");
      // còn câu tâm sự / nói chuyện phiếm thì Lomi đáp tự nhiên.
      //  Câu hỏi chuyện đời (không dính tới app) thì không đưa FAQ lạc đề — Lomi mời bói đúng câu đó.
      const sug = (looksLikeQuestion(q) && isAppish(q)) || q.split(/\s+/).length <= 3 ? suggestFaqs(q, 3) : [];
      if (!sug.length && !en) {
        const fb = friendlyFallback(q);
        return localReply(q, { role: "assistant", content: fb.text, local: true, quick: fb.quick, unk: q });
      }
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const chips = (sug.length ? sug : POPULAR_FAQ_IDS.slice(0, 4).map((id) => faqById(id)!)).map((f) =>
        lang === "en" ? f.q.en : f.q.vi,
      );
      return localReply(q, {
        role: "assistant",
        content: sug.length
          ? en
            ? "Hmm, I'm not 100% sure what you mean 😅 Did you mean one of these?"
            : pick([
                "Hmm, câu này Lomi chưa chắc hiểu đúng ý bạn 😅 Có phải bạn muốn hỏi một trong mấy câu này không?",
                "Lomi đoán bạn đang hỏi một trong mấy chuyện này nè, bấm vào câu đúng ý nha 👇",
                "Để chắc ăn, bạn chọn giúp Lomi câu gần đúng nhất nha 😊",
              ])
          : en
            ? "That's outside what Lomi knows 😅 I'm best at how to use the app, business tips and tarot. Try asking like “how do I claim an offer”, see the Guide (/huong-dan), or reach a human via Profile → ⋯ → Help & Contact."
            : "Câu này nằm ngoài những gì Lomi biết rồi 😅 Lomi rành nhất về cách dùng Liên Minh Liên Doanh, tư vấn kinh doanh và bói Tarot. Bạn thử hỏi kiểu “làm sao nhận ưu đãi”, xem Hướng dẫn (/huong-dan), hoặc cần người thật hỗ trợ thì vào Hồ sơ → ⋯ → Trợ giúp & Liên hệ nha.",
        local: true,
        quick: chips,
        unk: q,
      });
    }
    // 2) Không phải Membership / hết lượt → báo ngay, không gọi server.
    if (quota && !quota.member) {
      push([
        { role: "user", content: q, local: true },
        { role: "assistant", content: t("ai.memberOnlyLocal"), local: true, note: "member" },
      ]);
      return;
    }
    if (left === 0) {
      push([
        { role: "user", content: q, local: true },
        { role: "assistant", content: t("ai.limitLocal"), local: true, note: "limit" },
      ]);
      return;
    }
    // 3) Gọi Lomi AI. Chỉ gửi phần hội thoại với AI, bỏ các câu trả lời soạn sẵn.
    const next = push([{ role: "user", content: q }]);
    setBusy(true);
    const ctx = next
      .filter((m) => !m.local)
      .slice(-12)
      .map(({ role, content, aiContent: ac }) => ({ role, content: ac ?? content }));
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
    lomiSound("msg");
    setMsgs(withReply);
    saveHistory(user.id, withReply);
    if (quota && typeof data.remaining === "number") setQuota({ ...quota, used: quota.limit - data.remaining });
  };

  const clear = () => {
    setMsgs([]);
    saveHistory(user.id, []);
    setErr(null);
  };


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
        </div>
        <button
          onClick={() => {
            setLomiSound(!soundOn);
            if (!soundOn) window.setTimeout(() => lomiSound("pop"), 0);
          }}
          aria-label={t(soundOn ? "ai.soundOff" : "ai.soundOn")}
          title={t(soundOn ? "ai.soundOff" : "ai.soundOn")}
          className="p-2 text-muted-foreground"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
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
          <div className="py-4 space-y-5">
            {/* Màn chào gọn (30/09 r2, theo ý Kir): lời chào ngắn + 4 ô lối tắt, bỏ danh sách "Hỏi nhanh". */}
            <div className="flex flex-col items-center text-center gap-1 px-6">
              <LomiMascot size={56} className="mb-1" track />
              <p className="text-base font-bold">
                {en ? "Hi there 👋" : (() => {
                  const nm = displayName(loadMem(user.id), profile?.full_name);
                  return nm ? `Chào ${nm} 👋` : "Chào bạn 👋";
                })()}
              </p>
              <p className="text-xs text-muted-foreground">{en ? "How can Lomi help today?" : "Hôm nay Lomi giúp gì cho bạn nè?"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StarterCard emoji="🔮" title={en ? "Tarot reading" : "Bói Tarot"} desc={en ? "1 · 3 · 5 · 10 cards, for fun" : "Suy ngẫm & giải trí · 1–10 lá"} onClick={() => askTarot()} />
              {!en && <StarterCard emoji="💬" title="Tâm sự" desc="Lắng nghe, an ủi, tư vấn tình cảm" onClick={askHeart} />}
              {/* Tư vấn kinh doanh — chạy trên máy (lib/bizAdvisor.ts), miễn phí nên mở cho mọi người. */}
              <StarterCard emoji="💡" title={en ? "Business tips" : "Tư vấn kinh doanh"} desc={en ? "Offers, customers, posts" : "Ưu đãi, hút khách, bài đăng"} onClick={() => askBiz()} />
              {!en && <StarterCard emoji="🍜" title="Hôm nay ăn gì?" desc="Lomi chọn quán giùm bạn" onClick={() => void send("Hôm nay ăn gì? 🎲")} />}
            </div>
            <p className="text-center text-[11px] text-muted-foreground/80 px-6">
              {en ? "Or just type — ask anything about the app." : "Hoặc cứ gõ tự nhiên — hỏi về app, kể chuyện, hỏi gì cũng được 💚"}
            </p>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
              {m.role === "user" && parseStickerToken(m.content) ? (
                <img src={stickerUrl(parseStickerToken(m.content)!)} alt="Sticker" className="w-24 h-auto" />
              ) : (
              <>
              {m.role === "assistant" && m.sticker && (
                <img src={stickerUrl(m.sticker)} alt="Sticker" className="w-20 h-auto mb-1 animate-in zoom-in-50 fade-in duration-300" />
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                )}
              >
                {m.role === "assistant" && m.tarot ? (
                  <TarotCards reading={m.tarot} lang={lang} animate={m.tarot.at > openedAt.current}
                    onDone={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
                  >
                    <RichText text={m.content} />
                  </TarotCards>
                ) : m.role === "assistant" ? (
                  <RichText text={m.content} />
                ) : (
                  m.content
                )}
              </div>
              </>
              )}
              {m.places && <LomiPlaceCards places={m.places} />}
              {m.quick && i === msgs.length - 1 && !busy && <QuickReplies items={m.quick} onPick={(v) => void send(v)} />}
              {m.role === "assistant" && m.local && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 ml-1 text-[11px] text-muted-foreground">
                  {m.note === "member" && (
                    <button onClick={() => nav("/ho-so?view=personal")} className="font-semibold text-primary">
                      {t("offers.viewMembership")} ›
                    </button>
                  )}
                  {m.tarot && i === msgs.length - 1 && (
                    <>
                      {!!m.tarot.question && m.tarot.cards.length > 1 && (
                        <button onClick={() => void send(en ? "One more card" : "Rút thêm 1 lá")} className="font-semibold text-primary">
                          🔮 {en ? "One more card" : "Rút thêm 1 lá"}
                        </button>
                      )}
                      {m.tarot.kind === "daily" && !en ? (
                        // Lá hôm nay cố định trong ngày → "bói lại" không có gì mới; mời trải 3 lá theo buổi.
                        <button onClick={() => void send(DAY3_ASK)} className="font-semibold text-primary">
                          🔮 Bói 3 lá cho hôm nay
                        </button>
                      ) : (
                        <button onClick={() => void send(en ? "Draw again" : "Bói lại")} className="font-semibold text-primary">
                          ↻ {en ? "Draw again" : "Bói lại"}
                        </button>
                      )}
                    </>
                  )}
                  {AI_ENABLED && !m.note && m.ask && quota?.member && left !== 0 && i === msgs.length - 1 && (
                    <button onClick={() => void send(m.ask!, true)} className="font-semibold text-primary">
                      {t("ai.askAi")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {daily && !en && (
          <LomiDailyCard
            uid={user.id}
            name={displayName(loadMem(user.id), profile?.full_name)}
            onClose={() => setDaily(false)}
            onDetail={() => {
              setDaily(false);
              void send("Bói một lá cho hôm nay");
            }}
          />
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

      {(
        <>
        {showStickers && (
          <div className="border-t bg-card animate-in slide-in-from-bottom-2 fade-in duration-200">
            <LomiStickerGrid onPick={sendSticker} className="grid grid-cols-5 gap-1 p-2 max-h-56 overflow-y-auto" />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="p-3 border-t flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => setShowStickers((v) => !v)}
            aria-label="Sticker"
            className={cn(
              "w-10 h-10 shrink-0 rounded-full grid place-items-center transition",
              showStickers ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Smile className="w-5 h-5" />
          </button>
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
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BONG BÓNG LOMI (26/09 theo ý Kir) — linh vật Lomi nổi trên màn hình, chạm để mở khung chat AI
// dạng bảng trượt lên (không rời trang đang xem).
// • Kéo THẢ Ở ĐÂU CŨNG ĐƯỢC (trong vùng giữa thanh tiêu đề và thanh điều hướng) — không tự dính mép.
// • Thả SÁT MÉP trái/phải → Lomi nấp nửa người ở mép cho đỡ chiếm chỗ; chạm để ra lại.
// • Biểu cảm (robot, 27/09): bị kéo → mắt tròn xoe, người nghiêng theo hướng kéo; lắc qua lại
//   mạnh → mắt xoắn ốc; thả xuống → mắt cười ^ ^; chạm → mắt trái tim rồi mở chat; để yên lâu →
//   ngủ gật "z z"; mắt nhìn theo ngón tay/chuột, rảnh thì tự chớp/nheo/nháy mắt. Có tiếng nhỏ
//   khi chạm/kéo (tắt được bằng nút loa trong khung chat — xem lib/lomiSound.ts).
// • Vị trí lưu trên máy (localStorage). Ẩn ở trang có ô nhập phía dưới (chat, cộng đồng) và màn quẹt.
// ─────────────────────────────────────────────────────────────────────────────
const BUBBLE_KEY = "lmld:lomi-bubble-v3";
const GREET_KEY = "lmld:lomi-greet-day";
type BubblePos = { x: number; y: number; tucked: false | "left" | "right" }; // x, y = tỉ lệ 0..1
const SIZE = 72; // 28/09: to hơn 1 chút theo ý Kir (trước 60)
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
      lomiSound("wee");
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
      lomiSound("dizzy");
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
        lomiSound("pop");
        setPos({ ...pos, tucked: false });
        setMoodFor("happy", 900);
        return;
      }
      if (mood === "sleepy") {
        setMoodFor("excited", 900);
        lomiSound("greet");
        setSay(t("ai.wake"));
        window.setTimeout(() => setSay(null), 1800);
        return;
      }
      setMoodFor("excited", 700);
      lomiSound("pop");
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
      lomiSound("happy");
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
          <LomiMascot size={SIZE} mood={mood} look={lookNow} track={!drag && !pos.tucked} />
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
