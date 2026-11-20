// 19/11 — Gợi ý món nấu ở nhà (Kir duyệt bỏ luật "không nấu ăn" cũ của #71).
// Thư viện trên máy, không gọi AI: người dùng kể nguyên liệu đang có + điều kiện (chay, không chiên, món hấp, chán món nước,
// cần nhanh, mang đi chơi…) → chọn 2 món hợp nhất kèm cách làm ngắn. Hỏi thẳng "canh chua cá nấu sao" → cách làm món đó.
// Chỉ món nhà làm phổ biến, các bước ngắn; không nêu chuyện dinh dưỡng / bệnh (câu có bệnh, bầu, kiêng, bé… để lớp sức khoẻ lo).
import { normalizeVi } from "@/lib/lomiFaq";

type Method = "xao" | "hap" | "chien" | "canh" | "kho" | "luoc" | "tron" | "com";
type Dish = {
  name: string;
  /** nguyên liệu chính (dạng bỏ dấu); món chọn khi người dùng có ít nhất 1 thứ ở đây */
  ings: string[];
  method: Method;
  veg?: boolean; // làm chay được
  min: number; // phút, ước chừng
  carry?: boolean; // mang đi được
  /** tên gọi khác để nhận câu "X nấu sao" */
  alias?: string[];
  steps: string[];
};

