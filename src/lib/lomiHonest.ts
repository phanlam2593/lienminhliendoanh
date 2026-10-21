// ─────────────────────────────────────────────────────────────────────────────
// NÓI THẬT GIỚI HẠN (21/10, QA V2 Q46, Q48, Q49) — người dùng đòi Lomi cam kết chắc chắn, chẩn đoán qua ảnh, hay đưa
// "nghiên cứu chứng minh chữa khỏi hoàn toàn". Trước đây: "Thương anh ghê 🥺 nghỉ ngơi nhiều…", "Lomi ở đây với bạn nè",
// "Ừ, em nghe nè 🥺 Chuyện sao vậy anh?". Lomi không cam kết điều không biết, không chẩn đoán qua ảnh, không bịa nguồn.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";
import { VN } from "@/lib/viMatch";

const CERTAIN = VN(/\b((chắc chắn|cam đoan|đảm bảo|khẳng định)( \S+){0,2} (100|trăm phần trăm|một trăm)( %| phần trăm)?|(chắc chắn|cam đoan|đảm bảo|khẳng định) (là |rằng )?(anh|em|tôi|mình|tui|a|e|chị|con|bé|mẹ|ba|bố)? ?(không bị|không phải|bị|không có))\b/);
const HEALTHY = VN(/\b(bệnh|ung thư|tim|gan|thận|phổi|tiểu đường|huyết áp|đột quỵ|khối u|nhiễm|lây|có thai|mang thai)\b/);
const PHOTO = VN(/\b(gửi|xem|nhìn|coi|chụp)( \S+){0,2} (ảnh|hình|hình ảnh)\b|\b(ảnh|hình)( \S+){0,6} (xác định|chẩn đoán|bệnh gì|là gì|bị gì)\b/);
const SKINISH = VN(/\b(nốt|mụn|vết|mẩn|ban|đốm|da|nốt ruồi|sưng|vết thương)\b/);
const CURE_SRC = VN(/\b(nguồn|nghiên cứu|bài báo|tài liệu|bằng chứng|doi|link)\b.*\b(chữa khỏi|khỏi hoàn toàn|chữa dứt|trị dứt|đặc trị)\b|\b(chữa khỏi|khỏi hoàn toàn|chữa dứt|trị dứt)\b.*\b(nguồn|nghiên cứu|bằng chứng)\b/);

export function honestReply(text: string): string | null {
  const n = ` ${normalizeVi(text)} `;
  if (CERTAIN.test(n) && HEALTHY.test(n))
    return (
      "Lomi không thể chắc chắn 100% được — và thật lòng thì không ai khẳng định được qua tin nhắn, kể cả bác sĩ cũng cần khám, đo, làm xét nghiệm mới kết luận.\n\n" +
      (VN(/\btim\b/).test(n)
        ? "Nếu đang lo về tim:\n• Gọi **115** ngay khi có **đau / tức ngực, khó thở, vã mồ hôi, ngất, đau lan ra tay, hàm**\n• Không có mấy dấu hiệu đó mà vẫn lo → khám Tim mạch (bác sĩ thường cho đo điện tim, siêu âm tim, xét nghiệm) là cách duy nhất để yên tâm thật\n\n"
        : "Muốn yên tâm thật thì đi khám đúng chuyên khoa — bác sĩ mới đủ dữ liệu để nói chắc.\n\n") +
      "Bạn đang có triệu chứng gì làm bạn lo vậy?"
    );
  if (PHOTO.test(n) && SKINISH.test(n))
    return (
      "Lomi **không xác định chính xác được bệnh qua ảnh** đâu — kể cả bác sĩ da liễu xem ảnh cũng thường phải hỏi thêm và khám trực tiếp, vì nhiều bệnh da nhìn rất giống nhau.\n\n" +
      "Bạn mô tả giúp Lomi vài điều để biết mức độ cần đi khám:\n• Xuất hiện bao lâu rồi, có to ra / lan rộng không?\n• Có ngứa, đau, chảy dịch hay chảy máu không?\n• Có sốt, mệt kèm theo không?\n\n" +
      "⚠️ Đi khám ngay nếu vết đỏ **lan nhanh, sưng nóng đau**, kèm **sốt**, hoặc nổi mẩn kèm **khó thở, sưng môi / mặt** (gọi **115**). Nốt ruồi đổi màu, to nhanh, bờ nham nhở hay chảy máu → khám Da liễu sớm."
    );
  if (CURE_SRC.test(n))
    return (
      "Lomi **không bịa nguồn** đâu — Lomi không có nghiên cứu nào để đưa, và sẽ không tự đặt ra tên bài báo, DOI hay đường link cho có.\n\n" +
      "Vài điều nên biết khi đọc về thuốc:\n• Nghiên cứu cho thấy thuốc **có hiệu quả** (giảm triệu chứng, kéo dài thời gian sống…) khác với **chữa khỏi hoàn toàn** — lời quảng cáo \"chữa dứt điểm\" thường là dấu hiệu nên cảnh giác\n• Nguồn đáng tin: hướng dẫn của Bộ Y tế, NHS, WHO, tờ hướng dẫn trong hộp thuốc, hoặc tìm bài trên PubMed / Cochrane\n• Hỏi bác sĩ điều trị: thuốc này kỳ vọng được gì, trong bao lâu, và có bằng chứng nào\n\n" +
      "Bạn cho Lomi biết tên thuốc và bệnh nha — phần nào Lomi có nguồn đã kiểm chứng thì Lomi nói, phần nào không có thì Lomi nói thẳng là không có."
    );
  return null;
}
