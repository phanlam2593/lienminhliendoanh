// ─────────────────────────────────────────────────────────────────────────────
// LOMI HỖ TRỢ TÂM LÝ CÓ CẤU TRÚC (22/10, theo ý Kir: "nghiêng về tư vấn tâm lý như bác sĩ tâm lý").
//   Lomi KHÔNG tự xưng bác sĩ / chuyên gia, không chẩn đoán — nhưng hướng dẫn được những bài tập chuẩn mà chuyên gia tâm lý hay dùng,
//   theo từng bước qua nhiều lượt (trạng thái lưu trên tin Lomi: Msg.therapy):
//     • calm   — thở chậm 4–6 + kéo về hiện tại 5-4-3-2-1 (khi đang hoảng, lo dâng lên)
//     • cbt    — soi lại một suy nghĩ tiêu cực (liệu pháp nhận thức hành vi – CBT: tình huống → suy nghĩ → cảm xúc 0–10 →
//                bằng chứng hai phía → lời của bạn thân → câu cân bằng hơn → chấm lại cảm xúc)
//     • act    — kích hoạt hành vi: chọn MỘT việc nhỏ hôm nay khi tâm trạng xuống
//     • worry  — gỡ nỗi lo: phần làm được → bước cụ thể; phần ngoài tầm tay → "giờ lo âu"
//     • screen — 4 câu sàng lọc PHQ-2 + GAD-2 (2 tuần qua, 0–3 điểm; ≥3 điểm mỗi phần = nên được đánh giá kỹ hơn) — KHÔNG phải chẩn đoán
//     • safety — kế hoạch an toàn (theo mô hình Stanley–Brown): dấu hiệu báo động, việc tự làm, người liên hệ, giữ chỗ ở an toàn, số khẩn cấp
//   Ý định tự hại / cấp cứu luôn được các lớp an toàn xử lý TRƯỚC lớp này.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

export type TherapyState = { tool: "calm" | "cbt" | "act" | "worry" | "screen" | "safety" | "kind" | "anger"; step: number; data: Record<string, string> };
export type TherapyOut = { text: string; state?: TherapyState; quick?: string[] };