const D: Dish[] = [
  { name: "Trứng xào cà chua", ings: ["trung", "ca chua"], method: "xao", veg: true, min: 10, steps: ["Cà chua bổ múi cau; trứng đánh tan với chút muối, hành lá", "Xào cà chua với chút dầu tới khi mềm, ra nước sệt", "Đổ trứng vào, để hơi se mặt rồi đảo nhẹ cho trứng chín mềm, nêm lại vừa ăn"] },
  // 20/11 (bộ 100 câu): "chỉ mình cách nấu trứng sốt cà chua" từng bị đọc "sốt" = bị sốt; "cách làm bò kho" chưa có công thức.
  { name: "Trứng sốt cà chua", ings: ["trung", "ca chua"], method: "kho", veg: true, min: 15, alias: ["trung sot ca chua", "trung sot ca", "trung op la sot ca chua"], steps: ["Trứng chiên ốp la (hoặc luộc chín bóc vỏ, chiên sơ cho se mặt)", "Phi hành tím, cho cà chua băm vào xào tới khi nhừ, thêm chút nước, nêm nước mắm, chút đường cho sệt", "Cho trứng vào, rim nhỏ lửa 3–5 phút cho thấm sốt, rắc hành lá, tiêu"] },
  { name: "Bò kho", ings: ["bo", "thit bo", "ca rot", "sa"], method: "kho", min: 90, alias: ["bo kho"], steps: ["Thịt bò (nạm, gân hoặc bắp) cắt miếng vuông, ướp sả băm, tỏi, hành tím, gói gia vị bò kho (hoặc ngũ vị hương, quế, hồi), nước mắm, chút đường, màu điều 30 phút", "Phi sả, tỏi thơm, cho bò vào xào săn", "Thêm nước dừa hoặc nước lọc ngập thịt, hầm lửa nhỏ 60–90 phút tới khi bò mềm", "Cho cà rốt cắt khúc vào nấu thêm 10–15 phút, nêm lại; ăn với bánh mì, bún hoặc hủ tiếu"] },
  { name: "Canh cà chua trứng", ings: ["trung", "ca chua"], method: "canh", veg: true, min: 10, steps: ["Phi thơm hành, xào sơ cà chua cho mềm", "Thêm nước, đun sôi, nêm muối / nước mắm", "Đánh tan trứng, rót từ từ thành sợi vào nồi đang sôi, khuấy nhẹ, tắt bếp, rắc hành lá"] },
  { name: "Đậu phụ sốt cà chua", ings: ["dau phu", "ca chua"], method: "kho", veg: true, min: 15, alias: ["dau sot ca chua", "dau hu sot ca"], steps: ["Đậu cắt miếng, chiên vàng (hoặc áp chảo ít dầu)", "Xào cà chua băm với hành tím tới khi sệt, nêm muối, chút đường", "Cho đậu vào, rim nhỏ lửa 5 phút cho thấm, rắc hành lá"] },
  { name: "Đậu phụ xào nấm", ings: ["dau phu", "nam"], method: "xao", veg: true, min: 15, steps: ["Đậu cắt miếng, áp chảo cho vàng mặt", "Phi tỏi, xào nấm lửa lớn cho ráo nước", "Cho đậu vào, nêm nước tương / muối, đảo nhẹ, thêm hành lá"] },
  { name: "Canh nấm đậu phụ", ings: ["dau phu", "nam"], method: "canh", veg: true, min: 15, steps: ["Đun sôi nước (có thể nấu cùng ít cà rốt cho ngọt nước)", "Cho nấm, đậu cắt miếng vào, nấu 5 phút", "Nêm muối / hạt nêm, thêm rau ngò, hành lá"] },
  { name: "Đậu phụ non hấp nấm", ings: ["dau phu", "nam"], method: "hap", veg: true, min: 15, steps: ["Xếp đậu non ra đĩa, xếp nấm thái mỏng lên trên", "Rưới chút nước tương pha dầu mè (hoặc dầu ăn) và hành", "Hấp 8–10 phút, rắc hành lá, tiêu"] },
  { name: "Trứng hấp (trứng chưng)", ings: ["trung"], method: "hap", veg: true, min: 15, alias: ["trung chung", "trung hap"], steps: ["Đánh trứng với chút nước (hoặc sữa), muối, hành lá — thích thì thêm thịt băm, nấm băm", "Đổ vào bát, hấp lửa vừa 12–15 phút tới khi mặt trứng đông", "Rưới chút nước mắm hoặc dầu hành lên trên"] },
  { name: "Cá hấp gừng hành", ings: ["ca"], method: "hap", min: 20, alias: ["ca hap"], steps: ["Cá làm sạch, khứa vài đường, ướp chút muối, tiêu", "Xếp gừng thái sợi, hành lên cá, hấp 12–15 phút tuỳ độ dày", "Rưới nước tương + dầu nóng phi hành lên trên"] },
  { name: "Rau củ hấp chấm", ings: ["ca rot", "bong cai", "su su", "bi", "khoai", "dau que", "rau"], method: "hap", veg: true, min: 15, steps: ["Cắt rau củ miếng vừa ăn, củ cứng (cà rốt, khoai) cắt mỏng hơn", "Hấp 7–10 phút tới khi vừa chín, còn giòn", "Chấm nước tương, muối mè hoặc kho quẹt"] },
  { name: "Mì xào rau củ", ings: ["mi", "nam", "ca rot", "rau", "bap cai", "trung"], method: "xao", veg: true, min: 15, alias: ["mi xao"], steps: ["Trụng mì cho mềm (đừng nhừ), xả nước lạnh, để ráo", "Xào nấm, cà rốt thái sợi, rau với tỏi phi", "Cho mì vào, nêm nước tương / dầu hào, đảo đều lửa lớn cho săn sợi"] },
  { name: "Mì trộn trứng", ings: ["mi", "trung"], method: "tron", veg: true, min: 10, steps: ["Luộc mì, để ráo; chiên một quả trứng ốp la", "Trộn mì với chút dầu hành, nước tương, tương ớt, ít đường", "Xếp trứng, rau thơm, dưa leo lên trên"] },
  { name: "Cơm chiên trứng", ings: ["com", "trung"], method: "chien", veg: true, min: 15, alias: ["com chien"], steps: ["Cơm nguội đánh tơi; trứng đánh tan", "Phi tỏi / hành, cho cơm vào đảo lửa lớn cho săn hạt", "Đổ trứng vào đảo đều, nêm muối / nước tương, thêm hành lá"] },
  { name: "Cơm chiên đậu Hà Lan", ings: ["com", "dau ha lan", "ca rot", "bap"], method: "chien", veg: true, min: 15, steps: ["Đậu Hà Lan, cà rốt hạt lựu trụng sơ cho chín", "Phi hành, cho cơm nguội đánh tơi vào đảo lửa lớn", "Thêm rau củ (và trứng nếu có), nêm nước tương, đảo đều là xong — dọn ra đãi khách nhanh mà đẹp mắt"] },
  { name: "Rau cải xào tỏi", ings: ["rau cai", "cai", "rau muong", "rau"], method: "xao", veg: true, min: 7, alias: ["rau xao toi"], steps: ["Rau nhặt rửa, để thật ráo", "Phi tỏi thơm, cho rau vào xào lửa lớn, đảo nhanh", "Nêm muối / dầu hào, tắt bếp khi rau vừa chín tới"] },
  { name: "Canh rau cải đậu phụ", ings: ["rau cai", "cai", "dau phu"], method: "canh", veg: true, min: 10, steps: ["Đun sôi nước (có thể phi chút hành)", "Cho đậu cắt miếng vào trước, sau đó cho rau cải", "Nêm muối, sôi lại là tắt bếp để rau còn xanh"] },
  { name: "Trứng chiên đậu phụ hành", ings: ["trung", "dau phu"], method: "chien", veg: true, min: 10, steps: ["Đậu cắt hạt lựu nhỏ, trộn với trứng đánh tan, hành lá, chút muối", "Đổ vào chảo dầu nóng, dàn mỏng", "Chiên vàng hai mặt, cắt miếng"] },
  { name: "Thịt kho trứng", ings: ["thit", "trung"], method: "kho", min: 45, alias: ["thit kho"], steps: ["Thịt ba chỉ cắt miếng, ướp nước mắm, hành tím, chút đường 15 phút; trứng luộc bóc vỏ", "Thắng đường cho có màu, cho thịt vào đảo săn", "Thêm nước dừa (hoặc nước lọc) và trứng, kho lửa nhỏ 30–40 phút tới khi thịt mềm"] },
  { name: "Cá kho", ings: ["ca"], method: "kho", min: 30, alias: ["ca kho to", "ca kho"], steps: ["Cá ướp nước mắm, đường, tiêu, hành tím 15 phút", "Cho vào nồi đất / nồi nhỏ với chút nước màu", "Kho lửa nhỏ 20–25 phút tới khi nước sệt, rắc tiêu, ớt"] },
  { name: "Canh chua cá", ings: ["ca", "ca chua", "dua", "me", "dau bap", "bac ha"], method: "canh", min: 25, alias: ["canh chua"], steps: ["Dầm me lấy nước chua (hoặc dùng dứa, cà chua)", "Đun sôi nước với nước me, cho cá vào nấu chín", "Thêm cà chua, dứa, đậu bắp, bạc hà (dọc mùng), nêm chua ngọt vừa ăn, rắc rau om, ngò gai"] },
  { name: "Gà xào sả ớt", ings: ["ga", "sa"], method: "xao", min: 20, steps: ["Gà chặt miếng nhỏ, ướp nước mắm, sả băm, chút đường", "Phi sả, ớt thơm, cho gà vào xào lửa lớn cho săn", "Thêm chút nước, đậy nắp 7–10 phút tới khi gà chín, rim cho thấm"] },
  { name: "Thịt bò xào rau", ings: ["bo", "thit bo", "rau", "hanh tay", "bong cai"], method: "xao", min: 15, alias: ["bo xao"], steps: ["Bò thái mỏng, ướp tỏi, dầu hào, tiêu 10 phút", "Xào bò lửa thật lớn cho tái rồi múc ra", "Xào rau / hành tây cho vừa chín, cho bò vào đảo nhanh rồi tắt bếp"] },
  { name: "Gan xào hành", ings: ["gan"], method: "xao", min: 15, alias: ["gan xao"], steps: ["Gan rửa sạch, ngâm sữa hoặc nước muối loãng 10 phút cho bớt mùi, thái mỏng", "Ướp tỏi, tiêu, chút nước mắm", "Xào lửa lớn tới khi gan chín hẳn bên trong (không còn hồng), thêm hành tây / hành lá"] },
  { name: "Khoai tây xào", ings: ["khoai tay"], method: "xao", veg: true, min: 15, steps: ["Khoai tây thái sợi, ngâm nước cho bớt bột, để ráo", "Xào lửa lớn với tỏi tới khi khoai vừa chín còn giòn", "Nêm muối, thêm hành lá hoặc ớt chuông"] },
  { name: "Canh bí đỏ", ings: ["bi do", "bi"], method: "canh", veg: true, min: 20, steps: ["Bí cắt miếng vừa ăn", "Nấu với nước (thêm tôm khô / thịt băm nếu không ăn chay) tới khi bí mềm", "Nêm muối, thêm rau mùi"] },
  { name: "Gỏi rau củ trộn", ings: ["dua leo", "ca chua", "ca rot", "bap cai", "rau"], method: "tron", veg: true, min: 10, steps: ["Thái sợi / thái lát các loại rau củ", "Pha nước trộn: chanh, đường, nước mắm (chay thì nước tương), tỏi ớt", "Trộn đều ngay trước khi ăn, rắc đậu phộng rang"] },
  { name: "Bánh mì kẹp trứng", ings: ["banh mi", "trung"], method: "chien", veg: true, min: 10, carry: true, steps: ["Chiên trứng ốp la hoặc trứng cuộn", "Kẹp vào bánh mì cùng dưa leo, cà chua, rau thơm", "Gói giấy bạc, mang đi vẫn ngon"] },
  { name: "Cơm nắm muối mè", ings: ["com", "me"], method: "com", veg: true, min: 15, carry: true, steps: ["Cơm nóng nắm chặt tay thành viên / tam giác", "Chấm muối mè (hoặc ruốc)", "Gói màng bọc từng viên — trẻ con dễ cầm ăn"] },
  { name: "Cháo trứng hành", ings: ["gao", "com", "trung"], method: "canh", veg: true, min: 25, alias: ["chao trung"], steps: ["Nấu cháo từ gạo (hoặc cơm nguội nấu với nhiều nước cho nhanh)", "Khi cháo nhừ, đập trứng khuấy đều", "Nêm muối, thêm hành lá, tiêu"] },
];

