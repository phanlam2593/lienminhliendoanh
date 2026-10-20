// ─────────────────────────────────────────────────────────────────────────────
// LOMI TÌM CHỖ THẬT (30/09, theo ý Kir) — "quán cà phê nào đang có ưu đãi?", "gần mình có spa không?",
// "hôm nay ăn gì?" → Lomi lấy doanh nghiệp + ưu đãi THẬT trong app (businesses_explore_view, chỉ đọc,
// theo RLS sẵn có) và trả về thẻ bấm được. Có vị trí (người dùng đã cho phép) thì xếp gần trước.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { normalizeVi } from "@/lib/lomiFaq";
import type { BusinessType } from "@/lib/types";
import { VR, VN } from "@/lib/viMatch";

export type PlaceCard = {
  id: string;
  name: string;
  type: BusinessType;
  area?: string | null;
  offer?: string | null;
  offerCount: number;
  rating: number;
  distKm?: number;
  cover?: string | null;
};

type Kind = { re: RegExp; type: BusinessType; names: string[]; noun: string };
// names = chữ không dấu để tìm trong tên doanh nghiệp (name_unaccent)
const KINDS: Kind[] = [
  { re: VN(/\b(cà phê|cafe|coffee|cf)\b/), type: "food", names: ["cafe", "coffee", "ca phe"], noun: "quán cà phê" },
  { re: VN(/\b(trà sữa|trà chanh|milk tea)\b/), type: "food", names: ["tra sua", "tea", "tra"], noun: "quán trà sữa" },
  { re: VN(/\b(bánh|bakery|tiệm bánh)\b/), type: "food", names: ["banh", "bakery"], noun: "tiệm bánh" },
  { re: VN(/\b(lẩu|nướng|bbq)\b/), type: "food", names: ["lau", "nuong", "bbq"], noun: "quán lẩu nướng" },
  { re: VN(/\b(ăn vặt|chè|kem)\b/), type: "food", names: ["an vat", "che", "kem"], noun: "quán ăn vặt" },
  { re: VN(/\b(bar|pub|quán nhậu|bia|nhậu)\b/), type: "food", names: ["bar", "pub", "bia", "nhau"], noun: "quán nhậu" },
  { re: VN(/\b(phở|bún|cơm|mì quảng|hủ tiếu|quán ăn|nhà hàng|đồ ăn|ăn uống|chỗ ăn)\b/), type: "food", names: [], noun: "quán ăn" },
  { re: VN(/\b(spa|massage|gội đầu)\b/), type: "service", names: ["spa", "massage"], noun: "spa" },
  { re: VN(/\b(nail|móng)\b/), type: "service", names: ["nail"], noun: "tiệm nail" },
  { re: VN(/\b(tóc|salon|barber)\b/), type: "service", names: ["toc", "salon", "barber", "hair"], noun: "tiệm tóc" },
  { re: VN(/\b(gym|yoga|phòng tập)\b/), type: "service", names: ["gym", "yoga", "fitness"], noun: "phòng tập" },
  { re: VR(/\b(homestay)\b/), type: "stay", names: ["homestay"], noun: "homestay" },
  { re: VN(/\b(khách sạn|hotel|resort)\b/), type: "stay", names: ["hotel", "khach san", "resort"], noun: "khách sạn" },
  { re: VR(/\b(villa)\b/), type: "stay", names: ["villa"], noun: "villa" },
  { re: VN(/\b(chỗ ở|chỗ nghỉ|lưu trú|phòng nghỉ|nhà nghỉ)\b/), type: "stay", names: [], noun: "chỗ ở" },
  { re: VN(/\b(tour|du lịch)\b/), type: "travel", names: ["tour"], noun: "tour du lịch" },
  { re: VN(/\b(thuê xe|xe máy)\b/), type: "travel", names: ["xe", "thue"], noun: "chỗ thuê xe" },
  { re: VN(/\b(chụp ảnh|photo|studio)\b/), type: "freelance", names: ["photo", "studio", "chup"], noun: "dịch vụ chụp ảnh" },
  { re: VN(/\b(quần áo|thời trang|shop)\b/), type: "shopping", names: ["shop", "fashion"], noun: "shop" },
  { re: VN(/\b(mỹ phẩm|skincare)\b/), type: "shopping", names: ["cosmetic", "my pham"], noun: "shop mỹ phẩm" },
  { re: VN(/\b(hoa tươi|tiệm hoa|shop hoa)\b/), type: "shopping", names: ["hoa", "flower"], noun: "tiệm hoa" },
  { re: VN(/\b(đặc sản)\b/), type: "shopping", names: ["dac san"], noun: "shop đặc sản" },
  { re: VN(/\b(nhà đất|bất động sản|bds|thuê nhà|mua nhà)\b/), type: "broker", names: [], noun: "văn phòng nhà đất" },
];

