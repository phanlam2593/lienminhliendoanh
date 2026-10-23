// ─────────────────────────────────────────────────────────────────────────────
// ĐỊA DANH (23/10, theo phản hồi của Kir: hỏi "Mũi Né có gì chơi" mà Lomi bốc chỗ ở Đà Lạt, Vũng Tàu).
//   Nhận ra tên tỉnh / thành / điểm du lịch / khu trong Đà Lạt mà người dùng nêu → biết:
//   • area: giá trị cột businesses.area tương ứng (nếu app có chỗ ở đó) — chỉ lấy chỗ ĐÚNG khu vực đó;
//   • sights: vài điểm tham quan nổi tiếng (kiến thức phổ thông) để gợi ý khi app chưa có chỗ nào ở đó.
//   Nêu một nơi mà app chưa có chỗ → nói thật, KHÔNG bốc chỗ ở tỉnh khác.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizeVi } from "@/lib/lomiFaq";

export type Place = { label: string; re: RegExp; area?: string; sights?: string[] };

// Thứ tự: điểm cụ thể trước (Mũi Né trước Phan Thiết, Hồ Tuyền Lâm trước Đà Lạt), rồi thành phố, rồi tỉnh.
// Mẫu viết KHÔNG DẤU (so trên câu đã chuẩn hoá), có ranh giới từ hai bên.
const P = (label: string, re: RegExp, area?: string, sights?: string[]): Place => ({ label, re, area, sights });