/** từ nguyên liệu người dùng gõ → khoá chuẩn (bỏ dấu) */
const ING: [RegExp, string][] = [
  // (cụm dài xét trước: "bánh mì" không phải "mì")
  [/\bbanh mi\b/, "banh mi"],
  [/\b(trung|trug|hot ga|hot vit)\b/, "trung"],
  [/\bca chua\b/, "ca chua"],
  [/\b(dau phu|dau hu|tau hu|dau khuon)\b/, "dau phu"],
  [/\bnam\b/, "nam"],
  [/\b(rau cai|cai ngot|cai be xanh|cai thia|cai xanh)\b/, "rau cai"],
  [/\brau muong\b/, "rau muong"],
  [/\b(rau|rau xanh)\b/, "rau"],
  [/\b(mi|mi goi|mi tom|mien|hu tieu kho)\b/, "mi"],
  [/\bca rot\b/, "ca rot"],
  [/\b(com nguoi|com)\b/, "com"],
  [/\bdau ha lan\b/, "dau ha lan"],
  [/\bbap\b/, "bap"],
  [/\b(thit heo|thit lon|ba chi|thit ba roi|thit bam|thit)\b/, "thit"],
  [/\b(thit bo|bo)\b/, "bo"],
  [/\b(thit ga|ga|canh ga|dui ga)\b/, "ga"],
  [/\bgan\b/, "gan"],
  // ("ca" bỏ dấu còn là "cả", "cà" → chỉ nhận khi rõ là cá)
  [/\b(con ca|ca (loc|basa|dieu hong|thu|ro|nuc|chim|tuoi|phi le|hoi|kho|hap|chien)|(nau|kho|hap|chien|ran|rim) ca|canh chua ca)\b/, "ca"],
  [/\bkhoai tay\b/, "khoai tay"],
  [/\b(khoai lang|khoai)\b/, "khoai"],
  [/(?<!chuan )\bbi do\b/, "bi do"], // ("chuẩn bị đồ ăn" bỏ dấu là "chuan bi do an")
  [/\bbong cai\b/, "bong cai"],
  [/\bbap cai\b/, "bap cai"],
  [/\bdua leo\b/, "dua leo"],
  [/\bhanh tay\b/, "hanh tay"],
  [/\bgao\b/, "gao"],
];

