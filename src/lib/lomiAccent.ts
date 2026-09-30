// ─────────────────────────────────────────────────────────────────────────────
// ƯU TIÊN SÁT NGHĨA KHI CÓ DẤU (01/10, theo ý Kir): các thư viện Lomi so khớp trên chữ bỏ dấu, nên "đâu đâu"
// bị hiểu thành "đau đầu", "tìm" thành "tim", "chồng" thành "chóng (mặt)", "buôn bán" thành "buồn"…
// normStrict(): người dùng gõ CÓ DẤU mà chữ đó mang nghĩa khác với nghĩa thư viện cần → đổi thành chữ lạ
// (vd "đâu" → "daux") để không khớp nhầm. Gõ không dấu thì giữ nguyên như cũ (không đoán được nghĩa).
// Mỗi thư viện một bảng: chữ bỏ dấu → các cách viết có dấu ĐÚNG NGHĨA thư viện đó dùng.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";

type Table = Record<string, string[]>;

/** Sức khoẻ (triệu chứng, kiến thức sức khoẻ, kiêng ăn uống). */
export const HEALTH: Table = {
  dau: ["đau", "đầu", "dấu", "đậu"], // đâu, dâu, dầu, đấu… ≠ đau/đầu ("đậu" giữ cho "thuỷ đậu", "đậu phộng")
  ho: ["ho"], // họ, hồ, hổ, hộ, hò
  sot: ["sốt"], // sót, sọt
  tim: ["tim"], // tìm
  chong: ["chóng"], // chồng, chống
  buon: ["buồn"], // buôn (bán)
  nhuc: ["nhức"], // nhục
  oi: ["ói"], // ơi, ôi, ổi, ối
  non: ["nôn"], // non, nón
  ngua: ["ngứa"], // ngựa
  met: ["mệt"], // mét
  ngu: ["ngủ", "ngu"], // ngũ, ngư, ngừ
  lanh: ["lạnh"], // lành, lãnh
  nong: ["nóng"], // nông, nồng
  so: ["sợ", "sọ"], // số, sổ, sở, sò
  lo: ["lo", "lơ"], // lò, lọ, lộ, lỗ, lố
  an: ["ăn", "an"], // ấn, ẩn, án, ân
  gian: ["giận", "giãn"], // giản (đơn giản), gián, giàn
  chan: ["chán", "chân"], // chăn, chắn, chặn
  mun: ["mụn"], // mùn
  nguc: ["ngực"], // ngục
  ngat: ["ngạt", "ngất"], // ngát
};

/** Tâm lý – tình cảm – tâm sự. */
export const HEART: Table = {
  dau: ["đau", "đầu", "dấu"],
  buon: ["buồn"],
  so: ["sợ", "sọ"],
  lo: ["lo", "lơ"],
  oi: ["ói", "ôi"], // ơi, ổi, ối
  gian: ["giận", "giãn"],
  chan: ["chán", "chân"],
  nhuc: ["nhức"],
  ngu: ["ngủ", "ngu"],
  met: ["mệt"],
  sot: ["sốt"],
  non: ["nôn"],
  ngua: ["ngứa"],
};

/** Tư vấn kinh doanh / ưu đãi. */
export const BIZ: Table = {
  buon: ["buôn"], // buồn
  gia: ["giá"], // giả, già
};

const WORD = /[\p{L}\p{M}]+/gu;
const HAS_MARK = /[^\u0000-\u007f]/;

/** normalizeVi() nhưng chữ có dấu mang nghĩa khác bảng → đổi thành "<chữ>x" để không khớp nhầm. */
export function normStrict(text: string, table: Table): string {
  const t = text.normalize("NFC").toLowerCase();
  if (!HAS_MARK.test(t)) return normalizeVi(t);
  const fixed = t.replace(WORD, (w) => {
    if (!HAS_MARK.test(w)) return w;
    const bare = normalizeVi(w);
    const ok = table[bare];
    return ok && !ok.includes(w) ? `${bare}x` : w;
  });
  return normalizeVi(fixed);
}