export const PLACES: Place[] = [
  // ── Trong / quanh Đà Lạt ──
  P("Langbiang", /\b(langbiang|lang biang|lam vien)\b/, "Lạc Dương", ["Leo núi Langbiang (đi bộ hoặc xe jeep lên đỉnh Radar)", "Làng Cù Lần", "Khu du lịch thung lũng Vàng"]),
  P("Lạc Dương", /(?<!\b(bi|lam|de|di|hay|khong|cho|so|tranh|ko) )\blac duong\b/, "Lạc Dương", ["Núi Langbiang", "Làng Cù Lần", "Thung lũng Vàng"]),
  P("Hồ Tuyền Lâm", /\b(tuyen lam|thien vien truc lam)\b/, "Đà Lạt", ["Thiền viện Trúc Lâm", "Đi thuyền / dạo quanh hồ Tuyền Lâm", "Cáp treo Robin (từ đồi Robin xuống thiền viện)"]),
  P("Cầu Đất", /\bcau dat\b/, "Đà Lạt", ["Đồi chè Cầu Đất", "Săn mây buổi sáng sớm", "Cánh đồng điện gió Cầu Đất"]),
  P("Trại Mát", /\btrai mat\b/, "Đà Lạt", ["Chùa Linh Phước (chùa Ve Chai)", "Đi tàu hoả cổ từ ga Đà Lạt xuống Trại Mát"]),
  P("Đà Lạt", /\b(da lat|dalat|thanh pho hoa|xu lanh)\b/, "Đà Lạt", ["Hồ Xuân Hương, chợ Đà Lạt và chợ đêm", "Thiền viện Trúc Lâm – hồ Tuyền Lâm", "Núi Langbiang", "Đồi chè Cầu Đất (săn mây)", "Thác Datanla (máng trượt)", "Ga Đà Lạt"]),
  P("Đức Trọng", /\b(duc trong|lien khuong)\b/, "Đức Trọng", ["Thác Pongour", "Chùa Linh Ẩn"]),
  P("Đơn Dương", /\bdon duong\b/, "Đơn Dương", ["Hồ Đa Nhim", "Đèo Ngoạn Mục"]),
  P("Di Linh", /\bdi linh\b/, "Di Linh", ["Đồi chè Di Linh", "Thác Bobla"]),
  P("Bảo Lộc", /\b(bao loc|blao)\b/, "Bảo Lộc", ["Thác Dambri", "Đồi chè Tâm Châu", "Thiền viện Trúc Lâm Chánh Giác"]),
  // ── Biển miền Trung – Nam ──
  P("Mũi Né", /\b(mui ne|muine)\b/, undefined, ["Đồi cát bay (đồi cát đỏ)", "Bàu Trắng (đồi cát trắng) — trượt cát, đi xe địa hình", "Suối Tiên (suối Hồng)", "Làng chài Mũi Né, ngắm thuyền thúng buổi sáng", "Lướt ván diều (mùa gió khoảng tháng 11 – 4)", "Tháp Chàm Poshanư"]),
  P("Phan Thiết", /\b(phan thiet|binh thuan|hai dang ke ga)\b/, undefined, ["Đồi cát bay, Bàu Trắng (khu Mũi Né)", "Hải đăng Kê Gà", "Tháp Chàm Poshanư", "Núi Tà Cú (tượng Phật nằm)"]),
  P("Phan Rang", /\b(phan rang|ninh thuan|vinh hy|nam cuong)\b/, undefined, ["Vịnh Vĩnh Hy", "Đồi cát Nam Cương", "Tháp Chàm Po Klong Garai", "Hang Rái"]),
  P("Nha Trang", /\b(nha trang|khanh hoa|hon mun)\b/, "Nha Trang", ["Tháp Bà Ponagar", "Đi tour đảo (Hòn Mun, Hòn Tằm…) lặn ngắm san hô", "VinWonders Nha Trang trên đảo Hòn Tre", "Tắm bùn khoáng", "Viện Hải dương học"]),
  P("Cam Ranh", /\b(cam ranh|binh ba|binh hung)\b/, undefined, ["Đảo Bình Ba (đảo tôm hùm)", "Đảo Bình Hưng", "Bãi Dài Cam Ranh"]),
  P("Tuy Hòa", /\b(tuy hoa|phu yen|ganh da dia|mui dien)\b/, undefined, ["Gành Đá Đĩa", "Mũi Điện (Mũi Đại Lãnh) đón bình minh", "Tháp Nhạn", "Đầm Ô Loan"]),
  P("Quy Nhơn", /\b(quy nhon|binh dinh|bai ky co|eo gio)\b/, "Quy Nhơn", ["Kỳ Co – Eo Gió", "Ghềnh Ráng Tiên Sa", "Tháp Đôi", "Hòn Khô lặn ngắm san hô"]),
  P("Lý Sơn", /\bly son\b/, undefined, ["Cổng Tò Vò", "Đỉnh Thới Lới", "Đảo Bé (Bãi Hang Câu)", "Chùa Hang"]),
  P("Hội An", /\bhoi an\b(?! (toan|ninh|ui|tam|nhien|khang))|\bcu lao cham\b/, "Hội An", ["Phố cổ Hội An, Chùa Cầu", "Thả đèn hoa đăng trên sông Hoài buổi tối", "Rừng dừa Bảy Mẫu (đi thuyền thúng)", "Biển An Bàng", "Cù Lao Chàm"]),
  P("Đà Nẵng", /(?<!\b(noi|may|xe|ban|ghe|ke|tu|giuong|dao|keo|binh|sac|cap|bep|loai|kieu|tinh|chuc) )\bda nang\b|\b(danang|ba na hills|bana hills|ban dao son tra|my khe)\b/, "Đà Nẵng", ["Bà Nà Hills – Cầu Vàng", "Bán đảo Sơn Trà, chùa Linh Ứng", "Ngũ Hành Sơn", "Biển Mỹ Khê", "Cầu Rồng phun lửa tối cuối tuần"]),
  P("Huế", /\b(o|tai|den|ra|ve|vao|tp|thanh pho|di|xu) hue\b|^ hue\b/, "Huế", ["Đại Nội (Hoàng thành Huế)", "Chùa Thiên Mụ", "Lăng Khải Định, lăng Minh Mạng", "Đi thuyền nghe ca Huế trên sông Hương", "Chợ Đông Ba"]),
  P("Phong Nha", /\b(phong nha|quang binh|dong hoi|son doong)\b/, undefined, ["Động Phong Nha", "Động Thiên Đường", "Sông Chày – Hang Tối", "Biển Nhật Lệ (Đồng Hới)"]),
  P("Vũng Tàu", /\b(vung tau|ba ria|long hai|ho tram)\b/, "Vũng Tàu", ["Tượng Chúa Kitô Vua (Núi Nhỏ)", "Hải đăng Vũng Tàu", "Bãi Sau, Bãi Trước", "Mũi Nghinh Phong", "Bạch Dinh"]),
  P("Côn Đảo", /\b(di|o|ra|tai|den|ve|vao|du lich|tour|bien) con dao\b|^ con dao (co|choi|o dau)/, undefined, ["Nhà tù Côn Đảo", "Nghĩa trang Hàng Dương", "Bãi Đầm Trầu", "Lặn ngắm san hô Hòn Bảy Cạnh"]),
  P("Phú Quốc", /\bphu quoc\b/, "Phú Quốc", ["Cáp treo Hòn Thơm", "Bãi Sao", "Chợ đêm Phú Quốc", "Grand World", "Sunset Town (thị trấn Hoàng Hôn)"]),
  // ── Miền Tây ──
  P("Cần Thơ", /\bcan tho\b(?! (oxy|may|sau|deu|manh))|\b(cai rang|ninh kieu)\b/, "Cần Thơ", ["Chợ nổi Cái Răng (đi sớm khoảng 5–6 giờ sáng)", "Bến Ninh Kiều", "Nhà cổ Bình Thủy"]),
  P("Cà Mau", /\bca mau\b/, "Cà Mau", ["Mũi Cà Mau", "Rừng U Minh Hạ", "Chợ nổi Cà Mau"]),
  P("Châu Đốc", /\b(chau doc|an giang|tra su|nui sam)\b/, undefined, ["Miếu Bà Chúa Xứ núi Sam", "Rừng tràm Trà Sư", "Chợ nổi Long Xuyên"]),
  P("Hà Tiên", /\b(ha tien|rach gia|kien giang|dao nam du)\b/, undefined, ["Quần đảo Nam Du", "Mũi Nai (Hà Tiên)", "Thạch Động"]),
  P("Mỹ Tho", /\b(my tho|tien giang|ben tre)\b/, undefined, ["Cồn Thới Sơn, đi xuồng kênh rạch", "Vườn trái cây", "Chùa Vĩnh Tràng"]),
  // ── Miền Nam ──
  P("TP.HCM", /\b(sai gon|saigon|tp ?hcm|hcm|ho chi minh)\b/, "TP.HCM", ["Nhà thờ Đức Bà, Bưu điện Thành phố", "Phố đi bộ Nguyễn Huệ", "Chợ Bến Thành", "Dinh Độc Lập", "Landmark 81"]),
  P("Thủ Dầu Một", /\b(thu dau mot|binh duong)\b/, "Thủ Dầu Một", ["Khu du lịch Đại Nam", "Chùa Hội Khánh"]),
  P("Biên Hòa", /\b(o|tai|den|ra|ve|vao|di|tp|thanh pho|khu|gan|xuong|len) bien hoa\b|\bdong nai\b/, "Biên Hòa", ["Văn miếu Trấn Biên", "Khu du lịch Bửu Long"]),
  P("Tây Ninh", /\b(tay ninh|nui ba den)\b/, undefined, ["Núi Bà Đen (cáp treo)", "Toà thánh Cao Đài Tây Ninh", "Hồ Dầu Tiếng"]),
  // ── Tây Nguyên ──
  P("Buôn Ma Thuột", /\b(buon ma thuot|buon me thuot|bmt|dak lak|daklak|ho lak|buon don)\b/, "Buôn Ma Thuột", ["Bảo tàng Thế giới Cà phê", "Thác Dray Nur", "Hồ Lắk", "Buôn Đôn"]),
  P("Pleiku", /\b(pleiku|gia lai|bien ho)\b/, "Pleiku", ["Biển Hồ (hồ T'Nưng)", "Núi lửa Chư Đăng Ya (mùa hoa dã quỳ)", "Chùa Minh Thành"]),
  P("Kon Tum", /\bkon tum\b/, undefined, ["Nhà thờ gỗ Kon Tum", "Măng Đen", "Cầu treo Kon Klor"]),
  // ── Miền Bắc ──
  P("Hà Nội", /\b(ha noi|hanoi|ho guom|ho tay)\b/, "Hà Nội", ["Hồ Gươm và phố cổ", "Văn Miếu – Quốc Tử Giám", "Lăng Bác, chùa Một Cột", "Hồ Tây", "Phố đi bộ cuối tuần quanh Hồ Gươm"]),
  P("Hạ Long", /\b(ha long|quang ninh|tuan chau)\b/, "Hạ Long", ["Du thuyền vịnh Hạ Long", "Hang Sửng Sốt", "Đảo Ti Tốp", "Sun World Hạ Long"]),
  P("Cát Bà", /\b(cat ba|vinh lan ha)\b/, undefined, ["Vịnh Lan Hạ", "Vườn quốc gia Cát Bà", "Pháo đài Thần Công"]),
  P("Hải Phòng", /(?<!\b(\d+|co|thue|dat|lay|giu|book|can|muon|them) )\bhai phong\b(?! (ngu|tro|khach|tam|hoc|lam viec|rieng))|\bbai bien do son\b/, "Hải Phòng", ["Đảo Cát Bà – vịnh Lan Hạ", "Bãi biển Đồ Sơn", "Nhà hát lớn Hải Phòng"]),
  P("Ninh Bình", /\b(ninh binh|trang an|tam coc|bai dinh|hang mua)\b/, undefined, ["Tràng An (đi đò)", "Tam Cốc – Bích Động", "Chùa Bái Đính", "Hang Múa"]),
  P("Sa Pa", /\b(sa pa|sapa|fansipan|lao cai)\b/, "Sa Pa", ["Đỉnh Fansipan (cáp treo)", "Bản Cát Cát", "Đèo Ô Quy Hồ", "Thác Bạc", "Nhà thờ đá Sa Pa"]),
  P("Hà Giang", /\b(ha giang|dong van|lung cu|ma pi leng)\b/, undefined, ["Đèo Mã Pì Lèng – sông Nho Quế", "Cột cờ Lũng Cú", "Phố cổ Đồng Văn", "Dinh thự họ Vương"]),
  P("Mộc Châu", /\b(moc chau|son la)\b/, undefined, ["Đồi chè trái tim", "Thác Dải Yếm", "Mùa hoa mận, hoa cải"]),
  P("Mai Châu", /\b(mai chau|hoa binh)\b/, undefined, ["Bản Lác", "Thung lũng Mai Châu (đạp xe quanh ruộng lúa)"]),
  P("Tam Đảo", /\b(tam dao|vinh phuc)\b/, undefined, ["Thị trấn Tam Đảo", "Thác Bạc Tam Đảo", "Tháp truyền hình Tam Đảo"]),
  P("Sầm Sơn", /\b(sam son|thanh hoa)\b/, undefined, ["Biển Sầm Sơn", "Đền Độc Cước", "Hòn Trống Mái"]),
  P("Vinh", /\b(tp|thanh pho|o|tai|den|ra|ve|vao) vinh\b|\b(nghe an|cua lo|kim lien)\b/, "Vinh", ["Biển Cửa Lò", "Khu di tích Kim Liên (quê Bác)", "Quảng trường Hồ Chí Minh"]),
  // ── Tỉnh / thành khác (chưa có gợi ý điểm đến riêng) ──
  ...([
    ["Bắc Ninh", /\bbac ninh\b/], ["Bắc Giang", /\bbac giang\b/], ["Bắc Kạn", /\b(bac kan|ho ba be)\b/], ["Cao Bằng", /\b(cao bang|ban gioc)\b/],
    ["Lạng Sơn", /\blang son\b/], ["Thái Nguyên", /\bthai nguyen\b/], ["Tuyên Quang", /\btuyen quang\b/], ["Yên Bái", /\b(yen bai|mu cang chai)\b/],
    ["Phú Thọ", /\b(phu tho|viet tri)\b/], ["Điện Biên", /\bdien bien\b/], ["Lai Châu", /\blai chau\b/], ["Hưng Yên", /\bhung yen\b/],
    ["Hải Dương", /\bhai duong\b/], ["Thái Bình", /\bthai binh\b/], ["Nam Định", /\bnam dinh\b/], ["Hà Nam", /\bha nam\b/],
    ["Hà Tĩnh", /\bha tinh\b/], ["Quảng Trị", /\bquang tri\b/], ["Quảng Ngãi", /\bquang ngai\b/], ["Quảng Nam", /\bquang nam\b/],
    ["Đắk Nông", /\bdak nong\b/], ["Bình Phước", /\b(binh phuoc|dong xoai)\b/], ["Long An", /\blong an\b/],
    ["Đồng Tháp", /\b(dong thap|sa dec)\b/], ["Vĩnh Long", /\bvinh long\b/], ["Trà Vinh", /\btra vinh\b/], ["Sóc Trăng", /\bsoc trang\b/],
    ["Bạc Liêu", /\bbac lieu\b/], ["Hậu Giang", /\bhau giang\b/],
  ] as [string, RegExp][]).map(([l, re]) => P(l, re)),
];