function ingsOf(n: string): string[] {
  // ("cà chua" chứa chữ "cá" khi bỏ dấu → bỏ cụm dài trước khi dò "ca")
  let t = n;
  const out: string[] = [];
  for (const [re, k] of ING) {
    if (re.test(t)) {
      out.push(k);
      t = t.replace(new RegExp(re.source, "g"), " ");
    }
  }
  return out;
}

// Luật HẸP (19/11, sau khi bản đầu bắt nhầm "lá vối để làm gì", "ho nên làm gì", "không biết làm gì"): phải có chữ NẤU NƯỚNG rõ ràng
//   và chữ hỏi món — "làm gì" đứng một mình không bao giờ tính. ("kho" bỏ dấu cũng là "khó" → chỉ tính khi đi với món / nguyên liệu.)
const COOK_VERB = /\b(nau|nau nuong|che bien|lam mon|mon an|bua toi|bua trua|bua com|bua sang|(xao|hap|chien|kho|ran|luoc|rim) (mon|gi|ca|thit|trung|rau|dau|nam|ga|bo|tom|mi))\b/;
const ASK_DISH = /\b(mon gi|mon nao|nau gi|nau mon gi|lam mon gi|lam gi (an|cho bua)|(che bien|nau|lam) (sao|the nao|ra sao|kieu gi|nhu nao)|kieu gi|goi y (mon|them mon|mot mon|vai mon)|chi (giup|minh|em|toi|tui) (mot |vai )?(mon|cach nau)|mon (\S+ )?(de lam|nhanh gon|lam nhanh|nau nhanh|don gian)|cach (nau|lam))\b/;
/** hỏi CÁCH NẤU một món cụ thể ("bún bò Huế nấu thế nào", "cách làm trứng chưng") — khác với "còn trứng, nấu gì" */
const HOW_NAMED = /\b(cach (nau|lam)|nau (\S+ ){0,5}(the nao|sao|ra sao|nhu nao)|lam (\S+ ){0,5}(the nao|ra sao|nhu nao)|(\S+ ){1,5}(nau|lam) (the nao|sao|ra sao|nhu nao))\b/;

