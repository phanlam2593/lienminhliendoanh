// ─────────────────────────────────────────────────────────────────────────────
// BỘ STICKER LOMI (30/09, theo ý Kir — hoài niệm kiểu biểu cảm game online ngày xưa).
// Nhân vật là linh vật Lomi của app, biểu cảm tự vẽ bằng SVG có hoạt ảnh nhẹ, lưu ở public/stickers/lomi/.
// Gửi trong Tin nhắn / Nhóm / Cộng đồng như một tin "gif" (nội dung = đường dẫn ảnh) — không cần sửa DB.
// Trong khung chat với Lomi: người dùng gửi sticker thì Lomi đáp lại bằng sticker + một câu hợp cảm xúc.
// ─────────────────────────────────────────────────────────────────────────────

export type LomiSticker = { id: string; label: string };
export const LOMI_STICKERS: LomiSticker[] = [
  { id: "cuoi", label: "Cười" },
  { id: "haha", label: "Haha" },
  { id: "hihi", label: "Lè lưỡi" },
  { id: "nhaymat", label: "Nháy mắt" },
  { id: "yeu", label: "Yêu quá" },
  { id: "hon", label: "Hôn gió" },
  { id: "ngai", label: "Ngại" },
  { id: "buon", label: "Buồn" },
  { id: "khoc", label: "Khóc" },
  { id: "gian", label: "Giận" },
  { id: "bochoa", label: "Bốc hoả" },
  { id: "ngacnhien", label: "Ngạc nhiên" },
  { id: "so", label: "Sợ" },
  { id: "chongmat", label: "Chóng mặt" },
  { id: "ngu", label: "Ngủ" },
  { id: "chan", label: "Chán" },
  { id: "ngau", label: "Ngầu" },
  { id: "suynghi", label: "Suy nghĩ" },
  { id: "toatmohoi", label: "Toát mồ hôi" },
  { id: "tien", label: "Mê tiền" },
  { id: "metit", label: "Mê tít" },
  { id: "gianxao", label: "Gian xảo" },
  { id: "canloi", label: "Cạn lời" },
  { id: "xin", label: "Xỉn" },
  { id: "om", label: "Ốm" },
  { id: "xiu", label: "Xỉu" },
  { id: "ok", label: "OK" },
  { id: "chao", label: "Xin chào" },
  { id: "camon", label: "Cảm ơn" },
  { id: "doi", label: "Dỗi" },
];

export const stickerUrl = (id: string) => `/stickers/lomi/${id}.svg`;
/** Tin nhắn (gif) này có phải sticker Lomi không — để hiện "Sticker" thay vì "GIF" ở phần xem trước. */
export const isLomiStickerUrl = (url?: string | null) => !!url && /\/stickers\/lomi\/[a-z]+\.svg$/.test(url);

// Khung chat Lomi: tin người dùng gửi sticker lưu dạng "[sticker:id]".
export const stickerToken = (id: string) => `[sticker:${id}]`;
export function parseStickerToken(text: string): string | null {
  const m = text.trim().match(/^\[sticker:([a-z]+)\]$/);
  return m && LOMI_STICKERS.some((s) => s.id === m[1]) ? m[1] : null;
}

