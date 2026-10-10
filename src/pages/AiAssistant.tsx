import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGoBack } from "@/lib/navigation";
import { ArrowLeft, CircleHelp, RotateCcw, Send, Smile, Volume2, VolumeX } from "lucide-react";
import { loadTopTopics, topicHit, type Topic } from "@/lib/lomiTopics";
import { speak } from "@/lib/lomiAddress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LomiMascot, type LomiMood } from "@/components/LomiMascot";
import {
  POPULAR_FAQ_IDS,
  faqById,
  matchFaq,
  matchFaqFollowUp,
  answerFromPrev,
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
  learnAddr,
  learnFromText,
  loadMem,
  memorySummary,
  rememberBiz,
  situationContext,
} from "@/lib/lomiMemory";
import { DISHES, detectDish, detectSearch, runDishSearch, runSearch, suggestDishes, type DishWant, type PlaceCard, type SearchIntent } from "@/lib/lomiSearch";
import { findMedTopicId as findMedId, foodDisplay, hasQuestion, isSelfStatement, loadMedTopic, nameAsTyped, parseMedAsk, renderMed } from "@/lib/lomiMed";
import { recordStuck, type StuckKind } from "@/lib/lomiStuckLog";
import { learnAnswer, learnKey, loadTaught, logUnanswered, lookupLearned, matchTaught, sendFeedback, taughtHit, type FeedbackReason } from "@/lib/lomiLearn";
import { toast } from "sonner";
import { GATE_ASK_BACK, gate, tarotRuleInfo, topicOpener, understand } from "@/lib/lomiUnderstand";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAffirm, isDecline } from "@/lib/lomiChat";
import { GENERIC, heartContinue, heartFollow, heartOpen, heartStart, heartThemeOf, selfDxAsk, type HeartCtx, type HeartReply } from "@/lib/lomiHeart";
import { eventById } from "@/lib/lomiTalk";
import { storyOpen, storyOpenSymptom, storyTurn, subjectFix, type Thread } from "@/lib/lomiStory";
import { THEME_MOOD, analyzeBody, analyzeMind, onlyAnxietyBody, onlySoftSymptoms } from "@/lib/lomiSymptoms";
import { healthFact } from "@/lib/lomiHealthFacts";
import { dietName, dietOf, dietReply } from "@/lib/lomiDiet";
import { relationReply, relationSubject } from "@/lib/lomiRelation";
import { capabilityAsk, earlyIntent } from "@/lib/lomiIntent";
import { contextReply } from "@/lib/lomiContext";
import { drugAsk } from "@/lib/lomiDrug";
import { drugById } from "@/lib/lomiDrugData";
import { MEDICAL_CHIPS, REFLECT_INTRO, REFLECT_Q, gateWhy, medicalFollowAsk, medicalKindOf, medicalRefusal, tarotHealthGate } from "@/lib/lomiTarotGate";
import { boundaryAdvice, fearInHarm, harmOf, harmReply, helperAdvice, safetyFollow, type Harm } from "@/lib/lomiSafety";
import { isUpbeat, senseCanon, senseLast, senseState, talkContinue } from "@/lib/lomiSense";
import { convoOf, isOffer, otherPlace, resolveTurn } from "@/lib/lomiConvo";
import { YOU_MARK, parseVi } from "@/lib/lomiParse";
import { asksLomiLove, durationOf, frameTurn, isClause, mirrorText, patientOf, symptomClash, withAbout } from "@/lib/lomiFrame";
import type { SubjectKind } from "@/lib/lomiParse";
import { healthCtxOfDiet, healthFeeling, healthSubjectOf, healthTopicReply, isDietAsk, looksLikeHealthTopic, type HealthCtx } from "@/lib/lomiHealthTopic";
import { SCOPE_CHIP_REPLY, chitChat, crisisReply, expressiveReply, expandTeen, isAppish, looksLikeQuestion, scopedFallback } from "@/lib/lomiChat";
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
  isTarotAbilityAsk,
  drawClarifier,
  drawForQuestion,
  isDailyAsk,
  isTarotCancel,
  isTarotMore,
  isTarotRedo,
  isTarotStop,
  oneCardAsk,
  spreadFromText,
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
  /** 09/10: Lomi vừa đáp chuyện của một người / con vật ("mẹ anh", "con mèo nhà anh") — câu sau lược chủ ngữ vẫn là nói về người đó. */
  about?: { text: string; kind: SubjectKind };
  /** 11/10: "about" được giữ thêm một lượt qua câu đáp ngắn của lớp nghe kể (số lượt đã giữ) — để "a nên nói gì với nó" còn biết "nó" là ai. */
  aboutAge?: number;
  /** 10/10: MẠCH CHUYỆN đang theo (lib/lomiStory) — đang nói về ai, đã biết gì, Lomi vừa hỏi gì, còn thiếu gì. */
  thread?: Thread;
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
  hsub?: string; // chủ thể sức khoẻ đang nói (lib/lomiContext) — để hiểu câu hỏi nối
  rel?: string; // "<chủ thể>|<ý định>" chuyện tình cảm đang nói (lib/lomiRelation)
  heart?: string; // đang TÂM SỰ với Lomi (chủ đề cảm xúc) — lib/lomiHeart. KHÔNG dùng làm cờ "đang nói chuyện sức khoẻ" nữa (08/10).
  // Đang nói chuyện SỨC KHOẺ (kiến thức / triệu chứng / kiêng cữ) + bệnh đang nói tới nếu có — lib/lomiHealthTopic.
  // Tách khỏi heart: hỏi "bệnh gout" là hỏi kiến thức, không phải tâm sự. Có cả heart lẫn health = đang tâm sự VỀ chuyện sức khoẻ.
  health?: HealthCtx;
  heartListen?: boolean; // người dùng chỉ muốn được nghe, Lomi không khuyên
  dishPick?: boolean; // Lomi vừa hỏi khẩu vị cho một món cụ thể (lib/lomiIntent foodChoice)
  dishAsk?: { drink: boolean; shown: string[] }; // Lomi vừa gợi ý vài món — tin kế tiếp là món người dùng chọn
  avoidIds?: string[]; // quán đã gợi ý cho món này (không lặp khi bấm "Quán khác")
  dish?: string; // vừa tìm quán cho món này (bấm "Quán khác" để tìm tiếp)
  story?: string; // câu người dùng kể mở đầu câu chuyện đang tâm sự (để Lomi nhắc lại, không lạc mạch)
  sx?: string[]; // triệu chứng cơ thể đã kể (cộng dồn qua các tin) — lib/lomiSymptoms
  mood?: string[]; // cảm giác đã kể (cộng dồn) — lib/lomiSymptoms
  heartDepth?: number; // số lượt đã tâm sự (để đổi cách đáp, nhắc gặp chuyên gia khi cần)
  faqId?: string; // Lomi vừa trả lời câu hỏi thường gặp này — câu hỏi nối ("còn … thì sao") hiểu theo ngữ cảnh đó
  raw?: string; // tin người dùng: câu gõ NGUYÊN VĂN (trước khi chuẩn hoá) — dùng khi báo cáo / Dạy Lomi
  // Câu Lomi vừa bí — CÂU NGUYÊN VĂN người dùng gõ (08/10). Có cờ này thì hiện nút 💡 Dạy Lomi.
  unk?: string;
  // Khoá so khớp của câu vừa bí (câu đã chuẩn hoá, cùng dạng với lookupLearned / logUnanswered dùng để tra):
  // nếu tin kế tiếp trúng câu hỏi thường gặp thì Lomi tự học "khoá này = câu hỏi kia" (lib/lomiLearn).
  unkKey?: string;
  med?: { id: string; aspect?: string }; // 09/10: Lomi vừa trả lời từ kho kiến thức y khoa có nguồn (lib/lomiMed) — câu nối hiểu theo chủ đề này
  stuck?: StuckKind; // 09/10: loại "bí" của lượt này — tự ghi vào nhật ký lomi_stuck_log (lib/lomiStuckLog)
  talk?: number; // Lomi đang "nghe kể" (số lượt liên tục) — tin kế tiếp là kể tiếp, không phải câu độc lập (lib/lomiConvo)
  tarotRef?: TarotReading; // trải bài đang được nói tới (không vẽ lại lá) — để hỏi nối sau một câu giải thích vẫn đúng trải đó
  // 11/10: trải bài rút cách đây 1–3 lượt, giữa chừng đã nói sang chuyện khác ("nhưng người ấy không nhắn 2 tuần rồi") — câu sau nhắc rõ
  // "lá / bài / rút thêm" thì vẫn là hỏi về đúng trải bài đó (n = số lượt đã trôi qua).
  tarotBack?: { r: TarotReading; n: number };
  // 11/10: người dùng đang kể chuyện bị đánh / bị doạ / bị kiểm soát (lib/lomiSafety) — câu sau lược chủ ngữ vẫn là kể tiếp chuyện đó.
  harm?: Harm;
  // 12/10: Lomi vừa trả lời một câu hỏi về THUỐC — loại câu hỏi, tên thuốc người dùng nêu, và mã mục đã kiểm chứng (lib/lomiDrugData) nếu có.
  // Câu nối ("nó có tác dụng phụ gì không", "2 viên", "giờ thấy bình thường") đọc theo cờ này, không dò lại câu chữ của lời đáp trước.
  drug?: { kind: string; name?: string; id?: string };
  // 12/10: Lomi vừa từ chối bói một câu hỏi y khoa (lib/tarot.tarotHealthGate).
  tarotGate?: "medical" | "unclear";
  diet?: string; // bệnh vừa hỏi kiêng ăn uống (lib/lomiDiet) — cho câu nối tiếp "còn bia thì sao"
  reported?: boolean; // người dùng đã bấm ⁉️ gửi câu này cho ban quản trị (01/10)
  taught?: boolean; // câu trả lời do admin dạy (lib/lomiLearn → lomi_taught)
  issue?: string; // Lomi vừa hỏi thêm về lỗi app (lib/lomiUnderstand) — tin kế tiếp là chi tiết máy / màn hình
};
type Quota = { member: boolean; limit: number; used: number };
/** Mạch sức khoẻ đang mở ở tin này. Lịch sử lưu trước 08/10 còn dùng heart "health" làm cờ sức khoẻ → vẫn đọc được. */
const healthOf = (m?: Msg): HealthCtx | undefined => m?.health ?? (m?.heart === "health" && (m.heartDepth === 0 || m.sx?.length || m.hsub || m.diet) ? {} : undefined);

const db = supabase as any;
// 30/09 (theo ý Kir: không phụ thuộc Lovable): Lomi trả lời hoàn toàn trên máy — thư viện hỏi–đáp về app,
// tư vấn kinh doanh, bói Tarot. TẮT gọi AI qua edge function "ai-assistant" (số dư AI của Lovable).
// Khi có key Gemini riêng (xem supabase/functions/ai-assistant) thì đổi thành true để bật lại cho Membership.
const AI_ENABLED = false;
// Trải 3 lá theo buổi cho hôm nay (nút dưới lá bài hôm nay).
const DAY3_Q = "Hôm nay của mình sẽ thế nào?";
const DAY3_ASK = "Bói 3 lá: hôm nay của mình sẽ thế nào?";
// Hỏi nối sau khi bói ("thế còn công việc thì sao") → câu hỏi chuẩn theo chủ đề.
const FOLLOW_TOPIC_Q: Record<string, string> = {
  love: "Tình cảm của mình thời gian tới thế nào?",
  work: "Sự nghiệp của mình thời gian tới thay đổi thế nào?",
  money: "Tài chính của mình thời gian tới thế nào?",
  // 12/10: "thế còn sức khoẻ thì sao" không thành một trải bài DỰ BÁO sức khoẻ — đổi thành câu hỏi chiêm nghiệm (đi qua cửa bói như mọi câu).
  health: "Mình nên giữ tinh thần và chăm sóc sức khoẻ thế nào trong thời gian tới?",
  study: "Chuyện học hành của mình sắp tới thế nào?",
};
// Chủ đề tâm sự thuần tâm lý — kể từ 2 cảm giác thì phân tích tâm lý (lib/lomiSymptoms) sát hơn.
const LOVE_KEYS = new Set(["breakup", "ex", "cheat", "unrequited", "crush", "cold", "fight", "jealous", "longdist", "love", "toxic", "marriage", "single", "situationship", "newlove", "stayorgo", "parentsban", "lies", "spark"]);
const PSY_THEMES = new Set(["insomnia", "overthink", "anxiety", "panic", "sad", "tired", "lonely", "depress", "selfworth", "angerself", "compare"]);
const DISHES_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
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

/** Mở Lomi từ bất kỳ đâu — vd mục "Hỏi Lomi · Hướng dẫn" trong menu → sang trang chat /tro-ly-ai
 *  (01/10: không còn bảng nổi nên không ai "handled" sự kiện này nữa). */
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
  // 01/10 (theo ý Kir): khung chat Lomi nằm GIỮA thanh trên của app (logo, tin nhắn, thông báo) và thanh điều hướng
  // dưới — cùng cách tính chiều cao với trang tin nhắn (--vvh, --header-h, --bottom-nav-h do Layout đo).
  return (
    <div className="flex flex-col h-[calc(var(--vvh,100dvh)-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))]">
      <AiChat onBack={() => goBack("/tin-nhan")} className="h-full w-full max-w-2xl mx-auto" />
    </div>
  );
}