export type SearchIntent = { mode: "find" | "eat" | "drink" | "go"; kind?: Kind; near: boolean; offer: boolean; /** 10/10: chỉ lấy chỗ trong bán kính này (km) — "giới hạn 5km thôi" */ maxKm?: number; /** 20/10: khu vực người dùng nêu ("Đà Lạt nên đi chơi ở đâu") — chỉ lấy chỗ ở đó */ area?: string };

// 20/10: khu vực người dùng nêu tên → lọc đúng khu vực đó (khớp cột businesses.area). Trước đây "Đà Lạt nên đi chơi
// ở đâu" bị bỏ qua chữ "Đà Lạt" và bốc bừa cả nước → ra một tiệm giặt ủi ở Đà Nẵng cách 459km.
const AREAS: [string, RegExp][] = [
  ["Đà Lạt", /\b(da lat|dalat)\b/],
  ["TP.HCM", /\b(sai gon|saigon|tp ?hcm|hcm|ho chi minh)\b/],
  ["Hà Nội", /\b(ha noi|hanoi)\b/],
  ["Đà Nẵng", /\b(da nang|danang)\b/],
  ["Bảo Lộc", /\bbao loc\b/],
  ["Biên Hòa", /\bbien hoa\b/],
  ["Buôn Ma Thuột", /\b(buon ma thuot|buon me thuot|bmt)\b/],
  ["Cà Mau", /\bca mau\b/],
  ["Cần Thơ", /\bcan tho\b/],
  ["Di Linh", /\bdi linh\b/],
  ["Đơn Dương", /\bdon duong\b/],
  ["Đức Trọng", /\bduc trong\b/],
  ["Lạc Dương", /\blac duong\b/],
  ["Hạ Long", /\bha long\b/],
  ["Hải Phòng", /\bhai phong\b/],
  ["Hội An", /\bhoi an\b/],
  ["Huế", /\b(o|tai|den|ra|ve|vao|tp|thanh pho|di) hue\b/],
  ["Nha Trang", /\bnha trang\b/],
  ["Phú Quốc", /\bphu quoc\b/],
  ["Pleiku", /\bpleiku\b/],
  ["Quy Nhơn", /\bquy nhon\b/],
  ["Sa Pa", /\b(sa pa|sapa)\b/],
  ["Thủ Dầu Một", /\bthu dau mot\b/],
  ["Vinh", /\b(tp|thanh pho) vinh\b/],
  ["Vũng Tàu", /\bvung tau\b/],
];
export function detectArea(text: string): string | undefined {
  const n = ` ${normalizeVi(text)} `;
  return AREAS.find(([, re]) => re.test(n))?.[0];
}
const sameArea = (a: string | null | undefined, b: string) => !!a && normalizeVi(a) === normalizeVi(b);
// "Đi chơi" chỉ lấy chỗ để chơi: tour/thuê xe (travel) + quán (food). Không lấy "service" (giặt ủi, sửa xe, spa…).
const GO_TYPES: BusinessType[] = ["travel", "food"];

/** 10/10: lọc theo bán kính người dùng nói. Có vị trí thì lọc thật; không có thì nói rõ là chưa lọc được. */
function byRadius<T extends { distKm?: number }>(cards: T[], pos: unknown, maxKm?: number): { cards: T[]; note: string } {
  if (!maxKm) return { cards, note: "" };
  const k = Number.isInteger(maxKm) ? String(maxKm) : maxKm.toFixed(1).replace(".", ",");
  if (!pos) return { cards, note: `\n(Lomi chưa biết bạn đang ở đâu nên chưa lọc được trong ${k}km — bật quyền vị trí cho app là Lomi lọc liền nha.)` };
  const inR = cards.filter((c) => c.distKm != null && c.distKm <= maxKm);
  if (inR.length) return { cards: inR, note: `\n(Chỉ lấy chỗ trong khoảng ${k}km quanh bạn.)` };
  return { cards, note: `\n(Chưa thấy chỗ nào trong ${k}km quanh bạn — đây là mấy chỗ gần bạn nhất.)` };
}

// Động từ "tìm" rõ ràng. (Chữ "ưu đãi", "rẻ", "ngon" chỉ là điều kiện lọc, không tự kích hoạt tìm —
// tránh "ưu đãi hết hạn gia hạn được không?" bị hiểu thành đi tìm quán.)
const SEEK =
  VN(/\b(tìm|kiếm|ở đâu|đâu có|gần đây|gần mình|gần nhất|quanh đây|quanh mình|gợi ý|giới thiệu|recommend|muốn đi|muốn ăn|muốn uống|cần tìm|có ai bán|có ai làm)\b/);
const HOWTO = VN(/\b(làm sao|cách|thế nào|như thế nào|hướng dẫn|là gì|tại sao|bao nhiêu điểm|tạo ưu đãi|của tôi|của mình|đã nhận|đã lưu|mã ưu đãi)\b/);

