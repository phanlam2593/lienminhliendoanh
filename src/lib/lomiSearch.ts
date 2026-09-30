// ─────────────────────────────────────────────────────────────────────────────
// LOMI TÌM CHỖ THẬT (30/09, theo ý Kir) — "quán cà phê nào đang có ưu đãi?", "gần mình có spa không?",
// "hôm nay ăn gì?" → Lomi lấy doanh nghiệp + ưu đãi THẬT trong app (businesses_explore_view, chỉ đọc,
// theo RLS sẵn có) và trả về thẻ bấm được. Có vị trí (người dùng đã cho phép) thì xếp gần trước.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { normalizeVi } from "@/lib/lomiFaq";
import type { BusinessType } from "@/lib/types";

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
  { re: /\b(ca phe|cafe|coffee|cf)\b/, type: "food", names: ["cafe", "coffee", "ca phe"], noun: "quán cà phê" },
  { re: /\b(tra sua|tra chanh|milk tea)\b/, type: "food", names: ["tra sua", "tea", "tra"], noun: "quán trà sữa" },
  { re: /\b(banh|bakery|tiem banh)\b/, type: "food", names: ["banh", "bakery"], noun: "tiệm bánh" },
  { re: /\b(lau|nuong|bbq)\b/, type: "food", names: ["lau", "nuong", "bbq"], noun: "quán lẩu nướng" },
  { re: /\b(an vat|che|kem)\b/, type: "food", names: ["an vat", "che", "kem"], noun: "quán ăn vặt" },
  { re: /\b(bar|pub|quan nhau|bia|nhau)\b/, type: "food", names: ["bar", "pub", "bia", "nhau"], noun: "quán nhậu" },
  { re: /\b(pho|bun|com|mi quang|hu tieu|quan an|nha hang|do an|an uong|cho an)\b/, type: "food", names: [], noun: "quán ăn" },
  { re: /\b(spa|massage|goi dau)\b/, type: "service", names: ["spa", "massage"], noun: "spa" },
  { re: /\b(nail|mong)\b/, type: "service", names: ["nail"], noun: "tiệm nail" },
  { re: /\b(toc|salon|barber)\b/, type: "service", names: ["toc", "salon", "barber", "hair"], noun: "tiệm tóc" },
  { re: /\b(gym|yoga|phong tap)\b/, type: "service", names: ["gym", "yoga", "fitness"], noun: "phòng tập" },
  { re: /\b(homestay)\b/, type: "stay", names: ["homestay"], noun: "homestay" },
  { re: /\b(khach san|hotel|resort)\b/, type: "stay", names: ["hotel", "khach san", "resort"], noun: "khách sạn" },
  { re: /\b(villa)\b/, type: "stay", names: ["villa"], noun: "villa" },
  { re: /\b(cho o|cho nghi|luu tru|phong nghi|nha nghi)\b/, type: "stay", names: [], noun: "chỗ ở" },
  { re: /\b(tour|du lich)\b/, type: "travel", names: ["tour"], noun: "tour du lịch" },
  { re: /\b(thue xe|xe may)\b/, type: "travel", names: ["xe", "thue"], noun: "chỗ thuê xe" },
  { re: /\b(chup anh|photo|studio)\b/, type: "freelance", names: ["photo", "studio", "chup"], noun: "dịch vụ chụp ảnh" },
  { re: /\b(quan ao|thoi trang|shop)\b/, type: "shopping", names: ["shop", "fashion"], noun: "shop" },
  { re: /\b(my pham|skincare)\b/, type: "shopping", names: ["cosmetic", "my pham"], noun: "shop mỹ phẩm" },
  { re: /\b(hoa tuoi|tiem hoa|shop hoa)\b/, type: "shopping", names: ["hoa", "flower"], noun: "tiệm hoa" },
  { re: /\b(dac san)\b/, type: "shopping", names: ["dac san"], noun: "shop đặc sản" },
  { re: /\b(nha dat|bat dong san|bds|thue nha|mua nha)\b/, type: "broker", names: [], noun: "văn phòng nhà đất" },
];

export type SearchIntent = { mode: "find" | "eat" | "drink" | "go"; kind?: Kind; near: boolean; offer: boolean };

const SEEK =
  /\b(tim|kiem|o dau|dau co|gan day|gan minh|gan nhat|quanh day|quanh minh|co quan nao|quan nao|cho nao|tiem nao|noi nao|goi y|gioi thieu|recommend|review|ngon|re|dang giam|uu dai|khuyen mai|sale|giam gia|muon di|muon an|muon uong|can tim|co ai ban|co ai lam)\b/;
const HOWTO = /\b(lam sao|cach|the nao|nhu the nao|huong dan|la gi|tai sao|bao nhieu diem|tao uu dai|cua toi|cua minh|da nhan|da luu|ma uu dai)\b/;

