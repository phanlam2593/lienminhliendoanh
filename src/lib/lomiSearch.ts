// ─────────────────────────────────────────────────────────────────────────────
// LOMI TÌM CHỖ THẬT (30/09, theo ý Kir) — "quán cà phê nào đang có ưu đãi?", "gần mình có spa không?",
// "hôm nay ăn gì?" → Lomi lấy doanh nghiệp + ưu đãi THẬT trong app (businesses_explore_view, chỉ đọc,
// theo RLS sẵn có) và trả về thẻ bấm được. Có vị trí (người dùng đã cho phép) thì xếp gần trước.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/integrations/supabase/client";
import { normalizeVi } from "@/lib/lomiFaq";
import type { BusinessType } from "@/lib/types";
import { VR, VN } from "@/lib/viMatch";
import { PLACES, detectPlace, noPlaceText } from "@/lib/lomiPlaces";

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

type Kind = { re: RegExp; type: BusinessType | BusinessType[]; names: string[]; noun: string; /** loại chung (vd "quán ăn", "chỗ ở") — ít kết quả thì lấy thêm cả nhóm */ broad?: boolean };
// names = chữ không dấu để tìm trong tên doanh nghiệp (name_unaccent). Loại CỤ THỂ đứng trước loại chung.
// 23/10 (Kir: "địa điểm hay dịch vụ này nọ nếu người ta hỏi thì vô Lomi luôn"): phủ đủ các loại dịch vụ đang có trong app —
//   sửa xe, giặt ủi, thợ điện / nước, taxi, xe ghép, thuê xe, phòng trọ, căn hộ, gia sư, luật sư, chụp ảnh cưới, mặt bằng, tạp hoá…
const KINDS: Kind[] = [
  // ── Ăn uống ──
  { re: VN(/\b(cà phê|cafe|coffee|cf)\b/), type: "food", names: ["cafe", "coffee", "ca phe"], noun: "quán cà phê" },
  { re: VN(/\b(trà sữa|trà chanh|milk tea)\b/), type: "food", names: ["tra sua", "tea", "tra"], noun: "quán trà sữa" },
  { re: VN(/\b(tiệm bánh|bakery|bánh ngọt|bánh kem)\b/), type: "food", names: ["banh", "bakery"], noun: "tiệm bánh" },
  { re: VN(/\b(lẩu|nướng|bbq)\b/), type: "food", names: ["lau", "nuong", "bbq"], noun: "quán lẩu nướng" },
  { re: VN(/\b(ăn vặt|chè|kem)\b/), type: "food", names: ["an vat", "che", "kem"], noun: "quán ăn vặt" },
  { re: VN(/\b(bar|pub|quán nhậu|bia|nhậu)\b/), type: "food", names: ["bar", "pub", "bia", "nhau"], noun: "quán nhậu" },
  { re: VN(/\b(nhà hàng|restaurant)\b/), type: "food", names: ["nha hang", "restaurant"], noun: "nhà hàng" },
  { re: VN(/\b(phở|bún|cơm|mì quảng|hủ tiếu|quán ăn|đồ ăn|ăn uống|chỗ ăn)\b/), type: "food", names: [], noun: "quán ăn", broad: true },
  // ── Dịch vụ ──
  { re: VN(/\b(giặt ủi|giặt là|giặt sấy|giặt đồ|tiệm giặt)\b/), type: "service", names: ["giat"], noun: "tiệm giặt ủi" },
  { re: VN(/\b(rửa xe)\b/), type: "service", names: ["rua xe"], noun: "tiệm rửa xe" },
  { re: VN(/\b(sửa xe|tiệm sửa xe|vá xe|thay nhớt|bảo dưỡng xe|xe bị hư|xe( \S+){0,2} (bị )?(hư|hỏng|chết máy|xẹp lốp|thủng lốp|không nổ máy|không đề được)|thủng lốp)\b/), type: "service", names: ["sua xe"], noun: "tiệm sửa xe" },
  { re: VN(/\b(sửa điện thoại|thay màn hình|thay pin|điện thoại (bị )?(hư|hỏng|vỡ màn))\b/), type: "service", names: ["sua dien thoai"], noun: "tiệm sửa điện thoại" },
  { re: VN(/\b(sửa điều hoà|sửa điều hòa|sửa máy lạnh|vệ sinh máy lạnh|điều hoà (bị )?(hư|hỏng)|máy lạnh (bị )?(hư|hỏng))\b/), type: "service", names: ["dieu hoa"], noun: "thợ sửa điều hoà" },
  { re: VN(/\b(sửa khoá|sửa khóa|thợ khoá|thợ khóa|mở khoá|mở khóa|làm chìa|quên chìa khoá|mất chìa khoá|kẹt khoá)\b/), type: "service", names: ["khoa"], noun: "thợ sửa khoá" },
  { re: VN(/\b(sửa ống nước|thợ nước|thợ ống nước|ống nước (bị )?(vỡ|bể|rò|hư)|rò nước|nghẹt cống|thông cống|bồn cầu (bị )?(nghẹt|tắc))\b/), type: "service", names: ["ong nuoc"], noun: "thợ sửa ống nước" },
  { re: VN(/\b(thợ điện|sửa điện|mất điện|chập điện|điện (bị )?(hư|chập)|đi dây điện)\b/), type: "service", names: ["tho dien"], noun: "thợ điện" },
  { re: VN(/\b(vệ sinh nhà|dọn nhà|dọn dẹp nhà|giúp việc|lau dọn|tổng vệ sinh)\b/), type: "service", names: ["ve sinh"], noun: "dịch vụ vệ sinh nhà" },
  { re: VN(/\b(photocopy|photo copy|in ấn|in tài liệu|in màu|scan tài liệu)\b/), type: "service", names: ["photocopy"], noun: "tiệm photocopy" },
  { re: VN(/\b(taxi|gọi xe|đặt xe taxi)\b/), type: "service", names: ["taxi"], noun: "taxi" },
  { re: VN(/\b(chuyển nhà|vận chuyển|chở hàng|xe tải|chuyển đồ)\b/), type: "service", names: ["van chuyen"], noun: "dịch vụ vận chuyển" },
  { re: VN(/\b(giao hàng|ship hàng|shipper|gửi hàng)\b/), type: "service", names: ["giao hang"], noun: "dịch vụ giao hàng" },
  { re: VN(/\b(spa thú cưng|tắm chó|tắm mèo|cắt tỉa lông|chăm sóc thú cưng|gửi chó|gửi mèo)\b/), type: "service", names: ["thu cung"], noun: "chỗ chăm sóc thú cưng" },
  { re: VN(/\b(nail|móng|làm móng)\b/), type: "service", names: ["nail"], noun: "tiệm nail" },
  { re: VN(/\b(spa|massage|gội đầu)\b/), type: "service", names: ["spa", "massage"], noun: "spa" },
  { re: VN(/\b(cắt tóc|làm tóc|tiệm tóc|salon|barber|uốn tóc|nhuộm tóc)\b/), type: "service", names: ["toc", "salon", "barber", "hair"], noun: "tiệm tóc" },
  { re: VN(/\b(gym|yoga|phòng tập|huấn luyện viên|pt cá nhân|personal trainer)\b/), type: ["service", "freelance"], names: ["gym", "yoga", "fitness", "huan luyen"], noun: "phòng tập / huấn luyện viên" },
  // ── Chỗ ở ──
  { re: VR(/\b(homestay)\b/i), type: "stay", names: ["homestay"], noun: "homestay" },
  { re: VN(/\b(resort|khu nghỉ dưỡng|nghỉ dưỡng)\b/), type: "stay", names: ["resort", "nghi duong"], noun: "resort" },
  { re: VN(/\b(khách sạn|hotel)\b/), type: "stay", names: ["khach san", "hotel"], noun: "khách sạn" },
  { re: VR(/\b(villa|biệt thự)\b/i), type: "stay", names: ["villa"], noun: "villa" },
  { re: VR(/\b(bungalow)\b/i), type: "stay", names: ["bungalow"], noun: "bungalow" },
  { re: VN(/\b(cắm trại|camping|glamping)\b/), type: ["stay", "travel"], names: ["camping", "cam trai"], noun: "chỗ cắm trại" },
  { re: VN(/\b(nhà nghỉ|motel)\b/), type: "stay", names: ["nha nghi"], noun: "nhà nghỉ" },
  { re: VN(/\b(phòng trọ|nhà trọ|thuê trọ|ở trọ|kiếm trọ|tìm trọ)\b/), type: "stay", names: ["tro"], noun: "phòng trọ" },
  { re: VN(/\b(căn hộ cho thuê|thuê căn hộ|thuê chung cư)\b/), type: "stay", names: ["can ho"], noun: "căn hộ cho thuê" },
  { re: VN(/\b(thuê nhà nguyên căn|nhà nguyên căn|thuê nguyên căn|thuê nhà)\b/), type: "stay", names: ["nguyen can"], noun: "nhà cho thuê nguyên căn" },
  { re: VN(/\b(nhà sàn)\b/), type: "stay", names: ["nha san"], noun: "nhà sàn" },
  { re: VN(/\b(chỗ ở|chỗ nghỉ|lưu trú|phòng nghỉ|chỗ ngủ|ngủ ở đâu|nghỉ ở đâu|(nên|sẽ|định|tính) ở (đâu|khu nào|chỗ nào)|ở (đâu|khu nào|chỗ nào) (thì )?(tốt|đẹp|rẻ|ổn|tiện|hợp lý|được)|ở chỗ nào|đặt phòng|thuê phòng|book phòng)\b/), type: "stay", names: [], noun: "chỗ ở", broad: true },
  // ── Du lịch, đi lại ──
  { re: VN(/\b(xe ghép|xe khách|xe limousine|limousine|xe đi (đà lạt|sài gòn|nha trang|phan thiết|bảo lộc))\b/), type: "travel", names: ["xe ghep"], noun: "xe ghép / xe khách" },
  { re: VN(/\b(đưa đón sân bay|ra sân bay|đón sân bay|xe sân bay)\b/), type: "travel", names: ["san bay"], noun: "xe đưa đón sân bay" },
  { re: VN(/\b(xe đưa đón|thuê xe có tài|thuê tài xế)\b/), type: "travel", names: ["dua don"], noun: "xe đưa đón" },
  { re: VN(/\b(thuê xe máy|thuê xe tay ga|thuê xe số)\b/), type: "travel", names: ["xe may"], noun: "chỗ thuê xe máy" },
  { re: VN(/\b(thuê xe|thuê ô tô|thuê xe tự lái|cho thuê xe)\b/), type: "travel", names: ["thue xe"], noun: "chỗ cho thuê xe" },
  { re: VN(/\b(vé máy bay|đặt vé bay|săn vé)\b/), type: "travel", names: ["ve may bay"], noun: "đại lý vé máy bay" },
  { re: VN(/\b(du thuyền|đi thuyền|ngủ trên vịnh)\b/), type: "travel", names: ["du thuyen"], noun: "du thuyền" },
  { re: VN(/\b(lặn biển|lặn ngắm san hô|lặn san hô|snorkeling|diving)\b/), type: "travel", names: ["lan bien"], noun: "tour lặn biển" },
  { re: VN(/\b(trekking|leo núi|đi bộ đường dài|hiking)\b/), type: "travel", names: ["trekking"], noun: "tour trekking" },
  { re: VN(/\b(hướng dẫn viên|người dẫn đường|guide)\b/), type: "travel", names: ["huong dan vien"], noun: "hướng dẫn viên" },
  { re: VN(/\b(làm visa|xin visa|dịch vụ visa|visa)\b/), type: "travel", names: ["visa"], noun: "dịch vụ visa" },
  { re: VN(/\b(vườn dâu|hái dâu)\b/), type: "travel", names: ["dau"], noun: "vườn dâu" },
  { re: VN(/\b(tour|du lịch|combo du lịch|lữ hành)\b/), type: "travel", names: ["tour", "du lich", "lu hanh", "combo"], noun: "tour du lịch" },
  { re: VN(/\b(xe máy)\b/), type: "travel", names: ["xe may"], noun: "chỗ thuê xe máy" },
  // ── Ảnh, thiết kế, sáng tạo ──
  { re: VN(/\b(chụp ảnh cưới|ảnh cưới|chụp hình cưới|chụp pre wedding|prewedding)\b/), type: "creator", names: ["anh cuoi"], noun: "studio chụp ảnh cưới" },
  { re: VN(/\b(quay phim|quay video|quay sự kiện|dựng phim|edit video|biên tập video|làm video)\b/), type: "creator", names: ["phim", "video"], noun: "dịch vụ quay / dựng phim" },
  { re: VN(/\b(thiết kế logo|làm logo|thiết kế bao bì|thiết kế web|làm web|làm website|thiết kế)\b/), type: ["creator", "freelance"], names: ["thiet ke"], noun: "dịch vụ thiết kế" },
  { re: VN(/\b(photobooth|livestream|mc|dẫn chương trình)\b/), type: ["creator", "freelance"], names: ["photobooth", "livestream", "mc"], noun: "dịch vụ sự kiện" },
  { re: VN(/\b(chụp ảnh|chụp hình|photo|studio|thợ ảnh)\b/), type: "creator", names: ["chup", "studio", "photo"], noun: "dịch vụ chụp ảnh" },
  // ── Chuyên môn, tự do ──
  { re: VN(/\b(gia sư|dạy kèm|học kèm|dạy thêm|dạy tiếng anh|học tiếng anh kèm)\b/), type: "freelance", names: ["gia su"], noun: "gia sư" },
  { re: VN(/\b(luật sư|tư vấn pháp lý|tư vấn luật|kiện tụng)\b/), type: ["freelance", "broker"], names: ["luat su", "phap ly"], noun: "luật sư / tư vấn pháp lý" },
  { re: VN(/\b(kế toán|làm sổ sách|báo cáo thuế|khai thuế)\b/), type: "freelance", names: ["ke toan"], noun: "kế toán" },
  { re: VN(/\b(dịch thuật|biên dịch|phiên dịch|dịch tài liệu)\b/), type: "freelance", names: ["dich"], noun: "dịch thuật" },
  { re: VN(/\b(tư vấn tâm lý|chuyên gia tâm lý|nhà tâm lý|trị liệu tâm lý)\b/), type: "freelance", names: ["tam ly"], noun: "chuyên gia tư vấn tâm lý" },
  { re: VN(/\b(tư vấn tài chính|cố vấn tài chính)\b/), type: "freelance", names: ["tai chinh"], noun: "tư vấn tài chính" },
  { re: VN(/\b(lập trình viên|thuê lập trình|làm app|viết phần mềm)\b/), type: "freelance", names: ["lap trinh", "web"], noun: "lập trình viên" },
  { re: VN(/\b(chạy quảng cáo|marketing|viết content|viết bài quảng cáo)\b/), type: "freelance", names: ["marketing", "content", "viet lach"], noun: "freelancer marketing / content" },
  // ── Nhà đất ──
  { re: VN(/\b(thuê mặt bằng|mặt bằng cho thuê|sang nhượng|sang quán|sang tiệm)\b/), type: "broker", names: ["mat bang", "sang nhuong"], noun: "mặt bằng / sang nhượng" },
  { re: VN(/\b(thuê văn phòng|văn phòng cho thuê)\b/), type: "broker", names: ["van phong"], noun: "văn phòng cho thuê" },
  { re: VN(/\b(mua đất|đất nền|đất nông nghiệp|mua nhà|nhà đất|bất động sản|bđs|bds|môi giới|định giá nhà|kho bãi)\b/), type: "broker", names: [], noun: "môi giới nhà đất", broad: true },
  // ── Mua sắm ──
  { re: VN(/\b(tạp hoá|tạp hóa|cửa hàng tiện lợi|tiệm tạp hoá|mua đồ dùng|siêu thị mini)\b/), type: "shopping", names: ["tap hoa", "tien loi", "tong hop"], noun: "tiệm tạp hoá" },
  { re: VN(/\b(hoa tươi|tiệm hoa|shop hoa|mua hoa|bó hoa|lẵng hoa)\b/), type: "shopping", names: ["hoa tuoi"], noun: "tiệm hoa" },
  { re: VN(/\b(mỹ phẩm|skincare|son môi|kem dưỡng)\b/), type: "shopping", names: ["my pham"], noun: "shop mỹ phẩm" },
  { re: VN(/\b(quần áo|thời trang|shop đồ|mua đồ)\b/), type: "shopping", names: ["thoi trang"], noun: "shop thời trang" },
  { re: VN(/\b(nhà sách|hiệu sách|cửa hàng sách|mua sách)\b/), type: "shopping", names: ["sach"], noun: "nhà sách" },
  { re: VN(/\b(văn phòng phẩm|đồ dùng học tập)\b/), type: "shopping", names: ["van phong pham"], noun: "cửa hàng văn phòng phẩm" },
  { re: VN(/\b(đồ chơi)\b/), type: "shopping", names: ["do choi"], noun: "cửa hàng đồ chơi" },
  { re: VN(/\b(mẹ và bé|đồ em bé|đồ sơ sinh|sữa cho bé|bỉm|tã)\b/), type: "shopping", names: ["me va be"], noun: "cửa hàng mẹ và bé" },
  { re: VN(/\b(pet shop|đồ thú cưng|thức ăn cho chó|thức ăn cho mèo|cửa hàng thú cưng)\b/), type: "shopping", names: ["thu cung"], noun: "cửa hàng thú cưng" },
  { re: VN(/\b(điện gia dụng|đồ điện|nồi cơm|quạt điện|đồ gia dụng)\b/), type: "shopping", names: ["gia dung"], noun: "cửa hàng điện gia dụng" },
  { re: VN(/\b(đặc sản|nông sản|quà mang về|mua trà|trà b'lao|trà bảo lộc|atiso|mứt)\b/), type: "shopping", names: ["nong san", "dac san", "tra b"], noun: "cửa hàng nông sản / đặc sản" },
  { re: VN(/\b(đồ handmade|handmade|quà lưu niệm|đồ thủ công)\b/), type: "shopping", names: ["handmade"], noun: "cửa hàng handmade" },
  { re: VN(/\b(shop|cửa hàng)\b/), type: "shopping", names: [], noun: "cửa hàng", broad: true },
];

export type SearchIntent = { mode: "find" | "eat" | "drink" | "go"; kind?: Kind; near: boolean; offer: boolean; /** 10/10: chỉ lấy chỗ trong bán kính này (km) — "giới hạn 5km thôi" */ maxKm?: number; /** 20/10: khu vực người dùng nêu ("Đà Lạt nên đi chơi ở đâu") — chỉ lấy chỗ ở đó */ area?: string; /** 23/10: tên nơi người dùng nêu (kể cả nơi app chưa có chỗ nào — "Mũi Né") */ place?: string };

// 20/10: khu vực người dùng nêu tên → lọc đúng khu vực đó (khớp cột businesses.area). Trước đây "Đà Lạt nên đi chơi
// ở đâu" bị bỏ qua chữ "Đà Lạt" và bốc bừa cả nước → ra một tiệm giặt ủi ở Đà Nẵng cách 459km.
export function detectArea(text: string): string | undefined {
  // 23/10: dùng bảng địa danh đầy đủ (lib/lomiPlaces) — điểm cụ thể ("Mũi Né", "hồ Tuyền Lâm") ra đúng khu vực của nó;
  //   nơi app chưa có chỗ nào thì KHÔNG có khu vực (để không bốc chỗ ở tỉnh khác).
  return detectPlace(text)?.area;
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
  const pl = detectPlace(text);
  const area = pl ? pl.area : detectArea(text);
  const placeF = pl ? { place: pl.label } : {};
  if (VN(/\b(đi đâu chơi|chơi ở đâu|đi đâu bây giờ|cuối tuần đi đâu|đi chơi đâu|có gì chơi|có gì vui|chỗ nào chơi|nơi nào chơi|đi chơi ở|nên đi đâu chơi|tham quan ở đâu|check in ở đâu)\b/).test(n) ||
    (pl && VN(/\b(có gì|chơi gì|đi đâu|tham quan|điểm đến|nên đi|có gì hay|địa điểm|chỗ nào đẹp|chỗ nào đáng|check in|du lịch|đi chơi)\b/).test(n) && !VN(/\b(ăn gì|uống gì|ở đâu ngủ|khách sạn|homestay|chỗ ở)\b/).test(n) && (/\?/.test(text) || VN(/\b(gì|đâu|nào|không|ko|k|hông|sao|nhỉ|ha|hả|giúp|gợi ý|chỉ)\b/).test(n))))
    return { mode: "go", near, offer: true, ...(area ? { area } : {}), ...placeF };
  // Nêu nơi + hỏi ăn gì ("ở Nha Trang ăn gì") → tìm quán ăn ở đúng nơi đó (không gợi món theo giờ ở Đà Lạt).
  if (pl && VN(/\b(ăn gì|ăn ở đâu|quán ăn|ăn uống|món gì ngon)\b/).test(n))
    return { mode: "find", kind: KINDS.find((k) => k.noun === "quán ăn"), near, offer: false, ...(area ? { area } : {}), ...placeF };
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
    (!!pl && (!!strictKind || place) && VN(/\b(ở|tại|gần|quanh|bên|có)\b/).test(n)) || // 23/10: "quán cà phê ở Mũi Né", "Đà Lạt có chỗ thuê xe máy không"
    // 23/10: "a cần thợ điện", "muốn thuê mặt bằng", "xe ghép đi Sài Gòn" — nêu một DỊCH VỤ cụ thể kèm nhu cầu (hoặc câu ngắn chỉ có dịch vụ)
    (!!strictKind && !strictKind.broad && strictKind.type !== "food" && strictKind.noun !== "chuyên gia tư vấn tâm lý" &&
      (VN(/\b(cần|muốn|thuê|gọi|kêu|đặt|book|kiếm|xin)\b/).test(n) || (/xe ghép|đưa đón|taxi/u.test(strictKind.noun) && n.trim().split(/\s+/).length <= 6)) &&
      !VN(/\b(mới|vừa|đã|rồi|hôm qua|hôm trước|lúc nãy|hồi nãy|xong|mai|sắp|tuần sau|tháng sau|định|tính)\b/).test(n)) ||
    (VN(/\bcó\b.*\bkhông\b/).test(n) && !!kind && (offer || place)); // "có spa nào giảm giá không"
  if (!seek) return null;
  if (!kind && !offer && !place) return null;
  // Xe ghép / xe khách / đưa đón "đi Sài Gòn": nơi nêu là ĐIỂM ĐẾN, không phải nơi tìm xe → không lọc theo nơi đó.
  if (kind && /xe ghép|đưa đón|taxi|thuê xe|vé máy bay/u.test(kind.noun) && pl && VN(/\b(đi|về|ra|lên|xuống|tới|đến|sang) (\S+ ){0,1}\S+/).test(n) && !VN(/\b(ở|tại)\b/).test(n))
    return { mode: "find", kind, near, offer };
  return { mode: "find", kind, near, offer, ...(area ? { area } : {}), ...placeF };
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
  // 23/10: người dùng nêu một nơi mà app chưa có doanh nghiệp nào ("Mũi Né có gì chơi") → nói thật + điểm nổi tiếng ở đó,
  //   KHÔNG bốc chỗ gần mình / chỗ ở tỉnh khác (trước đây ra "Vé Máy Bay Nắng Vàng (ở Đà Lạt)", rồi "Tour Vạn Phúc (ở Vũng Tàu)").
  const plc = it.place ? PLACES.find((p) => p.label === it.place) : undefined;
  if (plc && !plc.area && avoidIds.length)
    return { text: `Ở **${plc.label}** trong app chưa có chỗ nào nên Lomi chưa đổi được 😅 Muốn tìm ở khu khác thì bạn gõ tên nơi đó, kiểu “Vũng Tàu có gì chơi” hay “quán cà phê ở Đà Lạt” nha.`, places: [], quick: [] };
  if (plc && !plc.area)
    return { text: noPlaceText(plc, it.mode === "find" ? "find" : "go", it.kind?.noun), places: [], quick: plc.sights?.length ? [] : ["Tìm quán cà phê có ưu đãi"] };
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
    let farNote = "";
    if (pos && !it.area) {
      const withD = cards.filter((c) => c.distKm != null).sort((a, b) => a.distKm! - b.distKm!);
      const n5 = withD.filter((c) => c.distKm! <= 5);
      const n30 = withD.filter((c) => c.distKm! <= 30);
      if (n5.length) cards = n5;
      else if (n30.length) cards = n30;
      else if (withD.length) {
        // 23/10: không có chỗ nào gần → chỉ lấy chỗ GẦN NHẤT (không trộn cả mấy tỉnh), và nói rõ là ở xa.
        const nearest = withD[0];
        cards = withD.filter((c) => c.area && nearest.area && sameArea(c.area, nearest.area)).slice(0, 8);
        if (!cards.length) cards = [nearest];
        farNote = `\n(Quanh bạn chưa có chỗ nào trong app — đây là khu gần bạn nhất, ${nearest.area ? `ở ${nearest.area}` : `cách khoảng ${Math.round(nearest.distKm!)}km`}.)`;
      }
    }
    if (!cards.length && plc && !avoidIds.length) return { text: noPlaceText(plc, "go"), places: [], quick: [] };
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
    // Nêu nơi có điểm nổi tiếng ("Đà Lạt có gì chơi") → kể vài điểm nổi tiếng trước, rồi mới tới chỗ có ưu đãi trong app (lượt đầu).
    const sightsLead = it.mode === "go" && plc?.sights?.length && !avoidIds.length ? `Đi ${plc.label} thì mấy điểm nổi tiếng nè:\n${plc.sights.map((x) => `• ${x}`).join("\n")}\n\nCòn trong app, ` : "";
    const lead2 = sightsLead ? "Lomi gợi ý ghé" : lead;
    return {
      text: `${sightsLead}${lead2} **${c.name}**${where(c, it.area)} nha!${offer}${again}${farNote}\nKhông ưng thì bấm “${it.mode === "go" ? "Đổi chỗ khác" : "Đổi món khác"}” để Lomi bốc lại 😄`,
      places: [c],
      quick: [it.mode === "go" ? "Đổi chỗ khác" : "Đổi món khác", "Tìm quán cà phê có ưu đãi", "Tìm quán ăn gần mình"],
    };
  }
  // ── Tìm theo loại / ưu đãi ──
  const k = it.kind;
  let rows = await fetchRows(k?.type, k?.names ?? [], it.offer, it.area);
  if (rows.length < 3 && k?.names.length && k.broad) {
    const more = await fetchRows(k.type, [], it.offer, it.area);
    rows = rows.concat(more.filter((m) => !rows.some((r) => r.id === m.id)));
  }
  let cards = rows.map((r) => toCard(r, pos));
  if (pos) cards.sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
  else cards.sort((a, b) => b.rating - a.rating || b.offerCount - a.offerCount);
  const rad = byRadius(cards, pos, it.maxKm);
  cards = rad.cards;
  // 24/10 (kiểm trên bản thật): "a cần thợ điện" mà quanh mình không có → trước đây ra 5 chỗ ở 3 tỉnh (88km, 205km, 233km).
  //   Không nêu nơi + chỗ gần nhất đã xa (>50km) → chỉ lấy chỗ ở ĐÚNG khu gần nhất đó.
  if (!it.area && pos && !it.maxKm && cards[0]?.distKm != null && cards[0].distKm > 50 && cards[0].area) {
    const a0 = cards[0].area;
    cards = cards.filter((c) => sameArea(c.area, a0));
  }
  cards = cards.slice(0, 5);
  const noun = k?.noun ?? "chỗ";
  if (!cards.length)
    return {
      text: `Lomi chưa thấy ${noun} nào ${it.area ? `ở ${it.area} ` : ""}${it.offer ? "đang có ưu đãi " : ""}trong app nè 🥲 Bạn thử tìm ở Khám phá (/kham-pha) với từ khoá khác xem sao nha.`,
      places: [],
      quick: ["Hôm nay ăn gì?", "Tìm quán cà phê có ưu đãi"],
    };
  const how = pos ? "xếp gần bạn nhất trước" : "xếp theo đánh giá cao";
  const at = it.area ? ` ${/(^| )ở$/u.test(noun) ? "tại" : "ở"} ${it.area}` : ""; // ("chỗ ở tại Đà Lạt", không "chỗ ở ở Đà Lạt")
  const intro = pick([
    `Lomi tìm được mấy ${noun}${at}${it.offer ? " đang có ưu đãi" : ""} nè (${how}) 👇`,
    `Có ngay đây! Mấy ${noun}${at}${it.offer ? " đang có ưu đãi" : ""} trong iLomi (${how}):`,
  ]);
  // 23/10: không nêu nơi → nói rõ đang lấy ở đâu (gần bạn / chỗ gần nhất ở xa / cả nước), để không tưởng là chỗ ngay cạnh mình.
  const areas = [...new Set(cards.map((c) => c.area).filter(Boolean))];
  const far = !it.area && pos && cards[0]?.distKm != null && cards[0].distKm > 50;
  const wide = !it.area && !pos && areas.length > 1;
  const hint =
    rad.note ||
    (far ? `\n(Quanh bạn chưa có ${noun} nào trong app — đây là chỗ gần bạn nhất${cards[0].area ? `, ở ${cards[0].area}` : ""}.)` : "") ||
    (wide ? `\n(Lomi chưa biết bạn ở đâu nên đang lấy ở nhiều nơi: ${areas.slice(0, 4).join(", ")}${areas.length > 4 ? "…" : ""}. Bạn gõ thêm tên nơi — vd “${noun} ở Đà Lạt” — hoặc bật quyền vị trí cho app là Lomi lọc đúng chỗ nha.)` : "") ||
    (pos ? "" : it.near ? "\n(Bạn bật quyền vị trí cho app thì Lomi xếp theo khoảng cách được nha.)" : "");
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
export type DishWant = { text?: string; offer?: boolean; near?: boolean; maxKm?: number; /** 23/10: nơi người dùng nêu ("quán lẩu ở Nha Trang") */ place?: string };

/**
 * Tìm quán THẬT có món này (tên quán, mô tả hoặc ưu đãi). avoidIds = quán đã gợi ý (bấm "Quán khác").
 * want (08/10) = điều kiện thêm: lọc theo quán đang có ưu đãi / theo chữ người dùng muốn ("yên tĩnh") có trong tên, mô tả,
 * ưu đãi hoặc đánh giá mới nhất của quán. Không có quán nào khớp thì NÓI THẬT rồi vẫn đưa các quán có món đó.
 */
export async function runDishSearch(d: Dish, avoidIds: string[] = [], want?: DishWant): Promise<SearchResult> {
  const plc = want?.place ? PLACES.find((p) => p.label === want.place) : undefined;
  const main0 = d.name.split(/[,(]/)[0].trim();
  if (plc && !plc.area) return { text: noPlaceText(plc, "find", `quán ${main0}`), places: [], quick: [d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"] };
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
  let rows = ((data ?? []) as unknown as WRow[]).filter((r) => !avoidIds.includes(r.id) && (!plc?.area || sameArea(r.area, plc.area)));
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
    // Không có quán nào có đúng món → nói thật, gợi ý vài quán ăn/uống khác đang có ưu đãi (cùng khu vực nếu người dùng nêu nơi).
    const rows = await fetchRows("food", [], true, plc?.area);
    if (plc?.area && !rows.length) return { text: `Lomi chưa thấy quán **${main0}** nào ở ${plc.area} trong app nè 🥲 Bạn thử tìm ở Khám phá (/kham-pha) nha.`, places: [], quick: [d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"] };
    const others = rows.map((r) => toCard(r, pos)).filter((c) => !avoidIds.includes(c.id)).sort(() => Math.random() - 0.5).slice(0, 3);
    if (!others.length)
      return { text: `Lomi gợi ý hết các quán có **${main0}**${plc?.area ? ` ở ${plc.area}` : ""} trong app rồi 😅 Bạn xem thêm ở Khám phá (/kham-pha) hoặc chọn món khác nha.`, places: [], quick: [d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"] };
    return {
      text: avoidIds.length
        ? `Lomi hết quán có **${nm}** để gợi ý rồi 😅 Thử mấy quán khác đang có ưu đãi nè 👇`
        : `Hic, trong iLomi chưa có quán nào ${plc?.area ? `ở ${plc.area} ` : ""}ghi rõ món **${nm}** 🥲 Lomi gợi ý tạm mấy quán ${d.drink ? "nước" : "ăn"}${plc?.area ? ` ở ${plc.area}` : ""} đang có ưu đãi nha 👇`,
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
      `Thèm **${nm}** hả, có ngay đây 😋 Mấy quán trong iLomi nè 👇`,
      `Chuẩn bài luôn! Đi ăn **${nm}** thì ghé mấy chỗ này nha 🤤`,
      `Lomi tìm được mấy quán có **${nm}** nè${pos ? " (gần bạn)" : ""} 👇 Bấm vào thẻ để xem chi tiết và nhận ưu đãi nha!`,
    ]),
    places: cards,
    quick: ["🔁 Quán khác", d.drink ? "🎲 Đồ uống khác" : "🎲 Món khác"],
  };
}