/** Nhận ý "tìm chỗ/ưu đãi thật" hoặc "hôm nay ăn gì". Câu hỏi cách dùng app thì trả null để FAQ lo. */
export function detectSearch(text: string): SearchIntent | null {
  const n = ` ${normalizeVi(text)} `;
  const near = VN(/\b(gần|quanh|lân cận|nearby)\b/).test(n);
  if (VN(/\b(hôm nay ăn gì|ăn gì bây giờ|ăn gì đây|nên ăn gì|trưa nay ăn gì|tối nay ăn gì|sáng nay ăn gì|ăn gì ta|ăn gì giờ|đổi món|món khác|chọn lại quán|quán khác)\b/).test(n))
    return { mode: "eat", near, offer: true };
  if (VN(/\b(uống gì|đi cafe đâu|cafe ở đâu|cà phê ở đâu|uống ở đâu)\b/).test(n)) return { mode: "drink", near, offer: true, kind: KINDS[0] };
  const area = detectArea(text);
  if (VN(/\b(đi đâu chơi|chơi ở đâu|đi đâu bây giờ|cuối tuần đi đâu|đi chơi đâu|có gì chơi|có gì vui|chỗ nào chơi|nơi nào chơi|đi chơi ở|nên đi đâu chơi|tham quan ở đâu|check in ở đâu)\b/).test(n))
    return { mode: "go", near, offer: true, ...(area ? { area } : {}) };
  if (HOWTO.test(n)) return null;
  const strictKind = KINDS.find((k) => k.re.test(n));
  // "ăn/uống" đứng một mình chỉ là đoán — không đủ để hiểu là muốn tìm quán (vd "bác sĩ nào cũng cho thuốc uống không hết").
  const kind = strictKind ?? (VN(/\b(ngon|ăn|uống)\b/).test(n) ? KINDS.find((k) => k.noun === "quán ăn") : undefined);
  const offer = VN(/\b(ưu đãi|khuyến mãi|giảm giá|sale|deal|voucher|rẻ)\b/).test(n);
  const place = VN(/\b(quán|tiệm|shop|cửa hàng|chỗ nào|nơi nào)\b/).test(n);
  const seek =
    SEEK.test(n) ||
    near ||
    (VN(/\b(nào|đâu)\b/).test(n) && (!!strictKind || place)) || // "quán cà phê NÀO đang có ưu đãi"
    (VN(/\bcó\b.*\bkhông\b/).test(n) && !!kind && (offer || place)); // "có spa nào giảm giá không"
  if (!seek) return null;
  if (!kind && !offer && !place) return null;
  return { mode: "find", kind, near, offer, ...(area ? { area } : {}) };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Lấy vị trí nếu người dùng ĐÃ cho phép (không tự bật hộp hỏi quyền, trừ khi họ hỏi "gần mình"). */
async function myPos(ask: boolean): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (st && st.state !== "granted" && !ask) return null;
    if (st && st.state === "denied") return null;
  } catch {
    if (!ask) return null;
  }
  return new Promise((res) => {
    const t = setTimeout(() => res(null), 6000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        res({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        res(null);
      },
      { maximumAge: 10 * 60 * 1000, timeout: 5500 },
    );
  });
}

type Row = {
  id: string; name: string; type: BusinessType; area: string | null; latest_offer: string | null; offer_count: number | null;
  rating: number | null; latitude: number | null; longitude: number | null; cover_url: string | null;
};
const COLS = "id,name,type,area,latest_offer,offer_count,rating,latitude,longitude,cover_url";

async function fetchRows(type: BusinessType | BusinessType[] | undefined, names: string[], offer: boolean, area?: string): Promise<Row[]> {
  const types = type == null ? [] : Array.isArray(type) ? type : [type];
  let q = supabase.from("businesses_explore_view").select(COLS).eq("status", "approved");
  if (types.length === 1) q = q.eq("type", types[0]);
  else if (types.length) q = q.in("type", types);
  if (area) q = q.eq("area", area);
  if (names.length) q = q.or(names.map((k) => `name_unaccent.ilike.%${k.replace(/[,()%]/g, "")}%`).join(","));
  if (offer) q = q.gt("offer_count", 0);
  const { data } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(60);
  // Lọc lại phía máy cho chắc (đúng loại, đúng khu vực) — không bao giờ trả chỗ sai loại / sai khu vực.
  return ((data ?? []) as unknown as Row[]).filter((r) => (!types.length || types.includes(r.type)) && (!area || sameArea(r.area, area)));
}

const toCard = (r: Row, pos: { lat: number; lng: number } | null): PlaceCard => ({
  id: r.id,
  name: r.name,
  type: r.type,
  area: r.area,
  offer: r.latest_offer,
  offerCount: r.offer_count ?? 0,
  rating: Number(r.rating ?? 0),
  cover: r.cover_url,
  distKm: pos && r.latitude != null && r.longitude != null ? haversineKm(pos, { lat: r.latitude, lng: r.longitude }) : undefined,
});