/** Khung chat AI dùng chung cho trang /tro-ly-ai và bảng nổi mở từ bong bóng. */
export function AiChat({
  onBack,
  onClose,
  className,
}: {
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const nav = useNavigate();
  const { t } = useLanguage();
  const { user, profile, isAdmin } = useAuth();
  const [quota, setQuota] = useState<Quota | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // Nút ⁉️ (01/10): tin Lomi đang được báo cáo (vị trí trong msgs).
  const [fbIdx, setFbIdx] = useState<number | null>(null);
  const [fbReason, setFbReason] = useState<FeedbackReason>("unknown");
  const [fbNote, setFbNote] = useState("");
  const [fbBusy, setFbBusy] = useState(false);
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
  // Mạch chuyện (lib/lomiStory) của tin trước: câu đáp của lớp khác (kiến thức sức khoẻ, xã giao, chưa hiểu…) vẫn giữ mạch thêm tối đa
  // 2 lượt — trừ khi câu đáp mở hẳn một việc khác (bói bài, tìm quán, tư vấn kinh doanh, hỏi app). Xem localReply().
  const carryRef = useRef<{ thread: Thread; about?: Msg["about"] } | null>(null);
  // Lượt bói rút SAU thời điểm mở khung chat mới có hiệu ứng lật bài (lịch sử cũ hiện ngửa sẵn).
  const openedAt = useRef(Date.now());
  // Popup "Lá bài hôm nay" — mở Lomi lần đầu trong ngày (components/LomiDailyCard).
  const [daily, setDaily] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [topList, setTopList] = useState<Topic[] | null>(null);

  const loadQuota = async () => {
    const { data } = await db.rpc("get_my_ai_quota");
    if (data) setQuota(data as Quota);
  };

  useEffect(() => {
    if (!user) return;
    setMsgs(loadHistory(user.id));
    void loadQuota();
    void loadTaught();
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
    carryRef.current = null; // mạch chuyện chỉ được giữ qua localReply của đúng lượt đang xử lý
    const sh = shownRef.current;
    if (sh) add = add.map((m) => (m.role === "user" && m.content === sh.from ? { ...m, content: sh.to } : m));
    // Xưng hô đối xứng (anh/chị/em/bạn) theo cách người dùng tự xưng — lib/lomiAddress.
    if (lang !== "en") {
      const addr = loadMem(user.id).addr;
      if (addr && addr !== "bạn") add = add.map((m) => (m.role === "assistant" ? { ...m, content: speak(m.content, addr) } : m));
    }
    const next = [...msgs, ...add];
    setMsgs(next);
    saveHistory(user.id, next);
    return next;
  };

  // Trả lời ngay từ danh sách soạn sẵn (lomiFaq) — không gọi AI. 30/09: bỏ mục "Câu hỏi thường gặp"
  // trên giao diện theo ý Kir, nhưng vẫn âm thầm dùng để trả lời nhanh + đúng các câu về cách dùng app.
  const answerFaq = (f: Faq, asked?: string) => {
    setErr(null);
    topicHit(`faq:${f.id}`);
    const q = asked ?? (lang === "en" ? f.q.en : f.q.vi);
    // Gợi ý 2 câu liên quan (cùng nhóm) để hỏi tiếp cho mượt.
    const rel = relatedFaqs(f, 2).map((x) => (lang === "en" ? x.q.en : x.q.vi));
    push([
      { role: "user", content: q, local: true },
      { role: "assistant", content: lang === "en" ? f.a.en : f.a.vi, local: true, ask: AI_ENABLED ? asked : undefined, quick: rel, faqId: f.id },
    ]);
    lomiSound("msg");
  };

  const en = lang === "en";
  const bizLabel = (k: string) => t(`type.${k}`);

  // ── Bói Tarot kiểu hỏi – đáp (30/09 r2) ──
  // Chưa có câu hỏi → Lomi hỏi lại bằng lời (kèm vài gợi ý nhỏ), tin kế tiếp được hiểu là câu hỏi.
  const askTarot = (asked?: string, intro?: string) => {
    setErr(null);
    push([
      ...(asked ? [{ role: "user" as const, content: asked, local: true }] : []),
      {
        role: "assistant",
        content: intro ?? (en ? TAROT_ASK.en : TAROT_ASK.vi),
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
    // 08/10: chỉ coi là "có chuyện kể kèm" khi ngoài câu hỏi và mấy chữ nhờ bói ra còn ít nhất vài từ — nếu không,
    // "bói tarot xem người ấy còn tình cảm không" (câu đầu tiên) bị mở đầu bằng "Nối tiếp chuyện mình đang nói lúc nãy".
    const extra = normalizeVi(asked).replace(normalizeVi(question), " ").replace(/\b(boi|tarot|xem|rut|bai|la|trai|giup|gium|dum|cho|minh|em|e|a|anh|chi|lomi|di|nha|nhe|thu|coi|ve|chuyen|mot|ba|nam|muoi|1|3|5|10|oi|voi)\b/g, " ").trim();
    let ctx = context ?? (question && extra.split(/\s+/).filter(Boolean).length >= 3 ? asked : undefined);
    // "trải 5 lá về tiền bạc": số lá nằm ngoài phần câu hỏi → vẫn phải rút đúng 5 lá.
    if (!ctx && question && ((spreadFromText(asked) && !spreadFromText(question)) || (oneCardAsk(asked) && !oneCardAsk(question)))) ctx = asked;
    // Câu hỏi chung chung ("bao giờ mọi chuyện ổn hơn") → ghép thêm hoàn cảnh Lomi nhớ (vd đang tìm việc).
    const sit = situationContext(loadMem(user.id));
    if (question && sit && questionTopic(question) === "general") ctx = `${ctx ?? asked}. ${sit}`;
    // 12/10 — RANH GIỚI TAROT – Y KHOA (lib/lomiTarotGate): mọi trải bài theo câu hỏi đều qua cửa này.
    //   • câu hỏi chẩn đoán / tiên lượng / sống chết / quyết định điều trị / thai kỳ → KHÔNG trải bài, nói rõ giới hạn và chỉ về bác sĩ
    //     (mạch chuyện đang theo — vd mẹ đang nằm viện — vẫn được giữ);
    //   • xin bài về cách giữ tinh thần, đối diện với bệnh → bói bằng câu hỏi chiêm nghiệm chuẩn, lá bài không nhắc tới bệnh hay thuốc.
    //   • đang nói dở chuyện một người ốm (mạch chăm người ốm còn đó, hoặc Lomi vừa từ chối một câu hỏi y khoa) thì câu hỏi chung chung
    //     về "sắp tới" cũng là hỏi bệnh → không trải bài; câu khác ("nên làm gì cho mẹ vui") bói được, mở bài bằng giọng trầm.
    const lastM = msgs[msgs.length - 1];
    const sick = carryRef.current?.thread?.kind === "care" || (lastM?.role === "assistant" && lastM.tarotGate === "medical");
    const gate = en ? null : tarotHealthGate(question, ctx, { sick });
    if (gate?.gate === "medical") {
      topicHit("tarot");
      // Đang theo chuyện một người ốm thì lời từ chối này vẫn thuộc chuyện đó → giữ nguyên mạch (không tính là "chuyện khác chen vào").
      const c0 = carryRef.current;
      return localReply(asked, { role: "assistant", content: medicalRefusal(gate.kind, false, !!sick), local: true, tarotGate: gate.kind === "unclear" ? "unclear" : "medical", quick: gate.kind === "unclear" ? ["🩺 Sức khoẻ"] : MEDICAL_CHIPS, ...(c0 ? { thread: { ...c0.thread, asked: [] }, about: c0.about } : {}) });
    }
    const reflect = gate?.gate === "reflect";
    const r = reflect && !gate?.own ? drawForQuestion(REFLECT_Q) : drawForQuestion(question, ctx);
    if (reflect) r.sober = true;
    topicHit(question ? "tarot" : "daily");
    // Thông điệp hôm nay = đúng lá của popup "Lá bài hôm nay" (cố định trong ngày).
    if (!question) r.cards = [dailyDraw(user.id)];
    push([
      { role: "user", content: asked, local: true },
      // Gợi ý bói tiếp theo đúng bối cảnh (vd tìm việc → "hợp ngành gì", "thu nhập có ổn không").
      { role: "assistant", content: `${reflect ? `${REFLECT_INTRO}\n\n` : ""}${readingText(r, lang)}`, local: true, tarot: r, ask: readingAiPrompt(r, lang), quick: en ? undefined : tarotFollowUps(r) },
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
  const rawRef = useRef<string | null>(null); // câu người dùng gõ nguyên văn của lượt đang xử lý
  const localReply = (asked: string, reply0: Msg) => {
    setErr(null);
    const c = carryRef.current;
    const newFlow = !!(reply0.tarot || reply0.tarotAwait || reply0.biz || reply0.bizPick || reply0.dish || reply0.dishAsk || reply0.dishPick || reply0.search || reply0.faqId || reply0.issue);
    let reply: Msg = c && !reply0.thread && !newFlow ? { ...reply0, thread: { ...c.thread, asked: [], idle: (c.thread.idle ?? 0) + 1 }, about: reply0.about ?? c.about } : reply0;
    // Trải bài vừa rút được nhớ thêm 3 lượt qua các câu đáp của lớp khác (tâm sự, hỏi han…), trừ khi lượt này mở một mạch mới.
    const prevA = msgs[msgs.length - 1]?.role === "assistant" ? msgs[msgs.length - 1] : undefined;
    const tb = prevA?.tarot ?? prevA?.tarotRef ? { r: (prevA.tarot ?? prevA.tarotRef)!, n: 1 } : prevA?.tarotBack && prevA.tarotBack.n < 3 ? { r: prevA.tarotBack.r, n: prevA.tarotBack.n + 1 } : undefined;
    if (tb && !reply.tarot && !reply.tarotRef && !reply.tarotAwait && !newFlow) reply = { ...reply, tarotBack: tb };
    // Đang nói về một người mà Lomi chỉ đáp một câu nghe kể ngắn → vẫn nhớ đang nói về người đó thêm một lượt.
    if (!reply.about && prevA?.about && (prevA.aboutAge ?? 0) < 1 && !newFlow && (reply.talk || (reply.heart && reply.heart === prevA.heart))) reply = { ...reply, about: prevA.about, aboutAge: (prevA.aboutAge ?? 0) + 1 };
    if (reply.stuck) {
      recordStuck(
        {
          kind: reply.stuck,
          question: rawRef.current ?? asked,
          reply: reply.content,
          context: msgs.slice(-8).map((m) => ({ r: m.role === "user" ? ("u" as const) : ("a" as const), t: m.role === "user" ? (m.raw ?? m.content) : m.content })),
        },
        isAdmin,
      );
    }
    push([{ role: "user", content: asked, local: true, raw: rawRef.current ?? asked }, reply]);
    lomiSound("msg");
  };

  // ── Tư vấn kinh doanh (30/09 r4) — chạy trên máy như Tarot (lib/bizAdvisor.ts), ai cũng dùng được ──
  // Hỏi loại hình → hỏi chủ đề → trả lời từ thư viện, xoay vòng ý để không lặp; hỏi nối "thêm ý khác".
  const askBiz = (asked?: string, pending?: BizTopic, force = false) => {
    topicHit("biz");
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
    topicHit("biz");
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
    // health: đang tâm sự về một chuyện sức khoẻ thì vẫn nhớ bệnh đang nói tới (để hỏi lại kiến thức là có ngay).
    ...(h.end ? {} : { heart: h.theme, heartListen: h.listen, heartDepth: depth, sx: keep?.sx, mood: keep?.mood, story: h.story ?? keep?.story, health: keep?.health }),
  });
  const askHeart = (asked?: string) => {
    setErr(null);
    topicHit("heart");
    push([...(asked ? [{ role: "user" as const, content: asked, local: true }] : []), heartMsg(heartOpen(), 0)]);
    lomiSound("pop");
  };
  // Bấm gợi ý / chủ đề hot → hiện như tin nhắn của mình trong cùng khung chat rồi Lomi trả lời bên dưới.
  const pickSuggest = (key: string, label: string, prompt?: string) => {
    setShowTop(false);
    setShowStickers(false);
    if (key === "tarot") return askTarot(label);
    if (key === "heart") return askHeart(label);
    if (key === "biz") return askBiz(label);
    if (key === "app") return void send("📱 Hỏi về app");
    if (key === "food") return void send("🍜 Hôm nay ăn gì?");
    if (key === "health") return void send("🩺 Sức khoẻ");
    return void send(prompt ?? label);
  };
  const openTop = () => {
    setShowTop((v) => !v);
    setShowStickers(false);
    if (!topList) void loadTopTopics(8).then(setTopList);
  };

  // 10/10: "thoái hóa cột sống ăn gì", "viêm xoang kiêng gì" — câu nêu một bệnh / tình trạng (kể cả bệnh chưa có trong kho) là hỏi
  // ăn uống theo bệnh, không phải nhờ gợi ý quán.
  const illMeal = (x: string) => /\b(benh|thoai hoa|viem|suy|ung thu|hoi chung|roi loan|dau|mo mau|tieu duong|huyet ap|sau mo|mang thai|co bau|ba bau|kieng|chua benh|chua tri)\b/.test(normalizeVi(x));
  // ── Hôm nay ăn gì / uống gì (01/10): gợi ý món → chọn món → tìm quán có món đó ──
  const replyDishes = (asked: string, drink: boolean, avoid: string[] = []) => {
    topicHit(drink ? "drink" : "food");
    const s = suggestDishes(drink, avoid);
    return localReply(asked, {
      role: "assistant",
      content: s.text,
      local: true,
      quick: s.quick,
      dishAsk: { drink, shown: [...avoid, ...s.dishes.map((d) => d.id)].slice(-12) },
    });
  };
  const replyDishShops = async (asked: string, dishId: string, avoidIds: string[] = [], want?: DishWant) => {
    const d = DISHES_BY_ID[dishId];
    if (!d) return;
    const shown = shownRef.current;
    setBusy(true);
    let res;
    try {
      res = await runDishSearch(d, avoidIds, want);
    } finally {
      setBusy(false);
    }
    shownRef.current = shown;
    return localReply(asked, { role: "assistant", content: res.text, local: true, places: res.places, quick: res.quick, dish: d.id, avoidIds });
  };

  const send = async (text: string, forceAi = false) => {
    const raw = text.trim();
    if (!raw || busy) return;
    rawRef.current = raw;
    const stk = parseStickerToken(raw);
    if (stk) {
      setInput("");
      return sendSticker(stk);
    }
    // Người dùng tự xưng anh/chị/em/mình → Lomi xưng hô đối xứng từ câu này trở đi.
    // 09/10 — KHUNG CÂU (lib/lomiParse): đọc câu GỐC một lần thành chủ ngữ / phủ định / thời gian / loại câu / vị ngữ.
    // Câu hỏi mở đầu bằng "e / em" mà chủ ngữ là Lomi ("e ăn tối chưa") → người dùng đang GỌI Lomi là em, không phải tự xưng em.
    const addr0 = en ? undefined : loadMem(user.id).addr;
    const fr0 = en ? null : parseVi(raw, { addr: addr0 });
    //   ("e có người yêu chưa" — hỏi chuyện riêng của Lomi — cũng vậy, dù khung không có vị ngữ.)
    const callsLomiEm = (!!fr0 && asksLomiLove(fr0)) || !!fr0 && fr0.conf >= 0.7 && fr0.em === "you" && !fr0.toks.some((t) => t.r === "SELF") && (fr0.subject === "you" || fr0.act === "greet" || fr0.act === "wish" || fr0.act === "thanks" || fr0.act === "invite");
    const selfAC = fr0 && fr0.conf >= 0.75 && fr0.pred && !fr0.multi ? (/^(a|anh)$/.test(fr0.selfWord ?? "") ? "anh" : /^(c|chị)$/.test(fr0.selfWord ?? "") ? "chị" : undefined) : undefined;
    // 12/10 — xưng hô đọc theo CẤU TRÚC cho những câu phép đoán "đại từ + động từ" bỏ sót (benchmark: Lomi vẫn gọi "bạn" dù người dùng
    // đã xưng anh / em):
    //  • chữ viết tắt "a" / "c" ở vai NGƯỜI NÓI thì gần như chỉ có một nghĩa → nhận cả khi câu hai vế hoặc là lời nhờ
    //    ("A đói mà chưa biết ăn gì", "bói xem a nên…"), và khi là người sở hữu ("con a á", "mẹ a bị…");
    //  • "e" thì mơ hồ (cũng là cách gọi Lomi) → chỉ nhận ở câu KỂ mà "e" là người sở hữu một người thân / con vật / đồ vật
    //    ("chồng e đánh e", "mèo nhà e mất rồi") hoặc đi cùng người yêu, vợ chồng ("e với bạn trai cãi nhau").
    const sw0 = fr0?.selfWord ?? "";
    const possSelf = !!fr0 && (fr0.subject === "third" || fr0.subject === "pet" || fr0.subject === "thing") && !!fr0.subjectText?.includes(YOU_MARK);
    //  (người đã xưng "em" thì "a" trong câu thường là người yêu — "a không nhắn cho e" — nên không đổi; "a ơi" là gọi Lomi.)
    const shortAC =
      fr0 && addr0 !== "em" && fr0.conf >= 0.45 && fr0.act !== "greet" && fr0.act !== "thanks" && fr0.act !== "wish" && !fr0.toks.some((t) => t.r === "EM") && !/(^|\s)(a|anh|c|chị)\s+ơi/iu.test(raw)
        ? sw0 === "a" ? "anh" : sw0 === "c" ? "chị" : undefined
        : undefined;
    const selfEm =
      fr0 && !sw0 && addr0 !== "anh" && addr0 !== "chị" && fr0.em === "self" && fr0.act === "statement" && fr0.conf >= 0.75 && (possSelf || (fr0.subject === "self" && (fr0.toks.some((t) => t.r === "KIN" && t.cls === "partner") || (!!fr0.pred && fr0.pred.val < 0 && (fr0.pred.cls === "bad" || fr0.pred.cls === "ill")))))
        ? ("em" as const)
        : undefined;
    const addrNow = en ? { explicit: undefined } : learnAddr(user.id, raw, { force: callsLomiEm ? "bạn-em" : fr0?.addressee && fr0.em === "you" && selfAC ? selfAC : undefined, fallback: selfAC ?? shortAC ?? selfEm, hold: (() => { const lm = msgs[msgs.length - 1]; return !!(lm?.role === "assistant" && (lm.rel || (lm.heart && LOVE_KEYS.has(lm.heart)))); })() });
    // Câu này vừa cho biết cách xưng hô mới ("a đang…") → đọc lại khung với cách xưng hô đó ("e" trong câu là Lomi).
    const fr1 = fr0 && loadMem(user.id).addr !== addr0 ? parseVi(raw, { addr: loadMem(user.id).addr }) : fr0;
    // Tin trước đang nói về một người / con vật → câu lược chủ ngữ này vẫn nói về người đó ("mẹ a đang ốm" → "bị cảm thôi").
    const lastMsg0 = msgs[msgs.length - 1];
    const fr = fr1 ? withAbout(fr1, lastMsg0?.role === "assistant" ? lastMsg0.about : null) : null;
    let q = en ? expandTeen(raw) : senseCanon(expandTeen(raw)); // 06/10: cách nói khác → từ khoá chuẩn (lib/lomiSense); bong bóng vẫn hiện nguyên văn
    shownRef.current = q !== raw ? { from: q, to: raw } : null;
    setErr(null);
    setInput("");
    const last = msgs[msgs.length - 1];
    const lastA0 = last?.role === "assistant" ? last : undefined;
    // Understanding Gate (01/10) — câu sửa lại ("không, a hỏi…", "ý mình là…") → bỏ ngữ cảnh cũ, hiểu phần sau như câu mới.
    const corr = !forceAi && !en ? gate(q, { lastText: lastA0?.content, inFlow: !!(lastA0?.heart || lastA0?.dishAsk || lastA0?.bizPick || lastA0?.bizTopicPick || lastA0?.issue || lastA0?.tarotAwait) }, true) : null;
    if (corr?.action === "rewrite") {
      q = corr.q;
      shownRef.current = { from: q, to: raw };
    }
    const lastA = corr?.action === "rewrite" ? undefined : lastA0;
    // 08/10 — hai mạch TÁCH RIÊNG: hCtx = đang nói chuyện sức khoẻ; heartOn = đang tâm sự thật (có cảm xúc).
    // Chỉ heartOn mới được đưa tin kế tiếp vào heartContinue(); mạch sức khoẻ có đường xử lý riêng ở mục f0.
    const hCtx = healthOf(lastA);
    const hCtx0 = healthOf(lastA0);
    const heartOn = !!lastA?.heart && !(hCtx && !lastA?.health);
    // Câu đáp không thuộc lớp sức khoẻ (cảm ơn, xã giao, chưa hiểu…) khi đang ở mạch sức khoẻ thì vẫn giữ mạch + bệnh đang nói.
    const keepHealth: Partial<Msg> = hCtx && !heartOn ? { health: hCtx, sx: lastA?.sx, diet: lastA?.diet, hsub: lastA?.hsub } : {};
    let gateSkip: string | null = null; // Gate bảo "đừng cho module chuyên biệt bắt câu này"
    let memLearn: ReturnType<typeof learnFromText> | null = null;
    // Người dùng nói rõ cách xưng hô ("gọi tui là anh nha", "thôi gọi mình là bạn") → xác nhận ngắn gọn.
    if (addrNow.explicit && q.split(/\s+/).length <= 14) {
      const a = addrNow.explicit;
      return localReply(q, {
        role: "assistant",
        content:
          a === "anh" || a === "chị"
            ? `Dạ, từ giờ em gọi ${a} là ${a} nha 😊`
            : a === "em"
              ? "Okie, từ giờ Lomi gọi em là em nha 😊"
              : "Okie, từ giờ mình gọi nhau là bạn với Lomi nha 😊",
        local: true,
      });
    }

    // 11/10: Lomi vừa hỏi thẳng "…hay có lúc bạn nghĩ tới chuyện không muốn sống nữa?" mà người dùng đáp "có" / "nhiều lúc" → đó là lời xác nhận,
    // ưu tiên hỗ trợ ngay (cùng lời đáp với khi họ tự nói ra), không đáp "À vậy hả, kể tiếp đi".
    if (!forceAi && !en && lastA0 && /không muốn sống nữa\?/.test(lastA0.content) && (isAffirm(q) || /\b(co luc|doi khi|nhieu luc|thinh thoang|ve sau|cai sau|co nghi|nghi toi roi|co chu)\b/.test(normalizeVi(q)))) {
      const cr0 = crisisReply("không muốn sống nữa", lang);
      if (cr0) return localReply(q, { role: "assistant", content: cr0.text, local: true, heart: "sad", heartDepth: 1 });
    }
    // 11/10: đang nói chuyện không vui của MỘT NGƯỜI KHÁC ("chị ấy mới nghỉ việc" → "chị ấy buồn lắm") mà hỏi mình nên nói gì / an ủi sao
    //        → gợi ý cách ở bên người đó (trước đây: "Ra là vậy 😄").
    //        Hỏi trống "a nên làm gì" cũng vậy — nhưng chỉ khi không phải chuyện ốm đau (mạch sức khoẻ / chăm người ốm có lời khuyên riêng).
    const nq0 = normalizeVi(q);
    const sayAsk0 = /\b(nen noi gi|noi gi voi|noi sao voi|an ui|dong vien|lam gi de giup|giup (\S+ ){0,2}(sao|the nao|duoc gi)|khuyen (\S+ ){0,2}(sao|the nao|gi))\b/.test(nq0);
    const doAsk0 = !sayAsk0 && !lastA0?.thread && !lastA0?.health && !lastA0?.heart && nq0.split(" ").length <= 7 && /\b(nen lam gi|nen lam sao|phai lam sao|phai lam gi|lam sao (bay gio|gio|day)|lam gi (bay gio|gio|day)|biet lam sao)\b/.test(nq0);
    if (!forceAi && !en && lastA0?.about && lastA0.about.kind === "third" && !lastA0.harm && !crisisReply(q, lang) && (sayAsk0 || doAsk0)) {
      const w = lastA0.about.text;
      // 12/10: người đang nhắc tới ĐÃ MẤT ("bạn a mới mất" → "a không biết nói gì với gia đình bạn") → gợi ý cách chia buồn với người ở lại;
      //   tuyệt đối không khuyên "hỏi thăm dạo này sao rồi", "hỏi xem người đó cần giúp gì" như với người đang còn.
      if (lastA0.thread?.kind === "loss")
        return localReply(q, {
          role: "assistant",
          content: `Lúc này không cần lời lẽ gì nhiều đâu bạn. Một câu thật lòng như “Mình xin chia buồn với gia đình” rồi có mặt ở đó là đủ.\n• Nếu bạn có một kỷ niệm đẹp về người đã mất, kể ra — người ở lại thường rất quý điều đó.\n• Tránh mấy câu như “thôi đừng buồn nữa”, “âu cũng là số”.\n• Hỏi xem gia đình cần phụ việc gì (đón khách, giấy tờ, cơm nước) rồi phụ đúng việc đó.\n\nVà bạn cũng đang mất một người thân thiết — bạn thấy thế nào rồi?`,
          local: true,
          about: lastA0.about,
          thread: lastA0.thread,
          talk: (lastA0.talk ?? 0) + 1,
        });
      return localReply(q, {
        role: "assistant",
        content: `${doAsk0 ? `Chuyện của ${w} thì việc quý nhất bạn làm được lúc này là ở bên và nghe.` : `Lúc ${w} đang có chuyện thì không cần nói điều gì to tát đâu bạn.`} Một câu kiểu “dạo này sao rồi, có gì cứ nói mình nghe” rồi ngồi nghe là đủ.\n• Đừng vội khuyên hay bảo “có gì đâu mà buồn” — được nghe thường quý hơn lời khuyên.\n• Hỏi xem ${w} cần giúp việc gì cụ thể, rồi giúp đúng việc đó.\n• Vài hôm sau nhắn hỏi thăm lại, để ${w} biết mình vẫn nhớ.`,
        local: true,
        about: lastA0.about,
        talk: (lastA0.talk ?? 0) + 1,
        ...(lastA0.heart ? { heart: lastA0.heart, heartDepth: (lastA0.heartDepth ?? 0) + 1, story: lastA0.story } : {}),
        ...(lastA0.health ? { health: lastA0.health } : {}),
      });
    }
    // 11/10: Lomi vừa hỏi "Ai nói hoài mà không chịu nghe vậy?" → câu đáp chỉ nêu MỘT NGƯỜI ("con a á") là câu trả lời cho đúng câu hỏi đó.
    if (!forceAi && !en && fr1 && lastA0 && /không chịu nghe vậy/.test(lastA0.content) && (fr1.subject === "third" || fr1.subject === "pet") && fr1.subjectText && !fr1.pred && raw.split(/\s+/).length <= 5) {
      const addrS = loadMem(user.id).addr;
      const who = { text: fr1.subjectText.split("⟦you⟧").join(addrS === "anh" || addrS === "chị" || addrS === "em" ? addrS : "bạn"), kind: fr1.subject };
      return localReply(q, { role: "assistant", content: `${who.text.charAt(0).toUpperCase() + who.text.slice(1)} hả 😔 Nhắc hoài mà không được nghe thì mệt thật. Chuyện gì mà phải nói hoài vậy bạn?`, local: true, about: who, talk: (lastA0.talk ?? 0) + 1 });
    }

    // 11/10 — AN TOÀN TRƯỚC (lib/lomiSafety): kể bị đánh / bị doạ / bị người yêu – vợ chồng kiểm soát → Lomi nói rõ đó không phải lỗi của
    // người kể, đưa số gọi khi nguy hiểm và hỏi về an toàn; không đáp "Ra là vậy 😄" như chuyện phiếm. (Ý định tự hại vẫn ưu tiên trước.)
    if (!forceAi && !en && !crisisReply(q, lang)) {
      const addrS = loadMem(user.id).addr;
      const keepHarm = { heart: "toxic", heartDepth: (lastA0?.heartDepth ?? 0) + 1, story: lastA0?.story ?? (raw.length <= 90 ? raw : undefined) };
      const sf = lastA0?.harm ? safetyFollow(raw, lastA0.content) : null;
      if (sf) return localReply(q, { role: "assistant", content: sf, local: true, ...keepHarm, harm: lastA0!.harm });
      const hm = harmOf(raw, fr1, { addr: addrS, inHarm: lastA0?.harm });
      if (hm) {
        topicHit("heart");
        const sr = harmReply(hm, { addr: addrS, inHarm: lastA0?.harm, mirror: mirrorText(fr1, addrS, 10), said: msgs.filter((m) => m.role === "assistant").slice(-6).map((m) => m.content) });
        return localReply(q, { role: "assistant", content: sr.text, local: true, ...keepHarm, harm: sr.harm });
      }
      // Người bị là NGƯỜI KHÁC ("bạn e bị chồng đánh") mà hỏi mình nên làm gì → lời khuyên cho người đứng ngoài, không phải cho nạn nhân.
      const hp = lastA0?.harm ? (helperAdvice(raw, lastA0.harm) ?? boundaryAdvice(raw, lastA0.harm, lastA0.content) ?? fearInHarm(raw, lastA0.harm)) : null;
      if (hp) return localReply(q, { role: "assistant", content: hp, local: true, ...keepHarm, harm: lastA0!.harm });
    }

    // 10/10 — MẠCH CHUYỆN CÓ TRẠNG THÁI (lib/lomiStory): Lomi đang theo chuyện một người / con vật ốm hay mới mất → đọc tin này như câu
    // TRẢ LỜI / kể tiếp cho đúng mạch đó (nhớ đang nói về ai, đã biết gì, vừa hỏi gì), rồi hỏi tiếp điều còn thiếu. Chạy trước lớp
    // ngữ cảnh chung vì "rồi", "chưa", "đi khám rồi" ở đây là câu trả lời cho đúng câu Lomi vừa hỏi. Ý định tự hại vẫn được ưu tiên trước.
    const th0 = !forceAi && !en ? lastA0?.thread : undefined;
    carryRef.current = th0 && (th0.idle ?? 0) < 2 ? { thread: th0, about: lastA0?.about } : null;
    if (!forceAi && !en && fr1 && lastA0 && !crisisReply(q, lang)) {
      const addrS = loadMem(user.id).addr;
      if (th0) {
        const claimed = !!(detectTarot(q) || detectSearch(q) || detectDish(q) || looksLikeBizQuestion(q) || capabilityAsk(q) || (isAppish(q) && matchFaq(q)));
        const st = storyTurn(raw, fr1, th0, { addr: addrS, mirror: mirrorText(fr1, addrS, 8), claimed, inHeart: !!lastA0.heart, inHealth: !!lastA0.health });
        if (st) {
          topicHit(st.health ? "health" : "heart");
          return localReply(q, {
            role: "assistant",
            content: st.text,
            local: true,
            quick: st.quick,
            thread: st.thread,
            about: st.thread.who,
            // Đang tâm sự thì vẫn ở mạch tâm sự; còn lại là mạch nghe kể (+ mạch sức khoẻ khi đã biết tên bệnh để hỏi tiếp kiến thức).
            ...(lastA0.heart
              ? { heart: lastA0.heart, heartDepth: (lastA0.heartDepth ?? 0) + 1, heartListen: lastA0.heartListen, story: lastA0.story, rel: lastA0.rel, mood: lastA0.mood }
              : st.heart
                ? { heart: st.heart, heartDepth: 1 }
                : { talk: (lastA0.talk ?? 0) + 1 }),
            ...(st.health ? { health: st.health } : hCtx0 && !lastA0.heart ? { health: hCtx0, sx: lastA0.sx, diet: lastA0.diet, hsub: lastA0.hsub } : {}),
          });
        }
      } else if (hCtx0 && lastA0.sx?.length) {
        // Lomi vừa đọc triệu chứng như của chính người dùng mà họ sửa lại: "Mẹ a á, không phải a" → đổi người bệnh, mở mạch chuyện về người đó.
        const fix = subjectFix(raw, addrS);
        if (fix?.who)
          return localReply(q, {
            role: "assistant",
            content: `Dạ, Lomi hiểu rồi — người bị là ${fix.who.text}, không phải ${addrS === "anh" || addrS === "chị" || addrS === "em" ? addrS : "bạn"} 🙏 Mấy điều Lomi vừa nói là dành cho ${fix.who.text} nha. ${fix.who.text.charAt(0).toUpperCase() + fix.who.text.slice(1)} bị vậy mấy hôm rồi bạn?`,
            local: true,
            thread: storyOpenSymptom(fix.who),
            about: fix.who,
            health: hCtx0,
            sx: lastA0.sx,
            diet: lastA0.diet,
            hsub: lastA0.hsub,
          });
      }
    }

    // 11/10: sửa lại người đang được nói tới khi KHÔNG ở mạch nào ("A đang nói mẹ a, không phải a.") → Lomi nhận là mình nghe nhầm,
    // nhớ đang nói về người đó và hỏi chuyện của người đó (trước đây: "Ừa, em nghe nè 😊 Rồi sao nữa?").
    if (!forceAi && !en && fr1 && !th0 && !(hCtx0 && lastA0?.sx?.length) && !crisisReply(q, lang)) {
      const addrS = loadMem(user.id).addr;
      const fix = subjectFix(raw, addrS);
      if (fix?.who) {
        const w = fix.who.text;
        const youS = addrS === "anh" || addrS === "chị" || addrS === "em" ? addrS : "bạn";
        return localReply(q, {
          role: "assistant",
          content: `Dạ, Lomi hiểu rồi — bạn đang nói về ${w}, không phải ${youS} 🙏 ${lastA0 ? "Lomi nghe nhầm, xin lỗi bạn nha. " : ""}${w.charAt(0).toUpperCase() + w.slice(1)} đang có chuyện gì vậy bạn, kể Lomi nghe với.`,
          local: true,
          about: fix.who,
          talk: (lastA0?.talk ?? 0) + 1,
        });
      }
    }

    // 08/10 — NGỮ CẢNH (lib/lomiConvo): đọc 2–5 lượt gần nhất rồi hiểu tin này như câu NỐI TIẾP nếu đúng là vậy:
    // "quán nào ổn?" (đang nói cà phê) → tìm quán cà phê; "yên tĩnh" (vừa tìm quán) → thêm điều kiện; "ừ" sau câu hỏi
    // chọn một trong nhiều thứ → hỏi lại đúng phần còn thiếu; "người đó thì sao?" → người đang nói tới…
    const convo = !forceAi && !en ? convoOf(msgs) : null;
    const rt = convo ? resolveTurn(q, raw, convo, { correcting: corr?.action === "rewrite" }) : null;
    if (rt?.kind === "reply") {
      // keep: giữ nguyên mạch đang nói (tâm sự, sức khoẻ, trải bài vừa rút…) qua một lượt hỏi lại / giải thích.
      const k = rt.keep ? lastA0 : undefined;
      return localReply(q, {
        role: "assistant",
        content: rt.reply.text,
        local: true,
        quick: rt.reply.quick,
        ...(rt.talk ? { talk: (convo?.talk ?? 0) + 1 } : {}),
        ...(k
          ? { heart: k.heart, health: k.health, heartListen: k.heartListen, heartDepth: k.heartDepth, rel: k.rel, hsub: k.hsub, sx: k.sx, mood: k.mood, story: k.story, diet: k.diet, dish: k.dish, dishPick: k.dishPick, avoidIds: k.avoidIds, search: k.search, biz: k.biz, faqId: k.faqId, talk: k.talk, tarotRef: k.tarot ?? k.tarotRef ?? (/^tarot:/.test(rt.why) ? k.tarotBack?.r : undefined) }
          : {}),
      });
    }
    if (rt?.kind === "refine") return replyDishShops(q, rt.dish, [], rt.want);
    // Câu bác lại trống ("không", "không phải") mà ngữ cảnh ở trên không giải thích được → Lomi nhận là mình hiểu nhầm.
    if (corr?.action === "reply") return localReply(q, { role: "assistant", content: corr.reply.text, local: true, quick: corr.reply.quick });
    if (rt?.kind === "rewrite") {
      q = rt.q;
      shownRef.current = { from: q, to: raw };
    }

    // Lomi vừa mời ("rút một lá cho nhẹ lòng không?") kèm nút gợi ý → người dùng gõ "ok / ờ / có"
    // thì làm luôn gợi ý đầu tiên (khung chat vẫn hiện đúng chữ họ gõ); "không / thôi" thì đáp nhẹ nhàng.
    if (!forceAi && !en && lastA?.quick?.length && !lastA.bizPick && !lastA.bizTopicPick && !lastA.tarotAwait && !lastA.heart && !hCtx) {
      // Chỉ khi tin trước thật sự là lời mời (có câu hỏi + động từ mời), tránh "ok" sau câu chào bị hiểu nhầm.
      const offered = isOffer(lastA.content);
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
      // Câu ngắn có nhấn mạnh / sắc thái ("chánnnn 😭", "okkk 😂", "ok......", "haizzz") → đáp đúng sắc thái,
      // trừ khi đang trong một mạch (tâm sự, bói, tư vấn, chọn món) thì để mạch đó hiểu tiếp.
      if (!en && q.split(/\s+/).length <= 4 && !lastA?.heart && !hCtx && !lastA?.tarotAwait && !lastA?.bizPick && !lastA?.bizTopicPick && !lastA?.dishAsk && !lastA?.issue) {
        const xr = expressiveReply(q, raw);
        //   ("trời ơiiii chán quá điiii" → đáp đúng sắc thái, và nhớ là đang CHÁN để câu sau "ở nhà hoài", "có gì chơi không" được hiểu tiếp.)
        const evX = xr ? heartStart(q, false) : null;
        if (xr) return localReply(q, { role: "assistant", content: xr.text, local: true, ...(evX?.theme === "ev:bored" ? { heart: evX.theme, heartDepth: 1, story: evX.story } : {}) });
      }
      // Câu admin đã dạy, khớp y câu → trả lời luôn (ưu tiên hơn mọi luồng, kể cả câu Lomi từng đáp sai).
      if (!en) {
        const tg = matchTaught(q, true) ?? (raw !== q ? matchTaught(raw, true) : null);
        if (tg) {
          taughtHit(tg.id);
          return localReply(q, { role: "assistant", content: tg.answer, local: true, taught: true });
        }
      }
      // Đang chọn món / vừa tìm quán cho một món → hiểu "🍜 Phở", "món khác", "quán khác".
      {
        const nq0 = normalizeVi(q);
        const other = raw.startsWith("🎲") || /\b(mon khac|do uong khac|doi mon|mon nao khac|goi y khac)\b/.test(nq0);
        if ((lastA?.dishAsk || lastA?.dish) && other) {
          const drink = lastA.dishAsk?.drink ?? !!DISHES_BY_ID[lastA.dish ?? ""]?.drink;
          return replyDishes(q, drink, lastA.dishAsk?.shown ?? (lastA.dish ? [lastA.dish] : []));
        }
        if (lastA?.dish && (raw.startsWith("🔁") || /\b(quan khac|doi quan|cho khac)\b/.test(nq0)))
          return replyDishShops(q, lastA.dish, [...(lastA.places ?? []).map((p) => p.id), ...(lastA.avoidIds ?? [])]);
        if (lastA?.dishAsk) {
          const d = detectDish(q);
          if (d) return replyDishShops(q, d.id);
        }
      }
      // Nút phạm vi ("🩺 Sức khoẻ", "📱 Hỏi về app") → Lomi hỏi tiếp đúng việc.
      // (q khi người dùng gõ "ừ" nhận lời Lomi mời quay lại một chủ đề — lúc đó q đã là chữ trên nút.)
      const scope = SCOPE_CHIP_REPLY[raw] ? raw : SCOPE_CHIP_REPLY[q] ? q : null;
      if (scope) return localReply(q, { role: "assistant", content: SCOPE_CHIP_REPLY[scope], local: true, ...(scope.includes("Sức khoẻ") ? { health: {} } : {}) });
      // 0a) Trí nhớ: người dùng kể tên / hoàn cảnh → Lomi ghi nhớ; hỏi "Lomi nhớ gì về mình?", "quên hết đi".
      if (isForgetMemory(q)) {
        clearMem(user.id);
        return localReply(q, { role: "assistant", content: "Okie, Lomi quên hết rồi nha 🙈 Mình làm quen lại từ đầu nè!", local: true });
      }
      if (isAskMemory(q)) {
        const mm = loadMem(user.id);
        return localReply(q, { role: "assistant", content: memorySummary(mm, mm.biz ? nounFor(mm.biz.type, mm.biz.noun) : undefined), local: true });
      }
      // 09/10: câu kể chuyện của NGƯỜI / VẬT KHÁC ("mẹ a đang ốm", "bạn a mới chia tay") không phải hoàn cảnh của người dùng → không ghi nhớ.
      //   (câu hai vế về một người thân — "vợ a đang bầu mà bị cảm" — độ chắc của khung thấp hơn nhưng chủ ngữ vẫn rõ là người đó.)
      const aboutOther = !!fr && ((fr.conf >= 0.75 && ["third", "pet", "thing", "place"].includes(fr.subject)) || (fr.conf >= 0.4 && (fr.subject === "third" || fr.subject === "pet") && !!fr.subjectText && fr.toks.some((t) => t.r === "KIN" || t.cls === "pet")));
      memLearn = aboutOther ? { mem: loadMem(user.id), newSits: [] } : learnFromText(user.id, q);
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
        // 08/10: người dùng chỉ nói thêm LOẠI HÌNH ("quán cà phê") → trả lời lại đúng chủ đề đang hỏi (vd vắng khách) cho loại hình đó,
        // không tự đổi sang "ý tưởng ưu đãi".
        if (lastA.bizTopicPick || kind.type) return bizReply(q, ctx, b.topic ?? "offer");
        // Mẩu chi tiết ngắn không phải câu hỏi ("buổi sáng", "khách toàn sinh viên") → vẫn là chuyện đang tư vấn: gợi ý thêm ý cho chủ đề đó.
        if (b.topic && q.split(/\s+/).length <= 6 && !looksLikeQuestion(q) && !isAffirm(q) && !isDecline(q) && !detectSearch(q) && !matchFaq(q)) return bizReply(q, ctx, b.topic, true);
      }

      // c) Lomi vừa hỏi "muốn hỏi bài điều gì?" → tin này chính là câu hỏi.
      if (lastA?.tarotAwait) {
        // Hỏi luật Tarot ("tarot có bài ngược hả?") lúc đang chờ câu hỏi → trả lời luật, vẫn chờ câu hỏi bói.
        const ti = en ? null : tarotRuleInfo(q);
        if (ti) return localReply(q, { role: "assistant", content: ti.text, local: true, tarotAwait: true, tarotSpread: lastA.tarotSpread, quick: lastA.quick });
        if (isTarotCancel(q) || (!en && isTarotStop(q))) return localReply(q, { role: "assistant", content: en ? TAROT_CANCEL.en : TAROT_CANCEL.vi, local: true });
        // (Câu hỏi bài thuộc chuyện y khoa — "a có bị ung thư không", "mẹ a có khỏi không" — do cửa bói trong doTarot xử lý.)
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
      // 11/10 — quanh một trải bài (vừa rút, hoặc rút cách đây vài lượt):
      //   • "thôi không bói nữa" → dừng, không rút bài cho câu hỏi "Thôi không?";
      //   • "tarot nói a bị ung thư hả" / "bói xem a có bệnh gì không" → nói thẳng lá bài không chẩn đoán được bệnh, không trải bài;
      //   • "rút thêm" / "bói lại" sau khi đã nói sang chuyện khác vài câu → vẫn đúng trải bài đó.
      const tLast = lastA?.tarot ?? lastA?.tarotRef;
      const tBack = tLast ?? lastA?.tarotBack?.r ?? (corr?.action === "rewrite" ? (lastA0?.tarot ?? lastA0?.tarotRef) : undefined);
      if (!en && isTarotStop(q) && !lastA?.tarotAwait) return localReply(q, { role: "assistant", content: tBack ? "Okie, mình dừng bói ở đây nha 😊 Lúc nào muốn xem tiếp thì gọi Lomi." : TAROT_CANCEL.vi, local: true });
      {
        const dq = en || lastA?.tarotAwait ? null : detectTarot(q);
        // Vừa có trải bài mà hỏi tiếp một câu y khoa không kèm chữ "bói" ("vậy a có khỏi không") → lá bài không trả lời chuyện đó.
        //   (Câu có chữ "bói" đi qua cửa bói trong doTarot; câu kể triệu chứng / hỏi điều trị là nói với Lomi → lớp sức khoẻ trả lời.)
        const medK = !dq && tLast && !lastA?.heart ? medicalFollowAsk(q) : null;
        if (medK)
          return localReply(q, { role: "assistant", content: medicalRefusal(medK, true), local: true, tarotGate: "medical", quick: MEDICAL_CHIPS, tarotRef: tLast });
      }
      // Người dùng SỬA lại câu hỏi bài vừa rồi ("ý a là nên ở lại hay đi") → bói lại theo câu đã sửa, không rẽ sang lớp khác.
      if (!en && corr?.action === "rewrite" && (lastA0?.tarot ?? lastA0?.tarotRef) && q.split(/\s+/).length <= 14 && !isAppish(q) && /(?<![a-z])(nen|hay|co nen|lieu|bao gio|khi nao|khong)(?![a-z])/.test(normalizeVi(q)) && !tarotHealthGate(q)) return doTarot(q, q);
      if (!tLast && lastA?.tarotBack && !en) {
        if (isTarotMore(q)) return moreTarot(lastA.tarotBack.r, q);
        if (isTarotRedo(q)) return doTarot(lastA.tarotBack.r.question || DAY3_Q, q, lastA.tarotBack.r.context ?? (lastA.tarotBack.r.spread === "five" ? "5 lá" : lastA.tarotBack.r.spread === "celtic" ? "10 lá" : undefined));
        // Vừa xem bài, Lomi mới đáp một câu ngắn về Tarot (không mở mạch nào khác) mà hỏi tiếp một câu QUYẾT ĐỊNH / THỜI ĐIỂM → vẫn là hỏi bài.
        if (lastA.tarotBack.n === 1 && !lastA.heart && !hCtx && !lastA.talk && !lastA.unk && /(?<![a-z])(co nen|nen hay khong|lieu co|bao gio|khi nao)(?![a-z])/.test(normalizeVi(q)) && q.split(/\s+/).length <= 14 && !isAppish(q) && !tarotHealthGate(q))
          return doTarot(q.replace(/^(vậy|thế|rồi|còn)\s+/iu, ""), q);
      }
      // d) Vừa bói xong → "rút thêm" / "bói lại" / hỏi nối ("thế còn tình cảm thì sao?").
      if (lastA?.tarot ?? lastA?.tarotRef) {
        const prev = (lastA.tarot ?? lastA.tarotRef)!;
        if (isTarotMore(q)) return moreTarot(prev, q);
        if (isTarotRedo(q)) {
          if (!prev.question && !en) return doTarot(DAY3_Q, q);
          return doTarot(prev.question ?? "", q, prev.context ?? (prev.spread === "five" ? "5 lá" : prev.spread === "celtic" ? "10 lá" : undefined));
        }
        if (/(?<![a-z])(thi sao|the con|vay con|con chuyen|con ve)(?![a-z])/.test(normalizeVi(q)) && !detectTarot(q)) {
          // "Thế còn công việc thì sao?" → hỏi bài đúng chủ đề (câu hỏi chuẩn), không lấy nguyên câu cụt.
          // Bỏ cụm "thế còn / thì sao" trước khi đoán chủ đề ("thì" bỏ dấu thành "thi" = thi cử).
          const tp = questionTopic(q.replace(/(thế|vậy|thì|còn|sao|chuyện|về)(?=\s|$|\?)/giu, " "));
          const std = FOLLOW_TOPIC_Q[tp];
          return doTarot(std ?? q, q);
        }
        // 10/10: vừa xem bài xong mà hỏi tiếp một câu QUYẾT ĐỊNH ("vậy a có nên nghỉ việc không?") → vẫn là hỏi bài (như bấm nút "Bói tiếp: …"),
        // không rẽ sang lời khuyên chung chung.
        if (!en && /(?<![a-z])(co nen|nen hay khong|lieu co|bao gio|khi nao)(?![a-z])/.test(normalizeVi(q)) && q.split(/\s+/).length <= 14 && !isAppish(q)) return doTarot(q.replace(/^(vậy|thế|rồi|còn)\s+/iu, ""), q);
      }
      // Understanding Gate (01/10): filler / follow-up / mơ hồ / hỏi luật Tarot — xác định ý trước khi module chuyên biệt bắt câu.
      if (!en) {
        const inFlow = !!(lastA?.heart || hCtx || lastA?.dishAsk || lastA?.dishPick || lastA?.bizPick || lastA?.bizTopicPick || lastA?.issue || lastA?.biz);
        const topic = lastA?.tarot || lastA?.tarotRef ? "tarot" : hCtx && !heartOn ? "health" : lastA?.heart ? "heart" : lastA?.biz ? "biz" : lastA?.faqId ? "faq" : undefined;
        const g = gate(q, { lastText: lastA?.content, faqId: lastA?.faqId, topic, inFlow });
        if (g?.action === "reply") return localReply(q, { role: "assistant", content: g.reply.text, local: true, quick: g.reply.quick, ...keepHealth });
        if (g?.action === "skip") gateSkip = g.intent;
        // Giao tiếp cơ bản: ưu tiên câu đáp sẵn của chitChat (nhớ tên, chào theo giờ…), không có thì dùng câu của gate.
        if (g?.action === "social") {
          const cc = g.preferChit ? chitChat(q, lang, displayName(loadMem(user.id), profile?.full_name), raw) : null;
          return localReply(q, { role: "assistant", content: cc?.text ?? g.reply.text, local: true, quick: cc?.quick, ...keepHealth });
        }
      }
      // e00) KHUNG CÂU (09/10, lib/lomiFrame): đáp theo CẤU TRÚC những câu mà lớp từ khoá đọc sai — lời chào / chúc kèm buổi, dịp bất kỳ,
      //      hỏi thăm Lomi, chuyện của người / con vật / đồ vật khác, câu có phủ định, chuyện đã qua, dự định, đang ở đâu / làm gì.
      //      Câu thuộc về lớp chuyên môn (sức khoẻ, tâm sự, tìm quán, hỏi app, bói bài, kinh doanh) thì frameTurn trả null.
      //      Đang ở một mạch khác thì chỉ nhận lời chào / chúc / cảm ơn + hỏi thăm Lomi; đang tâm sự, chọn khẩu vị, tư vấn kinh doanh thì không dùng.
      if (fr && !gateSkip) {
        const frMode = lastA?.dishPick || lastA?.biz || memLearn?.newSits.length ? "off" : heartOn ? "heart" : hCtx || lastA?.faqId || lastA?.issue || lastA?.dishAsk || lastA?.tarot || lastA?.tarotRef ? "speech" : "full";
        const fx = frameTurn(q, fr, { mode: frMode, inHealth: !!hCtx, hsub: lastA?.hsub, lastText: lastA?.content, addr: loadMem(user.id).addr });
        const hsFx = fx?.intent === "frame:third_ill" ? healthSubjectOf(q, true) : null;
        if (fx?.redirect) {
          q = fx.redirect;
          shownRef.current = { from: q, to: raw };
        } else if (fx)
          return localReply(q, {
            role: "assistant",
            content: fx.text,
            local: true,
            quick: fx.quick,
            about: fx.about,
            // Tin về một người / con vật đang ốm hay mới mất → mở MẠCH CHUYỆN (lib/lomiStory): câu sau là câu trả lời cho đúng điều Lomi vừa hỏi.
            thread: fx.about ? storyOpen(fx.intent, fx.about, fx.text, fr.toks.find((t) => t.cls === "ill")?.t ?? fr.pred?.head) : undefined,
            // Đang tâm sự mà kể tin buồn về người thân → vẫn ở mạch tâm sự; còn lại: mở / giữ mạch nghe kể, sức khoẻ như thường.
            ...(heartOn && fx.keepHeart && lastA ? { heart: lastA.heart, heartDepth: (lastA.heartDepth ?? 0) + 1, heartListen: lastA.heartListen, story: lastA.story, rel: lastA.rel, mood: lastA.mood } : fx.openHeart && !heartOn ? { heart: fx.openHeart, heartDepth: 1, story: raw.length <= 90 ? raw : undefined } : fx.talk && !heartOn ? { talk: (convo?.talk ?? 0) + 1 } : {}),
            // Tin người thân mắc một BỆNH CÓ TÊN ("ba e bị tiểu đường") → nhớ bệnh đó, để câu sau "nên kiêng gì?" trả lời được ngay.
            //   Tin người thân có một TRIỆU CHỨNG ("con a sốt từ tối qua") → nhớ triệu chứng đó, để câu sau "có cần đi viện không?" trả lời được.
            ...(fx.openHealth
              ? { health: {} }
              : heartOn
                ? {}
                : fx.intent === "frame:third_ill" && hsFx
                  ? { health: { subject: hsFx.subject, label: hsFx.label, diet: hsFx.diet, cond: hsFx.cond } }
                  : fx.intent === "frame:third_ill" && analyzeBody(q)?.sx.length
                    ? { health: {}, sx: analyzeBody(q)!.sx }
                    : fx.intent === "frame:third_preg" && dietOf(q)
                      ? { health: { diet: dietOf(q), label: (dietName(dietOf(q)!) ?? "mang thai").split(/[(/,]/)[0].trim().toLowerCase() }, diet: dietOf(q) }
                      : keepHealth),
          });
      }
      // e0) Hỏi khả năng của Lomi ("e tư vấn sức khỏe a đc k") / thèm–chọn một món ("thèm pizza mà k biết ăn pizza gì").
      //     08/10: luật "không cướp mạch đang nói" (đang bói, tâm sự, sức khoẻ, chọn món, tư vấn kinh doanh) nằm trong
      //     earlyIntent (lib/lomiIntent) để test được — ở đây chỉ báo cho nó biết tin trước đang ở mạch nào.
      if (!en && !gateSkip) {
        const talk = lastA?.tarot || lastA?.tarotRef ? "tarot" : (hCtx && !heartOn) || lastA?.sx?.length ? "health" : lastA?.heart ? "heart" : lastA?.biz ? "biz" : lastA?.dishAsk || lastA?.dishPick ? "dish" : undefined;
        const ei = earlyIntent(q, { waiting: !!(lastA?.tarotAwait || lastA?.bizPick || lastA?.bizTopicPick), talk });
        if (ei?.intent === "capability" && ei.domain === "health") {
          // 08/10: hỏi khả năng mà đã nêu luôn bệnh ("e biết cách chữa bệnh gout k") → trả lời "có" trong giới hạn RỒI nói luôn phần được hỏi
          // (hoặc hỏi muốn biết phần nào), và nhớ bệnh đó cho các câu sau. Mở mạch SỨC KHOẺ, không phải mạch tâm sự.
          const ht = healthTopicReply(q, undefined, "aspect") ?? healthTopicReply(q.replace(/\b(biết|rành|hiểu)\b/giu, " "), undefined, "menu");
          const hs = healthSubjectOf(q, true);
          if (ht) return localReply(q, { role: "assistant", content: `Được chứ 😄 Lomi chia sẻ được kiến thức sức khoẻ phổ thông ở mức tham khảo — không thay bác sĩ và không kê thuốc nha.\n\n${ht.text}`, local: true, quick: ht.quick, health: ht.health });
          return localReply(q, { role: "assistant", content: ei.text, local: true, health: hs ? { subject: hs.subject, label: hs.label, diet: hs.diet, cond: hs.cond } : {} });
        }
        if (ei?.intent === "capability") return localReply(q, { role: "assistant", content: ei.text, local: true });
        if (ei?.intent === "food_place") return replyDishShops(q, ei.dish);
        if (ei?.intent === "food_choice") return localReply(q, { role: "assistant", content: ei.text!, local: true, quick: ei.quick, dish: ei.dish, dishPick: true });
        // Chưa nhắc món nào ("giờ ăn gì", "a đói mà không biết ăn gì") → gợi ý món, như "Hôm nay ăn gì".
        // 09/10: đang theo chuyện người ốm mà hỏi "nên cho bé ăn gì" / "nên ăn gì" → là hỏi ăn uống cho người bệnh, không phải nhờ gợi ý quán.
        const sickMeal = th0?.kind === "care" && (th0.idle ?? 0) < 2 && /\b(nen|cho .{1,15} an|kieng|duoc an)\b/.test(normalizeVi(q));
        // ("thiếu vitamin D nên ăn gì", "gout nên ăn gì" — nêu một bệnh / tình trạng có trong kho kiến thức thì là hỏi ăn uống theo bệnh.)
        if (ei?.intent === "food_suggest" && !sickMeal && !findMedId(q) && !illMeal(q)) return replyDishes(q, ei.drink);
        // Vừa hỏi khẩu vị cho một món → câu trả lời khẩu vị ngắn ("nhiều phô mai") → tìm quán món đó.
        //     (Câu tự nói rõ một loại chỗ khác — "quán nào gần đây có spa?" — thì không phải trả lời khẩu vị.)
        //     (Nhắc lại chính món đó kèm kiểu — "lẩu thái" khi đang hỏi khẩu vị lẩu — cũng là câu trả lời khẩu vị.)
        if (lastA?.dishPick && lastA.dish && q.split(/\s+/).length <= 8 && (!detectDish(q) || detectDish(q)?.id === lastA.dish) && !looksLikeQuestion(q) && !capabilityAsk(q) && !otherPlace(q)) return replyDishShops(q, lastA.dish);
      }
      // e) Câu có ý muốn bói → bói luôn nếu đã có câu hỏi, chưa có thì Lomi hỏi lại.
      //    Kiểm tra TRƯỚC FAQ/AI để câu kiểu "bói tarot tư vấn giúp mình" không bị chuyển sang AI.
      if (!gateSkip) {
        // Hỏi Lomi có biết bói không → trả lời "có" + mời hỏi, KHÔNG rút bài ngay (01/10 r2).
        if (!en && isTarotAbilityAsk(q))
          return askTarot(
            q,
            pickOne([
              "Biết chứ 😄 Lomi bói Tarot được nè — bộ bài 78 lá, trải 1, 3, 5 hoặc 10 lá tuỳ bạn. Bạn muốn hỏi bài chuyện gì? Chọn chủ đề bên dưới hoặc gõ tự nhiên kiểu “người ấy nghĩ gì về mình?” nha 🔮",
              "Có nè 🔮 Lomi rành bói Tarot lắm á! Tình yêu, công việc, tiền bạc hay thông điệp hôm nay đều được. Bạn muốn hỏi bài điều gì nè?",
            ]),
          );
        // "bói lại" khi chưa có trải bài nào trước đó → rút lá hôm nay (không lấy chữ "lại" làm câu hỏi).
        if (!en && isTarotRedo(q)) return doTarot("", q);
        const d = detectTarot(q);
        if (d) return d.question || d.daily ? doTarot(d.question, q) : askTarot(q);
      }
      // f0) Kể triệu chứng / cảm giác → tra từ điển (lib/lomiSymptoms): triệu chứng A, B, C → bệnh hay gặp,
      //     nên làm / kiêng gì / khám khoa nào; cảm giác G, J, K → trạng thái tâm lý → nên làm gì.
      //     Cộng dồn với những gì đã kể ở tin trước khi đang tâm sự.
      if (!en && !gateSkip && !(looksLikeQuestion(q) && isAppish(q) && matchFaq(q))) {
        const inTalk = heartOn || !!hCtx;
        const depth = (lastA?.heartDepth ?? 0) + 1;
        const nq = ` ${normalizeVi(q)} `;
        // 11/10 — HỎI VỀ THUỐC (lib/lomiDrug): là thuốc gì · tác dụng phụ · liều · uống thuốc gì · dùng chung · ngưng thuốc · uống nhầm.
        //   Lomi không có dữ liệu riêng cho từng thuốc → nói thật giới hạn theo đúng dáng câu hỏi, không đáp "chưa hiểu ý" / "bấm Dạy Lomi".
        //   Câu hỏi DÙNG CHUNG / TƯƠNG TÁC được xét trước cả thuốc Lomi có dữ liệu (paracetamol), vì Lomi không có dữ liệu tương tác nào.
        // 11/10: đang nói về một bệnh (vd của mẹ) mà nói "a cũng bị nữa" → người dùng cũng có bệnh đó: nhận đúng ý, không đáp "chưa được học".
        if (hCtx?.label && /^(a|anh|e|em|c|chi|minh|toi|tui) (cung |con |lai )?(bi|mac)( (nua|vay|luon|y vay|giong vay|roi|y chang))*$/.test(nq.trim())) {
          const hm2 = healthTopicReply(`bị ${hCtx.label}`, undefined, "menu");
          topicHit("health");
          return localReply(q, { role: "assistant", content: `Bạn cũng bị **${hCtx.label}** nữa hả 🩺 Vậy mấy điều về ${hCtx.label} áp dụng cho cả bạn luôn — bạn chọn phần muốn xem bên dưới nha.`, local: true, quick: hm2?.quick, health: hCtx, diet: lastA?.diet });
        }
        const careOn = th0?.kind === "care" && (th0.idle ?? 0) < 2;
        const careWho = careOn && (th0!.idle ?? 0) === 0 ? th0!.who.text : undefined;
        const dg = drugAsk(q, {
          inHealth: !!hCtx || !!lastA?.sx?.length || careOn || lastA?.heart === "insomnia",
          label: hCtx?.label,
          who: careWho,
          pet: careOn && th0!.who.kind === "pet",
          afterOverdose: lastA?.drug?.kind === "overdose",
          afterDrug: !!lastA?.drug,
          name: lastA?.drug?.name,
          drugId: lastA?.drug?.id,
        });
        const drugMsg = (): Msg => ({
          role: "assistant",
          content: dg!.text,
          local: true,
          drug: { kind: dg!.kind, name: dg!.name ?? lastA?.drug?.name, id: dg!.drugId ?? (dg!.name ? undefined : lastA?.drug?.id) },
          // Đang tâm sự (vd mất ngủ) mà hỏi về thuốc → trả lời xong vẫn ở mạch tâm sự đó.
          ...(heartOn && lastA ? { heart: lastA.heart, heartDepth: (lastA.heartDepth ?? 0) + 1, heartListen: lastA.heartListen, story: lastA.story, rel: lastA.rel, mood: lastA.mood, health: hCtx } : { health: hCtx ?? {} }),
          sx: inTalk ? lastA?.sx : undefined,
          diet: lastA?.diet,
          hsub: lastA?.hsub,
          quick: dg!.kind === "which" && lastA?.sx?.length ? ["Nên làm gì cho đỡ?", "Khi nào cần đi khám?"] : undefined,
        });
        if (dg?.kind === "interact" || dg?.kind === "pet") {
          topicHit("health");
          return localReply(q, drugMsg());
        }
        // 00) Chủ thể sức khoẻ cụ thể (xét nghiệm máu, paracetamol…) + câu hỏi nối theo chủ thể đang nói — lib/lomiContext.
        const cx = contextReply(q, lastA?.hsub);
        if (cx) topicHit("health");
        const cxDrug = cx ? drugById(cx.anchor.subject) : null;
        if (cx) return localReply(q, { role: "assistant", content: cx.text, local: true, health: hCtx ?? {}, hsub: cx.anchor.subject, sx: inTalk ? lastA?.sx : undefined, ...(cxDrug ? { drug: { kind: cx.anchor.aspect === "overdose" ? "overdose" : cx.anchor.aspect, name: cxDrug.names[0], id: cxDrug.id } } : {}) });
        //   Hỏi về CHÍNH một thuốc (là thuốc gì, tác dụng phụ, liều, ngưng thuốc, uống nhầm) → trả lời trước lớp "bệnh đang nói":
        //   đang nói viêm xoang mà hỏi "omeprazol là thuốc gì" thì không đọc lại bài viêm xoang. ("uống thuốc gì", "có nên uống…" xét sau.)
        const rxHeart = heartOn && /\b(thuoc ngu|thuoc an than)\b/.test(nq);
        if (dg && dg.kind !== "which" && (dg.kind !== "should" || (!!dg.med && !rxHeart))) {
          topicHit("health");
          return localReply(q, drugMsg());
        }
        // 00b) Hỏi một KHÍA CẠNH của một bệnh / tình trạng ("bệnh gout là gì", "cách chữa bệnh gout", "vậy khám ở đâu?") — lib/lomiHealthTopic.
        //      Câu nối không nhắc lại tên bệnh thì dùng bệnh đang nói. Câu hỏi ăn uống / kiêng cữ vẫn để lib/lomiDiet ở dưới trả lời.
        // 09/10 — KHO KIẾN THỨC Y KHOA CÓ NGUỒN (lib/lomiMed): bệnh / tình trạng / thuật ngữ tâm lý nào có thẻ thì trả lời từ thẻ (kèm nguồn);
        //   phần thẻ không có thì nói thẳng "chưa xác minh được" (ghi vào nhật ký bí). Xét trước bảng cũ chưa có nguồn (healthTopicReply / lomiDiet).
        //   Nhường lớp cũ khi: chỉ nêu một TRIỆU CHỨNG ("a bị đau đầu", "đau dạ dày" — để mạch triệu chứng hỏi han / theo dõi),
        //   hỏi khám KHOA NÀO / ở đâu (thẻ không có, bảng cũ có), hay đang theo chuyện người ốm mà thẻ không có phần được hỏi
        //   (mạch chăm người ốm nói "chưa có kiến thức" đúng người, đúng chuyện).
        const mk = parseMedAsk(q, lastA?.med ?? (hCtx?.label ? { id: findMedId(hCtx.label) ?? "", aspect: hCtx.diet ? "diet" : undefined } : undefined));
        //   Tự hỏi "có phải a bị trầm cảm không" là câu hỏi CHẨN ĐOÁN về chính mình → mạch tâm sự / sức khoẻ trả lời "Lomi không chẩn đoán".
        const mkSkip =
          !!mk && (selfDxAsk(q) || (mk.aspect === "overview" && !!analyzeBody(q)?.sx?.length && (isSelfStatement(q) || !hasQuestion(q))) || (mk.aspect === "doctor" && /\b(kham o dau|o dau kham|khoa nao|kham khoa)\b/.test(nq) && !!healthTopicReply(q, hCtx, "aspect")));
        if (mk?.id && !mkSkip) {
          const mt = await loadMedTopic(mk.id);
          const mr0 = mt ? renderMed(mt, mk.aspect, mk.food, Date.now(), mk.food ? foodDisplay(q, mk.food) : undefined, mk.aspect === "overview" ? q : undefined) : null;
          // Câu nối chung chung theo chủ đề đang nói: chỉ trả lời khi thẻ có đúng ý được hỏi, không thì để các lớp sau xử lý.
          const mr = mk.focusOnly && mr0?.aspect !== "focus" ? null : mr0;
          // Người dùng nói CHÍNH MÌNH đang bị một vấn đề tâm lý ("a bị trầm cảm") → đó là lời tâm sự: để mạch tâm sự lắng nghe trước,
          // không đổ ngay một bài kiến thức (hỏi "trầm cảm là gì" thì vẫn trả lời kiến thức).
          const mentalSelf = mt?.kind === "mental" && mk.aspect === "overview" && isSelfStatement(q);
          if (mt && mr && !(mr.partial && careOn) && !mentalSelf) {
            // Giữ khoá chủ đề của lớp cũ (diet:gout, diet:dm…) để các câu nối / bảng kiêng cữ cũ vẫn hiểu đang nói bệnh nào.
            const same = hCtx?.label && findMedId(hCtx.label) === mt.id ? hCtx : null;
            const old = same ? { subject: same.subject, label: same.label, diet: same.diet, cond: same.cond } : (healthSubjectOf(q, true) ?? mt.names.map((n) => healthSubjectOf(n, true)).find(Boolean) ?? null);
            const typed = nameAsTyped(q, mt.id);
            // "a bị gout" — người dùng nói về chính mình: ghi nhận trước, rồi mới đưa kiến thức.
            const ack = mk.aspect === "overview" && typed && isSelfStatement(q) ? `Bạn đang bị **${typed}** hả 🩺 Lomi chia sẻ những gì đã kiểm chứng để bạn tham khảo nha.\n\n` : "";
            // Nhắc lại đúng chủ đề vừa tóm tắt ("Bệnh gút á") → không đọc lại cả bài, chỉ mời chọn phần muốn xem.
            const again = mr.aspect === "overview" && !ack && lastA?.med?.id === mt.id && lastA.med.aspect === "overview";
            if (again) mr.text = `Dạ đúng rồi, vẫn là **${mt.names[0]}** nè 🩺 Bạn muốn xem kỹ phần nào? Chọn bên dưới nha 👇`;
            topicHit("health");
            return localReply(q, {
              role: "assistant",
              content: ack + mr.text,
              local: true,
              quick: mr.quick,
              med: { id: mt.id, aspect: mr.aspect },
              health: { subject: old?.subject ?? `kb:${mt.id}`, label: old?.label ?? mt.names[0], diet: old?.diet, cond: old?.cond },
              ...((mr.aspect === "diet" || mr.aspect === "food") && old?.diet ? { diet: old.diet } : {}),
              sx: inTalk ? lastA?.sx : undefined,
              ...(mr.partial ? { stuck: "kb_partial" as StuckKind } : {}),
            });
          }
        }
        const ha = healthTopicReply(q, hCtx, "aspect");
        if (ha) topicHit("health");
        //      (Câu có kèm triệu chứng — "đau dạ dày nên làm gì" — thì vẫn ghi nhớ triệu chứng đó cho các câu sau.)
        if (ha) return localReply(q, { role: "assistant", content: ha.text, local: true, quick: ha.quick, health: ha.health, sx: Array.from(new Set([...(inTalk ? (lastA?.sx ?? []) : []), ...(analyzeBody(q)?.sx ?? [])])) });
        // 0a) Kiêng ăn uống theo bệnh ("gout kiêng gì", "huyết áp cao ăn mặn được k", nối tiếp "còn bia thì sao") — lib/lomiDiet.
        const prevUser = [...msgs].reverse().find((m) => m.role === "user")?.content;
        // Đang nói về một bệnh mà hỏi trống "kiêng gì?" / "ăn gì được?" → ghép tên bệnh đang nói vào cho đủ ý.
        const dq = hCtx?.diet && hCtx.label && !dietOf(q) && isDietAsk(q) ? `${hCtx.label} ${q}` : q;
        // (inDiet chỉ khi câu nhắc một bệnh KHÁC bệnh đang nói — "mỡ máu á" — còn nhắc lại đúng bệnh đang nói thì không lặp cả bảng kiêng cữ.)
        const diet = dietReply(dq, lastA?.diet ?? hCtx?.diet ?? (prevUser ? dietOf(prevUser) : undefined), !!lastA?.diet && dietOf(q) !== lastA.diet);
        if (diet) topicHit("health");
        if (diet) return localReply(q, { role: "assistant", content: diet.text, local: true, health: healthCtxOfDiet(diet.diet), diet: diet.diet, sx: inTalk ? lastA?.sx : undefined });
        //   (đang tâm sự chuyện mất ngủ mà hỏi "có nên uống thuốc ngủ không" thì bài mất ngủ của mạch tâm sự có lời đáp riêng.)
        if (dg && !(dg.kind === "should" && rxHeart)) {
          topicHit("health");
          return localReply(q, drugMsg());
        }
        // 0) Câu hỏi kiến thức sức khoẻ ("uống cà phê nhiều có sao k", "ăn gì để đẹp da") — lib/lomiHealthFacts.
        const fact = healthFact(q);
        if (fact) topicHit("health");
        if (fact) return localReply(q, { role: "assistant", content: fact, local: true, health: hCtx ?? {}, sx: inTalk ? lastA?.sx : undefined });
        // Đang nói chuyện sức khoẻ (không phải đang tâm sự) hoặc đã kể triệu chứng → đọc tin này như chi tiết sức khoẻ.
        const inHealth = (!!hCtx && !heartOn) || !!lastA?.sx?.length || lastA?.heart === "health";
        const th = heartThemeOf(q);
        // Cảm xúc đã kể trước đó (hoặc suy từ chủ đề đang tâm sự) để cộng dồn — vd đang kể lo âu rồi nói "tim đập nhanh nữa".
        const moodSeed = inTalk ? (lastA?.mood ?? THEME_MOOD[lastA?.heart ?? ""] ?? []) : [];
        //   (tự hỏi "liệu a có bị rối loạn lo âu không" là câu hỏi chẩn đoán → mạch tâm sự trả lời là Lomi không chẩn đoán, không đọc lại bảng cảm giác.)
        const mind0 = selfDxAsk(q) ? null : analyzeMind(q, moodSeed);
        // Chuyện cụ thể (vd công việc, người yêu) thì để thư viện tâm sự đáp — trừ khi kể từ 3 cảm giác trở lên.
        const psyTalk = heartOn && !inHealth && !!THEME_MOOD[lastA?.heart ?? ""];
        const mind = mind0 && (!th || GENERIC.has(th) || PSY_THEMES.has(th) || mind0.mood.length >= 3 || psyTalk) ? mind0 : null;
        // "mệt mỏi, mất ngủ, áp lực quá" / "tim đập nhanh" khi đang kể chuyện lo âu là chuyện tâm lý, không phải bệnh cơ thể.
        const softBody = onlySoftSymptoms(q) || (psyTalk && onlyAnxietyBody(q));
        const askAdvice = /\b(nen lam gi|lam sao|lam gi|phai lam sao|tu van|khuyen|nen an gi|nen uong gi|co sao khong|co nguy hiem khong|cach nao|co cach|cho do|do hon|het dau|giam dau|can di vien|can di kham|co nen di kham|di vien|di kham|nguy hiem|co sao)\b/.test(nq);
        // "hôm nay hơi mệt", "mất ngủ" nói bâng quơ (chưa nói chuyện sức khoẻ) → để phần tâm sự đáp ân cần hơn.
        //   (chỉ khi câu CÓ triệu chứng "mềm" — câu hỏi kiến thức không nêu triệu chứng nào như "Ho là do đâu?" thì vẫn để lớp sức khoẻ trả lời.)
        const casualSoft = !inHealth && onlySoftSymptoms(q) && !askAdvice && (analyzeBody(q)?.sx.length ?? 0) > 0;
        // 09/10: câu gõ CÓ DẤU mà triệu chứng chỉ khớp nhờ một từ khác nghĩa bị bỏ dấu ("đi đá bóng" → "da bong" = da bong tróc)
        // thì không phải kể triệu chứng (chỉ xét khi chưa ở mạch sức khoẻ; lib/lomiFrame.symptomClash).
        const accentClash = !!fr && !inHealth && !inTalk && symptomClash(q, fr);
        const body = (mind && softBody) || casualSoft || accentClash ? null : analyzeBody(q, inTalk ? (lastA?.sx ?? []) : [], inHealth, inHealth && askAdvice);
        if (body) topicHit("health");
        else if (mind) topicHit("mind");
        // Người bệnh là NGƯỜI KHÁC ("con a bị sốt", "mẹ a đau lưng") → không nói "Bạn đang bị…".
        const patient = fr ? patientOf(fr, loadMem(user.id).addr) : null;
        // Triệu chứng của NGƯỜI KHÁC → nhớ luôn đang nói về ai (câu sau lược chủ ngữ vẫn là người đó) và mở mạch chuyện để hỏi tiếp cho đúng người.
        const hsBody = body ? healthSubjectOf(q, true) : null;
        const whoP = patient && fr?.subjectText && (fr.subject === "third" || fr.subject === "pet") ? { text: patient.charAt(0).toLowerCase() + patient.slice(1), kind: fr.subject } : undefined;
        // 11/10: đang theo chuyện ốm của một người khác ("con a sốt từ tối qua" → "39 độ") thì câu kể thêm lược chủ ngữ vẫn là về NGƯỜI ĐÓ —
        //   không viết "Lomi ghi nhận bạn đang có: sốt cao" (người sốt là đứa con, không phải người đang gõ).
        const carried = !patient && fr?.subject !== "self" && th0 && th0.kind === "care" && (th0.idle ?? 0) < 2 ? th0.who.text : null;
        if (body)
          return localReply(q, {
            role: "assistant",
            content: patient ? body.text.replace(/^Bạn đang bị/u, `${patient} đang bị`).replace(/Lomi ghi nhận bạn đang có/u, `Lomi ghi nhận ${patient.charAt(0).toLowerCase() + patient.slice(1)} đang có`) : carried ? body.text.replace(/^Bạn đang bị/u, `${carried.charAt(0).toUpperCase() + carried.slice(1)} đang bị`).replace(/Lomi ghi nhận bạn đang có/u, `Lomi ghi nhận ${carried} đang có`) : body.text,
            local: true,
            // Câu kể triệu chứng có nêu tên bệnh ("mẹ a bị cao huyết áp") → nhớ luôn bệnh đó để câu sau "nên kiêng gì?" trả lời được ngay.
            health: hCtx ?? (hsBody ? { subject: hsBody.subject, label: hsBody.label, diet: hsBody.diet, cond: hsBody.cond } : {}),
            sx: body.sx,
            mood: inTalk ? lastA?.mood : undefined,
            ...(whoP ? { about: whoP, ...(th0 ? {} : { thread: storyOpenSymptom(whoP, raw) }) } : {}),
          });
        if (mind)
          return localReply(q, {
            role: "assistant",
            content: mind.text,
            local: true,
            heart: heartOn && lastA?.heart !== "open" && lastA?.heart !== "health" ? lastA!.heart : "sad",
            heartDepth: depth,
            mood: mind.mood,
            sx: inTalk ? lastA?.sx : undefined,
            health: hCtx,
          });
        // 0c) CẢM XÚC + sức khoẻ ("a lo quá vì bệnh này", "a buồn vì bệnh gout", "a lo vì bị gout") → lúc này mới mở mạch tâm sự,
        //     và vẫn nhớ bệnh đang nói để hỏi lại kiến thức là có ngay. Đang tâm sự sẵn rồi thì mạch tâm sự (mục f) tự lo.
        const hsNow = healthSubjectOf(q, !!hCtx);
        if (!heartOn && healthFeeling(raw) && (hsNow || hCtx || /\b(benh|suc khoe|om|kham)\b/.test(nq))) {
          const hh = heartStart(q, false) ?? heartStart("lo về sức khoẻ", false);
          const ctx: HealthCtx = hsNow ? { subject: hsNow.subject, label: hsNow.label, diet: hsNow.diet, cond: hsNow.cond } : (hCtx ?? {});
          if (hh) {
            topicHit("mind");
            const back = ctx.label ? `\n\nCòn về **${ctx.label}**, khi nào muốn biết nên làm gì hay ăn uống kiêng gì thì cứ hỏi Lomi nha 🩺` : "";
            return localReply(q, { ...heartMsg({ ...hh, text: hh.text + back }, 1), sx: lastA?.sx, health: ctx });
          }
        }
        // 0d) Chỉ NHẮC tên một bệnh ("a hỏi về bệnh gout", "bệnh gút á", "a bị gout") → vẫn là chuyện sức khoẻ: hỏi muốn biết phần nào.
        //     Đang tâm sự chuyện khác (buồn, lo…) thì một lần nhắc tên bệnh chưa phải là hỏi kiến thức — để mạch tâm sự đáp, chỉ ghi nhớ bệnh đó.
        const hm = !heartOn || lastA?.heart === "health" || /\b(hoi ve|tu van ve|noi ve)\b/.test(nq) ? healthTopicReply(q, hCtx, "menu") : null;
        if (hm) topicHit("health");
        if (hm) return localReply(q, { role: "assistant", content: hm.text, local: true, quick: hm.quick, health: hm.health, sx: inTalk ? lastA?.sx : undefined });
      }
      // f) Đang tâm sự → hiểu tin này là kể tiếp (trừ khi rõ ràng hỏi cách dùng app / tìm quán).
      // Chỉ nhường cho tìm quán khi người dùng hỏi tìm RÕ RÀNG (vd "quán nào gần đây", "ăn gì giờ").
      const wantSearch = !!detectSearch(q) && /\b(tim|kiem|goi y|an gi|uong gi|o dau|gan day|gan minh|quan nao|di dau|cho nao)\b/.test(normalizeVi(q));
      //    08/10: chỉ khi đang TÂM SỰ thật (heartOn). Mạch sức khoẻ không còn đi vào đây — trước đó "a hỏi về bệnh gout" sau một câu
      //    trả lời sức khoẻ bị đáp "Chuyện này làm anh bận lòng nhiều không?".
      if (heartOn && lastA?.heart && !en && !gateSkip && !wantSearch && !(looksLikeQuestion(q) && isAppish(q) && matchFaq(q))) {
        const depth = (lastA.heartDepth ?? 0) + 1;
        //   (đang kể chuyện cãi nhau mà hỏi "nhắn gì cho vợ giờ" → đã biết hoàn cảnh là vừa cãi nhau: soạn câu nhắn hợp cảnh đó.)
        const relSeed = !lastA.rel && lastA.heart === "fight" && /\b(nhan|goi dien|mo loi|lien lac|viet)\b/.test(normalizeVi(raw)) && relationSubject(q) ? `${relationSubject(q)}|after_fight|fight` : undefined;
        const rel = relationReply(q, lastA.rel ?? relSeed);
        if (rel) return localReply(q, { ...heartMsg(rel, depth, lastA), rel: rel.rel });
        // Trong lúc tâm sự có nhắc tên một bệnh ("tại bệnh gout đó") → vẫn là tâm sự, nhưng nhớ bệnh đó để lát hỏi kiến thức là có ngay.
        const hsHeart = healthSubjectOf(q, !!hCtx);
        const keepH: Msg = hsHeart ? { ...lastA, health: { subject: hsHeart.subject, label: hsHeart.label, diet: hsHeart.diet, cond: hsHeart.cond } } : lastA;
        // 08/10: đang kể một chuyện ĐỜI THƯỜNG vui (vừa có tin vui, đi chơi…) mà kể tiếp một ý vui ("sếp khen nữa") → mừng cùng,
        // không đọc chữ "sếp", "gia đình" thành chuyện áp lực để an ủi.
        // 10/10 — điều lớp hội thoại biết về lượt này, để câu "kể tiếp" BÁM NỘI DUNG vừa nghe (lib/lomiHeart.follow) thay vì xoay vòng
        // mấy câu "kể thêm đi": mẩu nhắc lại, các mẩu đã kể trong mạch này, mấy tin Lomi vừa nói (để không lặp), đang nói về ai.
        const addrH = loadMem(user.id).addr;
        const say = (x: string) => (addrH && addrH !== "bạn" ? speak(x, addrH) : x);
        const told: string[] = [];
        for (let i = msgs.length - 1; i >= 1 && told.length < 3; i--) {
          const m = msgs[i];
          if (m.role !== "user") continue;
          // Chỉ tính các mẩu KỂ THÊM cho đúng chuyện đang nói: tin Lomi trước và sau nó cùng một chủ đề (câu mở đầu / câu đổi chuyện thì không).
          if (msgs[i - 1]?.role !== "assistant" || !msgs[i - 1].heart || msgs[i - 1].heart !== msgs[i + 1]?.heart) break;
          const mm = mirrorText(parseVi(m.raw ?? m.content, { addr: addrH }), addrH, 7);
          if (mm) told.unshift(mm);
        }
        const mNow = mirrorText(fr1, addrH, 12);
        const hx: HeartCtx = {
          mirror: mNow,
          val: fr1?.pred && fr1.conf >= 0.6 ? fr1.pred.val : 0,
          recent: msgs.filter((m) => m.role === "assistant").slice(-8).reverse().map((m) => m.content),
          details: mNow && mNow.split(" ").length <= 7 ? [...told, mNow] : told,
          third: !!fr1 && fr1.conf >= 0.6 && (fr1.subject === "third" || fr1.subject === "pet") && fr1.subjectCls !== "partner" && fr1.subjectCls !== "boss",
          person: lastA.rel?.split("|")[0],
          ask: !!fr1 && (fr1.act === "question" || fr1.act === "request"),
          neg: !!fr1 && fr1.neg,
          self: !!fr1 && fr1.subject === "self",
          clause: isClause(fr1),
          say,
        };
        //   (câu kể trúng một ý chuyện đó có sẵn lời đáp riêng — đang chán mà nói "ở nhà hoài" — thì để heartContinue đáp đúng ý đó.)
        const evFollow = lastA.heart.startsWith("ev:") && !!eventById(lastA.heart.slice(3))?.follow.some(([re]) => re.test(` ${normalizeVi(q)} `));
        if (lastA.heart.startsWith("ev:") && isUpbeat(raw) && q.split(/\s+/).length <= 8 && !evFollow) {
          // Chuyện vui thì mừng cùng; chuyện không vui (kẹt xe, mắc mưa…) thì nhắc lại đúng điều vừa kể với giọng chia sẻ, không "😄 À à".
          if (eventById(lastA.heart.slice(3))?.good) {
            const tc = talkContinue(raw, depth);
            return localReply(q, { role: "assistant", content: tc.text, local: true, heart: lastA.heart, heartDepth: depth, story: lastA.story, health: lastA.health });
          }
          return localReply(q, heartMsg(heartFollow(q, lastA.heart, !!lastA.heartListen, depth, lastA.content, lastA.story, hx), depth, keepH));
        }
        const hc = heartContinue(q, lastA.heart, !!lastA.heartListen, depth, lastA.content, lastA.story, hx);
        // Vẫn đang nói đúng chuyện với người đó ("người ấy im lặng" → "2 ngày rồi") thì nhớ tiếp là đang nói về ai.
        return localReply(q, { ...heartMsg(hc, depth, keepH), ...(lastA.rel && hc.theme === lastA.heart && !hc.end ? { rel: lastA.rel.replace(/(\||,)offer\b/, "") } : {}), ...(lastA.harm && !hc.end ? { harm: lastA.harm } : {}) });
      }
    }
    // 1) Câu hỏi thường gặp → trả lời tại chỗ (miễn phí).
    //    Riêng câu hỏi chuyện kinh doanh (vd "làm sao giữ khách quen cho spa") thì ưu tiên tư vấn kinh
    //    doanh (1b), trừ khi FAQ khớp đúng câu hỏi về CÁCH DÙNG app (nhận/đăng ưu đãi, tạo doanh nghiệp…).
    // 0b) Chào hỏi, cảm ơn, tạm biệt… → đáp lại tự nhiên.
    // 0c) Tìm chỗ / ưu đãi THẬT trong app, "hôm nay ăn gì?" (đổi món → bốc chỗ khác, không trùng chỗ cũ).
    if (!forceAi && !en && !gateSkip) {
      const it = detectSearch(q);
      // "Hôm nay ăn gì / uống gì" → gợi ý món trước (chọn món rồi mới tìm quán).
      if (it && (it.mode === "eat" || it.mode === "drink") && !detectDish(q) && !illMeal(q)) return replyDishes(q, it.mode === "drink");
      // Hỏi thẳng một món ("quán phở nào ngon", "muốn ăn lẩu") → tìm quán có món đó luôn.
      if (it && it.mode !== "go") {
        const d = detectDish(q);
        if (d) return replyDishShops(q, d.id);
      }
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
      if (!en && !gateSkip && !memLearn?.newSits.length) {
        const sl0 = senseState(raw, ["sleepy"]);
        if (sl0) return localReply(q, { role: "assistant", content: sl0.text, local: true, quick: sl0.quick, talk: (convo?.talk ?? 0) + 1 });
        // Đang nói chuyện sức khoẻ mà câu không có tín hiệu cảm xúc → không mở mạch tâm sự (để phần "chưa biết" bên dưới nói thật).
        const calmHealth = !!hCtx && !heartOn && !healthFeeling(raw);
        const rel = calmHealth ? null : relationReply(q);
        if (rel) topicHit("love");
        if (rel) return localReply(q, { ...heartMsg(rel, 1), rel: rel.rel });
        // 08/10: Lomi đang nghe kể chuyện vui ("a đang tính đi Nha Trang" → "đi với gia đình") thì một chữ "gia đình", "sếp"
        // không biến câu kể thành tâm sự chuyện buồn — chỉ mở mạch tâm sự khi câu có dấu hiệu buồn / mệt / hỏi xin lời khuyên.
        const casual = (!!convo?.talk && isUpbeat(raw)) || calmHealth;
        const h = casual ? null : heartStart(q, looksLikeQuestion(q) && isAppish(q) && !!matchFaq(q));
        if (h) topicHit(LOVE_KEYS.has(h.theme) ? "love" : PSY_THEMES.has(h.theme) ? "mind" : "heart");
        if (h) return localReply(q, heartMsg(h, 1));
      }
      // 10/10: người dùng vừa kể một hoàn cảnh ĐÁNG TÂM SỰ ("a chia tay rồi") — lần đầu Lomi đáp bằng câu ghi nhớ hoàn cảnh, nhưng câu sau
      // ("3 năm", "cô ấy có người khác") vẫn là kể tiếp chuyện đó → mở luôn mạch tâm sự đúng chủ đề thay vì coi câu sau là câu độc lập.
      const sitTheme = !en && !heartOn && memLearn?.newSits.length ? heartThemeOf(q) : undefined;
      const sitHeart: Partial<Msg> = sitTheme && !GENERIC.has(sitTheme) ? { heart: sitTheme, heartDepth: 1, story: raw.length <= 90 ? raw : undefined } : {};
      const cc = chitChat(q, lang, displayName(loadMem(user.id), profile?.full_name), raw);
      if (cc)
        return localReply(q, {
          role: "assistant",
          content: cc.text,
          local: true,
          quick: cc.quick,
          ...keepHealth,
          ...sitHeart,
        });
      // Người dùng vừa kể hoàn cảnh ("mình đang thất nghiệp") → Lomi đáp lại và nhớ.
      const ns = memLearn?.newSits[0];
      if (ns && !en && q.split(/\s+/).length <= 14 && !matchFaq(q)) {
        const sr = SIT_REPLY[ns];
        return localReply(q, { role: "assistant", content: sr.text, local: true, quick: sr.quick, ...sitHeart });
      }
    }
    // Hiểu ý định đời thường (01/10, lib/lomiUnderstand): mở lời, báo lỗi app, không thấy nút, chưa hiểu,
    // câu cụt "cái này?", rủ đi chơi… — dùng ngữ cảnh tin Lomi vừa nói, không bắt người dùng nói lại.
    // 11/10: "Nói hoài không nghe.", "dặn mấy lần mà chẳng chịu làm" — than về MỘT NGƯỜI không chịu nghe (chưa nói là ai) → hỏi là ai,
    //        câu đáp kế tiếp chỉ nêu người ("con a á") được hiểu là câu trả lời (xem ô "không chịu nghe vậy" ở đầu send()).
    if (!forceAi && !en && !lastA?.heart && !hCtx && raw.split(/\s+/).length <= 10 && /^(?:(?:a|anh|e|em|c|chị|mình|tui|tôi)\s+)?(?:nói|dặn|nhắc|bảo|kêu|khuyên)(?:\s+\S+){0,3}?\s+(?:hoài|mãi|suốt|bao nhiêu lần|mấy lần|nhiều lần|rồi)(?:\s+(?:mà|vẫn|cũng))*\s+(?:không|chẳng|chả|hổng|ko|k)\s+(?:chịu\s+)?(?:nghe|làm|sửa|đổi|hiểu|bỏ)/iu.test(raw.trim()))
      return localReply(q, { role: "assistant", content: "Nói hoài mà không được nghe thì bực thật 😤 Ai mà không chịu nghe vậy bạn — con, người nhà hay ai ở chỗ làm?", local: true, talk: (convo?.talk ?? 0) + 1 });
    if (!forceAi && !en) {
      const prevUser = [...msgs].reverse().find((m) => m.role === "user")?.content;
      const u = understand(q, raw, { lastText: lastA?.content, faqId: lastA?.faqId, issue: lastA?.issue, lastUser: prevUser }, matchFaq(q)?.id);
      if (u) return localReply(q, { role: "assistant", content: u.text, local: true, quick: u.quick, issue: u.issue });
      // Gate: filler / câu mơ hồ không có ngữ cảnh mà không luồng nào hiểu → hỏi lại, không đoán bừa.
      if (gateSkip === "filler" || gateSkip === "followup_nocontext") return localReply(q, { role: "assistant", content: GATE_ASK_BACK, local: true });
    }
    // 08/10: câu KỂ về mình, không có dáng câu hỏi và không nói gì về app ("a đang tính đi Nha Trang", "a đang chán") → đáp như
    // người nghe TRƯỚC khi dò câu hỏi thường gặp. Bỏ dấu thì "đang"/"đăng", "chán"/"chặn" trùng nhau nên phần dò FAQ dễ bắt nhầm.
    if (!forceAi && !en && !isAppish(q) && !looksLikeQuestion(q) && !lastA?.faqId && !looksLikeBizQuestion(q)) {
      const ss = senseState(raw);
      if (ss && ss.intent !== "state:biz_state") return localReply(q, { role: "assistant", content: ss.text, local: true, quick: ss.quick, talk: (convo?.talk ?? 0) + 1 });
    }
    // Câu hỏi nối sau câu trả lời về app ("còn … thì sao", "1 ngày quẹt đc mấy lần") → hiểu theo câu trước.
    // Câu cụt ("hết hạn rồi thì sao", "tối đa mấy người") → ưu tiên hiểu theo câu hỏi vừa rồi.
    const cut = !!lastA?.faqId && (q.split(/\s+/).length <= 6 || /\b(thi sao|con|nua|vay)\b/.test(normalizeVi(q)));
    const fu = !forceAi && lastA?.faqId ? matchFaqFollowUp(q, lastA.faqId, lastA.quick) : null;
    // 11/10: đang kể triệu chứng mà nói thêm một mẩu chi tiết ("nhất là lúc đứng dậy") → không đem đi dò câu hỏi về app
    //        (bỏ dấu thì "đứng dậy", "lúc"… trùng chữ với câu hỏi về mã ưu đãi).
    const healthDetail = !forceAi && !en && !!keepHealth.health && !!lastA?.sx?.length && !looksLikeQuestion(q) && !isAppish(q) && q.split(/\s+/).length <= 8;
    const faq = forceAi || healthDetail ? null : cut ? (fu ?? matchFaq(q)) : (matchFaq(q) ?? fu);
    // Ý hỏi đã có sẵn trong câu trả lời vừa rồi → chỉ lại đúng câu đó.
    if (!faq && cut && lastA && !en) {
      const back = answerFromPrev(q, lastA.content);
      if (back) return localReply(q, { role: "assistant", content: `Như Lomi vừa nói ở trên nè: ${back}`, local: true, faqId: lastA.faqId, quick: lastA.quick });
    }
    const bizQ = !forceAi && looksLikeBizQuestion(q);
    // Câu hỏi xin LỜI KHUYÊN kinh doanh (giữ khách, hút khách lúc vắng, giá, khai trương, dịp lễ, bài đăng)
    // thì để tư vấn kinh doanh trả lời — trừ FAQ về cách dùng app rõ ràng (APP_HOWTO_FAQ).
    const advisory = bizQ && ["loyal", "slow", "newcust", "price", "opening", "holiday", "post", "offer"].includes(detectBizTopic(q) ?? "");
    if (faq && (!advisory || APP_HOWTO_FAQ.has(faq.id))) {
      // Lomi vừa bí câu trước, giờ người dùng chọn gợi ý / hỏi lại trúng → ghi nhớ để lần sau trả lời luôn.
      // Khoá học = câu đã chuẩn hoá (unkKey); lịch sử cũ chỉ có unk thì dùng tạm unk.
      const uk = lastA?.unkKey ?? lastA?.unk;
      if (uk && learnKey(uk) !== learnKey(q)) learnAnswer(uk, faq.id);
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
      // Câu admin đã dạy, khớp gần đúng (vd khác vài chữ) → trả lời bằng câu đó.
      const tg = en ? null : matchTaught(q);
      if (tg) {
        taughtHit(tg.id);
        return localReply(q, { role: "assistant", content: tg.answer, local: true, taught: true });
      }
      const learned = await lookupLearned(q);
      const lf = learned ? faqById(learned) : undefined;
      if (lf) return answerFaq(lf, q);
      // Chỉ tới đây khi MỌI luồng (xã giao, sức khoẻ, Tarot, ngữ cảnh, món ăn, FAQ, câu đã dạy/đã học) đều không đáp được.
      // Chỉ gợi ý câu hỏi về app khi câu thật sự nói về app; còn lại nói thật là chưa hiểu / ngoài phạm vi.
      //   (Đang nghe kể mà người dùng kể thêm một mẩu ngắn — "trầy chân thôi" — thì không đem đi dò câu hỏi về app: bỏ dấu "chân" trùng "chặn".)
      const sug = isAppish(q) && !(convo?.talk && !looksLikeQuestion(q) && q.split(/\s+/).length <= 6) ? suggestFaqs(q, 3) : [];
      // 08/10 — thứ tự đúng: senseState → senseLate → CHỈ KHI thật sự bí mới logUnanswered + gắn unk (nút 💡 Dạy Lomi).
      // senseLast (lib/lomiSense) gộp hai bước đầu: câu KỂ về mình ("a đói bụng"), chào kèm lời chúc, hỏi về chính Lomi,
      // gọi trống, câu cụt, lời kể nhận ra được → Lomi đáp tự nhiên và KHÔNG ghi vào "Lomi bí".
      // (Trước đây logUnanswered chạy trước senseLate nên câu Lomi đã đáp được vẫn bị ghi là "bí".)
      // Đang nói chuyện sức khoẻ: câu Lomi không nhận ra thì nói thật là chưa biết (kèm nút 💡), không đáp kiểu "kể thêm đi".
      // Câu hỏi về một bệnh / thuốc Lomi chưa có ("a hỏi về bệnh lupus") cũng vậy — và mở luôn mạch sức khoẻ.
      const askHealth = !en && !keepHealth.health && !heartOn && looksLikeHealthTopic(q);
      // 09/10: Lomi vừa hỏi "bị bao lâu rồi?" mà người dùng chỉ đáp khoảng thời gian ("từ tối qua", "2 ngày rồi") → ghi nhận, giữ mạch sức khoẻ.
      const dur = !en && keepHealth.health && lastA?.sx?.length && fr ? durationOf(fr) : null;
      if (dur)
        return localReply(q, {
          role: "assistant",
          content: `Dạ, bị ${dur}${/rồi$/.test(dur) ? "" : " rồi"} hả 📝 Lomi ghi nhận nha. Nếu kéo dài hoặc nặng thêm thì nên đi khám để bác sĩ xem trực tiếp. Còn triệu chứng nào kèm theo không bạn?`,
          local: true,
          about: lastA?.about,
          ...keepHealth,
        });
      // "vậy a kể triệu chứng nha", "a hỏi chuyện sức khoẻ nha" — mở lời về sức khoẻ: mời kể, mở mạch sức khoẻ.
      if (!en && !heartOn && q.split(/\s+/).length <= 9 && /\b(ke|noi|hoi|tu van) (\S+ ){0,3}(trieu chung|suc khoe|benh tinh)\b/.test(normalizeVi(q)))
        return localReply(q, { role: "assistant", content: SCOPE_CHIP_REPLY["🩺 Sức khoẻ"], local: true, health: hCtx ?? {} });
      // Mẩu chi tiết cho triệu chứng đang kể mà Lomi chưa có dữ liệu riêng → ghi nhận, giữ mạch sức khoẻ (không đáp "chưa được học").
      if (healthDetail && fr1?.act !== "question" && fr1?.act !== "greet" && fr1?.act !== "thanks")
        return localReply(q, {
          role: "assistant",
          content: "Dạ, Lomi ghi nhận thêm chi tiết này nha 📝 Lomi chưa đủ dữ liệu để nói riêng về nó — nếu triệu chứng kéo dài, nặng lên hoặc lặp lại nhiều lần thì bạn nên đi khám để bác sĩ xem trực tiếp. Còn triệu chứng nào kèm theo không bạn?",
          local: true,
          about: lastA?.about,
          stuck: "health_detail",
          ...keepHealth,
        });
      if (!en) {
        //   (đề tài BỆNH Lomi chưa có kiến thức thì nói thật ở bước dưới; nêu tên một THUỐC — "a hỏi về ibuprofen" — thì vẫn mời hỏi tiếp,
        //    câu hỏi cụ thể sau đó do lớp thuốc trả lời trong giới hạn dữ liệu đã kiểm chứng.)
        const tOpen = heartOn || gateWhy(q).some((w) => !w.startsWith("meds")) ? null : topicOpener(raw);
        if (tOpen) return localReply(q, { role: "assistant", content: tOpen, local: true, ...keepHealth });
        const slAny = senseLast(raw, { lastText: lastA?.content, hasSuggest: sug.length > 0, talk: convo?.talk, mirror: fr ? mirrorText(fr, loadMem(user.id).addr, 9) : null });
        const sl = (keepHealth.health || askHealth) && slAny && ["listen", "continue", "clarify"].includes(slAny.intent) ? null : slAny;
        // 10/10: câu kể Lomi chưa có bài đáp riêng → thay vì "Lomi nghe nè, bạn kể thêm chút được không?" thì NHẮC LẠI đúng điều vừa kể
        // rồi mới mời kể tiếp ("a làm ở ngân hàng" → "Anh làm ở ngân hàng hả? Rồi sao nữa anh, kể em nghe với.").
        const mSl = sl?.intent === "listen" && /^(Ừa?, Lomi nghe nè|Vậy hả 😄 Chuyện sao|Lomi nghe nè 🌿|Lomi ở đây với bạn nè)/.test(sl.text) && fr1?.act === "statement" && fr1.conf >= 0.75 && !!fr1.pred && fr1.pred.known && !fr1.multi && !fr1.neg && !/^(hỏi|kể|nói|nhờ|cứu|giúp|nghĩ|thấy|là)( |$)/.test(fr1.pred.head) && !fr1.toks.some((t) => t.r === "EM" || t.r === "YOU" || t.r === "THIRD") ? mirrorText(fr1, loadMem(user.id).addr, 9) : null;
        //   (chỉ khi khung câu đọc CHẮC câu đó là một câu kể có vị ngữ rõ — câu mơ hồ, câu nhờ / sắp hỏi thì giữ lời đáp cũ.)
        const vSl = fr1?.pred && fr1.conf >= 0.6 ? fr1.pred.val : 0;
        //   (nỗi lo / nỗi sợ thì không hỏi "rồi có sao không" — đó là điều đang nghĩ, chưa phải chuyện đã xảy ra.)
        const feelSl = fr1?.pred?.cls === "feel";
        const slText = sl && mSl ? `${mSl.charAt(0).toUpperCase() + mSl.slice(1)} hả${feelSl && vSl < 0 ? (fr1?.pred?.obj ? " 🥺 Nghĩ vậy cũng dễ hiểu mà. Bạn kể thêm cho Lomi nghe với." : " 🥺 Có chuyện gì vậy bạn, kể Lomi nghe với.") : vSl < 0 || /🥺/.test(sl.text) ? " 🥺 Rồi có sao không bạn?" : vSl > 0 ? " 😄 Nghe thích ghê!" : "? Rồi sao nữa bạn, kể Lomi nghe với."}` : sl?.text;
        if (sl) return localReply(q, { role: "assistant", content: slText ?? sl.text, local: true, quick: sl.quick, ...(sl.intent === "listen" && !mSl && /^(Ừa?, Lomi nghe nè|Vậy hả 😄 Chuyện sao|Lomi nghe nè 🌿|Lomi ở đây với bạn nè)/.test(sl.text) ? { stuck: "generic_listen" as StuckKind } : {}), ...(sl.talk ? { talk: (convo?.talk ?? 0) + 1 } : {}) });
      }
      // 12/10: đang ở mạch sức khoẻ mà người dùng nói ra một nỗi lo / cảm xúc của CHÍNH MÌNH ("mà a cũng hay lo", "lo chuyện tiền") → đó là
      // lời tâm sự, không phải "kiến thức Lomi chưa có": mở mạch tâm sự (vẫn nhớ bệnh đang nói), không đáp "chưa được học, bấm Dạy Lomi".
      if (!en && (keepHealth.health || askHealth) && !looksLikeQuestion(q) && fr1 && fr1.act !== "question" && (fr1.subject === "self" || fr1.subject === "none") && fr1.pred?.cls === "feel" && fr1.pred.val < 0 && !fr1.neg) {
        const p1 = fr1.pred;
        const worry = /^(lo|sợ|hồi hộp|căng thẳng|bất an|rối|hoang mang|sốt ruột)/.test(p1.head);
        const hh = heartStart(q, false);
        topicHit("mind");
        return localReply(q, {
          ...(hh ? heartMsg(hh, 1) : { role: "assistant" as const, content: p1.obj ? `${p1.head.charAt(0).toUpperCase() + p1.head.slice(1)} ${p1.obj} hả 🥺 Chuyện sao vậy bạn, kể Lomi nghe với.` : `Bạn đang ${p1.head} chuyện gì vậy 🥺 Kể Lomi nghe với.`, local: true, heart: worry ? "anxiety" : "sad", heartDepth: 1 }),
          sx: lastA?.sx,
          health: hCtx,
        });
      }
      // 12/10: tự hỏi mình có MẮC một bệnh / hội chứng không ("a có bị mất trí nhớ không") mà Lomi không có bài riêng → Lomi không chẩn đoán;
      // nói rõ điều đó và khi nào nên đi khám — không đáp "chưa được học". (Chỉ nhận khi cụm sau "bị" nói về cơ thể / bệnh.)
      const dxSelf = en ? null : normalizeVi(q).match(/\b(?:a|anh|e|em|c|chi|minh|toi|tui|to) (?:co (?:phai )?(?:dang )?(?:bi|mac)|co khi nao (?:bi|mac)|lieu co (?:bi|mac)|bi) ((?:\S+ ){1,4}?)(?:khong|ko|k|ha|nhi|chua)(?: (?:e|em|a|anh|lomi|vay|ta))*$/);
      if (dxSelf && /\b(benh|hoi chung|roi loan|viem|suy|nhiem|ung thu|tri nho|than kinh|tam than|tam ly|tim|gan|than|phoi|mau|nao|da day|ruot|xuong|khop|noi tiet|huyet ap|duong huyet|mo mau|thieu|di ung|ky sinh)\b/.test(dxSelf[1]))
        return localReply(q, {
          role: "assistant",
          content: "Lomi không chẩn đoán được đâu bạn — có bị vậy hay không thì phải bác sĩ khám trực tiếp mới nói được, qua vài câu kể thì không ai kết luận được.\n\nNếu chuyện này lặp lại nhiều, hoặc bắt đầu ảnh hưởng tới sinh hoạt, công việc thì bạn nên đi khám cho yên tâm nha. Bạn thấy như vậy bao lâu rồi?",
          local: true,
          health: hCtx ?? {},
        });
      // Tới đây là Lomi thật sự bí: ghi câu NGUYÊN VĂN (raw) cho admin xem, khoá gộp theo câu đã chuẩn hoá (q).
      logUnanswered(raw, q);
      if (!sug.length && !en) {
        const fb = scopedFallback(q, lastA?.faqId ? faqById(lastA.faqId)?.q.vi : undefined);
        // Đang theo chuyện một người / con vật ốm (lib/lomiStory) mà hỏi điều Lomi chưa có kiến thức → nói thật theo đúng mạch đó
        // (vẫn ghi lại câu chưa trả lời được + hiện nút 💡 như thường), không buông một câu "chưa được học" lạc lõng.
        const careUnk = th0?.kind === "care" && (th0.idle ?? 0) < 2 && (looksLikeQuestion(q) || fr1?.act === "question" || fr1?.act === "request")
          ? `Câu này Lomi chưa đủ kiến thức để trả lời cho chắc 🙏 ${th0.facts.doctor === true ? `${th0.who.text.charAt(0).toUpperCase() + th0.who.text.slice(1)} đang được bác sĩ theo dõi rồi thì bạn hỏi thẳng bác sĩ là chính xác nhất nha.` : `Chuyện sức khoẻ của ${th0.who.text} thì hỏi bác sĩ là chắc nhất nha.`}`
          : null;
        // 12/10: câu hỏi SỨC KHOẺ mà Lomi chưa có kiến thức ("bệnh Kawasaki là gì", "có nên mổ không") → nói rõ là CHƯA CÓ KIẾN THỨC đã kiểm
        // chứng (khác với "chưa hiểu câu"), chỉ về bác sĩ; không mời bói cho một câu hỏi y khoa như lời đáp chung của câu "có nên…".
        const medUnk = !careUnk && (medicalKindOf(q) ?? "unclear") !== "unclear" && (looksLikeQuestion(q) || fr1?.act === "question" || fr1?.act === "request")
          ? "Chuyện này Lomi **chưa có kiến thức đã kiểm chứng** nên không dám trả lời bừa — chuyện sức khoẻ mà nói sai thì nguy hiểm 🙏 Bạn hỏi bác sĩ hoặc dược sĩ là chắc nhất nha.\n\nMuốn Lomi được bổ sung phần này thì bấm 💡 Dạy Lomi ngay dưới câu này để gửi ban quản trị."
          : null;
        // 12/10: phân biệt CHƯA HIỂU CÂU với CHƯA CÓ KIẾN THỨC — câu KỂ / mẩu câu Lomi không đọc được ("ý a là món đó") thì nói là chưa hiểu
        // và xin nói rõ hơn; chỉ câu HỎI / lời nhờ mới là "chưa có kiến thức". (Đang ở mạch sức khoẻ thì giữ lời đáp theo mạch đó.)
        //   ("cách sửa xe máy", "công thức nấu phở" — cụm danh từ mở đầu bằng "cách / công thức / hướng dẫn…" cũng là xin kiến thức.)
        const isAsk = looksLikeQuestion(q) || fr1?.act === "question" || fr1?.act === "request" || /^(cach|cong thuc|huong dan|meo|kinh nghiem|y nghia|dinh nghia|lich su|gia|thong tin) /.test(normalizeVi(q));
        // Đang nghe kể chuyện đời thường mà gặp một câu KỂ Lomi không có bài riêng ("chắc tại a ít nói") → vẫn là kể tiếp: nhắc lại + nghe tiếp.
        //   (chỉ khi câu nói về CHÍNH người kể hoặc lược chủ ngữ với một việc Lomi đọc được — "bitcoin hôm nay lên 100k" thì vẫn là chưa biết.)
        if (!careUnk && !medUnk && !isAsk && !keepHealth.health && !askHealth && convo?.talk && fr1?.act === "statement" && (fr1.toks.some((t) => t.r === "SELF") || (fr1.subject === "none" && !!fr1.pred?.known))) {
          const tc = talkContinue(raw, convo.talk, /🥺|😔|😣/u.test(lastA?.content ?? ""), lastA?.content ?? "");
          return localReply(q, { role: "assistant", content: tc.text, local: true, talk: convo.talk + 1, about: lastA?.about });
        }
        const notGot = !careUnk && !medUnk && !isAsk && !keepHealth.health && !askHealth
          ? "Câu này Lomi chưa hiểu ý lắm 😅 Bạn nói rõ hơn một chút giúp Lomi nha? (Nếu là điều Lomi nên biết mà chưa biết, bạn bấm 💡 Dạy Lomi bên dưới để gửi ban quản trị.)"
          : null;
        const unkText = careUnk ?? medUnk ?? notGot;
        return localReply(q, { role: "assistant", content: unkText ?? fb.text, local: true, quick: unkText ? undefined : fb.quick, unk: raw, unkKey: q, stuck: (careUnk ? "unknown_care" : medUnk ? "unknown_med" : notGot ? "not_understood" : "fallback") as StuckKind, sticker: unkText ? undefined : fb.sticker, ...keepHealth, ...(askHealth ? { health: {} } : {}) });
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
        unk: raw,
        unkKey: q,
        stuck: "suggest",
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

  // Lời chào đầu khung chat (01/10, theo ý Kir): linh vật + 1 câu in đậm, không kèm dòng chữ phụ.
  // Xưng hô theo cách người dùng tự xưng (lib/lomiAddress).
  const greetLine = (() => {
    const a = loadMem(user.id).addr;
    if (a === "anh" || a === "chị") return `Xin chào ${a}, em là Lomi! Em giúp gì được cho ${a}?`;
    if (a === "bạn-em") return "Xin chào, em là Lomi! Em giúp gì được cho bạn?";
    return speak(t("ai.welcome"), a);
  })();

  const clear = () => {
    setMsgs([]);
    saveHistory(user.id, []);
    setErr(null);
  };


  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* 01/10 (theo ý Kir): góc trái mũi tên quay lại; góc phải làm mới · loa · "?". */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        {(onClose ?? onBack) && (
          <button onClick={onClose ?? onBack} aria-label={t("common.back")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <LomiMascot size={30} animated={false} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{t("ai.title")}</div>
        </div>
        {msgs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clear();
              setShowTop(false);
            }}
            aria-label={t("ai.clear")}
            title={en ? "Clear" : "Làm mới cuộc trò chuyện"}
            className="p-2 rounded-full grid place-items-center text-muted-foreground hover:bg-accent transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => {
            setLomiSound(!soundOn);
            if (!soundOn) window.setTimeout(() => lomiSound("pop"), 0);
          }}
          aria-label={t(soundOn ? "ai.soundOff" : "ai.soundOn")}
          title={t(soundOn ? "ai.soundOff" : "ai.soundOn")}
          className="p-2 rounded-full text-muted-foreground hover:bg-accent"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        {!en && (
          <button
            type="button"
            onClick={openTop}
            aria-label="Lomi giúp được gì?"
            title="Lomi giúp được gì?"
            className={cn(
              "p-2 rounded-full grid place-items-center transition",
              showTop ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <CircleHelp className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {showTop && !en && (
        <div className="absolute right-3 top-14 z-20 max-h-[60%] overflow-y-auto w-72 max-w-[calc(100%-1.5rem)] rounded-2xl border bg-card shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">🔥 Mọi người hay hỏi Lomi</div>
          {!topList ? (
            <div className="px-2 py-3 text-xs text-muted-foreground animate-pulse">Đang tải…</div>
          ) : (
            <div className="flex flex-col">
              {topList.map((tp, i) => (
                <button
                  key={tp.key}
                  onClick={() => pickSuggest(tp.key.startsWith("faq:") ? "send" : tp.action === "send" ? tp.key : tp.action, tp.label, tp.prompt)}
                  className="flex items-center gap-2 text-left text-sm px-2 py-2 rounded-xl hover:bg-accent active:scale-[0.98] transition"
                >
                  <span className="w-5 text-xs font-bold text-primary/70">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate">{tp.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3" onClick={() => showTop && setShowTop(false)}>
        {/* Lời chào luôn nằm đầu khung chat (01/10, theo ý Kir) — bấm gợi ý thì trả lời nối tiếp bên dưới,
            không đổi màn hình. */}
        <div className={cn("text-center px-6 space-y-2", msgs.length === 0 ? "min-h-[70%] flex flex-col items-center justify-center" : "pt-4 pb-2")}>
          <LomiMascot size={64} className="mx-auto" track />
          <p className="text-base font-bold leading-snug">{en ? t("ai.welcome") : greetLine}</p>
        </div>
        {msgs.length === 0 ? null : (
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
                  {!en && !m.note && !!m.unk && (
                    <button
                      onClick={() => {
                        if (m.reported) return void toast("Câu này đã được gửi cho ban quản trị rồi nha 💚");
                        setFbReason("unknown");
                        setFbNote("");
                        setFbIdx(i);
                      }}
                      aria-label="Dạy Lomi câu này"
                      title="Lomi chưa biết câu này? Dạy Lomi nha"
                      className={cn("font-semibold", m.reported ? "text-muted-foreground/60" : "text-amber-600 dark:text-amber-400")}
                    >
                      💡 {m.reported ? "Đã gửi" : "Dạy Lomi"}
                    </button>
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

      {/* ⁉️ Báo câu trả lời cho ban quản trị (01/10) — admin xem ở Quản trị → Lomi học hỏi và dạy lại Lomi. */}
      <Dialog open={fbIdx !== null} onOpenChange={(o) => !o && !fbBusy && setFbIdx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>💡 Dạy Lomi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Câu này sẽ được gửi cho ban quản trị để dạy lại Lomi. Cảm ơn ấy nhiều nha 🍀</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["unknown", "🤔 Lomi chưa biết"],
                ["wrong", "❌ Trả lời sai"],
                ["offtopic", "🙃 Lạc đề, không đúng ý"],
                ["other", "💬 Khác"],
              ] as [FeedbackReason, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFbReason(k)}
                className={cn(
                  "text-xs rounded-xl border px-2 py-2 text-left transition",
                  fbReason === k ? "border-primary bg-primary/10 text-primary font-semibold" : "hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={fbNote}
            onChange={(e) => setFbNote(e.target.value.slice(0, 500))}
            placeholder="Ấy muốn Lomi trả lời thế nào? (không bắt buộc)"
            rows={3}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            disabled={fbBusy}
            onClick={async () => {
              if (fbIdx === null) return;
              const m = msgs[fbIdx];
              const um = [...msgs.slice(0, fbIdx)].reverse().find((x) => x.role === "user");
              // Câu người dùng gõ NGUYÊN VĂN là nguồn gốc — không gửi câu đã chuẩn hoá.
              const askedQ = um?.raw ?? um?.content ?? "";
              setFbBusy(true);
              const ok = await sendFeedback(askedQ, m?.content ?? "", fbReason, fbNote);
              setFbBusy(false);
              if (!ok) return void toast.error("Gửi chưa được, ấy thử lại sau nha 🥲");
              setMsgs((prev) => {
                const next = prev.map((x, j) => (j === fbIdx ? { ...x, reported: true } : x));
                try {
                  saveHistory(user.id, next);
                } catch {
                  /* bỏ qua */
                }
                return next;
              });
              setFbIdx(null);
              toast.success("Đã gửi ban quản trị rồi nè! Cảm ơn ấy đã giúp Lomi học hỏi 🙂‍↕️");
            }}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
          >
            {fbBusy ? "Đang gửi…" : "Gửi cho ban quản trị"}
          </button>
        </DialogContent>
      </Dialog>

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
          className="p-3 flex items-end gap-2 border-t"
        >
          <button
            type="button"
            onClick={() => {
              setShowStickers((v) => !v);
              setShowTop(false);
            }}
            aria-label="Sticker"
            className={cn(
              "w-9 h-10 shrink-0 rounded-full grid place-items-center transition",
              showStickers ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Smile className="w-5 h-5" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onFocus={() => setShowTop(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={t("ai.placeholder")}
            className="flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-base max-h-32 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
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
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const [pos, setPos] = useState<BubblePos>(readPos);
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

  useEffect(() => {
    try {
      localStorage.setItem(BUBBLE_KEY, JSON.stringify(pos));
    } catch {
      /* bỏ qua */
    }
  }, [pos]);

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
        // 01/10 (theo ý Kir): chạm Lomi = mở trang chat riêng như mở đoạn chat với 1 người (không còn bảng nổi
        // đè lên trang đang xem — trang nền không còn cuộn được phía sau).
        nav("/tro-ly-ai");
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

    </>
  );
}
