// ─────────────────────────────────────────────────────────────────────────────
// TRÍ NHỚ CỦA LOMI (30/09, theo ý Kir) — Lomi nhớ vài điều người dùng TỰ KỂ để trò chuyện liền mạch:
// tên gọi, hoàn cảnh (đang tìm việc, vừa thất tình, đang ốm, sắp thi…), loại hình kinh doanh.
// Chỉ lưu trên máy người dùng (localStorage theo tài khoản), hoàn cảnh tự hết hạn sau 45 ngày.
// Người dùng hỏi "Lomi nhớ gì về mình?" để xem, "quên hết đi" để xoá.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import type { BizCtx } from "@/lib/bizAdvisor";

export type Sit = "jobless" | "working" | "heartbroken" | "single" | "inlove" | "sick" | "student";
export type LomiMem = { name?: string; sits?: Partial<Record<Sit, number>>; biz?: Pick<BizCtx, "type" | "noun"> };

const KEY = (uid: string) => `lomi-mem:${uid}`;
const TTL = 45 * 86400000;

export function loadMem(uid: string): LomiMem {
  try {
    const m = JSON.parse(localStorage.getItem(KEY(uid)) ?? "{}") as LomiMem;
    if (m.sits) for (const k of Object.keys(m.sits) as Sit[]) if (Date.now() - (m.sits[k] ?? 0) > TTL) delete m.sits[k];
    return m;
  } catch {
    return {};
  }
}
export function saveMem(uid: string, m: LomiMem) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(m));
  } catch {
    /* bỏ qua */
  }
}
export function clearMem(uid: string) {
  try {
    localStorage.removeItem(KEY(uid));
  } catch {
    /* bỏ qua */
  }
}

const SIT_RE: [Sit, RegExp][] = [
  ["jobless", /\b(that nghiep|mat viec|dang tim viec|nghi viec roi|bi duoi viec|chua co viec|khong co viec|dang kiem viec)\b/],
  ["working", /\b(moi co viec|da co viec|dang di lam|moi di lam|vua co viec)\b/],
  ["heartbroken", /\b(that tinh|vua chia tay|bi da|bi bo roi|chia tay roi|bi nguoi yeu bo|moi chia tay)\b/],
  ["single", /\b(doc than|dang e|fa|chua co nguoi yeu|khong co nguoi yeu)\b/],
  ["inlove", /\b(co nguoi yeu roi|dang yeu|moi co nguoi yeu|dang hen ho)\b/],
  ["sick", /\b(dang om|bi om|bi benh|dang benh|bi sot|bi cam|dang dieu tri)\b/],
  ["student", /\b(sinh vien|hoc sinh|dang on thi|sap thi|dang di hoc|mua thi)\b/],
];
const CONFLICT: Partial<Record<Sit, Sit[]>> = {
  working: ["jobless"],
  jobless: ["working"],
  inlove: ["single", "heartbroken"],
  single: ["inlove"],
  heartbroken: ["inlove"],
};
export const SIT_PHRASE: Record<Sit, string> = {
  jobless: "mình đang thất nghiệp, đang tìm việc",
  working: "mình đang đi làm",
  heartbroken: "mình vừa thất tình",
  single: "mình đang độc thân",
  inlove: "mình đang có người yêu",
  sick: "mình đang bị ốm",
  student: "mình đang đi học, sắp thi",
};
const SIT_LABEL: Record<Sit, string> = {
  jobless: "đang tìm việc",
  working: "đang đi làm",
  heartbroken: "vừa trải qua chuyện buồn trong tình cảm",
  single: "đang độc thân",
  inlove: "đang có người thương",
  sick: "đang không khoẻ",
  student: "đang đi học / ôn thi",
};

const SELF = /(^| )(minh|toi|tui|em|anh|chi|to|t|tao|bo may|nay|dang|vua|moi|bi|hien)( |$)/;
const NAME_BAD = new Set(["gì", "gi", "là", "chi", "đó", "ai", "nè", "nha", "đi"]);

/** Đọc câu người dùng → cập nhật trí nhớ. Trả về tên mới (nếu vừa giới thiệu) và hoàn cảnh mới thêm. */
export function learnFromText(uid: string, raw: string): { mem: LomiMem; newName?: string; newSits: Sit[] } {
  const mem = loadMem(uid);
  const newSits: Sit[] = [];
  let newName: string | undefined;
  const m =
    raw.match(/(?:^|\s)(?:mình|tôi|tui|em|anh|chị|tớ|t)\s+tên(?:\s+là)?\s+([\p{L}]+(?:\s+[\p{L}]+)?)/iu) ??
    raw.match(/(?:gọi|kêu)\s+(?:mình|tôi|tui|em|anh|chị|tớ)\s+là\s+([\p{L}]+(?:\s+[\p{L}]+)?)/iu);
  if (m) {
    const words = m[1].split(/\s+/).filter((w) => !NAME_BAD.has(w.toLowerCase()));
    const nm = words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    if (nm && nm.length <= 20) {
      mem.name = nm;
      newName = nm;
    }
  }
  const n = ` ${normalizeVi(raw)} `;
  if (SELF.test(n) || n.trim().split(" ").length <= 4) {
    for (const [s, re] of SIT_RE)
      if (re.test(n)) {
        mem.sits = mem.sits ?? {};
        if (!mem.sits[s]) newSits.push(s);
        mem.sits[s] = Date.now();
        for (const c of CONFLICT[s] ?? []) delete mem.sits[c];
      }
  }
  if (newName || newSits.length) saveMem(uid, mem);
  return { mem, newName, newSits };
}