/** Người dùng đang hỏi NÊN NẤU GÌ (có thể kèm nguyên liệu)? */
export function isCookAsk(text: string): boolean {
  const n = ` ${normalizeVi(text).replace(/\bj\b/g, "gi").replace(/\bz\b/g, "vay")} `;
  if (/\b(tim quan|quan nao|o dau|gan day|dat ban|giao tan noi)\b/.test(n)) return false;
  const ing = ingsOf(n).length > 0;
  const named = D.some((d) => [d.name, ...(d.alias ?? [])].some((x) => n.includes(` ${normalizeVi(x)} `)));
  if (named && /\b(cach (nau|lam)|nau (sao|the nao|ra sao|nhu nao)|lam (sao|the nao|ra sao|nhu nao))\b/.test(n)) return true;
  return (COOK_VERB.test(n) && ASK_DISH.test(n)) || (ing && /\b(tu (lanh )?(con|co)|nha (con|co)|o nha co|trong tu)\b/.test(n) && (COOK_VERB.test(n) || ASK_DISH.test(n)))
    || /\bmon (chay|hap|xao|kho|canh)\b(?: \S+){0,4} (de lam|nhanh|don gian|gon)\b/.test(n)
    || /\b(do an|mon an|mon)\b(?: \S+){0,4} (mang theo|mang di|de chia phan)\b/.test(n);
}

