// ─────────────────────────────────────────────────────────────────────────────
// ĂN UỐNG KIÊNG CỮ THEO BỆNH (01/10, theo ý Kir) — chạy trên máy, không gọi AI.
// "bị gout kiêng gì", "huyết áp cao ăn gì", "gout ăn thịt chó được không", "đau dạ dày uống cà phê được k".
// Kiến thức phổ thông: nhóm nên tránh / ăn vừa phải / nên ăn. Không đưa khẩu phần, số lượng, thực đơn cụ thể;
// luôn nhắc hỏi bác sĩ đang điều trị. Có sửa vài quan niệm kiêng dân gian chưa có bằng chứng (vd rau muống – sẹo lồi).
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { HEALTH, normStrict } from "@/lib/lomiAccent";
import { VR, VN } from "@/lib/viMatch";

/** 1 nhóm thực phẩm: chữ hiển thị + từ khoá (CÓ DẤU; cụm ≥2 chữ tự nhận thêm bản không dấu). */
type Item = { t: string; k: string[]; why?: string };
type Diet = {
  id: string;
  name: string; // "bị gout", "huyết áp cao"…
  re: RegExp; // khớp trên chữ KHÔNG dấu
  avoid: Item[];
  limit?: Item[];
  good: Item[];
  tip?: string;
  myth?: string;
};

const I = (t: string, k: string[], why?: string): Item => ({ t, k, why });

// Nhóm dùng chung
const ALCOHOL = I("bia, rượu", ["bia", "rượu", "nhậu", "bia rượu", "rượu bia", "rượu vang", "rượu đế"]);
const SODA = I("nước ngọt có ga, trà sữa, nước ép đóng chai nhiều đường", ["nước ngọt", "coca", "pepsi", "nước có ga", "trà sữa", "sting", "nước tăng lực", "nước ép đóng chai"]);
const FRIED = I("đồ chiên rán, nhiều dầu mỡ", ["đồ chiên", "chiên", "rán", "gà rán", "khoai tây chiên", "đồ rán", "dầu mỡ", "chiên xù"]);
const PROCESSED = I("đồ chế biến sẵn (xúc xích, lạp xưởng, chả, thịt nguội, mì gói)", ["xúc xích", "lạp xưởng", "chả lụa", "giò chả", "thịt nguội", "mì gói", "mì tôm", "đồ hộp", "pate", "pa tê", "đồ chế biến sẵn"]);
const ORGAN = I("nội tạng (gan, lòng, tim, cật, óc)", ["nội tạng", "lòng", "gan", "cật", "óc", "tim heo", "lòng lợn", "lòng heo", "dồi", "phèo", "tiết canh"]);
const SWEETS = I("bánh kẹo, chè, đồ ngọt", ["bánh kẹo", "kẹo", "chè", "bánh ngọt", "đồ ngọt", "kem", "bánh kem", "sô cô la", "socola", "chocolate"]);
const SPICY = I("đồ cay (ớt, tiêu, mù tạt)", ["cay", "ớt", "tiêu", "mù tạt", "đồ cay", "mì cay", "lẩu cay", "sa tế"]);
const COFFEE = I("cà phê, trà đặc", ["cà phê", "cafe", "cà phê sữa", "cafe sữa", "trà đặc", "trà"]);
const SALTY = I("đồ mặn (nước mắm chấm đậm, muối, dưa cà muối, khô mặn)", ["mặn", "muối", "nước mắm", "dưa muối", "cà muối", "dưa cà", "khô cá", "cá khô", "mắm", "mắm tôm", "đồ mặn", "bim bim", "snack"]);
const RAW = I("đồ sống, tái (gỏi, sushi, thịt tái, trứng lòng đào, rau sống chưa rửa kỹ)", ["gỏi", "sushi", "sashimi", "tái", "phở tái", "bò tái", "trứng lòng đào", "đồ sống", "rau sống", "hàu sống", "tiết canh"]);
const VEG = I("rau xanh các loại", ["rau", "rau xanh", "rau củ", "bông cải", "súp lơ", "bắp cải", "cải"]);
const FRUIT = I("trái cây tươi", ["trái cây", "hoa quả", "chuối", "táo", "cam", "bưởi", "thanh long", "đu đủ", "dưa hấu", "ổi"]);
const FISH = I("cá (nhất là cá biển béo như cá hồi, cá thu)", ["cá", "cá hồi", "cá thu", "cá basa", "cá lóc"]);
const WATER = I("nước lọc (uống đủ trong ngày)", ["nước lọc", "nước", "uống nước"]);
const DAIRY = I("sữa, sữa chua ít đường", ["sữa", "sữa chua", "sữa tươi", "yaourt", "phô mai"]);