export function rememberBiz(uid: string, biz: Pick<BizCtx, "type" | "noun">) {
  if (!biz.type) return;
  const mem = loadMem(uid);
  mem.biz = { type: biz.type, noun: biz.noun };
  saveMem(uid, mem);
}
export function forgetBiz(uid: string) {
  const mem = loadMem(uid);
  delete mem.biz;
  saveMem(uid, mem);
}

/** Câu mô tả hoàn cảnh để ghép vào ngữ cảnh bói Tarot khi câu hỏi chung chung. */
export function situationContext(mem: LomiMem): string {
  return (Object.keys(mem.sits ?? {}) as Sit[]).map((s) => SIT_PHRASE[s]).join(", ");
}

export function isAskMemory(text: string) {
  return /\b(nho gi ve (minh|toi|tui|em|anh)|biet gi ve (minh|toi|tui|em|anh)|con nho (minh|toi|tui|em|anh) khong|nho ten (minh|toi|tui|em|anh)|ten (minh|toi|tui|em|anh) la gi)\b/.test(
    normalizeVi(text),
  );
}
export function isForgetMemory(text: string) {
  return /\b(quen het di|quen het nha|xoa tri nho|dung nho nua|quen minh di|quen toi di|xoa het tri nho)\b/.test(normalizeVi(text));
}
export function memorySummary(mem: LomiMem, bizNoun?: string): string {
  const lines: string[] = [];
  if (mem.name) lines.push(`• Bạn tên ${mem.name}`);
  for (const s of Object.keys(mem.sits ?? {}) as Sit[]) lines.push(`• Bạn ${SIT_LABEL[s]}`);
  if (mem.biz?.type) lines.push(`• Bạn kinh doanh ${bizNoun ?? "một chỗ kinh doanh"}`);
  if (!lines.length)
    return "Lomi chưa nhớ gì nhiều về bạn nè 😊 Bạn cứ kể, kiểu “mình tên Lan”, “mình đang tìm việc” hay “mình bán cà phê” — Lomi sẽ nhớ để trò chuyện hợp với bạn hơn.";
  return `Lomi nhớ mấy điều bạn từng kể nè 😊\n${lines.join("\n")}\n\nLomi chỉ lưu trên máy của bạn thôi. Muốn Lomi quên hết thì gõ “quên hết đi” nha.`;
}

/** Phản hồi ngắn khi người dùng vừa kể hoàn cảnh (nếu không có luồng nào khác trả lời). */
export const SIT_REPLY: Record<Sit, { text: string; quick: string[] }> = {
  jobless: {
    text: "Lomi nghe rồi nè 🫂 Giai đoạn tìm việc nhiều áp lực lắm, nhưng đó chỉ là một khúc quanh thôi, không nói lên giá trị của bạn đâu. Lomi nhớ rồi — cần gì cứ hỏi nha.",
    quick: ["Bói xem bao giờ mình có việc làm", "Hôm nay ăn gì? 🎲"],
  },
  working: {
    text: "Yayy, chúc mừng bạn nha 🎉 Lomi nhớ rồi! Chúc công việc mới thật suôn sẻ.",
    quick: ["Bói xem công việc mới thế nào", "Hôm nay ăn gì? 🎲"],
  },
  heartbroken: {
    text: "Lomi gửi bạn một cái ôm thật chặt 🫂 Chuyện buồn cần thời gian để lành, cứ cho phép mình buồn một chút nha. Lomi ở đây nếu bạn muốn kể.",
    quick: ["Bói xem khi nào có người yêu mới", "Bói một lá cho hôm nay"],
  },
  single: {
    text: "Độc thân cũng có cái vui riêng đó 😄 Lomi nhớ rồi nha. Muốn làm quen bạn mới thì thử mục Làm quen trên Quẹt (/quet) xem!",
    quick: ["Bói xem khi nào có người yêu mới", "Quẹt là gì, dùng thế nào?"],
  },
  inlove: {
    text: "Ui, dễ thương quá 💞 Lomi nhớ rồi nha, chúc hai bạn thật hạnh phúc!",
    quick: ["Bói xem tình cảm sắp tới thế nào", "Hôm nay ăn gì? 🎲"],
  },
  sick: {
    text: "Thương bạn ghê 🥺 Nghỉ ngơi nhiều, uống đủ nước và làm đúng lời bác sĩ dặn nha. Nếu thấy nặng hơn thì đi khám liền đó. Lomi mong bạn mau khoẻ!",
    quick: ["Bói một lá cho hôm nay"],
  },
  student: {
    text: "Cố lên nha 📚 Nhớ ngủ đủ giấc, học theo từng phiên ngắn là nhớ bài lâu hơn đó. Lomi nhớ rồi — chúc bạn thi tốt!",
    quick: ["Bói xem kỳ thi sắp tới thế nào", "Bói một lá cho hôm nay"],
  },
};

/** Tên gọi: ưu tiên tên người dùng tự nói với Lomi, không có thì lấy ĐỦ họ tên trong hồ sơ
 *  (30/09 theo ý Kir: cắt chữ cuối dễ ra "Hello Trị" với tên như "Ban Quản Trị"). */
export function displayName(mem: LomiMem, fullName?: string | null): string | undefined {
  if (mem.name) return mem.name;
  const full = (fullName ?? "").trim().replace(/\s+/g, " ");
  return full && full.length <= 40 ? full : undefined;
}
