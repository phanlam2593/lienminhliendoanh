// 21/11 (ChatGPT chấm bộ 50 đoạn, #40–#43): việc cần làm TRONG LÚC CHỜ cấp cứu, soạn gọn theo từng tình huống
//   (trước: ghép nhiều câu từ thẻ bệnh nên tư thế phản vệ bị mâu thuẫn; ngộ độc thiếu "không gây nôn, mang theo chai";
//   đột quỵ thiếu "ghi giờ bắt đầu"). Nội dung theo NHS (Anh): Anaphylaxis, Stroke, Poisoning, Heart attack.
//   Không nêu liều thuốc (quy tắc #62) — aspirin chỉ nói "hỏi tổng đài".

export type EmKind = "anaphylaxis" | "stroke" | "poison" | "chest";

export function emKindOf(thread: string): EmKind | null {
  const t = thread.toLowerCase();
  if (/phản vệ|sưng (môi|lưỡi|họng)|môi (\S+ )?sưng|dị ứng (nặng|hạt|tôm|đậu phộng)/u.test(t)) return "anaphylaxis";
  if (/đột quỵ|méo miệng|mặt (\S+ )?xệ|nói không rõ|nói ngọng|yếu (nửa|một bên)|tay (\S+ ){0,2}yếu/u.test(t)) return "stroke";
  if (/ngộ độc|chất độc|tẩy rửa|tẩy bồn cầu|hoá chất|hóa chất|thuốc tẩy|nước tẩy|uống nhầm|nuốt nhầm|thuốc chuột|thuốc trừ sâu/u.test(t)) return "poison";
  if (/đau tim|đau ngực|tức ngực|nhói ngực|đè ngực/u.test(t)) return "chest";
  return null;
}

const LISTS: Record<EmKind, string[]> = {
  anaphylaxis: [
    "Có **bút tiêm adrenaline** (như EpiPen) thì tiêm ngay vào **mặt ngoài đùi**, làm theo hướng dẫn in trên bút; sau **5 phút** chưa đỡ mà có bút thứ hai thì tiêm tiếp",
    "Cho **nằm xuống, kê cao chân**; **nếu khó thở thì cho ngồi dậy** cho dễ thở; người mang thai nằm nghiêng bên trái",
    "**Không đứng dậy hay đi lại**, kể cả khi thấy đỡ hơn",
    "Không cho ăn uống hay uống thuốc gì bằng miệng khi đang khó thở; nôn thì xoay nằm nghiêng",
    "Ngừng thở, không phản ứng → **làm theo hướng dẫn của tổng đài 115** (ép tim)",
  ],
  stroke: [
    "**Ghi lại giờ bắt đầu có dấu hiệu** (hoặc lần cuối thấy còn bình thường) — báo cho đội cấp cứu, rất quan trọng để chọn cách điều trị",
    "**Không cho ăn uống gì** — người bị đột quỵ có thể khó nuốt, dễ sặc",
    "Không tự cho uống thuốc (kể cả thuốc huyết áp, aspirin)",
    "**Không tự chở bằng xe máy / tự lái** — chờ xe cấp cứu",
    "Cho nằm / ngồi chỗ an toàn, nới quần áo chật; nôn hay lơ mơ thì cho nằm nghiêng",
  ],
  poison: [
    "**Không cố làm cho nôn**, không cho uống sữa, nước chanh hay thứ gì để “trung hoà”",
    "Không cho ăn uống gì nếu tổng đài chưa dặn",
    "**Mang theo chai / bao bì sản phẩm** (hoặc chụp rõ nhãn) để báo đội cấp cứu đã uống chất gì, khoảng bao nhiêu, lúc mấy giờ",
    "Hoá chất dính da, mắt, miệng → rửa / súc bằng **nhiều nước sạch**",
    "Có người ở cạnh; lơ mơ hay nôn thì cho nằm nghiêng; ngừng thở → làm theo hướng dẫn của tổng đài 115",
  ],
  chest: [
    "Cho **ngồi nghỉ yên** ở tư thế dễ chịu (thường là ngồi tựa lưng, co gối), **không đứng dậy đi lại**, không tự lái xe",
    "Nới quần áo chật, để chỗ thoáng",
    "**Không tự cho uống thuốc gì** — làm đúng theo hướng dẫn của nhân viên tổng đài 115",
    "Ngất, ngừng thở, không phản ứng → **làm theo hướng dẫn ép tim của tổng đài 115**",
  ],
};

const SRC: Record<EmKind, string> = {
  anaphylaxis: "NHS (Anh) — Anaphylaxis",
  stroke: "NHS (Anh) — Stroke: symptoms",
  poison: "NHS (Anh) — Poisoning",
  chest: "NHS (Anh) — Heart attack",
};

export function waitList(kind: EmKind): string {
  return LISTS[kind].map((t) => `• ${t}`).join("\n") + `\n\n_Nguồn: ${SRC[kind]}._`;
}

// 22/11 (ChatGPT chấm lần 2, #40–#43): câu mở đầu riêng từng tình huống — không kể lẫn đột quỵ / đau tim / phản vệ / ngộ độc vào một câu.
const HEAD: Record<EmKind, string> = {
  poison: "Uống nhầm **chất tẩy rửa / hoá chất** thì **đừng chờ tới sáng** — gọi **115** ngay (hoặc nhờ người gần nhất gọi giúp), nói rõ đã uống chất gì. **Kể cả khi giờ chỉ hơi rát cổ** — hoá chất có thể gây bỏng miệng, họng, đừng dựa vào cảm giác lúc này để đoán là không sao.",
  stroke: "Nói không rõ chữ, một bên mặt xệ là dấu hiệu **có thể là đột quỵ** — gọi **115** ngay, **đừng chờ thêm**. **Kể cả khi đã đỡ** — đó có thể là cơn thiếu máu não thoáng qua (TIA), vẫn cần cấp cứu; điều trị đột quỵ càng sớm càng tốt.",
  anaphylaxis: "Sưng môi, ho, khó thở sau khi ăn là dấu hiệu **có thể là sốc phản vệ** — gọi **115** ngay, **đừng chờ xem có đỡ không**. **Kể cả khi đã đỡ** — triệu chứng có thể quay lại, nên thường cần theo dõi ở bệnh viện vài giờ.",
  chest: "Đau ngực, tức ngực mà chưa rõ nguyên nhân thì **đừng chờ theo dõi ở nhà** — gọi **115** ngay. **Kể cả khi người bệnh nói đã đỡ** — với tim, cơn đau có thể quay lại, và được khám càng sớm càng tốt.",
};
export function emHead(k: EmKind): string { return HEAD[k]; }