const DIETS: Diet[] = [
  {
    id: "gout", name: "bị gout (gút)",
    re: VN(/\b(gout|gút|gut|goute|thống phong|axit uric|acid uric|a xít uric|uric)\b/),
    avoid: [
      I("nội tạng động vật (gan, lòng, cật, óc)", ["nội tạng", "lòng", "gan", "cật", "óc", "lòng lợn", "lòng heo", "dồi", "phèo"], "nội tạng rất nhiều purin — chất tạo ra axit uric"),
      I("thịt đỏ, thịt thú (bò, dê, trâu, chó, mèo, ngựa…)", ["thịt bò", "bò", "thịt dê", "dê", "thịt trâu", "trâu", "thịt chó", "chó", "cầy", "thịt mèo", "mèo", "thịt ngựa", "ngựa", "thịt đỏ", "thịt thú", "thịt rừng", "bê", "thịt bê"], "thịt đỏ nhiều purin, dễ làm axit uric tăng và khởi phát cơn đau"),
      I("hải sản (tôm, cua, ghẹ, mực, sò, nghêu, hàu, cá cơm, cá mòi)", ["hải sản", "tôm", "cua", "ghẹ", "mực", "sò", "ốc", "nghêu", "ngao", "hàu", "cá cơm", "cá mòi", "cá trích", "tôm hùm", "bạch tuộc"], "hải sản, nhất là loại có vỏ và cá nhỏ, nhiều purin"),
      I("bia, rượu (bia là hại nhất)", ["bia", "rượu", "nhậu", "bia rượu", "rượu bia", "rượu vang", "rượu đế"], "cồn làm thận thải axit uric kém, bia còn chứa purin"),
      I("nước ngọt, nước ép đóng chai nhiều đường fructose", ["nước ngọt", "coca", "pepsi", "nước có ga", "trà sữa", "sting", "nước tăng lực", "nước ép đóng chai"], "đường fructose làm cơ thể tạo thêm axit uric"),
      I("nước dùng hầm xương đậm, lẩu, canh thịt đặc", ["lẩu", "nước hầm xương", "canh xương", "súp xương", "lẩu hải sản", "lẩu bò"], "purin tan ra nước dùng khi hầm lâu"),
    ],
    limit: [
      I("phở, bún bò, hủ tiếu (ăn ít nước dùng, chọn thịt nạc, bớt tái nạm gầu)", ["phở", "bún bò", "hủ tiếu", "nước lèo", "nước dùng"], "nước dùng hầm xương khá nhiều purin"),
      I("thịt gà, thịt heo nạc, cá thường (ăn vừa phải)", ["thịt gà", "gà", "thịt heo", "thịt lợn", "heo", "lợn", "cá"]),
      I("các loại đậu, nấm, măng tây, rau dền, giá đỗ, cải bó xôi", ["đậu", "đậu nành", "đậu phụ", "đậu hũ", "nấm", "măng tây", "rau dền", "giá", "giá đỗ", "cải bó xôi", "rau chân vịt", "măng"], "rau đậu có purin nhưng ít làm bệnh nặng như thịt, hải sản — ăn vừa phải được, không cần kiêng tuyệt đối"),
    ],
    good: [
      I("rau xanh, củ quả (bí, bầu, su su, cà rốt, dưa leo)", ["rau", "rau xanh", "bí", "bầu", "su su", "cà rốt", "dưa leo", "dưa chuột", "rau muống", "bắp cải"]),
      I("trái cây ít ngọt (cherry/anh đào, cam, bưởi, dưa hấu)", ["trái cây", "cherry", "anh đào", "cam", "bưởi", "dưa hấu", "chuối", "táo"]),
      I("sữa, sữa chua ít béo", ["sữa", "sữa chua", "sữa tươi"]),
      I("trứng", ["trứng", "trứng gà", "trứng vịt"]),
      I("uống nhiều nước lọc để thận thải axit uric", ["nước lọc", "nước", "uống nước"]),
      I("cơm, khoai, ngũ cốc", ["cơm", "khoai", "khoai lang", "yến mạch", "bánh mì", "bún"]),
    ],
    tip: "Giữ cân nặng hợp lý, đừng nhịn đói hay giảm cân quá nhanh (dễ lên cơn). Đang lên cơn đau thì nghỉ ngơi, kê cao chân, chườm lạnh và đi khám.",
  },
  {
    id: "htn", name: "huyết áp cao",
    re: VN(/\b(huyết áp cao|cao huyết áp|tăng huyết áp|huyết áp(?! thấp))\b/),
    avoid: [
      I("đồ mặn: muối, nước mắm chấm đậm, dưa cà muối, cá khô, mắm", ["mặn", "muối", "nước mắm", "dưa muối", "cà muối", "dưa cà", "khô cá", "cá khô", "mắm", "mắm tôm", "đồ mặn", "bim bim", "snack", "khô bò", "mực khô"], "muối (natri) giữ nước, làm huyết áp tăng"),
      PROCESSED, ALCOHOL,
      I("mỡ động vật, da, nội tạng", ["mỡ heo", "mỡ động vật", "da gà", "da heo", "nội tạng", "lòng", "óc", "thịt mỡ", "ba chỉ"]),
      I("cà phê đặc, nước tăng lực", ["cà phê", "cafe", "cà phê sữa", "cafe sữa", "nước tăng lực", "sting", "redbull", "trà đặc"], "làm tim đập nhanh, huyết áp tăng tạm thời"),
    ],
    limit: [SWEETS, FRIED, I("thịt đỏ", ["thịt bò", "bò", "thịt đỏ", "thịt heo", "thịt lợn"])],
    good: [VEG, I("trái cây nhiều kali (chuối, cam, bơ, dưa hấu)", ["trái cây", "chuối", "cam", "bơ", "dưa hấu", "táo", "đu đủ"]), FISH, I("các loại đậu, hạt, ngũ cốc nguyên hạt, gạo lứt", ["đậu", "hạt", "gạo lứt", "yến mạch", "ngũ cốc"]), DAIRY],
    tip: "Ăn nhạt là quan trọng nhất: nấu ít muối, chấm nhẹ tay, đừng chan nước mắm. Uống thuốc đều theo bác sĩ, đừng tự ngưng khi thấy huyết áp đẹp.",
  },
  {
    id: "dm", name: "tiểu đường (đường huyết cao)",
    re: VN(/\b(tiểu đường|đái tháo đường|đường huyết cao|đường máu cao|tiền tiểu đường|đường huyết|tiểu ngọt)\b/),
    avoid: [
      I("nước ngọt, trà sữa, nước ép đóng chai, cà phê nhiều đường/sữa đặc", ["nước ngọt", "coca", "pepsi", "nước có ga", "trà sữa", "sting", "nước tăng lực", "nước ép", "nước mía", "cà phê sữa", "cafe sữa", "sinh tố"], "đường dạng nước hấp thu rất nhanh, làm đường huyết vọt lên"),
      I("bánh kẹo, chè, kem, mứt, bánh ngọt", ["bánh kẹo", "kẹo", "chè", "bánh ngọt", "đồ ngọt", "kem", "bánh kem", "mứt", "sô cô la", "socola", "chocolate", "bánh flan", "bánh bông lan"]),
      I("trái cây rất ngọt ăn nhiều (sầu riêng, mít, nhãn, vải, xoài chín, chuối chín kỹ, nho)", ["sầu riêng", "mít", "nhãn", "vải", "xoài", "nho", "hồng", "chuối chín"]),
      ALCOHOL, FRIED,
    ],
    limit: [
      I("cơm trắng, bún, phở, bánh mì trắng, xôi, bánh cuốn (giảm lượng, ăn kèm nhiều rau)", ["cơm", "cơm trắng", "bún", "phở", "bánh mì", "xôi", "bánh cuốn", "mì", "hủ tiếu", "miến", "nếp", "bánh chưng"]),
      I("khoai, bắp, củ nhiều tinh bột", ["khoai", "khoai lang", "khoai tây", "bắp", "ngô", "khoai môn", "sắn", "khoai mì"]),
      I("trái cây ngọt vừa (chuối, dưa hấu, dứa) — ăn lượng nhỏ, sau bữa", ["chuối", "dưa hấu", "dứa", "thơm", "đu đủ"]),
    ],
    good: [
      I("rau xanh (ăn rau trước, cơm sau)", ["rau", "rau xanh", "rau củ", "bông cải", "súp lơ", "bắp cải", "cải", "mướp đắng", "khổ qua"]),
      I("đạm nạc: cá, thịt gà bỏ da, trứng, đậu phụ", ["cá", "thịt gà", "gà", "trứng", "đậu phụ", "đậu hũ", "thịt nạc"]),
      I("gạo lứt, yến mạch, ngũ cốc nguyên hạt", ["gạo lứt", "yến mạch", "ngũ cốc", "bánh mì đen"]),
      I("trái cây ít ngọt (ổi, bưởi, táo, cam, thanh long)", ["ổi", "bưởi", "táo", "cam", "thanh long", "trái cây"]),
      I("các loại hạt không tẩm đường", ["hạt", "hạt điều", "hạnh nhân", "óc chó", "đậu phộng", "lạc"]),
    ],
    tip: "Ăn đúng bữa, đừng bỏ bữa rồi ăn bù; nhai chậm; vận động nhẹ sau ăn (đi bộ) giúp đường huyết ổn hơn. Thực đơn và thuốc phải theo bác sĩ điều trị.",
  },
  {
    id: "lipid", name: "mỡ máu cao",
    re: VN(/\b(mỡ máu|mỡ trong máu|cholesterol|choresteron|colesterol|triglyceride|rối loạn mỡ máu|rối loạn lipid|máu nhiễm mỡ)\b/),
    avoid: [
      I("mỡ động vật, da gà, da heo, thịt ba chỉ", ["mỡ heo", "mỡ động vật", "da gà", "da heo", "thịt mỡ", "ba chỉ", "tóp mỡ", "mỡ hành"]),
      ORGAN, FRIED,
      I("bánh ngọt công nghiệp, bơ thực vật, đồ ăn nhanh", ["bánh ngọt", "bơ thực vật", "margarine", "đồ ăn nhanh", "fast food", "pizza", "hamburger", "gà rán"]),
      ALCOHOL, SODA,
    ],
    limit: [I("lòng đỏ trứng, thịt đỏ, hải sản như tôm, mực", ["trứng", "lòng đỏ", "thịt bò", "bò", "thịt đỏ", "tôm", "mực"]), SWEETS],
    good: [VEG, FISH, I("dầu thực vật (dầu ô liu, dầu mè, dầu đậu nành) thay mỡ", ["dầu ô liu", "dầu mè", "dầu thực vật", "dầu ăn"]), I("yến mạch, gạo lứt, các loại đậu, hạt", ["yến mạch", "gạo lứt", "đậu", "hạt", "óc chó", "hạnh nhân"]), FRUIT],
    tip: "Ưu tiên hấp, luộc, kho nhạt thay chiên rán; vận động đều mỗi ngày giúp giảm mỡ máu rõ rệt.",
  },
  {
    id: "stomach", name: "đau dạ dày / trào ngược",
    re: VN(/\b(đau dạ dày|viêm dạ dày|loét dạ dày|bệnh dạ dày|bị dạ dày|đau bao tử|viêm bao tử|bao tử|trào ngược|ợ chua|ợ nóng|nóng rát thượng vị|viêm hang vị|hp dạ dày)\b/),
    avoid: [
      SPICY,
      I("đồ chua (chanh, giấm, dưa muối, cóc, xoài xanh), nhất là lúc đói", ["đồ chua", "chanh", "giấm", "dưa muối", "cóc", "xoài xanh", "me", "nước chanh"]),
      I("cà phê, trà đặc (nhất là lúc đói)", ["cà phê", "cafe", "cà phê sữa", "cafe sữa", "trà đặc", "trà"], "kích thích dạ dày tiết axit"),
      ALCOHOL,
      I("nước có ga", ["nước ngọt", "nước có ga", "coca", "pepsi", "soda"]),
      FRIED,
      I("sô cô la, bạc hà, đồ quá ngọt (dễ trào ngược)", ["sô cô la", "socola", "chocolate", "bạc hà", "kẹo"]),
    ],
    limit: [I("đồ quá nóng hoặc quá lạnh, đồ nếp khó tiêu", ["đá", "nước đá", "kem", "nếp", "xôi", "bánh chưng"]), I("sữa (tuỳ người — uống vào thấy đỡ thì được, đầy bụng thì bớt)", ["sữa", "sữa tươi"])],
    good: [
      I("cháo, súp, cơm mềm, bún, bánh mì", ["cháo", "súp", "cơm", "bánh mì", "bún", "mì"]),
      I("chuối, đu đủ chín, khoai lang, bí đỏ", ["chuối", "đu đủ", "khoai lang", "bí đỏ", "khoai"]),
      I("thịt nạc, cá, trứng nấu chín mềm", ["thịt nạc", "cá", "trứng", "thịt gà", "gà"]),
      I("sữa chua ít đường (sau ăn)", ["sữa chua", "yaourt"]),
      I("mật ong, nghệ (dùng như gia vị)", ["mật ong", "nghệ", "tinh bột nghệ"]),
    ],
    tip: "Ăn đúng giờ, chia nhỏ bữa, nhai kỹ; đừng để quá đói hay quá no; không nằm ngay sau ăn (chờ 2–3 tiếng), ăn tối sớm; bớt stress, thức khuya.",
  },
  {
    id: "kidney", name: "bệnh thận / sỏi thận",
    re: VN(/\b(sỏi thận|suy thận|bệnh thận|viêm thận|thận yếu|yếu thận|sỏi tiết niệu)\b/),
    avoid: [
      I("đồ mặn, đồ chế biến sẵn, mì gói", ["mặn", "muối", "nước mắm", "dưa muối", "cà muối", "mắm", "xúc xích", "lạp xưởng", "mì gói", "mì tôm", "đồ hộp", "bim bim", "snack"], "muối làm thận làm việc nặng hơn, dễ tạo sỏi"),
      I("nước ngọt có ga (nhất là cola)", ["nước ngọt", "coca", "pepsi", "nước có ga", "soda"]),
      ALCOHOL,
      I("tự ý uống thuốc nam, thực phẩm chức năng không rõ nguồn gốc", ["thuốc nam", "thuốc bắc", "thực phẩm chức năng", "tpcn"]),
    ],
    limit: [
      I("thịt đỏ, nội tạng, hải sản (đạm động vật nhiều)", ["thịt bò", "bò", "thịt đỏ", "nội tạng", "lòng", "gan", "hải sản", "tôm", "cua", "mực"]),
      I("rau nhiều oxalat nếu có sỏi (cải bó xôi, rau dền, củ dền), trà đặc, sô cô la, đậu phộng", ["cải bó xôi", "rau chân vịt", "rau dền", "củ dền", "trà đặc", "trà", "sô cô la", "socola", "đậu phộng", "lạc"]),
    ],
    good: [
      I("uống đủ nước lọc chia đều trong ngày (trừ khi bác sĩ dặn hạn chế nước)", ["nước lọc", "nước", "uống nước"]),
      I("rau củ, trái cây tươi (cam, chanh giúp hạn chế sỏi)", ["rau", "rau xanh", "cam", "chanh", "trái cây", "dưa hấu"]),
      I("cơm, bún, khoai", ["cơm", "bún", "khoai"]),
    ],
    tip: "Suy thận/bệnh thận mạn thì lượng đạm, kali, nước phải theo đúng dặn dò của bác sĩ — mỗi giai đoạn mỗi khác, đừng tự áp dụng chung nha.",
  },
  {
    id: "liver", name: "bệnh gan (gan nhiễm mỡ, viêm gan, men gan cao)",
    re: VN(/\b(gan nhiễm mỡ|viêm gan|men gan cao|men gan|xơ gan|bệnh gan|gan yếu|nóng gan|viêm gan b|viêm gan c)\b/),
    avoid: [
      I("bia, rượu (tuyệt đối)", ["bia", "rượu", "nhậu", "bia rượu", "rượu bia", "rượu vang", "rượu đế"], "cồn trực tiếp làm tổn thương tế bào gan"),
      SODA, SWEETS, FRIED,
      I("thực phẩm mốc (đậu phộng, bắp, gạo để lâu bị mốc)", ["mốc", "đậu phộng mốc", "lạc mốc"], "nấm mốc sinh độc tố hại gan"),
      I("tự ý uống thuốc nam, thực phẩm chức năng \"giải độc gan\"", ["thuốc nam", "thuốc bắc", "thực phẩm chức năng", "tpcn", "giải độc gan", "bổ gan"]),
    ],
    limit: [I("mỡ động vật, nội tạng, thịt đỏ", ["mỡ heo", "mỡ động vật", "nội tạng", "lòng", "thịt bò", "bò", "thịt đỏ", "ba chỉ"]), I("đồ mặn (nhất là xơ gan)", ["mặn", "muối", "nước mắm", "mắm"])],
    good: [VEG, FRUIT, FISH, I("đậu phụ, trứng, thịt gà bỏ da", ["đậu phụ", "đậu hũ", "trứng", "thịt gà", "gà"]), I("ngũ cốc nguyên hạt, yến mạch", ["yến mạch", "gạo lứt", "ngũ cốc"]), WATER],
    tip: "Gan nhiễm mỡ cải thiện tốt nhất nhờ giảm cân từ từ và vận động đều. Viêm gan virus cần khám và theo dõi định kỳ.",
  },
  {
    id: "heart", name: "bệnh tim mạch",
    re: VN(/\b(bệnh tim|tim mạch|suy tim|mạch vành|thiếu máu cơ tim|đột quỵ)\b/),
    avoid: [
      I("đồ mặn, nước mắm chấm đậm, dưa cà muối", ["mặn", "muối", "nước mắm", "dưa muối", "cà muối", "mắm", "đồ mặn"]),
      PROCESSED,
      I("mỡ động vật, da, nội tạng, đồ chiên rán", ["mỡ heo", "mỡ động vật", "da gà", "nội tạng", "lòng", "chiên", "rán", "gà rán", "ba chỉ"]),
      ALCOHOL,
      I("nước tăng lực, cà phê đặc", ["nước tăng lực", "sting", "redbull", "cà phê", "cafe", "trà đặc"]),
    ],
    limit: [SWEETS, I("thịt đỏ", ["thịt bò", "bò", "thịt đỏ"])],
    good: [VEG, FRUIT, FISH, I("các loại đậu, hạt, ngũ cốc nguyên hạt", ["đậu", "hạt", "yến mạch", "gạo lứt"]), I("dầu thực vật thay mỡ", ["dầu ô liu", "dầu thực vật", "dầu mè"])],
    tip: "Ăn nhạt, bỏ thuốc lá, vận động theo sức; suy tim có khi phải hạn chế cả lượng nước — hỏi bác sĩ tim mạch cho đúng.",
  },
  {
    id: "anemia", name: "thiếu máu (thiếu sắt)",
    re: VN(/\b(thiếu máu(?! não| cơ tim)|thiếu sắt)\b/),
    avoid: [I("uống trà, cà phê ngay trong hoặc sau bữa ăn", ["trà", "cà phê", "cafe", "trà đặc"], "làm giảm hấp thu sắt — nên uống cách bữa ăn 1–2 tiếng")],
    limit: [I("sữa, canxi uống cùng lúc với bữa giàu sắt", ["sữa", "canxi"])],
    good: [
      I("thịt đỏ nạc (bò), thịt gà, cá", ["thịt bò", "bò", "thịt đỏ", "thịt gà", "gà", "cá", "thịt nạc"]),
      I("gan, tiết (ăn vừa phải, nấu chín)", ["gan", "tiết", "huyết", "gan gà", "gan heo"]),
      I("trứng, đậu, rau xanh đậm (rau dền, cải bó xôi, rau ngót)", ["trứng", "đậu", "rau dền", "cải bó xôi", "rau ngót", "rau muống", "rau xanh", "rau"]),
      I("trái cây nhiều vitamin C ăn kèm (cam, ổi, bưởi) giúp hấp thu sắt", ["cam", "ổi", "bưởi", "chanh", "trái cây"]),
    ],
    tip: "Thiếu máu có nhiều nguyên nhân (không chỉ thiếu sắt) — nên xét nghiệm để biết đúng loại trước khi tự bổ sung viên sắt.",
  },
  {
    id: "dengue", name: "sốt xuất huyết",
    re: VR(/\b(sot xuat huyet|sxh|dengue)\b/),
    avoid: [
      I("đồ ăn uống màu đỏ, đen, nâu (thanh long ruột đỏ, củ dền, sô cô la, coca, cà phê)", ["thanh long", "thanh long đỏ", "củ dền", "sô cô la", "socola", "coca", "cà phê", "cafe", "nước ngọt", "tiết", "tiết canh"], "để không nhầm với dấu hiệu xuất huyết khi nôn ra hoặc đi ngoài"),
      I("đồ cay nóng, chiên rán, khó tiêu", ["cay", "chiên", "rán", "ớt", "đồ chiên"]),
      ALCOHOL,
    ],
    good: [
      I("uống nhiều nước: nước lọc, oresol pha đúng hướng dẫn, nước cam, nước dừa, nước chanh", ["nước lọc", "nước", "oresol", "nước cam", "nước dừa", "cam", "dừa", "nước chanh"]),
      I("cháo, súp, sữa, đồ mềm dễ tiêu", ["cháo", "súp", "sữa", "sữa chua"]),
    ],
    tip: "Không tự ý dùng thuốc giảm đau ngoài hướng dẫn của bác sĩ. Đau bụng nhiều, nôn liên tục, chảy máu cam/chân răng, lừ đừ → đi viện ngay (gọi 115).",
  },
  {
    id: "cold", name: "cảm cúm, sốt, ho, viêm họng",
    re: VN(/\b(cảm cúm|cảm lạnh|bị cúm|bị cảm lạnh|đang sốt|bị sốt|viêm họng|đau họng|bị ho|đang ho|ho khan|ho có đờm|ho đờm|ho nhiều|sổ mũi|nghẹt mũi|bị cảm (nên|ăn|uống|kiêng|thì))\b/),
    avoid: [
      I("đồ lạnh, nước đá, kem", ["đá", "nước đá", "kem", "đồ lạnh", "trà đá", "trà sữa"]),
      I("đồ chiên rán, cay nóng (dễ kích thích họng)", ["chiên", "rán", "cay", "ớt", "gà rán", "đồ chiên", "khoai tây chiên"]),
      ALCOHOL,
      I("đồ quá ngọt", ["kẹo", "bánh kẹo", "nước ngọt", "đồ ngọt"]),
    ],
    good: [
      I("cháo, súp, canh ấm (cháo hành, cháo gà)", ["cháo", "súp", "canh", "cháo hành", "cháo gà"]),
      I("nước ấm, trà gừng, chanh mật ong (trẻ dưới 1 tuổi không dùng mật ong)", ["nước ấm", "trà gừng", "gừng", "mật ong", "chanh", "chanh mật ong", "nước"]),
      I("trái cây nhiều vitamin C (cam, bưởi, ổi, kiwi)", ["cam", "bưởi", "ổi", "kiwi", "trái cây"]),
    ],
    myth: "Kiêng tắm, kiêng gió hoàn toàn là không cần — tắm nhanh bằng nước ấm, lau khô ngay thì vẫn được nha.",
  },
  {
    id: "diarrhea", name: "tiêu chảy, rối loạn tiêu hoá",
    re: VN(/\b(tiêu chảy|đi ngoài nhiều|đi ngoài lỏng|ngộ độc thức ăn|rối loạn tiêu hoá|đau bụng đi ngoài|đi cầu lỏng|bị tào tháo)\b/),
    avoid: [
      I("sữa tươi, đồ nhiều dầu mỡ", ["sữa", "sữa tươi", "dầu mỡ", "chiên", "rán", "mỡ heo"]),
      I("rau sống, đồ sống, đồ lên men (mắm, dưa chua)", ["rau sống", "gỏi", "sushi", "tái", "mắm", "dưa chua", "dưa muối", "đồ sống"]),
      SPICY, I("cà phê, rượu bia, nước ngọt", ["cà phê", "cafe", "bia", "rượu", "nước ngọt", "coca"]),
    ],
    good: [
      I("bù nước: oresol pha đúng hướng dẫn trên gói, nước lọc, nước cháo", ["oresol", "nước lọc", "nước", "nước cháo"]),
      I("cháo trắng, cơm nhão, bánh mì, khoai tây luộc", ["cháo", "cơm", "bánh mì", "khoai tây", "khoai"]),
      I("chuối, táo nấu chín", ["chuối", "táo"]),
      I("sữa chua (khi đã đỡ)", ["sữa chua"]),
    ],
    tip: "Đi ngoài ra máu, sốt cao, lừ đừ, khát nhiều, tiểu ít hay tiêu chảy ở trẻ nhỏ/người già → đi khám sớm.",
  },
  {
    id: "constip", name: "táo bón",
    re: VN(/\b(táo bón|khó đi ngoài|khó đi cầu|lâu đi cầu)\b/),
    avoid: [
      I("đồ chiên rán, đồ ăn nhanh", ["chiên", "rán", "gà rán", "đồ ăn nhanh", "fast food"]),
      I("ổi xanh, hồng xiêm (sapoche) xanh, chuối xanh", ["ổi", "hồng xiêm", "sapoche", "chuối xanh"]),
      I("trà đặc, rượu bia", ["trà đặc", "trà", "bia", "rượu"]),
    ],
    limit: [I("thịt đỏ, đồ nếp, bánh mì trắng", ["thịt bò", "bò", "thịt đỏ", "nếp", "xôi", "bánh mì"])],
    good: [
      I("rau xanh (rau lang, mồng tơi, rau đay)", ["rau", "rau xanh", "rau lang", "mồng tơi", "rau đay", "rau muống"]),
      I("trái cây: đu đủ chín, chuối chín, thanh long, bưởi, mận", ["đu đủ", "chuối", "chuối chín", "thanh long", "bưởi", "mận", "cam", "trái cây"]),
      I("khoai lang, yến mạch, gạo lứt", ["khoai lang", "yến mạch", "gạo lứt"]),
      I("uống đủ nước, sữa chua", ["nước lọc", "nước", "sữa chua"]),
    ],
    tip: "Tập đi vệ sinh giờ cố định, vận động nhẹ mỗi ngày.",
  },
  {
    id: "hemorrhoid", name: "bệnh trĩ",
    re: VN(/\b(bệnh trĩ|bị trĩ|trĩ nội|trĩ ngoại|trĩ hỗn hợp)\b/),
    avoid: [SPICY, ALCOHOL, I("đồ chiên, đồ ăn nhanh, ít rau", ["chiên", "rán", "gà rán", "đồ ăn nhanh"]), I("cà phê, trà đặc", ["cà phê", "cafe", "trà đặc"])],
    good: [I("rau xanh, trái cây nhiều chất xơ (đu đủ, chuối chín, thanh long)", ["rau", "rau xanh", "đu đủ", "chuối", "thanh long", "trái cây"]), I("khoai lang, yến mạch, gạo lứt", ["khoai lang", "yến mạch", "gạo lứt"]), WATER],
    tip: "Tránh ngồi lâu, rặn mạnh; chảy máu nhiều hay búi trĩ không tự co lên → khám Hậu môn – Trực tràng.",
  },
  {
    id: "allergy", name: "dị ứng, nổi mề đay",
    re: VN(/\b(dị ứng|mề đay|nổi mề đay|nổi mẩn ngứa|mẩn ngứa|nổi mẩn đỏ)\b/),
    avoid: [
      I("món từng làm mình nổi dị ứng", []),
      // 15/10 (audit): bỏ "kiêng hải sản / đồ lên men khi đang nổi" cho MỌI người — chưa có nguồn; chỉ tránh đúng món mình dị ứng.
      ALCOHOL,
    ],
    limit: [I("đậu phộng, trứng, sữa bò (với người vốn dị ứng)", ["đậu phộng", "lạc", "trứng", "sữa", "sữa bò"])],
    good: [VEG, FRUIT, WATER],
    tip: "Sưng môi, mắt, khó thở, choáng sau khi ăn → đi cấp cứu ngay (gọi 115).",
  },
  {
    id: "acne", name: "da nổi mụn",
    re: VN(/\b(nổi mụn|bị mụn|mụn trứng cá|mụn ẩn|mụn viêm|mụn bọc|da mụn)\b/),
    avoid: [I("đồ ngọt, trà sữa, nước ngọt", ["đồ ngọt", "trà sữa", "nước ngọt", "bánh kẹo", "kẹo", "chè"]), I("đồ chiên rán, cay nóng", ["chiên", "rán", "cay", "gà rán"])],
    limit: [I("sữa bò (với một số người làm mụn nhiều hơn)", ["sữa", "sữa bò", "sữa tươi"])],
    good: [VEG, FRUIT, FISH, WATER],
    tip: "Ngủ đủ, rửa mặt nhẹ nhàng, không nặn mụn; mụn viêm nhiều thì khám Da liễu.",
  },
  {
    id: "ibs", name: "viêm đại tràng / hội chứng ruột kích thích",
    re: VN(/\b(đại tràng|viêm đại tràng|ruột kích thích|ibs)\b/),
    avoid: [
      I("đồ sống, tái, rau sống", ["gỏi", "sushi", "tái", "rau sống", "đồ sống"]),
      SPICY, I("rượu bia, cà phê, nước có ga", ["bia", "rượu", "cà phê", "cafe", "nước ngọt", "nước có ga"]),
      I("đồ nhiều dầu mỡ, đồ chiên", ["chiên", "rán", "dầu mỡ", "mỡ heo"]),
      I("sữa (nếu uống vào đầy bụng, tiêu chảy)", ["sữa", "sữa tươi"]),
    ],
    limit: [I("hành, tỏi sống, các loại đậu, bắp cải (dễ đầy hơi)", ["hành", "tỏi", "đậu", "bắp cải"])],
    good: [I("đồ nấu chín mềm: cháo, cơm, canh", ["cháo", "cơm", "canh", "súp"]), I("chuối chín, khoai, bí đỏ", ["chuối", "khoai", "bí đỏ", "khoai lang"]), I("sữa chua", ["sữa chua"]), I("thịt nạc, cá, trứng nấu chín", ["thịt nạc", "cá", "trứng", "gà"])],
    tip: "Ghi lại món nào ăn vào bị đau/đầy để tự tránh; ăn đúng giờ, bớt căng thẳng.",
  },
  {
    id: "pregnant", name: "đang mang thai",
    re: VN(/\b(mang thai|có bầu|có thai|bầu bí|đang bầu|bà bầu|mang bầu|thai kỳ|thai kì|bầu (ăn|uống|có được|nên|kiêng))\b/),
    avoid: [
      ALCOHOL,
      I("đồ sống, tái (gỏi, sushi, thịt tái, trứng lòng đào), pa tê, phô mai mềm chưa tiệt trùng", ["gỏi", "sushi", "sashimi", "tái", "phở tái", "bò tái", "trứng lòng đào", "pate", "pa tê", "phô mai", "đồ sống", "hàu sống"], "nguy cơ nhiễm khuẩn (Listeria), ký sinh trùng hại thai"),
      I("cá nhiều thuỷ ngân (cá kiếm, cá mập, cá thu vua)", ["cá kiếm", "cá mập", "cá thu vua"]),
      I("đu đủ xanh, rau ngót nhiều (nhất là 3 tháng đầu)", ["đu đủ xanh", "rau ngót"]),
    ],
    limit: [I("cà phê, trà đặc, nước tăng lực", ["cà phê", "cafe", "trà", "trà đặc", "nước tăng lực"]), I("đồ ngọt, nước ngọt", ["đồ ngọt", "nước ngọt", "trà sữa", "bánh kẹo"])],
    good: [VEG, FRUIT, I("thịt, cá, trứng nấu chín kỹ", ["thịt", "cá", "trứng", "gà", "thịt bò"]), DAIRY, I("các loại đậu, hạt", ["đậu", "hạt"])],
    tip: "Rửa rau kỹ, nấu chín; thực đơn và viên bổ sung nên theo bác sĩ Sản khám thai định kỳ.",
  },
  {
    id: "wound", name: "có vết thương / mới mổ / mới xăm",
    re: VN(/\b(vết thương|sau mổ|mới mổ|vừa mổ|vết mổ|mới xăm|vừa xăm|bị thương|sau sinh mổ|mới nhổ răng|vết đứt|trầy xước)\b/),
    avoid: [ALCOHOL, I("thuốc lá", ["thuốc lá", "hút thuốc"]), I("đồ sống, đồ để lâu không vệ sinh", ["đồ sống", "gỏi", "tái"])],
    // 15/10 (audit): bỏ "đồ nếp, đồ cay làm vết thương sưng hơn" — quan niệm dân gian, chưa có nguồn.
    good: [
      I("đạm: thịt nạc, cá, trứng, sữa", ["thịt", "thịt nạc", "cá", "trứng", "sữa", "thịt gà", "gà", "thịt bò", "bò", "hải sản", "tôm"]),
      I("rau xanh, trái cây nhiều vitamin C (cam, ổi, bưởi)", ["rau", "rau xanh", "rau muống", "cam", "ổi", "bưởi", "trái cây"]),
      WATER,
    ],
    myth: "Kiêng rau muống, thịt gà, thịt bò, hải sản vì sợ sẹo lồi/thâm là quan niệm dân gian, chưa có bằng chứng rõ — sẹo lồi chủ yếu do cơ địa. Ăn đủ đạm và rau quả mới giúp vết thương mau lành (trừ khi mình dị ứng món đó).",
  },
  {
    id: "osteo", name: "loãng xương / thiếu canxi",
    re: VN(/\b(loãng xương|thiếu canxi|thiếu can xi|xương yếu)\b/),
    avoid: [I("đồ mặn", ["mặn", "muối", "nước mắm", "mắm"]), I("nước có ga, cà phê nhiều", ["nước ngọt", "coca", "nước có ga", "cà phê", "cafe"]), ALCOHOL],
    good: [I("sữa, sữa chua, phô mai", ["sữa", "sữa chua", "phô mai"]), I("cá nhỏ ăn cả xương, tôm tép", ["cá cơm", "cá nhỏ", "tép", "tôm", "tôm khô"]), I("đậu phụ, rau xanh đậm", ["đậu phụ", "đậu hũ", "rau", "rau xanh", "cải"]), I("trứng (có vitamin D) + phơi nắng sáng sớm", ["trứng"])],
    tip: "Vận động chịu sức (đi bộ, tập nhẹ) giúp xương chắc; viên canxi/vitamin D thì hỏi bác sĩ trước.",
  },
  {
    id: "asthma", name: "hen suyễn",
    re: VN(/\b(hen suyễn|hen phế quản|suyễn|bị hen)\b/),
    avoid: [
      I("món từng làm mình lên cơn hen hoặc dị ứng (hay gặp: hải sản, đậu phộng, trứng)", ["hải sản", "tôm", "cua", "đậu phộng", "lạc", "trứng"]),
      I("đồ lạnh, nước đá, kem (với người hay lên cơn khi lạnh)", ["đá", "nước đá", "kem", "đồ lạnh"]),
      I("đồ có nhiều chất bảo quản, phẩm màu (đồ khô tẩm, rượu vang, dưa muối đóng gói)", ["rượu vang", "đồ khô", "dưa muối", "mứt"]),
      ALCOHOL,
    ],
    good: [VEG, I("trái cây tươi (táo, cam, chuối)", ["trái cây", "táo", "cam", "chuối"]), FISH, WATER],
    tip: "Tránh khói thuốc, bụi, lông thú; mang theo thuốc cắt cơn bác sĩ kê. Khó thở nhiều, nói không thành câu → đi cấp cứu (115).",
  },
  {
    id: "rhinitis", name: "viêm xoang / viêm mũi dị ứng",
    re: VN(/\b(viêm xoang|viêm mũi|viêm mũi dị ứng|xoang mũi|bị xoang)\b/),
    avoid: [
      I("đồ lạnh, nước đá", ["đá", "nước đá", "kem", "đồ lạnh", "trà đá"]),
      I("đồ cay nóng, chiên rán (dễ kích ứng niêm mạc)", ["cay", "ớt", "chiên", "rán"]),
      ALCOHOL,
      I("món từng gây dị ứng cho mình", ["hải sản", "tôm", "cua"]),
    ],
    good: [I("nước ấm, canh, súp ấm", ["nước ấm", "canh", "súp", "cháo", "nước"]), I("trái cây nhiều vitamin C (cam, bưởi, ổi, kiwi)", ["cam", "bưởi", "ổi", "kiwi", "trái cây"]), I("gừng, tỏi, hành (dùng như gia vị)", ["gừng", "tỏi", "hành"]), VEG],
    tip: "Rửa mũi bằng nước muối sinh lý, giữ ấm, đeo khẩu trang khi ra đường bụi.",
  },
  {
    id: "thyroid", name: "bệnh tuyến giáp",
    re: VN(/\b(tuyến giáp|bướu cổ|cường giáp|suy giáp|nhân giáp|basedow)\b/),
    avoid: [
      I("tự ý uống thực phẩm chức năng, tảo biển liều cao, thuốc nam", ["thực phẩm chức năng", "tpcn", "thuốc nam", "tảo biển"]),
      I("cà phê, nước tăng lực (nhất là cường giáp: tim đã đập nhanh)", ["cà phê", "cafe", "nước tăng lực", "sting", "redbull"]),
      ALCOHOL,
    ],
    limit: [
      I("muối i-ốt, rong biển, hải sản — ăn vừa phải, cường giáp hay suy giáp mỗi loại một khác", ["muối", "rong biển", "hải sản", "tôm", "cá biển"]),
      I("đậu nành, bắp cải, súp lơ sống ăn quá nhiều (nấu chín thì ổn)", ["đậu nành", "đậu phụ", "bắp cải", "súp lơ", "bông cải"]),
    ],
    good: [VEG, FRUIT, I("đạm nạc: cá, thịt gà, trứng", ["cá", "thịt gà", "gà", "trứng", "thịt nạc"]), DAIRY],
    tip: "Cường giáp và suy giáp cần chế độ i-ốt khác nhau, người đã mổ/điều trị i-ốt phóng xạ lại khác nữa — hỏi bác sĩ Nội tiết cho đúng loại của mình nha.",
  },
  {
    id: "chickenpox", name: "thuỷ đậu / sởi",
    re: VN(/\b(thuỷ đậu|trai rua|bị sởi|bệnh sởi|tay chân miệng)\b/),
    avoid: [
      I("đồ cay nóng, chiên rán", ["cay", "ớt", "chiên", "rán"]),
      I("đồ quá ngọt, nước ngọt", ["kẹo", "nước ngọt", "đồ ngọt", "bánh kẹo"]),
      I("đồ cứng, chua khi miệng có vết loét", ["chua", "đồ cứng", "chanh"]),
    ],
    good: [
      I("cháo, súp, đồ mềm mát dễ nuốt", ["cháo", "súp", "canh"]),
      I("uống nhiều nước, nước trái cây (cam, dừa)", ["nước", "nước lọc", "nước cam", "nước dừa", "cam", "dừa"]),
      I("rau xanh, trái cây", ["rau", "rau xanh", "trái cây"]),
      I("thịt, cá, trứng nấu chín (vẫn ăn bình thường)", ["thịt", "cá", "trứng", "gà", "thịt gà", "thịt bò", "bò", "hải sản", "tôm"]),
    ],
    myth: "Kiêng tắm, kiêng gió, kiêng tôm cá thịt gà là quan niệm dân gian — nên tắm nhẹ bằng nước ấm, lau khô để da sạch, đỡ bội nhiễm; vẫn ăn đủ đạm để mau hồi phục (trừ món mình dị ứng).",
    tip: "Cắt móng tay, không gãi, không chọc vỡ nốt; sốt cao, lừ đừ, co giật, khó thở → đi khám ngay.",
  },
  {
    id: "breastfeed", name: "đang cho con bú / sau sinh",
    re: VN(/\b(cho con bú|đang cho bú|sau sinh|mới sinh|vừa sinh|ở cữ|mẹ bỉm|ít sữa|mất sữa|gọi sữa)\b/),
    avoid: [
      ALCOHOL,
      I("cà phê, trà đặc nhiều (vào sữa, bé dễ quấy khó ngủ)", ["cà phê", "cafe", "trà đặc", "nước tăng lực"]),
      I("cá nhiều thuỷ ngân (cá kiếm, cá mập, cá thu vua)", ["cá kiếm", "cá mập", "cá thu vua"]),
      I("tự ý uống thuốc, thực phẩm chức năng, thuốc nam lợi sữa không rõ nguồn gốc", ["thuốc nam", "thực phẩm chức năng", "tpcn", "thuốc"]),
    ],
    limit: [I("đồ quá cay, quá nhiều tỏi hành (một số bé không thích mùi sữa)", ["cay", "ớt", "tỏi", "hành"]), I("rau ngót, lá lốt, bạc hà ăn thật nhiều (dân gian cho là giảm sữa)", ["rau ngót", "lá lốt", "bạc hà"])],
    good: [
      I("uống đủ nước, sữa, canh, súp (ví dụ canh rau ngót nấu thịt, móng giò hầm đu đủ)", ["nước", "nước lọc", "sữa", "canh", "súp", "móng giò", "chân giò", "đu đủ"]),
      I("đạm: thịt, cá, trứng, đậu", ["thịt", "cá", "trứng", "đậu", "gà", "thịt bò", "bò", "tôm"]),
      I("rau xanh, trái cây (đu đủ chín, chuối, cam)", ["rau", "rau xanh", "chuối", "cam", "trái cây"]),
      I("ngũ cốc, gạo lứt, yến mạch", ["yến mạch", "gạo lứt", "ngũ cốc", "cơm"]),
    ],
    myth: "Kiêng tắm, kiêng rau, chỉ ăn thịt kho mặn cả tháng là quan niệm cũ — mẹ cần ăn đa dạng, đủ rau và tắm nhanh bằng nước ấm để sạch sẽ, đỡ viêm nhiễm.",
    tip: "Cho bé bú thường xuyên là cách kích sữa tốt nhất; mẹ ngủ bù được lúc nào thì tranh thủ nha.",
  },
  {
    id: "lowbp", name: "huyết áp thấp",
    re: VN(/\b(huyết áp thấp|tụt huyết áp|hạ huyết áp)\b/),
    avoid: [I("nhịn đói, bỏ bữa sáng", ["nhịn đói", "bỏ bữa"]), ALCOHOL, I("đứng dậy đột ngột, ở chỗ nóng lâu (không phải món ăn nhưng hay gây choáng)", [])],
    limit: [I("bữa quá no nhiều tinh bột (dễ choáng sau ăn)", ["cơm", "bún", "phở", "xôi"])],
    good: [
      I("uống đủ nước (thiếu nước làm huyết áp tụt)", ["nước", "nước lọc", "oresol"]),
      I("chia nhỏ nhiều bữa trong ngày", []),
      I("thịt, cá, trứng, sữa; rau xanh và trái cây", ["thịt", "cá", "trứng", "sữa", "rau", "trái cây"]),
      I("một ly trà/cà phê nhẹ buổi sáng (nếu hợp)", ["trà", "cà phê", "cafe", "trà gừng", "gừng"]),
    ],
    tip: "Choáng thì ngồi/nằm xuống ngay, kê cao chân. Ngất, đau ngực, khó thở → đi cấp cứu.",
  },
  {
    id: "uti", name: "viêm đường tiết niệu / viêm bàng quang",
    re: VN(/\b(viêm đường tiết niệu|nhiễm trùng tiết niệu|viêm bàng quang|tiểu buốt|tiểu rắt|tiểu gắt)\b/),
    avoid: [
      I("nhịn tiểu, uống ít nước", ["nhịn tiểu"]),
      I("rượu bia, cà phê, nước có ga", ["bia", "rượu", "cà phê", "cafe", "nước ngọt", "coca", "nước có ga"]),
      I("đồ cay, quá mặn", ["cay", "ớt", "mặn", "muối"]),
      I("đồ quá ngọt", ["đồ ngọt", "kẹo", "trà sữa", "nước ngọt"]),
    ],
    good: [
      I("uống nhiều nước lọc, đi tiểu đều, không nhịn", ["nước", "nước lọc", "uống nước"]),
      I("rau xanh, trái cây nhiều nước (dưa hấu, dưa leo, bí đao)", ["rau", "dưa hấu", "dưa leo", "bí đao", "trái cây"]),
      I("sữa chua", ["sữa chua"]),
    ],
    tip: "Sốt, đau hông lưng, tiểu ra máu hay đang mang thai → đi khám sớm, không tự mua kháng sinh.",
  },
  {
    id: "insomnia", name: "hay mất ngủ",
    re: VN(/\b(mất ngủ|khó ngủ|không ngủ được|ngủ không ngon|hay thức giấc|trằn trọc)\b/),
    avoid: [
      I("cà phê, trà, nước tăng lực sau khoảng 2 giờ chiều", ["cà phê", "cafe", "trà", "trà sữa", "nước tăng lực", "sting", "redbull", "coca"]),
      I("rượu bia (dễ ngủ lúc đầu nhưng hay thức giấc nửa đêm)", ["bia", "rượu", "nhậu"]),
      I("bữa tối quá no, nhiều dầu mỡ, cay; ăn khuya", ["ăn khuya", "cay", "chiên", "rán", "lẩu"]),
      I("sô cô la buổi tối", ["sô cô la", "socola", "chocolate"]),
    ],
    good: [
      I("sữa ấm, sữa chua", ["sữa", "sữa ấm", "sữa chua"]),
      I("chuối, yến mạch, các loại hạt", ["chuối", "yến mạch", "hạt", "hạnh nhân", "óc chó"]),
      I("trà thảo mộc không caffeine (hoa cúc, tim sen)", ["trà hoa cúc", "hoa cúc", "tim sen", "trà thảo mộc"]),
    ],
    tip: "Đi ngủ – thức dậy giờ cố định, cất điện thoại trước khi ngủ 30–60 phút; mất ngủ kéo dài vài tuần thì nên đi khám.",
  },
  {
    id: "migraine", name: "hay đau nửa đầu (migraine)",
    re: VN(/\b(đau nửa đầu|migraine|đau đầu vận mạch|đau đầu kinh niên|hay đau đầu)\b/),
    avoid: [
      I("nhịn đói, bỏ bữa", ["nhịn đói", "bỏ bữa"]),
      I("rượu vang đỏ, bia rượu", ["rượu vang", "bia", "rượu"]),
      I("phô mai để lâu, thịt nguội, xúc xích, đồ nhiều bột ngọt (với người nhạy cảm)", ["phô mai", "thịt nguội", "xúc xích", "bột ngọt", "mì chính"]),
      I("uống cà phê thất thường (lúc nhiều lúc bỏ)", ["cà phê", "cafe"]),
    ],
    good: [WATER, VEG, I("ăn đúng bữa, đủ đạm (cá, trứng, thịt nạc)", ["cá", "trứng", "thịt nạc", "thịt gà"]), I("các loại hạt, chuối, rau xanh đậm (nhiều magie)", ["hạt", "chuối", "rau xanh", "hạnh nhân"])],
    tip: "Ghi nhật ký cơn đau (ăn gì, ngủ ra sao) để tìm “thủ phạm” riêng của mình. Đau đầu dữ dội đột ngột, yếu tay chân, nói ngọng → đi cấp cứu ngay.",
  },
];