type Reply = { s: string; t: string[]; quick?: string[] };
const HAPPY: Reply = { s: "haha", t: ["Hihi, thấy bạn vui là Lomi vui lây 😄", "Vui dữ ta! Có chuyện gì hay kể Lomi nghe với 😆"] };
const LOVE: Reply = { s: "yeu", t: ["Lomi cũng thương bạn nè 💚", "Ui, nhận được tim rồi nha, gửi lại bạn nè 💚"] };
const SAD: Reply = {
  s: "camon",
  t: ["Thương thương 🫂 Có chuyện gì kể Lomi nghe nha.", "Lomi ở đây nè 🫂 Muốn Lomi rút một lá xem thông điệp hôm nay cho nhẹ lòng không?"],
  quick: ["Bói một lá cho hôm nay"],
};
const ANGRY: Reply = { s: "toatmohoi", t: ["Ui bình tĩnh bình tĩnh 😅 Hít một hơi thật sâu… ai làm bạn giận vậy, kể Lomi nghe với!"] };
const DIZZY: Reply = { s: "chongmat", t: ["Nghỉ ngơi xíu nha, uống miếng nước cho tỉnh táo lại 😵‍💫"] };
const BORED: Reply = {
  s: "suynghi",
  t: ["Chán hả? Để Lomi bày trò nè — bốc thăm món ăn hay bói một lá cho vui?"],
  quick: ["Hôm nay ăn gì? 🎲", "Bói một lá cho hôm nay"],
};
export const STICKER_REPLY: Record<string, Reply> = {
  cuoi: { s: "cuoi", t: ["Cười tươi dữ ta 😊 Hôm nay có chuyện vui hả?"] },
  haha: HAPPY,
  hihi: { s: "hihi", t: ["Lè lưỡi lại nè 😝"] },
  nhaymat: { s: "nhaymat", t: ["Nháy mắt gì đó, đang có âm mưu gì hả 😉"] },
  yeu: LOVE,
  hon: LOVE,
  ngai: { s: "hihi", t: ["Có gì đâu mà ngại nè 😆"] },
  buon: SAD,
  khoc: SAD,
  gian: ANGRY,
  bochoa: ANGRY,
  doi: { s: "camon", t: ["Thôi mà, đừng dỗi nữa, Lomi dỗ nè 🥺💚"] },
  ngacnhien: { s: "ngacnhien", t: ["Hả, chuyện gì vậy?! Kể Lomi nghe liền 😲"] },
  so: { s: "toatmohoi", t: ["Đừng sợ, có Lomi ở đây rồi nè 🫂"] },
  chongmat: DIZZY,
  xiu: DIZZY,
  xin: { s: "chongmat", t: ["Xỉn rồi hả 😵 Nhớ gọi xe về nha, đừng tự lái đó!"] },
  ngu: { s: "ngu", t: ["Ngủ ngon nha 🌙 Mơ đẹp, mai gặp lại Lomi nè!"] },
  chan: BORED,
  canloi: BORED,
  ngau: { s: "ngau", t: ["Ngầu dữ ta 😎 Lomi cũng ngầu không kém đâu nha!"] },
  suynghi: { s: "suynghi", t: ["Đang nghĩ gì đó? Hỏi Lomi thử xem, biết đâu Lomi giúp được!"] },
  toatmohoi: { s: "toatmohoi", t: ["Căng vậy sao 😅 Có gì Lomi giúp được không?"] },
  tien: { s: "tien", t: ["Chúc bạn tiền vô như nước, tiền ra nhỏ giọt 💰"] },
  metit: HAPPY,
  gianxao: { s: "gianxao", t: ["Hehe, đang tính gì đó phải không 😏"] },
  om: { s: "camon", t: ["Mau khoẻ nha 🥺 Nhớ uống thuốc, nghỉ ngơi đầy đủ nè!"] },
  ok: { s: "ok", t: ["OK luôn! 👌"] },
  chao: { s: "chao", t: ["Chào bạn nè 👋 Lomi giúp gì được cho bạn hôm nay?"] },
  camon: { s: "cuoi", t: ["Không có gì nè, Lomi luôn sẵn sàng 😊"] },
};
export function stickerReply(id: string): { sticker: string; text: string; quick?: string[] } {
  const r = STICKER_REPLY[id] ?? HAPPY;
  return { sticker: r.s, text: r.t[Math.floor(Math.random() * r.t.length)], quick: r.quick };
}

/** Nhãn xem trước cho tin loại "gif": sticker Lomi hiện "Sticker", còn lại "GIF". */
export const gifLabel = (url?: string | null) => (isLomiStickerUrl(url) ? "🙂 Sticker" : "🎬 GIF");
/** Class ảnh trong bong bóng chat: sticker Lomi nhỏ gọn, không bo góc; GIF giữ như cũ. */
export const gifImgClass = (url?: string | null, extra = "") =>
  isLomiStickerUrl(url) ? `w-28 h-auto ${extra}` : `max-w-[180px] rounded-xl ${extra}`;
