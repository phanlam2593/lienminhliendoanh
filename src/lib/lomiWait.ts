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
    "Hỏi tổng đài 115 có nên cho **nhai aspirin** không — đừng tự cho uống nếu chưa được hướng dẫn hoặc người bệnh dị ứng aspirin",
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
