// ─────────────────────────────────────────────────────────────────────────────
// ƯU TIÊN SÁT NGHĨA KHI CÓ DẤU (01/10, theo ý Kir): các thư viện Lomi so khớp trên chữ bỏ dấu, nên "đâu đâu"
// bị hiểu thành "đau đầu", "tìm" thành "tim", "chồng" thành "chóng (mặt)", "buôn bán" thành "buồn"…
// normStrict(): người dùng gõ CÓ DẤU mà chữ đó mang nghĩa khác với nghĩa thư viện cần → đổi thành chữ lạ
// (vd "đâu" → "daux") để không khớp nhầm. Gõ không dấu thì giữ nguyên như cũ (không đoán được nghĩa).
// Mỗi thư viện một bảng: chữ bỏ dấu → các cách viết có dấu ĐÚNG NGHĨA thư viện đó dùng.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";

/** w: chữ bỏ dấu → cách viết có dấu đúng nghĩa; p: cụm có dấu hay bị nhầm → đổi thành chữ lạ trước khi so. */
// bare: chữ mà khi cả câu gõ CÓ DẤU đầy đủ, viết không dấu nghĩa là đúng chữ không dấu đó (vd "nhớ nha" = nhớ nhé,
// không phải "nhớ nhà") → cũng đổi thành chữ lạ.
type Table = { w: Record<string, string[]>; p?: [string, string][]; bare?: string[] };

/** Sức khoẻ (triệu chứng, kiến thức sức khoẻ, kiêng ăn uống). */
export const HEALTH: Table = {
  w: {
  dau: ["đau", "đầu", "dấu", "đậu"], // đâu, dâu, dầu, đấu… ≠ đau/đầu ("đậu" giữ cho "thuỷ đậu", "đậu phộng")
  ho: ["ho"], // họ, hồ, hổ, hộ, hò
  sot: ["sốt"], // sót, sọt
  tim: ["tim", "tím"], // tìm  ("tím" = môi tím)
  chong: ["chóng"], // chồng, chống
  buon: ["buồn"], // buôn (bán)
  nhuc: ["nhức"], // nhục
  oi: ["ói"], // ơi, ôi, ổi, ối
  non: ["nôn"], // non, nón
  ngua: ["ngứa"], // ngựa
  met: ["mệt"], // mét
  ngu: ["ngủ", "ngu"], // ngũ, ngư, ngừ
  lanh: ["lạnh", "lành"], // lãnh  ("lành" = lâu lành)
  nong: ["nóng"], // nông, nồng
  so: ["sợ", "sọ", "sổ"], // "sổ" = sổ mũi; // số, sổ, sở, sò
  lo: ["lo", "lơ"], // lò, lọ, lộ, lỗ, lố
  an: ["ăn", "an"], // ấn, ẩn, án, ân
  gian: ["giận", "giãn"], // giản (đơn giản), gián, giàn
  chan: ["chán", "chân"], // chăn, chắn, chặn
  mun: ["mụn"], // mùn
  nguc: ["ngực"], // ngục
  ngat: ["ngạt", "ngất"], // ngát
  do: ["đỏ", "đổ", "do", "đồ", "độ", "đo"], // đỡ (đỡ rồi), đó, dở, dỗ
  hong: ["họng", "hỏng"], // hông (đau hông = hông/thắt lưng) → "hongx"
  mo: ["mổ", "mờ", "mơ", "mỡ", "mô", "mồ", "mộ", "mợ"], // mở
  },
  p: [
    ["mọi người", "moix nguoi"], // "trước mặt mọi người" ≠ mỏi mắt
    ["đỏ mặt", "do matx"],
    ["mới mở", "moi mox"],
    ["vừa mở", "vua mox"],
  ],
};

/** Tâm lý – tình cảm – tâm sự. */
export const HEART: Table = {
  w: {
  dau: ["đau", "đầu", "dấu", "dâu", "đậu"], // đâu ("dâu" = con dâu, "đậu" = thi đậu)
  buon: ["buồn"],
  so: ["sợ", "sọ", "sổ"],
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
  nha: ["nhà"], // "nhớ nha" (nhớ nhé) ≠ nhớ nhà
  ghen: ["ghen"], // ghèn (gỉ mắt)
  },
  p: [
    ["bản thân", "banthan"],
    ["đồ ăn", "dox an"],
    ["họ nhiều", "hox nhieu"],
    ["thuốc là", "thuoc lax"],
    ["đau hông", "dau hongx"],
    ["quán đó", "quan dox"],
  ],
  bare: ["nha"],
};

/** Tư vấn kinh doanh / ưu đãi. */
export const BIZ: Table = {
  w: {
  buon: ["buôn"], // buồn
  gia: ["giá"], // giả, già
  vang: ["vắng"], // vàng
  viet: ["viết"], // Việt
  // 10/10: "liên quan e tự hào" bỏ dấu thành "quan e" = "quán ế" → tưởng hỏi quán vắng khách.
  quan: ["quán"], // quan (liên quan, cơ quan…), quần, quận
  e: ["ế"], // é, è, ê…
  am: ["ẩm"], // ấm, âm
  cham: ["chậm"], // chăm, chấm, chạm
  },
  // câu gõ CÓ DẤU mà các chữ này để trơn thì người dùng gõ đúng như vậy ("liên quan", "e" = em) — không phải "quán", "ế"
  bare: ["quan", "e"],
  p: [
  ],
};

/** Hỏi về app (câu hỏi thường gặp): "chặn" người dùng, "quẹt" — gõ CÓ DẤU thành chữ khác ("đau chân lắm", "quét nhà") thì không phải chuyện app. */
export const APP: Table = {
  w: {
  chan: ["chặn"], // chân, chán, chăn, chắn
  quet: ["quẹt"], // quét
  },
};

const WORD = /[\p{L}\p{M}]+/gu;
const HAS_MARK = /[^\u0000-\u007f]/;

/** Giữ nguyên câu, chỉ đổi những chữ CÓ DẤU mang nghĩa khác bảng thành chữ lạ ("chân" → "chanx") — cho các lớp tự chuẩn hoá bên trong. */
export function maskStrict(text: string, table: Table): string {
  const t = text.normalize("NFC");
  if (!HAS_MARK.test(t)) return text;
  return t.replace(WORD, (w) => {
    const lw = w.toLowerCase();
    if (!HAS_MARK.test(lw)) return w;
    const bare = normalizeVi(lw);
    const ok = table.w[bare];
    return ok && !ok.includes(lw) ? `${bare}x` : w;
  });
}

/** normalizeVi() nhưng chữ có dấu mang nghĩa khác bảng → đổi thành "<chữ>x" để không khớp nhầm. */
export function normStrict(text: string, table: Table): string {
  let t = text.normalize("NFC").toLowerCase();
  if (!HAS_MARK.test(t)) return normalizeVi(t);
  for (const [a, b] of table.p ?? []) t = t.split(a).join(` ${b} `);
  const words = t.match(WORD) ?? [];
  const accented = words.filter((w) => HAS_MARK.test(w)).length * 3 >= words.length;
  const fixed = t.replace(WORD, (w) => {
    if (!HAS_MARK.test(w)) return accented && table.bare?.includes(w) ? `${w}x` : w;
    const bare = normalizeVi(w);
    const ok = table.w[bare];
    return ok && !ok.includes(w) ? `${bare}x` : w;
  });
  return normalizeVi(fixed);
}