/** Nơi người dùng nêu tên trong câu (điểm cụ thể nhất). */
export function detectPlace(text: string): Place | undefined {
  const n = ` ${normalizeVi(text)} `;
  return PLACES.find((p) => p.re.test(n));
}

/** Câu trả lời khi app CHƯA có chỗ nào ở nơi người dùng hỏi — nói thật + vài điểm nổi tiếng (nếu có). */
export function noPlaceText(p: Place, what: "go" | "find", noun = "chỗ"): string {
  const head = what === "go"
    ? `Trong Liên Minh Liên Doanh hiện chưa có chỗ nào ở **${p.label}** để Lomi gợi ý ưu đãi 🥲`
    : `Lomi chưa thấy ${noun} nào ở **${p.label}** trong app nè 🥲`;
  const sights = what === "go" && p.sights?.length ? `\n\nNhưng đi ${p.label} thì mấy điểm nổi tiếng này đáng ghé nè:\n${p.sights.map((s) => `• ${s}`).join("\n")}` : "";
  return `${head}${sights}\n\n${what === "go" && p.sights?.length ? "Giờ mở cửa, giá vé thay đổi theo mùa nên bạn kiểm tra lại trước khi đi nha. " : ""}Khi có doanh nghiệp ở ${p.label} tham gia app, Lomi sẽ gợi ý được chỗ có ưu đãi cho bạn.`;
}