/** 20/11: hỏi CÁCH NẤU một món mà thư viện chưa có ("cách nấu cà ri gà") — để AiAssistant chuyển câu này đi hỏi thay vì đoán sang lớp khác. */
export function isUnknownDishAsk(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  return /\b(cach nau|nau mon|cach lam mon|cong thuc (nau|lam|mon))\b/.test(n) && !/\b(tim quan|quan nao|o dau|gan day|dat ban|giao tan noi|com tho|nau com dien)\b/.test(n);
}

/** Câu có nhắc nguyên liệu nấu ăn không */
export function hasCookIngredients(text: string): boolean {
  return ingsOf(` ${normalizeVi(text)} `).length > 0;
}

/** Câu chỉ KỂ nguyên liệu (dùng khi lượt trước đã hỏi nấu gì): "trong tủ chỉ còn trứng với cà chua" */
export function cookIngredientsOnly(text: string): boolean {
  const n = ` ${normalizeVi(text)} `;
  return ingsOf(n).length > 0 && n.trim().split(" ").length <= 14 && /\b(con|chi co|chi con|trong tu|tu lanh|nha co|o nha co)\b/.test(n);
}

export function cookReply(text: string, ctx = ""): string | null {
  const n = ` ${normalizeVi(`${ctx} ${text}`).replace(/\bj\b/g, "gi")} `;
  const veg0 = /\b(chay|khong (an )?thit|dung cho thit|khong cho thit|khong co thit|an chay)\b/.test(n);
  const have = ingsOf(n.replace(/\b(dung|khong|khoi|dung co) (cho |an |co )?(thit|ca|ga|bo)\b/g, " ")).filter((k) => !(veg0 && ["thit", "bo", "ga", "ca", "gan"].includes(k)));
  const veg = /\b(chay|khong (an )?thit|dung cho thit|khong cho thit|khong co thit|an chay)\b/.test(n);
  const noFry = /\b(khoi (mon )?chien|khong (an )?chien|dung chien|bo chien|it dau mo|khong dau mo)\b/.test(n);
  const steam = /\bhap\b/.test(n) && !/\bkhong hap\b/.test(n);
  const dry = /\b(chan mon nuoc|mon kho|khong (an )?nuoc|khoi canh|khong canh|mon xao)\b/.test(n);
  const soup = /\b(mon nuoc|mon canh|nau canh|an canh)\b/.test(n) && !dry;
  const quick = /\b(nhanh|gon|don gian|de lam|tan lam muon|20 phut|hai muoi phut|15 phut|muoi lam phut|met|luoi)\b/.test(n);
  const carry = /\b(mang theo|mang di|cong vien|da ngoai|picnic|di choi|chia phan|hop com)\b/.test(n);
  const guest = /\b(dai|ban ghe|khach toi|khach den|dai khach)\b/.test(n);

  // Hỏi thẳng cách nấu một món có trong thư viện ("canh chua cá nấu sao", "cách làm trứng chưng")
  const named = D.find((d) => [d.name, ...(d.alias ?? [])].some((x) => n.includes(` ${normalizeVi(x)} `)));
  if (named && /\b(nau|lam|che bien|cach)\b/.test(n) && (!have.length || named.ings.some((i) => have.includes(i)) || have.length <= 1))
    return `🍳 **${named.name}** (khoảng ${named.min} phút):\n${named.steps.map((s) => `• ${s}`).join("\n")}\n\nNêm nếm theo khẩu vị nhà mình nha 😋`;

  // món cụ thể ngoài thư viện ("nấu bún bò Huế thế nào") → không lấy món khác thế vào
  if (HOW_NAMED.test(n) && !/\b(mon gi|nau gi|lam gi|mon nao|goi y|tu (lanh )?(con|co)|nha (con|co)|con (moi|it|chut))\b/.test(n)) return null;
  let pool = D.filter((d) => (!veg || d.veg) && (!noFry || d.method !== "chien") && (!steam || d.method === "hap") && (!dry || d.method !== "canh") && (!soup || d.method === "canh") && (!carry || d.carry || d.method === "com"));
  if (quick) pool = pool.filter((d) => d.min <= 20);
  const score = (d: Dish) => {
    const hit = d.ings.filter((i) => have.includes(i)).length;
    const core = d.ings.slice(0, 2).filter((i) => have.includes(i)).length;
    const miss = d.ings.slice(0, 2).length - core; // thiếu nguyên liệu chính (chỉ có trứng mà món cần cả cà chua)
    return hit * 3 + core * 2 - (have.length ? miss * 2 : 0) + (guest && d.method === "com" ? 1 : 0) + (guest && /dau ha lan/.test(d.ings.join()) ? 2 : 0) - d.min / 60;
  };
  let pick = pool.map((d) => [d, score(d)] as const).sort((a, b) => b[1] - a[1]);
  if (have.length && !carry) pick = pick.filter(([d]) => d.ings.some((i) => have.includes(i)));
  const top = pick.slice(0, 2).map(([d]) => d);
  if (carry && !top.length) return null;
  if (!top.length) {
    if (have.length) return null;
    return "Bạn đang có sẵn nguyên liệu gì nè? Kể Lomi nghe (vd “trứng, cà chua, rau cải”) — kèm điều kiện nếu có (ăn chay, không chiên, cần nhanh), Lomi gợi ý món hợp luôn 🍳";
  }
  const cond = [veg && "món chay", noFry && "không chiên", steam && "món hấp", dry && "món khô", quick && "nhanh gọn", carry && "mang đi tiện"].filter(Boolean).join(", ");
  const head = carry
    ? "Đồ ăn mang theo đi chơi thì chọn món khô, dễ cầm, dễ chia phần nha 🧺"
    : `${have.length ? `Với ${have.slice(0, 4).map(niceIng).join(", ")}` : "Gợi ý"}${cond ? ` (${cond})` : ""} thì làm mấy món này nha 🍳`;
  const body = top.map((d, i) => `**${i + 1}. ${d.name}** (khoảng ${d.min} phút)\n${d.steps.map((s) => `• ${s}`).join("\n")}`).join("\n\n");
  const tip = carry
    ? "\n\nThêm trái cây cắt sẵn đựng hộp kín, nước lọc; đồ ăn chín nên để mát, đừng để ngoài nắng quá lâu."
    : veg
      ? "\n\nĂn chay thì thay nước mắm bằng nước tương / muối, hạt nêm chay."
      : "";
  return `${head}\n\n${body}${tip}\n\nNgại nấu thì nói Lomi tìm quán gần bạn nha 😋`;
}

const NICE: Record<string, string> = { trung: "trứng", "ca chua": "cà chua", "dau phu": "đậu phụ", nam: "nấm", "rau cai": "rau cải", "rau muong": "rau muống", rau: "rau", mi: "mì", "ca rot": "cà rốt", com: "cơm nguội", "dau ha lan": "đậu Hà Lan", bap: "bắp", thit: "thịt", bo: "thịt bò", ga: "gà", gan: "gan", ca: "cá", "khoai tay": "khoai tây", khoai: "khoai", "bi do": "bí đỏ", "bong cai": "bông cải", "bap cai": "bắp cải", "dua leo": "dưa leo", "banh mi": "bánh mì", "hanh tay": "hành tây", gao: "gạo" };
const niceIng = (k: string) => NICE[k] ?? k;