/** Nhận ý "tìm chỗ/ưu đãi thật" hoặc "hôm nay ăn gì". Câu hỏi cách dùng app thì trả null để FAQ lo. */
export function detectSearch(text: string): SearchIntent | null {
  const n = ` ${normalizeVi(text)} `;
  const near = /\b(gan|quanh|lan can|nearby)\b/.test(n);
  if (/\b(hom nay an gi|an gi bay gio|an gi day|nen an gi|trua nay an gi|toi nay an gi|sang nay an gi|an gi ta|an gi gio|doi mon|mon khac|chon lai quan|quan khac)\b/.test(n))
    return { mode: "eat", near, offer: true };
  if (/\b(uong gi|di cafe dau|cafe o dau|ca phe o dau|uong o dau)\b/.test(n)) return { mode: "drink", near, offer: true, kind: KINDS[0] };
  if (/\b(di dau choi|choi o dau|di dau bay gio|cuoi tuan di dau|di choi dau)\b/.test(n)) return { mode: "go", near, offer: true };
  if (HOWTO.test(n)) return null;
  const kind = KINDS.find((k) => k.re.test(n)) ?? (/\b(ngon|an|uong)\b/.test(n) ? KINDS.find((k) => k.noun === "quán ăn") : undefined);
  const offer = /\b(uu dai|khuyen mai|giam gia|sale|deal|voucher|re)\b/.test(n);
  if (!SEEK.test(n)) return null;
  if (!kind && !offer && !/\b(quan|tiem|cho|shop|cua hang|doanh nghiep)\b/.test(n)) return null;
  return { mode: "find", kind, near, offer };
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

async function fetchRows(type: BusinessType | undefined, names: string[], offer: boolean): Promise<Row[]> {
  let q = supabase.from("businesses_explore_view").select(COLS).eq("status", "approved");
  if (type) q = q.eq("type", type);
  if (names.length) q = q.or(names.map((k) => `name_unaccent.ilike.%${k.replace(/[,()%]/g, "")}%`).join(","));
  if (offer) q = q.gt("offer_count", 0);
  const { data } = await q.order("rating", { ascending: false, nullsFirst: false }).limit(60);
  return (data ?? []) as unknown as Row[];
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

export async function runSearch(it: SearchIntent, avoidIds: string[] = []): Promise<SearchResult> {
  const pos = await myPos(it.near);
  // ── Hôm nay ăn gì / uống gì / đi đâu: chọn NGẪU NHIÊN 1 chỗ đang có ưu đãi ──
  if (it.mode !== "find") {
    const type: BusinessType = it.mode === "go" ? pick(["travel", "food", "service"] as BusinessType[]) : "food";
    let rows = await fetchRows(type, it.kind?.names ?? [], true);
    if (!rows.length) rows = await fetchRows(type, [], true);
    let cards = rows.map((r) => toCard(r, pos)).filter((c) => !avoidIds.includes(c.id));
    if (pos) {
      const nearBy = cards.filter((c) => c.distKm != null && c.distKm <= 5);
      if (nearBy.length) cards = nearBy;
    }
    if (!cards.length)
      return { text: "Hic, giờ Lomi chưa tìm được chỗ nào đang có ưu đãi phù hợp 🥲 Bạn xem thử ở Khám phá (/kham-pha) nha!", places: [], quick: [] };
    const c = pick(cards);
    const lead =
      it.mode === "eat"
        ? pick(["Để Lomi chọn giùm cho nè 🎲 Hôm nay thử ghé", "Bốc thăm được rồi! 🍜 Hôm nay mình đi", "Hôm nay đổi gió chút nha, thử"])
        : it.mode === "drink"
          ? pick(["Lomi chọn giùm nè ☕ Ghé", "Uống gì hả? Thử ghé"])
          : pick(["Đi chơi hả? Lomi gợi ý ghé", "Cuối tuần thử ghé"]);
    const offer = c.offer ? ` Đang có ưu đãi: “${c.offer}” 🎁` : "";
    return {
      text: `${lead} **${c.name}**${km(c.distKm)} nha!${offer}\nKhông ưng thì bấm “Đổi chỗ khác” để Lomi bốc lại 😄`,
      places: [c],
      quick: [it.mode === "go" ? "Đổi chỗ khác" : "Đổi món khác", "Tìm quán cà phê có ưu đãi", "Tìm quán ăn gần mình"],
    };
  }
  // ── Tìm theo loại / ưu đãi ──
  const k = it.kind;
  let rows = await fetchRows(k?.type, k?.names ?? [], it.offer);
  if (rows.length < 3 && k?.names.length) {
    const more = await fetchRows(k.type, [], it.offer);
    rows = rows.concat(more.filter((m) => !rows.some((r) => r.id === m.id)));
  }
  let cards = rows.map((r) => toCard(r, pos));
  if (pos) cards.sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
  else cards.sort((a, b) => b.rating - a.rating || b.offerCount - a.offerCount);
  cards = cards.slice(0, 5);
  const noun = k?.noun ?? "chỗ";
  if (!cards.length)
    return {
      text: `Lomi chưa thấy ${noun} nào ${it.offer ? "đang có ưu đãi " : ""}trong app nè 🥲 Bạn thử tìm ở Khám phá (/kham-pha) với từ khoá khác xem sao nha.`,
      places: [],
      quick: ["Hôm nay ăn gì?", "Tìm quán cà phê có ưu đãi"],
    };
  const how = pos ? "xếp gần bạn nhất trước" : "xếp theo đánh giá cao";
  const intro = pick([
    `Lomi tìm được mấy ${noun}${it.offer ? " đang có ưu đãi" : ""} nè (${how}) 👇`,
    `Có ngay đây! Mấy ${noun}${it.offer ? " đang có ưu đãi" : ""} trong Liên Minh Liên Doanh (${how}):`,
  ]);
  const hint = pos ? "" : it.near ? "\n(Bạn bật quyền vị trí cho app thì Lomi xếp theo khoảng cách được nha.)" : "";
  return {
    text: `${intro}${hint}\nBấm vào thẻ để xem chi tiết và nhận ưu đãi nha. Muốn xem nhiều hơn thì vào Khám phá (/kham-pha).`,
    places: cards,
    quick: ["Hôm nay ăn gì?", k?.type === "food" ? "Tìm spa có ưu đãi" : "Tìm quán cà phê có ưu đãi"],
  };
}