const N = (q: string) => ` ${normalizeVi(q)} `;
const clip = (x: string, n = 90) => {
  const t = x.trim().replace(/\s+/g, " ").replace(/[.!…]+$/u, "");
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/u, "")}…` : t;
};
const HOTLINE = "đường dây hỗ trợ tâm lý Ngày Mai **096 306 1414** (13h–20h30, thứ 4 đến Chủ nhật)";
const STOP = VN(/^ ((thôi|dừng|ngưng|stop)( (lại|dừng|ngưng|thôi|nha|nhé|nhe|đi|em|lomi|đã|ở đây))*|(không|ko|khỏi) (làm|tập) nữa( (nha|nhé|đâu))*|để (sau|lúc khác|hôm khác)( (nha|nhé|đi))*|thôi để (sau|lúc khác)( (nha|nhé))*) $/);
const YES = VN(/^ (có|ừ|ừm|uh|ok|oke|okie|được|đc|dc|thử|thử xem|thử đi|làm đi|bắt đầu|ừ thử xem|ok thử xem|có thử|muốn|ừa|vâng|dạ|dạ có|🔎 ừ, thử xem)( (đi|nha|nhé|luôn|em|lomi|xem|thử))* $|^ (có )?(cách nào|làm sao|làm thế nào|giúp (anh|a|em|e|mình|tôi|tui|chị|c)|chỉ (anh|a|em|e|mình|tôi|tui|chị|c))( \S+){0,4} $/);
const NO = VN(/^ (không|ko|k|hông|hong|khỏi|thôi|chưa|không cần|thôi khỏi|thôi, mình chỉ muốn kể|chỉ muốn kể|mình chỉ muốn kể)( (đâu|nha|nhé|em|lomi|thôi|đã))* $/);

// ── Lời giới thiệu: Lomi giúp được gì trong chuyện tâm lý ──
const MENU =
  "Lomi **không phải bác sĩ hay chuyên gia tâm lý**, nên không chẩn đoán hay điều trị được 🙏 Nhưng Lomi có thể ngồi nghe bạn kể, và cùng bạn làm vài bài tập mà chuyên gia tâm lý hay hướng dẫn:\n" +
  "• 🫁 **Bài tập thở** — khi đang hoảng, lo dâng lên\n" +
  "• 🔎 **Soi lại suy nghĩ** — khi đầu cứ nói những câu khắt khe về bản thân (từ liệu pháp nhận thức hành vi – CBT)\n" +
  "• 🌱 **Một việc nhỏ hôm nay** — khi chẳng muốn làm gì\n" +
  "• 🧺 **Gỡ nỗi lo** — khi lo hoài không dừng được\n" +
  "• 🧭 **Sàng lọc nhanh** — 4 câu hỏi chuẩn xem có nên đi gặp chuyên gia không (không phải chẩn đoán)\n" +
  "• 🛟 **Kế hoạch an toàn** — cho những lúc rất tệ\n\n" +
  "Bạn muốn bắt đầu bằng việc kể chuyện, hay gõ tên một bài tập ở trên?";

// ── Các bước ──
function calm(step: number, q: string, d: Record<string, string>): TherapyOut {
  if (step === 1)
    return {
      text: "Mình làm cùng nhau nha, chậm thôi 🫁\n• Ngồi xuống, đặt chân chạm sàn, thả lỏng vai\n• Hít vào bằng mũi, đếm thầm 1 – 2 – 3 – 4\n• Thở ra thật chậm bằng miệng, đếm 1 – 2 – 3 – 4 – 5 – 6\n\nLàm như vậy 5 lần. Xong thì nhắn Lomi một chữ “xong” nha.\n\n(Nếu đang **đau / tức ngực, khó thở nhiều, sắp ngất** hoặc đây là lần đầu bị như vậy → gọi **115** trước.)",
      state: { tool: "calm", step: 2, data: d },
    };
  if (step === 2) return { text: "Tốt lắm 💚 Giờ mình kéo sự chú ý về **hiện tại** nha. Nhìn quanh và kể Lomi nghe **5 thứ bạn đang nhìn thấy**.", state: { tool: "calm", step: 3, data: d } };
  if (step === 3) return { text: "Rồi nè 👀 Tiếp nha: **4 thứ bạn đang chạm được** (ghế, áo, mặt bàn…) và **3 âm thanh bạn đang nghe thấy**.", state: { tool: "calm", step: 4, data: d } };
  if (step === 4) return { text: "Gần xong rồi 🌿 **2 mùi** bạn ngửi thấy (hoặc 2 mùi bạn thích), và **1 điều** làm bạn thấy dễ chịu hay biết ơn lúc này.", state: { tool: "calm", step: 5, data: d } };
  if (step === 5) return { text: "Bạn làm rất tốt 💚 Từ 0 đến 10, giờ mức lo / hoảng của bạn còn khoảng bao nhiêu?", state: { tool: "calm", step: 6, data: d } };
  const r = rate(q);
  if (r === null) return { text: "Bạn chấm giúp Lomi một con số từ 0 (rất bình tĩnh) đến 10 (hoảng nhất) nha.", state: { tool: "calm", step: 6, data: d } };
  return {
    text:
      r <= 4
        ? `${r}/10 — dịu xuống được vậy là tốt rồi 💚 Lúc nào thấy lo dâng lên, cứ quay lại thở 4–6 và gọi tên vài thứ quanh mình như vừa rồi. Cơ thể học được cách bình tĩnh lại nhanh hơn khi mình tập đều.\n\nGiờ bạn muốn kể Lomi nghe điều gì làm bạn lo lúc nãy không?`
        : `${r}/10 — vẫn còn cao ha, không sao đâu, có lúc cần nhiều vòng hơn 🌿 Thử thêm một vòng thở 4–6, ra chỗ thoáng hoặc uống vài ngụm nước, và nhắn / gọi một người bạn tin để họ ở cạnh bạn.\n\nNếu những cơn như vậy hay lặp lại, nên gặp bác sĩ tâm lý hoặc chuyên khoa tâm thần — hoảng loạn, lo âu điều trị được. Có đau ngực, khó thở nhiều, ngất thì gọi **115** nha.`,
  };
}

const DISTORT: [RegExp, string][] = [
  [VN(/\b(luôn luôn|luôn|lúc nào cũng|không bao giờ|chẳng bao giờ|chả bao giờ|ai cũng|mọi người đều|tất cả|chẳng ai|không ai)\b/), "**khái quát hoá** — từ một vài lần mà nghĩ là “lúc nào cũng”, “không bao giờ”, “ai cũng”"],
  [VN(/\b(chắc (là )?(họ|mọi người|ai|người ta|cô ấy|anh ấy|sếp)|họ nghĩ|người ta nghĩ|ai cũng nghĩ)\b/), "**đoán ý người khác** — tin chắc người khác đang nghĩ xấu về mình, dù chưa ai nói vậy"],
  [VN(/\b(vô dụng|vô tích sự|thất bại|ngu|ngốc|kém cỏi|chẳng ra gì|không ra gì|vô giá trị|tệ hại|đồ bỏ đi)\b/), "**dán nhãn bản thân** — lấy một chuyện không như ý để kết luận về cả con người mình"],
  [VN(/\b(tiêu rồi|hết đời|toang|xong đời|chắc chắn sẽ|sẽ không bao giờ|không còn đường)\b/), "**nghĩ tới viễn cảnh tệ nhất** — xem kết cục xấu nhất như chắc chắn sẽ xảy ra"],
  [VN(/\b(phải|lẽ ra|đáng lẽ|đáng ra)\b/), "**câu “phải / lẽ ra” khắt khe** — đặt cho mình một chuẩn mà chính mình không bao giờ đòi ở người khác"],
];
function cbt(step: number, q: string, d: Record<string, string>): TherapyOut {
  const S = (s: number, extra: Record<string, string> = {}) => ({ tool: "cbt" as const, step: s, data: { ...d, ...extra } });
  if (step === 0) {
    // vừa được mời
    if (YES.test(N(q))) return { text: `Okie 🔎 Mình đi 5 bước ngắn nha, không có câu trả lời đúng sai đâu.\n\n**Bước 1:** Câu “${d.thought}” hiện lên sau chuyện gì vậy? Kể ngắn thôi.`, state: S(2) };
    if (NO.test(N(q))) return { text: "Okie, vậy bạn cứ kể, Lomi nghe nha 🫶" };
    return { text: "" }; // trả lời khác → để các lớp khác hiểu
  }
  if (step === 1)
    return {
      text: "Mình làm 5 bước ngắn, giống một buổi tập với chuyên gia tâm lý nha 🔎 Không có câu trả lời đúng sai đâu.\n\n**Bước 1:** Gần đây có chuyện gì làm bạn nghĩ tiêu cực về bản thân? Kể ngắn thôi.",
      state: S(11),
    };
  if (step === 11) return { text: "Ừm, Lomi ghi nhận 📝 Lúc đó trong đầu bạn hiện lên **câu gì về bản thân**? (vd “mình vô dụng”, “chắc mọi người chán mình”)", state: S(12, { sit: clip(q) }) };
  if (step === 12) return { text: `“${clip(q, 70)}” — nghe nặng lòng ghê.\n\n**Bước 2:** Lúc nghĩ vậy bạn thấy cảm xúc gì (buồn, xấu hổ, lo, giận…) và mạnh cỡ nào, từ 0 đến 10?`, state: S(3, { thought: clip(q, 70) }) };
  if (step === 2) return { text: `Ừm, Lomi ghi nhận 📝\n\n**Bước 2:** Lúc nghĩ “${d.thought}”, bạn thấy cảm xúc gì (buồn, xấu hổ, lo, giận…) và mạnh cỡ nào, từ 0 đến 10?`, state: S(3, { sit: clip(q) }) };
  if (step === 3) {
    const r = rate(q);
    return {
      text: `${r !== null ? `${r}/10 — ` : ""}cảm xúc đó là thật, mình không gạt nó đi đâu 💚\n\n**Bước 3:** Giờ mình làm thám tử chút nha 🔎 Có **bằng chứng** nào cho thấy câu “${d.thought}” là đúng? Chỉ kể sự việc thôi, không kể cảm giác.`,
      state: S(4, { feel: clip(q, 60), ...(r !== null ? { r1: String(r) } : {}) }),
    };
  }
  if (step === 4)
    return {
      text: "Ghi nhận 📝 Còn bằng chứng nào cho thấy câu đó **không hoàn toàn đúng** — dù nhỏ thôi? (một việc bạn từng làm được, ai đó từng cảm ơn hay tin bạn, một lần mọi chuyện không tệ như mình sợ…)",
      state: S(5, { pro: clip(q) }),
    };
  if (step === 5) return { text: `Cái này quan trọng lắm đó 💚\n\n**Bước 4:** Nếu bạn thân của bạn gặp đúng chuyện này và tự nói “${d.thought}”, bạn sẽ nói gì với người đó?`, state: S(6, { con: clip(q) }) };
  if (step === 6)
    return {
      text: `Đó cũng chính là điều bạn xứng đáng được nghe 💚\n\n**Bước 5:** Giờ thử viết lại câu “${d.thought}” thành một câu **công bằng hơn**, dựa trên cả hai phía bằng chứng. Ví dụ: “Chuyện đó làm mình buồn thật, nhưng một lần như vậy không nói lên toàn bộ con người mình.” Bạn viết câu của bạn nha.`,
      state: S(7, { friend: clip(q) }),
    };
  if (step === 7) return { text: `“${clip(q, 120)}” — nghe công bằng với bạn hơn nhiều 💚\n\nĐọc lại câu đó, cảm xúc lúc nãy${d.r1 ? ` (lúc đầu ${d.r1}/10)` : ""} giờ còn khoảng mấy điểm?`, state: S(8, { bal: clip(q, 120) }) };
  // step 8 — tổng kết
  const r2 = rate(q);
  const r1 = d.r1 ? Number(d.r1) : null;
  const dist = DISTORT.find(([re]) => re.test(N(d.thought ?? "")));
  const change = r1 !== null && r2 !== null ? (r2 < r1 ? `Từ ${r1} xuống ${r2}/10 👏 ` : `Vẫn ${r2}/10 cũng không sao — cảm xúc cần thời gian, và tập vài lần sẽ dễ hơn. `) : "";
  return {
    text:
      `${change}Bạn vừa làm xong một bài tập mà chuyên gia tâm lý hay dùng trong liệu pháp nhận thức hành vi (CBT) đó 💚\n\n` +
      `📝 **Tóm tắt buổi tập**\n• Tình huống: ${d.sit ?? "—"}\n• Suy nghĩ ban đầu: “${d.thought ?? "—"}”\n• Câu cân bằng hơn: “${d.bal ?? "—"}”\n\n` +
      `${dist ? `Câu ban đầu có dấu hiệu của kiểu nghĩ ${dist[1]}. Biết tên nó rồi thì lần sau dễ nhận ra hơn.\n\n` : ""}` +
      "Mẹo nhỏ: lần tới câu cũ quay lại, hỏi mình hai câu — “**bằng chứng đâu?**” và “**mình sẽ nói gì với bạn thân?**”. Nếu những suy nghĩ như vậy đến gần như mỗi ngày, kéo dài vài tuần, thì nên gặp chuyên gia tâm lý để được tập kỹ hơn nha.",
  };
}

function act(step: number, q: string, d: Record<string, string>): TherapyOut {
  if (step === 0) {
    if (YES.test(N(q))) return act(1, q, d);
    if (NO.test(N(q))) return { text: "Okie, vậy bạn cứ kể, Lomi nghe nha 🫶" };
    return { text: "" };
  }
  if (step === 1)
    return {
      text: "Khi tâm trạng xuống, chờ có động lực rồi mới làm thường không hiệu quả — làm một việc **thật nhỏ** trước, động lực mới tới sau (chuyên gia gọi là *kích hoạt hành vi*) 🌱\n\nTrước đây có việc gì làm bạn thấy dễ chịu hoặc có ích một chút không? (đi bộ, tắm nước ấm, nghe một bài nhạc, gọi cho ai đó, dọn một góc bàn…)",
      state: { tool: "act", step: 2, data: d },
    };
  if (step === 2) return { text: `Okie: “${clip(q, 60)}” 👍 Mình làm cho nó **nhỏ tới mức gần như không thể thất bại** nha — ví dụ chỉ 10 phút. Hôm nay bạn định làm lúc mấy giờ?`, state: { tool: "act", step: 3, data: { ...d, act: clip(q, 60) } } };
  return {
    text: `Chốt nha 📝 **${d.act}** — khoảng 10 phút, ${clip(q, 40)}.\n\nLàm xong thì nhắn Lomi một chữ cho vui. Còn nếu hôm nay không làm được cũng không sao — mình chỉnh việc đó cho nhỏ hơn nữa. Mỗi ngày một việc nhỏ, tâm trạng sẽ nhích lên từng chút. Nếu chẳng muốn làm gì kéo dài hơn hai tuần, nên gặp chuyên gia tâm lý nha.`,
  };
}

function worry(step: number, q: string, d: Record<string, string>): TherapyOut {
  if (step === 1) return { text: "Mình gỡ nỗi lo theo cách chuyên gia tâm lý hay hướng dẫn nha 🧺\n\n**Bước 1:** Điều bạn đang lo nhất là gì? Gói gọn trong một câu thôi.", state: { tool: "worry", step: 2, data: d } };
  if (step === 2) return { text: `Ừm, “${clip(q, 80)}”.\n\n**Bước 2:** Trong chuyện này có phần nào **bạn làm được gì đó** trong tuần này không — hay gần như nằm ngoài tầm tay mình?`, state: { tool: "worry", step: 3, data: { ...d, w: clip(q, 80) } } };
  if (step === 3) {
    const n = N(q);
    const cant = VN(/\b(ngoài tầm|không làm được gì|không làm gì được|chẳng làm được|chịu|không kiểm soát|không có|không)\b/).test(n) && !VN(/\b(có phần|làm được|có thể)\b/).test(n);
    if (cant)
      return {
        text: "Với phần nằm ngoài tầm tay, lo thêm cũng không đổi được kết quả mà chỉ làm mình mệt 🌿 Một cách hay:\n• Dành **15 phút “giờ lo âu”** mỗi chiều — chỉ lo trong khung giờ đó, viết hết ra giấy\n• Ngoài giờ mà nỗi lo hiện lên → ghi vội một dòng, hẹn nó tới “giờ lo”, rồi quay về việc đang làm\n• Kéo mình về hiện tại bằng vài nhịp thở chậm (hít 4, thở 6)\n\nLàm vài ngày, nhiều người thấy nỗi lo bớt chiếm cả ngày của mình. Nếu lo âu kéo dài vài tuần, ảnh hưởng ăn ngủ, thì nên gặp chuyên gia tâm lý nha.",
      };
    return { text: "Tốt quá, vậy mình biến nỗi lo thành **một việc cụ thể** nha 📝 Bước nhỏ nhất bạn làm được trong tuần này là gì? (vd gọi một cuộc, viết danh sách, hỏi một người, đặt lịch)", state: { tool: "worry", step: 4, data: d } };
  }
  return { text: `Chốt: **${clip(q, 80)}** 📝 Có việc cụ thể để làm rồi thì nỗi lo thường nhẹ đi, vì mình đã đang giải quyết nó chứ không chỉ nghĩ về nó. Làm xong bước này, kể Lomi nghe nha 💚` };
}

const SCREEN_Q = [
  "Ít hứng thú hoặc không thấy vui khi làm mọi việc?",
  "Thấy buồn chán, trĩu nặng, hoặc tuyệt vọng?",
  "Thấy lo âu, bồn chồn, căng thẳng?",
  "Không dừng được hoặc không kiểm soát được việc lo lắng?",
];
const SCALE = "0 = không ngày nào · 1 = vài ngày · 2 = hơn nửa số ngày · 3 = gần như ngày nào";
function score(q: string): number | null {
  const n = N(q);
  const m = n.match(/(?:^| )([0-3])(?: |$)/);
  if (m) return Number(m[1]);
  if (VN(/\b(không ngày nào|không có|không bao giờ|chưa bao giờ|không hề)\b/).test(n)) return 0;
  if (VN(/\b(gần như ngày nào|hầu như ngày nào|ngày nào cũng|mỗi ngày|suốt|liên tục)\b/).test(n)) return 3;
  if (VN(/\b(hơn nửa|nhiều ngày|thường xuyên|hay bị)\b/).test(n)) return 2;
  if (VN(/\b(vài ngày|vài lần|thỉnh thoảng|đôi khi|ít)\b/).test(n)) return 1;
  return null;
}
function screen(step: number, q: string, d: Record<string, string>): TherapyOut {
  const chips = ["0", "1", "2", "3"];
  if (step === 0)
    return {
      text: `Mình làm **4 câu sàng lọc nhanh** nha 🧭 Đây là các câu hỏi chuẩn (PHQ-2 và GAD-2) mà nhân viên y tế hay dùng để xem có nên đánh giá kỹ hơn không — **không phải chẩn đoán**.\n\nTrong **2 tuần qua**, bạn bị những điều sau thường xuyên cỡ nào? Trả lời bằng số:\n${SCALE}\n\n**Câu 1/4:** ${SCREEN_Q[0]}`,
      state: { tool: "screen", step: 1, data: d },
      quick: chips,
    };
  const s = score(q);
  if (s === null) return { text: `Bạn trả lời giúp Lomi bằng một số nha: ${SCALE}\n\n**Câu ${step}/4:** ${SCREEN_Q[step - 1]}`, state: { tool: "screen", step, data: d }, quick: chips };
  const d2 = { ...d, [`q${step}`]: String(s) };
  if (step < 4) return { text: `**Câu ${step + 1}/4:** ${SCREEN_Q[step]}`, state: { tool: "screen", step: step + 1, data: d2 }, quick: chips };
  const phq = Number(d2.q1) + Number(d2.q2);
  const gad = Number(d2.q3) + Number(d2.q4);
  const lines = [
    `• **Tâm trạng (PHQ-2): ${phq}/6** — ${phq >= 3 ? "từ 3 điểm trở lên là mức **nên được đánh giá kỹ hơn** về trầm cảm" : "chưa tới mức gợi ý trầm cảm theo bộ câu hỏi này"}`,
    `• **Lo âu (GAD-2): ${gad}/6** — ${gad >= 3 ? "từ 3 điểm trở lên là mức **nên được đánh giá kỹ hơn** về rối loạn lo âu" : "chưa tới mức gợi ý rối loạn lo âu theo bộ câu hỏi này"}`,
  ];
  const pos = phq >= 3 || gad >= 3;
  return {
    text:
      `Cảm ơn bạn đã trả lời thật lòng 💚 Kết quả sàng lọc:\n${lines.join("\n")}\n\n` +
      (pos
        ? "Điều này **không có nghĩa** là bạn chắc chắn bị bệnh — chỉ là nên gặp bác sĩ tâm lý hoặc chuyên khoa tâm thần để được hỏi kỹ hơn. Những vấn đề này rất phổ biến và điều trị được. Mang theo kết quả này khi đi khám cũng được.\n\n"
        : "Dù điểm chưa cao, nếu bạn vẫn thấy không ổn thì cảm giác đó vẫn đáng được lắng nghe — cứ kể Lomi, hoặc gặp chuyên gia khi cần.\n\n") +
      (phq >= 3 ? "Lomi hỏi thêm một câu quan trọng nha, vì Lomi quan tâm: trong 2 tuần qua, bạn có lúc nào nghĩ tới chuyện không muốn sống nữa?" : "Bạn muốn kể Lomi nghe thêm về dạo này không?"),
  };
}

function safety(step: number, q: string, d: Record<string, string>): TherapyOut {
  const S = (s: number, k?: string) => ({ tool: "safety" as const, step: s, data: k ? { ...d, [k]: clip(q, 100) } : d });
  if (step === 1)
    return {
      text: "Mình cùng làm một **kế hoạch an toàn** nhỏ nha 🛟 — giống cách chuyên gia tâm lý làm cùng người từng có những lúc rất nặng nề. Làm xong bạn lưu lại để mở ra khi cần.\n\n**Bước 1/4:** Những dấu hiệu nào báo cho bạn biết mình đang bắt đầu rơi vào lúc tệ? (vd mất ngủ, thu mình, uống rượu, một suy nghĩ cứ lặp lại)",
      state: S(2),
    };
  if (step === 2) return { text: "**Bước 2/4:** Khi thấy dấu hiệu đó, việc gì **tự bạn làm được** để dịu lại một chút? (tắm nước ấm, đi bộ, nghe nhạc, thở chậm, ra chỗ có người…)", state: S(3, "a") };
  if (step === 3) return { text: "**Bước 3/4:** Ai là **người bạn có thể nhắn hoặc gọi** — kể cả chỉ để nói chuyện cho khuây? Ghi 1–2 người.", state: S(4, "b") };
  if (step === 4) return { text: "**Bước 4/4:** Làm sao để chỗ bạn ở **an toàn hơn** trong những lúc đó? (vd nhờ người khác cất giữ thuốc, vật sắc nhọn; không ở một mình)", state: S(5, "c") };
  const dd: Record<string, string> = { ...d, d: clip(q, 100) };
  return {
    text: `🛟 **Kế hoạch an toàn**\n1. Dấu hiệu báo động: ${dd.a}\n2. Việc tự làm để dịu lại: ${dd.b}\n3. Người có thể liên hệ: ${dd.c}\n4. Giữ chỗ ở an toàn: ${dd.d}\n5. Khi vẫn thấy nguy hiểm: gọi **115**, hoặc ${HOTLINE}; nhờ người đưa tới bệnh viện gần nhất\n\nBạn chụp màn hình lại để mở ra khi cần nha. Làm được kế hoạch này là bạn đang chăm sóc mình rất tốt rồi 💚 Lomi luôn ở đây.`,
  };
}

function rate(q: string): number | null {
  const m = q.match(/(?:^|[^\d])(10|[0-9])(?:\s*\/\s*10|\s*điểm|\s*diem)?(?![\d])/u);
  return m ? Number(m[1]) : null;
}

// ── 23/10: tự trấn an khi tự trách (lòng tự trắc ẩn — self-compassion) ──
function kind(step: number, q: string, d: Record<string, string>): TherapyOut {
  const S = (s: number, extra: Record<string, string> = {}) => ({ tool: "kind" as const, step: s, data: { ...d, ...extra } });
  if (step === 0) {
    if (YES.test(N(q))) return kind(1, q, d);
    if (NO.test(N(q))) return { text: "Okie, vậy bạn cứ kể, Lomi nghe nha 🫶" };
    return { text: "" };
  }
  if (step === 1) return { text: "Mình làm 3 bước ngắn nha 💚\n\n**Bước 1:** Lần gần nhất bạn tự mắng mình là vì chuyện gì, và bạn đã nói gì với chính mình? (cứ ghi đúng câu trong đầu, kể cả câu nặng)", state: S(2) };
  if (step === 2) return { text: "Cảm ơn bạn đã thật lòng 🫶 Nghe câu đó thôi đã thấy nặng rồi.\n\n**Bước 2:** Nếu người bạn thân nhất của bạn làm sai đúng chuyện đó, bạn sẽ nói gì với họ?", state: S(3, { harsh: clip(q, 120) }) };
  if (step === 3) return { text: "Đó là cách bạn đối xử với người mình thương 💚\n\n**Bước 3:** Giờ đặt một tay lên ngực, hít thở chậm 3 lần, rồi nói câu đó **với chính mình** — đổi “bạn” thành “mình”. Gõ lại câu đó cho Lomi nha.", state: S(4, { friend: clip(q, 120) }) };
  return {
    text: `“${clip(q, 140)}” 💚\n\nĐây là câu bạn xứng đáng được nghe — từ chính mình. Tự mắng mình thật nặng không làm mình sửa sai nhanh hơn; nhiều nghiên cứu về **lòng tự trắc ẩn** (self-compassion) cho thấy người tử tế với bản thân khi vấp ngã thường bớt lo âu và có động lực sửa sai tốt hơn.\n\nMẹo nhỏ: lần tới câu cũ${d.harsh ? ` (“${clip(d.harsh, 60)}”)` : ""} hiện lên, dừng lại một nhịp và đổi sang câu mới này. Tập vài lần, nó sẽ đến tự nhiên hơn.`,
  };
}

// ── 23/10: kế hoạch cho cơn giận (nhận ra ngòi nổ, dấu hiệu sớm, câu xin tạm dừng, STOP) ──
function anger(step: number, q: string, d: Record<string, string>): TherapyOut {
  const S = (s: number, extra: Record<string, string> = {}) => ({ tool: "anger" as const, step: s, data: { ...d, ...extra } });
  if (step === 1) return { text: "Mình cùng làm một **kế hoạch cho cơn giận** nha 🧯 — kiểu chuyên gia tâm lý hay hướng dẫn, 3 bước ngắn.\n\n**Bước 1:** Thường điều gì làm bạn nổi nóng nhất? (một câu nói, một tình huống, lúc mệt, lúc vội…)", state: S(2) };
  if (step === 2) return { text: "Ghi nhận 📝\n\n**Bước 2:** Trước khi bùng lên, cơ thể bạn hay báo hiệu gì? (nóng mặt, nắm chặt tay, tim đập nhanh, nói to dần, nghiến răng…)", state: S(3, { trig: clip(q, 90) }) };
  if (step === 3) return { text: "Đó là “đèn vàng” của bạn 🚦 Thấy nó là còn kịp dừng.\n\n**Bước 3:** Khi đèn vàng bật lên, bạn sẽ nói câu gì để xin tạm dừng? Ví dụ: “Anh đang nóng, cho anh 15 phút rồi mình nói tiếp nha.”", state: S(4, { sign: clip(q, 90) }) };
  return {
    text:
      `🧯 **Kế hoạch cho cơn giận của bạn**\n1. Ngòi nổ hay gặp: ${d.trig ?? "—"}\n2. Đèn vàng của cơ thể: ${d.sign ?? "—"}\n3. Câu xin tạm dừng: “${clip(q, 100)}”\n4. Khi đã tạm dừng — **STOP**: **D**ừng lại · **T**hở chậm (hít 4, thở 6) · **Q**uan sát mình đang thấy gì (tức, tổn thương, mệt?) · rồi mới **C**họn cách nói\n5. Quay lại nói chuyện sau 15–30 phút, nói bằng câu “mình cảm thấy…” thay vì câu trách\n\n` +
      "Nói trước kế hoạch này với người nhà để họ hiểu khi bạn xin tạm dừng. Nếu cơn giận từng làm ai bị đau, đồ đạc bị đập phá, hay người nhà thấy sợ, nên gặp chuyên gia tâm lý để được hỗ trợ kỹ hơn nha 💚",
  };
}

const RUN: Record<TherapyState["tool"], (step: number, q: string, d: Record<string, string>) => TherapyOut> = { calm, cbt, act, worry, screen, safety, kind, anger };

/** Đang làm dở một bài tập → đi bước tiếp. null = người dùng đã chuyển sang chuyện khác (để các lớp khác đáp). */
export function therapyContinue(q: string, st: TherapyState): TherapyOut | null {
  const n = N(q);
  if (STOP.test(n)) return { text: "Okie, mình dừng bài tập ở đây nha 🌿 Lúc nào muốn làm tiếp, hoặc chỉ muốn kể chuyện, cứ nhắn Lomi." };
  const out = RUN[st.tool](st.step, q, st.data);
  return out.text ? out : null;
}

// ── Bắt đầu ──
const ASK_PRO = VN(/\b((em|lomi|e|bạn) (có phải|là|có làm được|làm được|có thể làm|có biết) (bác sĩ|chuyên gia|chuyên viên|nhà) (tâm lý|trị liệu)|(muốn|cần|xin) (được )?(tư vấn|trị liệu|hỗ trợ) tâm lý|tư vấn tâm lý (cho|giúp|giùm) (anh|a|em|e|mình|tôi|tui|chị)|(lomi|em|e) (giúp|hỗ trợ) (được )?(gì|những gì) (về|cho) (tâm lý|sức khoẻ tinh thần|sức khỏe tinh thần))\b/);
const CALM_ASK = VN(/^ (bài |cái )?(tập )?thở( (đi|nha|nhé|trước))* $|\b(bài tập thở|tập thở|thở sao cho|hướng dẫn thở|giúp (anh|a|em|e|mình|tôi|tui|chị|c) (bình tĩnh|bớt hoảng|thở)( lại)?|đang (hoảng|hoảng loạn|lên cơn hoảng|panic)|lên cơn hoảng|cơn hoảng loạn|hoảng loạn quá|bấn loạn quá|không bình tĩnh (lại )?được|lo quá (không|ko) thở (nổi|được)|run (hết |cả |lên )*(cả )?người (vì|do) (lo|sợ|hoảng)|tim đập (thình thịch|nhanh) vì (lo|sợ))\b/);
const CBT_ASK = VN(/\b(soi lại (một |cái )?suy nghĩ|(bớt|giảm|bỏ|thay đổi|gỡ|xử lý) (những |mấy |cái )?suy nghĩ tiêu cực|suy nghĩ tiêu cực (hoài|mãi|quá|nhiều)|hay nghĩ tiêu cực|tập suy nghĩ tích cực|bài tập cbt|liệu pháp nhận thức)\b/);
const ACT_ASK = VN(/\b(một việc nhỏ hôm nay|chọn (một|1) việc nhỏ|kích hoạt hành vi|giúp (anh|a|em|e|mình|tôi|tui|chị) (có|lấy lại) động lực|làm sao (để )?(có|lấy lại) động lực)\b/);
const WORRY_ASK = VN(/^ (bài |cái )?gỡ (nỗi )?lo( (đi|nha|nhé|trước))* $|\b(gỡ (bớt )?nỗi lo|(lo|lo lắng|lo âu) (hoài|mãi|suốt) (không|chẳng|ko) (dừng|ngừng|hết) (được|lại)|không (dừng|ngừng) lo (được)?|cứ lo (lắng )?(hoài|mãi|suốt)|lo đủ thứ (hết|cả)?( (trơn|luôn))?)\b/);
const SCREEN_ASK = VN(/\b(kiểm tra (xem )?((mình|anh|a|em|e|tôi|tui|chị|c) )?(có )?(bị )?(trầm cảm|lo âu|rối loạn lo âu)|sàng lọc( nhanh)?( tâm trạng| tâm lý| trầm cảm| lo âu)?|(test|kiểm tra|làm bài test|bài kiểm tra|trắc nghiệm) (tâm lý|trầm cảm|lo âu|tâm trạng|sức khoẻ tinh thần|sức khỏe tinh thần)|phq|gad)\b/);
const SAFETY_ASK = VN(/\b(kế hoạch an toàn|lập kế hoạch an toàn|safety plan)\b/);
// Câu tự chê bản thân rất khắt khe ("mình thật vô dụng", "ai cũng ghét mình") → mời soi lại suy nghĩ đó.
const SELF_LABEL = VN(/\b(mình|anh|a|em|e|tôi|tui|tớ|tao) (thật|đúng là|quả là|là|thấy mình|cảm thấy mình|thật sự)? ?(một )?((đồ |kẻ |người |đứa |thứ )?(vô dụng|vô tích sự|vô giá trị|kém cỏi|chẳng ra gì|không ra gì|đồ bỏ đi|tệ hại|ngu ngốc)|(đồ|kẻ|người|đứa) (thất bại|ngu|bỏ đi))( quá| thật| lắm| hết sức)?\b|\b(chẳng|không|chả) (bao giờ )?làm (được )?(gì|cái gì|việc gì) (ra hồn|nên hồn|cho đúng|tử tế)\b/);
const NOT_SELF = VN(/\b(không|chẳng|đâu có|đâu phải|không phải) (là |phải )?(đồ |kẻ |người )?(vô dụng|thất bại|ngu|kém cỏi)\b|\b(nó|họ|ảnh|cổ|anh ấy|cô ấy|sếp|bạn|người ta) (thật |đúng là |là )?(vô dụng|ngu|kém cỏi)\b/);

const ANX_TOOLS = VN(/\b(bài tập|cách|kỹ thuật|mẹo)( \S+){0,2} (cho|để|giúp)( \S+){0,2} (đỡ|bớt|giảm|hết|khỏi) (lo|lo âu|lo lắng|hồi hộp|căng thẳng|stress|hoảng)\b/);
const KIND_ASK = VN(/\b(bài tập |cách )?(tự trấn an|tử tế với (bản thân|chính mình)|thương bản thân|bớt tự trách|thôi tự trách|ngừng tự trách|bớt tự chê|lòng tự trắc ẩn)\b/);
const SELF_CRIT = VN(/\b((chửi|mắng|chê|trách|nói) (mình|bản thân|chính mình) (ngu|dốt|vô dụng|tệ|đồ|là đồ|ngu ngốc)|tự (chửi|mắng|chê|trách|đay nghiến) (mình|bản thân)( \S+){0,3} (hoài|mãi|suốt|lúc nào cũng|nặng)|lúc nào (làm sai|sai)( \S+){0,2} cũng (chửi|mắng|trách|chê) (mình|bản thân))\b/);
const ANGER_ASK = VN(/\b(bài tập (cho )?cơn giận|kế hoạch (cho |kiềm chế )?cơn giận|bài tập kiềm chế|tập kiềm chế cơn giận)\b/);
export function therapyStart(q: string): TherapyOut | null {
  const n = N(q);
  if (KIND_ASK.test(n)) return kind(1, q, {});
  if (ANGER_ASK.test(n)) return anger(1, q, {});
  if (SELF_CRIT.test(n) && q.trim().split(/\s+/).length <= 20)
    return {
      text: "Lúc làm sai mà còn tự mắng mình nặng như vậy thì mệt gấp đôi 😔 Nhiều người nghĩ phải khắt khe với bản thân mới tiến bộ — nhưng thật ra tự mắng thường chỉ làm mình sợ sai hơn, chứ không giúp sửa sai.\n\nBạn có muốn thử một bài tập ngắn tập **nói với mình như nói với bạn thân** không? Chỉ 3 bước. Hoặc bạn chỉ muốn kể thôi cũng được nha.",
      state: { tool: "kind", step: 0, data: {} },
    };
  if (ASK_PRO.test(n)) return { text: MENU };
  if (ANX_TOOLS.test(n))
    return { text: "Có nè 🌿 Hai bài tập hợp nhất khi đang lo:\n• 🫁 **Bài tập thở** — làm dịu cơ thể ngay, hợp lúc tim đập nhanh, run, bồn chồn (gõ “bài tập thở”)\n• 🧺 **Gỡ nỗi lo** — hợp khi đầu cứ lo hoài một chuyện (gõ “gỡ nỗi lo”)\n\nBạn muốn thử bài nào?" };
  if (SAFETY_ASK.test(n)) return safety(1, q, {});
  if (SCREEN_ASK.test(n)) return screen(0, q, {});
  if (CALM_ASK.test(n) && !VN(/\b(đau ngực|tức ngực|ngất|xỉu|méo miệng|yếu (tay|chân|nửa người))\b/).test(n)) return calm(1, q, {});
  if (CBT_ASK.test(n)) return cbt(1, q, {});
  if (ACT_ASK.test(n)) return act(1, q, {});
  if (WORRY_ASK.test(n) && q.trim().split(/\s+/).length <= 16) return worry(1, q, {});
  // Chẳng muốn làm gì cả → đồng cảm, mời chọn một việc thật nhỏ (kích hoạt hành vi).
  if (VN(/\b(chẳng|không|chả|hông) (muốn|thiết|buồn) (làm|động tay vào) (gì|cái gì|việc gì)( cả| hết| luôn| nữa)*\b|\bnằm (cả ngày|suốt ngày|lì cả ngày)\b/).test(n) && q.trim().split(/\s+/).length <= 14)
    return {
      text: "Có những ngày chẳng muốn làm gì cả — người nặng trĩu, việc gì cũng thấy xa. Không phải bạn lười đâu, nhiều khi đó là dấu hiệu mình đang cạn năng lượng 💚\n\nMột điều chuyên gia tâm lý hay hướng dẫn: đừng chờ có động lực, mà bắt đầu từ **một việc thật nhỏ** — động lực thường tới sau. Bạn có muốn cùng Lomi chọn một việc nhỏ cho hôm nay không? Hoặc bạn chỉ muốn kể thôi cũng được.\n\nNếu tình trạng này kéo dài hơn hai tuần, gần như ngày nào cũng vậy, thì nên gặp chuyên gia tâm lý nha.",
      state: { tool: "act", step: 0, data: {} },
    };
  // ("em ngu quá", "lomi vô dụng" là chê Lomi — lớp xã giao đáp xin lỗi)
  // (người dùng đang KỂ về cái thói tự chê — "làm sai việc nhỏ rồi tự kết luận mình là kẻ thất bại" — chủ đề tâm sự có lời đáp riêng)
  if (SELF_LABEL.test(n) && !NOT_SELF.test(n) && !VN(/\btự (kết luận|cho (là|rằng)|nghĩ (là|rằng)|gán|dán nhãn)\b/).test(n) && !VN(/^ (em|e|lomi|mày|m|bot|bạn) (ngu|ngủ|dở|tệ|kém|vô dụng|ngốc|dốt|chán)\b/).test(n) && q.trim().split(/\s+/).length <= 20) {
    // trích đúng câu tự chê, đổi về ngôi "mình": "Sao a thấy mình vô dụng quá" → “Mình vô dụng quá”
    const q1 = q.replace(/^(?:em ơi|lomi ơi|e ơi)[,\s]*/iu, "");
    const at = q1.search(/(?:^|\s)(?:anh|a|em|e|tôi|tui|tớ|tao|mình)\s+(?:(?:cảm\s+)?thấy\s+)?(?:mình\s+)?(?:thật\s+|đúng là\s+|là\s+)?(?:một\s+)?(?:đồ\s+|kẻ\s+|người\s+|đứa\s+)?(?:vô dụng|vô tích sự|vô giá trị|kém cỏi|chẳng ra gì|không ra gì|tệ hại|ngu ngốc|thất bại|bỏ đi)/iu);
    const body = (at >= 0 ? q1.slice(at).trim() : q1).replace(/^(?:sao|tại sao|chắc|hình như|thật sự|nói thật)\s+/iu, "");
    const self = body.replace(/^(?:anh|a|em|e|tôi|tui|tớ|tao|mình)\s+(?:(?:cảm\s+)?thấy\s+)?(?:mình\s+)?/iu, "mình ");
    const t0 = clip(self, 70);
    const thought = t0.charAt(0).toUpperCase() + t0.slice(1);
    return {
      text: `Nghe bạn nói “${thought}” mà Lomi thương ghê 💚 Lúc buồn hay mệt, đầu mình hay nói những câu rất khắt khe như vậy — và mình dễ tin nó là sự thật, dù nhiều khi nó không công bằng với mình chút nào.\n\nBạn có muốn cùng Lomi **soi lại câu này** một chút không? Chuyên gia tâm lý hay làm bài tập này, chỉ mất vài phút. Hoặc bạn chỉ muốn kể thôi cũng được nha.`,
      state: { tool: "cbt", step: 0, data: { thought } },
    };
  }
  return null;
}