const DIET_ASK = VN(/\b(kiêng|kiêng gì|kiêng cữ|kiêng khem|ăn gì|uống gì|ăn được|uống được|ăn dc|uống dc|ăn đc|uống đc|được ăn|được uống|nên ăn|nên uống|không nên ăn|không nên uống|tránh ăn|tránh uống|tránh gì|thực đơn|chế độ ăn|ăn uống|ăn có sao|uống có sao|có ăn được|có uống được|nên tránh|món gì|đồ ăn|thực phẩm)\b/);
const CAN_ASK = VN(/\b(được (không|ko|k|hong|hongx|hông|hok|hk|kh|hả|ha|chứ|khum)|(?:dc|đc) (không|ko|k|hong|hongx|hông|hok|hk|kh|khum)|được k|có sao|có sao không|có sao ko|có hại|có ảnh hưởng|có bị sao|ăn nhiều|uống nhiều|có nên|nên không|nên ko)\b/);

const CHIP = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Tìm món người dùng nhắc trong nhóm của 1 bệnh (khớp CÓ DẤU; cụm ≥2 chữ khớp cả không dấu). */
function findItem(text: string, items: Item[], condPhrase = ""): { item: Item; word: string } | null {
  const acc = ` ${CHIP(text)} `;
  const bare = ` ${normalizeVi(text)} `;
  let best: { item: Item; word: string } | null = null;
  for (const it of items)
    for (const k of it.k) {
      const kk = CHIP(k);
      // Bỏ qua chữ nằm sẵn trong tên bệnh ("tiêu" trong "tiêu chảy", "mỡ" trong "mỡ máu", "chua" trong "ợ chua").
      if (condPhrase && ` ${condPhrase} `.includes(` ${normalizeVi(kk)} `)) continue;
      const hit = acc.includes(` ${kk} `) || (kk.includes(" ") && bare.includes(` ${normalizeVi(kk)} `));
      // Ưu tiên từ khoá dài hơn ("thịt chó" hơn "chó", "cà phê sữa" hơn "cà phê").
      if (hit && (!best || kk.length > best.word.length)) best = { item: it, word: kk };
    }
  return best;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NOTE = "(Kiến thức phổ thông Lomi tổng hợp, **chưa gắn nguồn y khoa cụ thể** — mỗi người mỗi khác, nhất là đang uống thuốc hay có nhiều bệnh cùng lúc, bạn hỏi thêm bác sĩ đang điều trị nha 🩺)";

// 15/10 (audit): bảng kiêng cữ cũ này CHƯA có nguồn. Bệnh nào đã có thẻ CÓ NGUỒN trong kho kiến thức (lib/medkb) thì lời đáp lấy từ thẻ
//   (AiAssistant đổi sang renderMed); bảng cũ chỉ còn dùng cho phần thẻ chưa có (vd vết thương / mới mổ).
export const DIET_MEDKB: Record<string, string> = {
  gout: "gout", htn: "tang-huyet-ap", dm: "tieu-duong", lipid: "mo-mau-cao", stomach: "viem-da-day", kidney: "benh-than-man",
  liver: "gan-nhiem-mo", heart: "benh-mach-vanh", anemia: "thieu-mau", dengue: "sot-xuat-huyet", cold: "cam-lanh", diarrhea: "tieu-chay",
  constip: "tao-bon", hemorrhoid: "tri", allergy: "di-ung-thuc-pham", acne: "mun-trung-ca", ibs: "hoi-chung-ruot-kich-thich",
  pregnant: "an-uong-khi-mang-thai", osteo: "loang-xuong", asthma: "hen-suyen", rhinitis: "viem-mui-di-ung", thyroid: "suy-giap",
  chickenpox: "thuy-dau", breastfeed: "an-uong-khi-cho-con-bu", lowbp: "huyet-ap-thap", uti: "nhiem-trung-duong-tiet-nieu",
  insomnia: "mat-ngu", migraine: "migraine",
};

function fullList(d: Diet): string {
  const line = (xs: Item[]) => xs.filter((x) => x.t).map((x) => `• ${cap(x.t)}`).join("\n");
  const out = [`🥗 **${cap(d.name)} nên ăn uống thế nào?**`, `🚫 **Nên tránh:**\n${line(d.avoid)}`];
  if (d.limit?.length) out.push(`⚠️ **Ăn vừa phải:**\n${line(d.limit)}`);
  out.push(`✅ **Nên ăn:**\n${line(d.good)}`);
  if (d.myth) out.push(`💬 ${d.myth}`);
  if (d.tip) out.push(`💡 ${d.tip}`);
  out.push(NOTE);
  return out.join("\n\n");
}

export type DietResult = { text: string; diet: string; /** món được hỏi (chữ người dùng gõ), nếu là câu hỏi một món */ food?: string };

/**
 * "bị gout kiêng gì" → danh sách; "gout ăn thịt chó được không" → trả lời đúng món đó.
 * `prevDiet`: bệnh đã nói ở tin trước — cho câu nối tiếp kiểu "còn bia thì sao", "ăn tôm được k".
 */
export function dietReply(text: string, prevDiet?: string, inDiet = false): DietResult | null {
  const n = ` ${normStrict(text, HEALTH)} `;
  let d = DIETS.find((x) => x.re.test(n));
  const condPhrase = d ? (n.match(d.re)?.[0] ?? "") : "";
  const fromPrev = !d && !!prevDiet;
  if (!d && prevDiet) d = DIETS.find((x) => x.id === prevDiet);
  if (!d) return null;
  const all = [...d.avoid, ...(d.limit ?? []), ...d.good];
  const hit = findItem(text, all, condPhrase);
  // Nối tiếp từ tin trước: phải nhắc đúng 1 món hoặc hỏi kiểu "còn … thì sao / ăn gì nữa".
  if (fromPrev && !hit && !VN(/\b(còn gì nữa|ăn gì nữa|kiêng gì nữa|còn nữa|thêm nữa)\b/).test(n)) return null;
  // Hỏi chung chung về bệnh ("bị sỏi thận thì sao?", "mỡ máu á") khi đang nói chuyện ăn uống / kiêng cữ → vẫn trả lời danh sách.
  const vague = VN(/\b(thì sao|thế nào|làm sao|ra sao|sao ạ|sao à|sao ta|sao nhỉ|thì như nào|thì làm gì)\b/).test(n);
  if (!fromPrev && !hit && !DIET_ASK.test(n) && !vague && !inDiet) return null;
  if (!fromPrev && hit && !DIET_ASK.test(n) && !CAN_ASK.test(n) && !VN(/\b(thì sao|sao)\b/).test(n)) return null;
  if (!hit) return { text: fullList(d), diet: d.id };

  const w = hit.word;
  const verb = VR(/\b(uong|nhau)\b/).test(n) ? "uống" : "ăn";
  const why = hit.item.why ? ` — ${hit.item.why}` : "";
  let head: string;
  if (d.avoid.includes(hit.item)) head = `🚫 **${cap(d.name)} thì nên tránh ${w} nha.** Món này thuộc nhóm ${hit.item.t}${why}.`;
  else if (d.limit?.includes(hit.item)) head = `⚠️ **${cap(d.name)} vẫn ${verb} ${w} được, nhưng vừa phải thôi nha.** (Nhóm ${hit.item.t}${why}.)`;
  else head = `✅ **${cap(d.name)} ${verb} ${w} được nha, còn tốt nữa.** (Nhóm ${hit.item.t}${why}.)`;
  const avoidShort = d.avoid.filter((x) => x !== hit.item && x.t).slice(0, 4).map((x) => x.t).join("; ");
  const more = avoidShort ? `\n\nNgoài ra ${d.name} nên hạn chế: ${avoidShort}. Muốn xem đầy đủ thì hỏi "${d.name.split(" (")[0]} kiêng gì" nha.` : "";
  return { text: `${head}${more}\n\n${NOTE}`, diet: d.id, food: w };
}

/** Tên gọi của một bệnh trong bảng kiêng cữ (vd "bị gout (gút)", "huyết áp cao") — lib/lomiHealthTopic dùng làm chủ thể sức khoẻ. */
export function dietName(id: string): string | undefined {
  return DIETS.find((x) => x.id === id)?.name;
}

/** Bệnh nhắc trong 1 câu (vd tin trước "mình bị đau dạ dày") — để câu sau "uống cà phê được không" hiểu đúng. */
export function dietOf(text: string): string | undefined {
  const n = ` ${normStrict(text, HEALTH)} `;
  return DIETS.find((x) => x.re.test(n))?.id;
}