export type SearchResult = { text: string; places: PlaceCard[]; quick: string[] };
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const km = (d?: number) => (d == null ? "" : d < 1 ? ` (cách bạn khoảng ${Math.round(d * 1000 / 50) * 50}m)` : ` (cách bạn khoảng ${d.toFixed(1)}km)`);
/** Ghi chú vị trí cho 1 chỗ: gần (≤50km) thì nói khoảng cách; xa thì nói chỗ đó ở đâu (không khoe "cách 459km"). */
const where = (c: PlaceCard, askedArea?: string) =>
  c.distKm != null && c.distKm <= 50 ? km(c.distKm) : c.area && !(askedArea && sameArea(c.area, askedArea)) ? ` (ở ${c.area})` : "";

export async function runSearch(it: SearchIntent, avoidIds: string[] = []): Promise<SearchResult> {
  const pos = await myPos(it.near);
  // ── Hôm nay ăn gì / uống gì / đi đâu: chọn NGẪU NHIÊN 1 chỗ đang có ưu đãi ──
  if (it.mode !== "find") {
    const type: BusinessType | BusinessType[] = it.mode === "go" ? GO_TYPES : "food";
    let rows = await fetchRows(type, it.kind?.names ?? [], true, it.area);
    if (!rows.length) rows = await fetchRows(type, [], true, it.area);
    const all = rows.map((r) => toCard(r, pos));
    // Đổi chỗ mãi hết chỗ mới → bốc lại từ đầu (vẫn tránh đúng chỗ vừa đưa), thay vì báo "không tìm được".
    let cards = all.filter((c) => !avoidIds.includes(c.id));
    let again = "";
    if (!cards.length && all.length > 1) {
      cards = all.filter((c) => c.id !== avoidIds[avoidIds.length - 1]);
      again = "\n(Lomi gợi ý hết các chỗ đang có ưu đãi rồi, giờ bốc lại từ đầu nha.)";
    }
    // Không nêu khu vực mà có vị trí → chỉ bốc trong các chỗ GẦN anh (≤5km, rồi ≤30km, rồi vài chỗ gần nhất) — không bốc bừa cả nước.
    if (pos && !it.area) {
      const withD = cards.filter((c) => c.distKm != null).sort((a, b) => a.distKm! - b.distKm!);
      const n5 = withD.filter((c) => c.distKm! <= 5);
      const n30 = withD.filter((c) => c.distKm! <= 30);
      if (n5.length) cards = n5;
      else if (n30.length) cards = n30;
      else if (withD.length) cards = withD.slice(0, 8);
    }
    if (!cards.length)
      return {
        text: it.area
          ? `Hic, ở ${it.area} Lomi chưa thấy chỗ nào đang có ưu đãi phù hợp 🥲 Bạn xem thử ở Khám phá (/kham-pha) nha!`
          : "Hic, giờ Lomi chưa tìm được chỗ nào đang có ưu đãi phù hợp 🥲 Bạn xem thử ở Khám phá (/kham-pha) nha!",
        places: [],
        quick: [],
      };
    const c = pick(cards);
    const lead =
      it.mode === "eat"
        ? pick(["Để Lomi chọn giùm cho nè 🎲 Hôm nay thử ghé", "Bốc thăm được rồi! 🍜 Hôm nay mình đi", "Hôm nay đổi gió chút nha, thử"])
        : it.mode === "drink"
          ? pick(["Lomi chọn giùm nè ☕ Ghé", "Uống gì hả? Thử ghé"])
          : it.area
            ? pick([`Đi chơi ${it.area} hả? Lomi gợi ý ghé`, `Ở ${it.area} thì thử ghé`])
            : pick(["Đi chơi hả? Lomi gợi ý ghé", "Cuối tuần thử ghé"]);
    const offer = c.offer ? ` Đang có ưu đãi: “${c.offer}” 🎁` : "";
    return {
      text: `${lead} **${c.name}**${where(c, it.area)} nha!${offer}${again}\nKhông ưng thì bấm “${it.mode === "go" ? "Đổi chỗ khác" : "Đổi món khác"}” để Lomi bốc lại 😄`,
      places: [c],
      quick: [it.mode === "go" ? "Đổi chỗ khác" : "Đổi món khác", "Tìm quán cà phê có ưu đãi", "Tìm quán ăn gần mình"],
    };
  }
  // ── Tìm theo loại / ưu đãi ──
  const k = it.kind;
  let rows = await fetchRows(k?.type, k?.names ?? [], it.offer, it.area);
  if (rows.length < 3 && k?.names.length) {
    const more = await fetchRows(k.type, [], it.offer, it.area);
    rows = rows.concat(more.filter((m) => !rows.some((r) => r.id === m.id)));
  }
  let cards = rows.map((r) => toCard(r, pos));
  if (pos) cards.sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
  else cards.sort((a, b) => b.rating - a.rating || b.offerCount - a.offerCount);
  const rad = byRadius(cards, pos, it.maxKm);
  cards = rad.cards.slice(0, 5);
  const noun = k?.noun ?? "chỗ";
  if (!cards.length)
    return {
      text: `Lomi chưa thấy ${noun} nào ${it.area ? `ở ${it.area} ` : ""}${it.offer ? "đang có ưu đãi " : ""}trong app nè 🥲 Bạn thử tìm ở Khám phá (/kham-pha) với từ khoá khác xem sao nha.`,
      places: [],
      quick: ["Hôm nay ăn gì?", "Tìm quán cà phê có ưu đãi"],
    };
  const how = pos ? "xếp gần bạn nhất trước" : "xếp theo đánh giá cao";
  const at = it.area ? ` ở ${it.area}` : "";
  const intro = pick([
    `Lomi tìm được mấy ${noun}${at}${it.offer ? " đang có ưu đãi" : ""} nè (${how}) 👇`,
    `Có ngay đây! Mấy ${noun}${at}${it.offer ? " đang có ưu đãi" : ""} trong Liên Minh Liên Doanh (${how}):`,
  ]);
  const hint = rad.note || (pos ? "" : it.near ? "\n(Bạn bật quyền vị trí cho app thì Lomi xếp theo khoảng cách được nha.)" : "");
  return {
    text: `${intro}${hint}\nBấm vào thẻ để xem chi tiết và nhận ưu đãi nha. Muốn xem nhiều hơn thì vào Khám phá (/kham-pha).`,
    places: cards,
    quick: ["Hôm nay ăn gì?", k?.type === "food" ? "Tìm spa có ưu đãi" : "Tìm quán cà phê có ưu đãi"],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// "HÔM NAY ĂN GÌ / UỐNG GÌ" KIỂU MỚI (01/10, theo ý Kir): Lomi gợi ý vài MÓN hợp giờ này (Đà Lạt se lạnh)
// → người dùng chọn món → Lomi tìm quán THẬT trong app có món đó (tên / mô tả / ưu đãi).
// ─────────────────────────────────────────────────────────────────────────────
export type Dish = {
  id: string;
  label: string; // có emoji, hiện trên nút
  name: string; // tên món để nói
  keys: string[]; // không dấu — tìm trong tên quán (name_unaccent)
  vi: string[]; // có dấu — tìm trong mô tả / ưu đãi
  re: RegExp; // nhận ra người dùng gõ món này (không dấu)
  when: ("morning" | "noon" | "afternoon" | "evening" | "night")[];
  drink?: boolean;
};

export const DISHES: Dish[] = [
  { id: "pho", label: "🍜 Phở", name: "phở", keys: ["pho"], vi: ["phở"], re: VN(/\bphở\b/), when: ["morning", "noon", "night"] },
  { id: "bunbo", label: "🍜 Bún bò", name: "bún bò", keys: ["bun bo"], vi: ["bún bò"], re: VN(/\bbún bò\b/), when: ["morning", "noon"] },
  { id: "bundau", label: "🍱 Bún đậu", name: "bún đậu mắm tôm", keys: ["bun dau"], vi: ["bún đậu"], re: VN(/\bbún đậu\b/), when: ["noon", "afternoon"] },
  { id: "bun", label: "🍜 Bún các loại", name: "bún", keys: ["bun"], vi: ["bún"], re: VN(/\bbún\b/), when: ["morning", "noon"] },
  { id: "hutieu", label: "🍜 Hủ tiếu", name: "hủ tiếu", keys: ["hu tieu"], vi: ["hủ tiếu"], re: VN(/\bhủ tiếu\b/), when: ["morning", "night"] },
  { id: "miquang", label: "🍜 Mì Quảng", name: "mì Quảng", keys: ["mi quang"], vi: ["mì quảng"], re: VN(/\bmì quảng\b/), when: ["morning", "noon"] },
  { id: "banhcan", label: "🥞 Bánh căn", name: "bánh căn Đà Lạt", keys: ["banh can"], vi: ["bánh căn"], re: VN(/\bbánh căn\b/), when: ["morning", "afternoon", "evening"] },
  { id: "banhmi", label: "🥖 Bánh mì xíu mại", name: "bánh mì (xíu mại)", keys: ["banh mi", "xiu mai"], vi: ["bánh mì", "xíu mại"], re: VN(/\b(bánh mì|xíu mại)\b/), when: ["morning", "night"] },
  { id: "comtam", label: "🍛 Cơm tấm", name: "cơm tấm", keys: ["com tam"], vi: ["cơm tấm"], re: VN(/\bcơm tấm\b/), when: ["morning", "noon", "evening"] },
  { id: "com", label: "🍚 Cơm", name: "cơm", keys: ["com"], vi: ["cơm"], re: VN(/\b(cơm|cơm trưa|cơm văn phòng)\b/), when: ["noon", "evening"] },
  { id: "chao", label: "🥣 Cháo", name: "cháo", keys: ["chao"], vi: ["cháo"], re: VN(/\bcháo (gà|lòng|vịt|hàu|cá|sườn|bò)\b|\băn cháo\b/), when: ["morning", "night"] },
  { id: "lau", label: "🍲 Lẩu gà lá é", name: "lẩu (gà lá é, lẩu bò…)", keys: ["lau"], vi: ["lẩu"], re: VR(/\blau\b/), when: ["evening", "night"] },
  { id: "nuong", label: "🍢 Đồ nướng / BBQ", name: "đồ nướng", keys: ["nuong", "bbq"], vi: ["nướng", "bbq"], re: VN(/\b(nướng|bbq)\b/), when: ["evening", "night"] },
  { id: "banhtrang", label: "🫓 Bánh tráng nướng", name: "bánh tráng nướng / trộn", keys: ["banh trang"], vi: ["bánh tráng"], re: VN(/\bbánh tráng\b/), when: ["afternoon", "evening", "night"] },
  { id: "oc", label: "🐚 Ốc", name: "ốc", keys: ["oc"], vi: ["ốc"], re: VN(/\b(ăn ốc|quán ốc|ốc)\b/), when: ["evening", "night"] },
  { id: "banhxeo", label: "🥘 Bánh xèo", name: "bánh xèo", keys: ["banh xeo"], vi: ["bánh xèo"], re: VN(/\bbánh xèo\b/), when: ["afternoon", "evening"] },
  { id: "ga", label: "🍗 Gà rán / gà nướng", name: "gà", keys: ["ga "], vi: ["gà"], re: VN(/\b(gà rán|gà nướng|cơm gà|gà)\b/), when: ["noon", "evening"] },
  { id: "pizza", label: "🍕 Pizza / đồ Tây", name: "pizza, đồ Âu", keys: ["pizza", "steak", "burger"], vi: ["pizza", "bò bít tết"], re: VN(/\b(pizza|steak|burger|đồ tây|mì ý|spaghetti)\b/), when: ["noon", "evening"] },
  { id: "anvat", label: "🍡 Ăn vặt", name: "đồ ăn vặt", keys: ["an vat"], vi: ["ăn vặt"], re: VN(/\băn vặt\b/), when: ["afternoon", "night"] },
  { id: "che", label: "🍧 Chè / kem", name: "chè, kem", keys: ["che", "kem"], vi: ["chè", "kem"], re: VN(/\b(ăn chè|chè|kem)\b/), when: ["afternoon", "evening"] },
  // Đồ uống
  { id: "cafe", label: "☕ Cà phê", name: "cà phê", keys: ["cafe", "coffee", "ca phe"], vi: ["cà phê", "cafe", "coffee"], re: VN(/\b(cà phê|cafe|cf|coffee)\b/), when: ["morning", "noon", "afternoon"], drink: true },
  { id: "trasua", label: "🧋 Trà sữa", name: "trà sữa", keys: ["tra sua"], vi: ["trà sữa"], re: VN(/\btrà sữa\b/), when: ["afternoon", "evening"], drink: true },
  { id: "tra", label: "🍵 Trà / trà trái cây", name: "trà", keys: ["tra"], vi: ["trà"], re: VN(/\b(trà chanh|trà trái cây|trà đào|uống trà)\b/), when: ["noon", "afternoon"], drink: true },
  { id: "daunanh", label: "🥛 Sữa đậu nành nóng", name: "sữa đậu nành nóng", keys: ["dau nanh"], vi: ["đậu nành"], re: VN(/\b(đậu nành|sữa đậu)\b/), when: ["evening", "night"], drink: true },
  { id: "sinhto", label: "🥤 Sinh tố / nước ép", name: "sinh tố, nước ép", keys: ["sinh to", "nuoc ep", "juice"], vi: ["sinh tố", "nước ép"], re: VN(/\b(sinh tố|nước ép|juice)\b/), when: ["noon", "afternoon"], drink: true },
  { id: "cacao", label: "🍫 Ca cao nóng", name: "ca cao / sô-cô-la nóng", keys: ["cacao", "ca cao", "chocolate"], vi: ["ca cao", "cacao"], re: VN(/\b(ca cao|cacao|socola nóng|chocolate)\b/), when: ["evening", "night", "morning"], drink: true },
  { id: "bia", label: "🍻 Bia / quán nhậu", name: "bia, đồ nhậu", keys: ["bia", "nhau", "pub", "bar"], vi: ["bia", "nhậu"], re: VN(/\b(bia|nhậu|quán nhậu)\b/), when: ["evening", "night"], drink: true },
];

function partNow(h = new Date().getHours()): Dish["when"][number] {
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 14) return "noon";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}
const PART_VI: Record<Dish["when"][number], string> = {
  morning: "Sáng sớm Đà Lạt se lạnh",
  noon: "Trưa rồi",
  afternoon: "Chiều chiều",
  evening: "Tối rồi, trời lạnh lạnh",
  night: "Khuya rồi",
};

/** Người dùng gõ / bấm tên một món ("🍜 Phở", "ăn phở", "quán lẩu nào ngon"). */
export function detectDish(text: string): Dish | undefined {
  const t = text.trim();
  const byLabel = DISHES.find((d) => d.label === t);
  if (byLabel) return byLabel;
  const n = ` ${normalizeVi(t)} `;
  // 08/10: "phô mai", "phố đi bộ" bỏ dấu cũng ra "pho" — gõ CÓ DẤU mà không phải "phở" thì không tính là món phở
  // (gõ không dấu "pho" vẫn hiểu là phở như trước).
  const notPho = VR(/(?<![\p{L}])ph[ôốồổỗộóòỏõọ](?![\p{L}])/u).test(t.normalize("NFC").toLowerCase()) && !VR(/phở/iu).test(t.normalize("NFC"));
  return DISHES.find((d) => d.re.test(n) && !(d.id === "pho" && notPho));
}

/** Gợi ý 3 món hợp giờ này (tránh lặp món vừa gợi ý). drink = đang hỏi "uống gì". */
export function suggestDishes(drink: boolean, avoid: string[] = []): { text: string; dishes: Dish[]; quick: string[] } {
  const part = partNow();
  const pool = DISHES.filter((d) => !!d.drink === drink && !avoid.includes(d.id));
  const fit = pool.filter((d) => d.when.includes(part));
  const rest = pool.filter((d) => !d.when.includes(part));
  const shuffled = [...fit].sort(() => Math.random() - 0.5).concat([...rest].sort(() => Math.random() - 0.5));
  const dishes = (shuffled.length >= 3 ? shuffled : [...DISHES.filter((d) => !!d.drink === drink)].sort(() => Math.random() - 0.5)).slice(0, 3);
  const names = dishes.map((d) => `**${d.name.charAt(0).toUpperCase() + d.name.slice(1)}**`);
  const text = drink
    ? pick([
        `${PART_VI[part]}, uống gì cho đã nè 😋 Lomi gợi ý: ${names.join(", ")}. Bạn thích món nào? Chọn một cái, Lomi tìm quán có món đó cho liền!`,
        `Khát rồi hả 🥤 Giờ này hợp nhất là ${names.join(", ")} nè. Bấm món bạn thích, Lomi kiếm quán giùm nha!`,
      ])
    : pick([
        `${PART_VI[part]}, ăn gì cho ấm bụng nè 🤤 Lomi gợi ý: ${names.join(", ")}. Bạn thèm món nào? Chọn một món, Lomi tìm quán có món đó cho nha!`,
        `Để Lomi nghĩ giùm nè 🎲 Giờ này hợp nhất là ${names.join(", ")}. Bạn chọn món nào, Lomi tìm quán ngon có món đó liền!`,
        `Hôm nay thử đổi vị nha 😋 ${names.join(", ")} — món nào làm bạn thèm nhất? Bấm chọn, Lomi tìm quán cho!`,
      ]);
  return { text, dishes, quick: [...dishes.map((d) => d.label), drink ? "🎲 Đồ uống khác" : "🎲 Món khác"] };
}

/** Điều kiện thêm khi người dùng nói tiếp sau kết quả tìm quán ("gần mình", "có ưu đãi không?", "yên tĩnh") — lib/lomiConvo. */
export type DishWant = { text?: string; offer?: boolean; near?: boolean; maxKm?: number };

/**
 * Tìm quán THẬT có món này (tên quán, mô tả hoặc ưu đãi). avoidIds = quán đã gợi ý (bấm "Quán khác").
 * want (08/10) = điều kiện thêm: lọc theo quán đang có ưu đãi / theo chữ người dùng muốn ("yên tĩnh") có trong tên, mô tả,
 * ưu đãi hoặc đánh giá mới nhất của quán. Không có quán nào khớp thì NÓI THẬT rồi vẫn đưa các quán có món đó.
 */
export async function runDishSearch(d: Dish, avoidIds: string[] = [], want?: DishWant): Promise<SearchResult> {
  const pos = await myPos(!!want?.near);
  const clean = (x: string) => x.replace(/[,()%]/g, "").trim();
  // Tìm theo tên CÓ DẤU ("Phở" ≠ "Phố" — bỏ dấu thì trùng nhau); chỉ dùng tên không dấu cho từ khoá
  // nhiều chữ, không lẫn được (vd "bun bo", "banh mi").
  const ors = [
    ...d.vi.map((k) => `name.ilike.%${clean(k)}%`),
    ...d.keys.filter((k) => clean(k).includes(" ")).map((k) => `name_unaccent.ilike.%${clean(k)}%`),
    ...d.vi.map((k) => `description.ilike.%${clean(k)}%`),
    ...d.vi.map((k) => `latest_offer.ilike.%${clean(k)}%`),
  ].join(",");
  const { data } = await supabase
    .from("businesses_explore_view")
    .select(want?.text ? `${COLS},description,latest_review_comment` : COLS)
    .eq("status", "approved")
    .eq("type", "food")
    .or(ors)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(40);
  type WRow = Row & { description?: string | null; latest_review_comment?: string | null };
  let rows = ((data ?? []) as unknown as WRow[]).filter((r) => !avoidIds.includes(r.id));
  // Điều kiện thêm: lọc được thì ghi rõ đã lọc theo gì (met); không quán nào khớp thì ghi lại (miss) để nói thật.
  const met: string[] = [];
  const miss: string[] = [];
  if (want?.offer) {
    const f = rows.filter((r) => (r.offer_count ?? 0) > 0);
    if (f.length) {
      rows = f;
      met.push("đang có ưu đãi");
    } else if (rows.length) miss.push("đang có ưu đãi");
  }
  if (want?.text) {
    const k = normalizeVi(want.text);
    const f = rows.filter((r) => normalizeVi(`${r.name} ${r.description ?? ""} ${r.latest_offer ?? ""} ${r.latest_review_comment ?? ""}`).includes(k));
    if (f.length) {
      rows = f;
      met.push(`có nhắc “${want.text}”`);
    } else if (rows.length) miss.push(`ghi rõ “${want.text}” trong mô tả hay đánh giá`);
  }
  let cards = rows.map((r) => toCard(r, pos));
  // Tên nhóm món có thể là "pizza, đồ Âu" / "lẩu (gà lá é, lẩu bò…)" — nói với người dùng chỉ dùng tên món chính.
  const main = d.name.split(/[,(]/)[0].trim();
  const nm = main.charAt(0).toUpperCase() + main.slice(1);
  if (!cards.length) {
    // Không có quán nào có đúng món → nói thật, gợi ý vài quán ăn/uống khác đang có ưu đãi.
    const rows = await fetchRows("food", [], true);
    const others = rows.map((r) => toCard(r, pos)).filter((c) => !avoidIds.includes(c.id)).sort(() => Math.random() - 0.5).slice(0, 3);
    return {
      text: avoidIds.length
        ? `Lomi hết quán có **${nm}** để gợi ý rồi 😅 Thử mấy quán khác đang có ưu đãi nè 👇`
        : `Hic, trong Liên Minh Liên Doanh chưa có quán nào ghi rõ món **${nm}** 🥲 Lomi gợi ý tạm mấy quán ${d.drink ? "nước" : "ăn"} đang có ưu đãi nha 👇`,
      places: others,
      quick: [d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"],
    };
  }
  const rad = byRadius(cards, pos, want?.maxKm);
  cards = rad.cards;
  if (pos) {
    cards.sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
    cards = cards.slice(0, 6).sort(() => Math.random() - 0.5);
  } else cards = cards.slice(0, 8).sort(() => Math.random() - 0.5);
  cards = cards.slice(0, 3);
  if (want && (met.length || miss.length || want.near)) {
    const nearNote = rad.note || (want.near ? (pos ? " (xếp gần bạn trước)" : "\n(Bạn bật quyền vị trí cho app thì Lomi xếp theo khoảng cách được nha.)") : "");
    return {
      text: miss.length
        ? `Lomi chưa thấy quán **${nm}** nào ${miss.join(", ")} 🥲 Đây là mấy quán ${nm} khác${met.length ? ` ${met.join(", ")}` : ""}, bạn xem thử nha 👇${nearNote}`
        : `Mấy quán **${nm}**${met.length ? ` ${met.join(", ")}` : ""} nè 👇${nearNote}`,
      places: cards,
      quick: ["🔁 Quán khác", d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"],
    };
  }
  return {
    text: pick([
      `Thèm **${nm}** hả, có ngay đây 😋 Mấy quán trong Liên Minh Liên Doanh nè 👇`,
      `Chuẩn bài luôn! Đi ăn **${nm}** thì ghé mấy chỗ này nha 🤤`,
      `Lomi tìm được mấy quán có **${nm}** nè${pos ? " (gần bạn)" : ""} 👇 Bấm vào thẻ để xem chi tiết và nhận ưu đãi nha!`,
    ]),
    places: cards,
    quick: ["🔁 Quán khác", d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"],
  };
}
