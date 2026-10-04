// ─────────────────────────────────────────────────────────────────────────────
// TỪ ĐIỂN TRIỆU CHỨNG & CẢM XÚC CỦA LOMI (30/09 r4, theo ý Kir) — chạy trên máy, không gọi AI.
//
// 1) SỨC KHOẺ: nhận các triệu chứng trong câu (A, B, C…) → chấm điểm các bệnh hay gặp (D, E…)
//    → nói rõ: bạn đang có gì · hay gặp ở bệnh nào · nên làm gì · nên kiêng gì · khám khoa nào ·
//    khi nào phải đi cấp cứu. Triệu chứng được CỘNG DỒN qua các tin nhắn ("còn bị sốt nữa").
// 2) TÂM LÝ: nhận các cảm giác (G, J, K…) → trạng thái tâm lý thường gặp → nên làm gì / tránh gì /
//    khi nào gặp chuyên gia.
//
// Nguyên tắc an toàn: chỉ là gợi ý tham khảo, KHÔNG chẩn đoán, KHÔNG kê thuốc / liều lượng.
// Dấu hiệu nguy hiểm → nhắc 115 ngay. Ý định tự hại luôn do lomiChat.crisisReply xử lý trước.
// Từ khoá viết KHÔNG DẤU (đã qua normalizeVi) — cẩn thận chữ trùng: "sot" (sốt/sót), "ho" (ho/họ),
// "non" (nôn/non), "ngat" (ngất/ngắt), "dau co" (đau cổ/đâu có)… nên luôn dùng cụm từ.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeVi } from "@/lib/lomiFaq";
import { HEALTH, HEART, normStrict } from "@/lib/lomiAccent";

type Sym = { id: string; label: string; re: RegExp; red?: string };

// ═══════════════════════ TRIỆU CHỨNG CƠ THỂ ═══════════════════════
const SYMPTOMS: Sym[] = [
  // Toàn thân
  { id: "fever", label: "sốt", re: /\b((bi|dang|hoi|phat|con|van|lai|them|co) sot|sot (cao|nhe|hoai|lien|keo dai|ve dem|ve chieu|mien man|\d+)|nong sot|sot ret)\b/ },
  { id: "highfever", label: "sốt cao", re: /\b(sot cao|sot (39|40|41)|sot tren 39)\b/ },
  { id: "chills", label: "ớn lạnh", re: /\b(on lanh|lanh run|run minh|gai oc|rung minh)\b/ },
  { id: "fatigue", label: "mệt mỏi", re: /\b(met moi|met lu|u oai|kiet suc|duoi suc|khong co suc|mat suc|met nhieu|hoi met|thay met|bi met|dang met|met met|met ca nguoi|nguoi met)\b/ },
  { id: "bodyache", label: "đau nhức mình mẩy", re: /\b(dau nhuc (nguoi|minh|toan than|co)|nhuc moi|dau minh may|moi het nguoi|dau nhuc|nhuc xuong|dau co bap|e am)\b/ },
  { id: "sweat", label: "đổ mồ hôi nhiều", re: /\b(do mo hoi|ra mo hoi nhieu|va mo hoi|mo hoi dem|toat mo hoi)\b/ },
  { id: "weightloss", label: "sụt cân", re: /\b(sut can|gay sut|giam can khong ro ly do|tu nhien gay)\b/ },
  { id: "thirst", label: "khát nước nhiều", re: /\b(khat nuoc nhieu|hay khat|khat lien tuc|luc nao cung khat)\b/ },
  { id: "pale", label: "da xanh xao", re: /\b(xanh xao|da xanh|nhot nhat|mat xanh)\b/ },
  { id: "dizzy", label: "chóng mặt", re: /\b((bi|hay|de|hoi) chong mat|chong mat (qua|hoa mat|buon non|khi dung|khi quay|khi doi tu the)|hoa mat|choang vang|xay xam|quay cuong)\b/ },
  { id: "faint", label: "ngất xỉu", re: /\b(ngat xiu|bi ngat|xiu di|ngat di|bat tinh|lim di)\b/, red: "ngất, bất tỉnh" },
  { id: "chestpain", label: "đau ngực", re: /\b(dau nguc|tuc nguc|nang nguc|dau that nguc|dau nhoi nguc)\b/, red: "đau hoặc tức ngực" },
  { id: "palp", label: "tim đập nhanh", re: /\b(tim dap nhanh|tim dap manh|tim dap loan|hoi hop danh trong nguc|danh trong nguc)\b/ },
  { id: "breath", label: "khó thở", re: /\b(kho tho|tho doc|hut hoi|tho khong noi|nghet tho|tho kho khan)\b/ },
  { id: "severebreath", label: "khó thở nặng", re: /\b(kho tho (nang|du doi|lam|qua)|tim tai|moi tim|khong tho duoc)\b/, red: "khó thở nặng, tím môi" },
  { id: "stroke", label: "yếu / tê nửa người, méo miệng, nói khó", re: /\b(yeu nua nguoi|liet nua nguoi|te nua nguoi|meo mieng|meo mat|noi ngong|noi kho dot ngot|noi lap bap dot ngot)\b/, red: "yếu liệt nửa người, méo miệng, nói khó (dấu hiệu đột quỵ)" },
  { id: "seizure", label: "co giật", re: /\b(co giat|len con giat)\b/, red: "co giật" },
  { id: "swellface", label: "sưng môi / mặt", re: /\b(sung moi|sung mat|phu mat|sung mi mat|sung hong)\b/ },
  { id: "bleed", label: "chảy máu bất thường", re: /\b(chay mau cam|chay mau chan rang|cham do tren da|xuat huyet duoi da|bam tim de|chay mau khong cam)\b/ },
  // Đầu, mắt, tai, mũi, họng
  { id: "headache", label: "đau đầu", re: /\b(dau dau|nhuc dau|dau nua dau|dau vung tran|dau vung dinh|dau sau gay|dau bua bo)\b/ },
  { id: "suddenhead", label: "đau đầu dữ dội đột ngột", re: /\b(dau dau (du doi|dot ngot|nhu bua bo|nhat tu truoc toi gio))\b/, red: "đau đầu dữ dội đột ngột" },
  { id: "eyepain", label: "đau hốc mắt", re: /\b(dau hoc mat|dau sau mat|nhuc hoc mat)\b/ },
  { id: "light", label: "sợ ánh sáng / tiếng ồn", re: /\b(so anh sang|choi mat|so tieng on|kho chiu voi anh sang)\b/ },
  { id: "redeye", label: "đỏ mắt", re: /\b(do mat|mat do|mat bi do|ghen mat|nhieu ghen)\b/ },
  { id: "itcheye", label: "ngứa / chảy nước mắt", re: /\b(ngua mat|chay nuoc mat|cay mat|xot mat)\b/ },
  { id: "dryeye", label: "khô mỏi mắt", re: /\b(kho mat|(bi|hay|de) moi mat|moi mat (qua|khi|lam|hoai)|mat moi|mo mat khi nhin lau|nhuc mat)\b/ },
  { id: "earpain", label: "đau tai / ù tai", re: /\b(dau tai|u tai|chay mu tai|chay nuoc tai|nghe kem|nghe khong ro)\b/ },
  { id: "stuffy", label: "nghẹt mũi", re: /\b(nghet mui|ngat mui|tac mui|kho tho bang mui)\b/ },
  { id: "runny", label: "chảy nước mũi", re: /\b(chay mui|so mui|chay nuoc mui|nuoc mui trong)\b/ },
  { id: "sneeze", label: "hắt hơi", re: /\b(hat hoi|hat xi)\b/ },
  { id: "yellowmucus", label: "dịch mũi vàng xanh", re: /\b(mui vang|mui xanh|dich mui vang|dich mui xanh|nuoc mui vang|nuoc mui xanh|chay mu mui)\b/ },
  { id: "facepain", label: "đau nhức vùng mặt / trán", re: /\b(dau nhuc mat|nhuc vung mat|dau vung ma|dau nhuc tran|nang mat|dau quanh mui)\b/ },
  { id: "smell", label: "mất mùi / vị", re: /\b(mat khu giac|mat vi giac|khong ngui duoc mui|khong ngui thay mui|an khong co vi|mat mui)\b/ },
  { id: "spray", label: "dùng thuốc xịt thông mũi lâu", re: /\b(otilin|otrivin|naphazolin|xylometazolin|thuoc xit mui|xit mui (hoai|hang ngay|moi ngay|lau|thuong xuyen)|khong xit khong tho duoc)\b/ },
  { id: "sorethroat", label: "đau họng", re: /\b(dau hong(?! lung| ben| phai| trai| mot ben)|rat hong|viem hong|nuot dau|dau khi nuot|ngua hong|vuong hong)\b/ },
  { id: "hoarse", label: "khàn tiếng", re: /\b(khan tieng|mat tieng|khan giong)\b/ },
  { id: "cough", label: "ho", re: /\b((bi|dang|con|hay|van|lai|them|nay|may nay|mat) ho|ho (khan|co dom|nhieu|hoai|dai|keo dai|ve dem|lien tuc|sac sua|khong dut|suot|qua(?! dang)|ghe|lam|mai|hoai))\b/ },
  { id: "phlegm", label: "ho có đờm", re: /\b(ho co dom|khac dom|dom vang|dom xanh|nhieu dom|co dom)\b/ },
  { id: "wheeze", label: "thở khò khè", re: /\b(kho khe|tho rit|tho khe khe)\b/ },
  { id: "bloodcough", label: "ho ra máu", re: /\b(ho ra mau|khac ra mau)\b/, red: "ho ra máu" },
  { id: "mouthulcer", label: "loét miệng", re: /\b(loet mieng|nhiet mieng|lo mieng|nhiet luoi)\b/ },
  { id: "toothache", label: "đau răng / chảy máu chân răng", re: /\b(dau rang|e buot rang|sung loi|sung nuou|chay mau nuou|sau rang|rang e)\b/ },
  // Tiêu hoá
  { id: "nausea", label: "buồn nôn / nôn", re: /\b(buon non|oi mua|muon oi|(bi|dang|hay|muon) non|non (ra|mua|nhieu|hoai|lien tuc|oi)|oi ra)\b/ },
  { id: "vomitblood", label: "nôn ra máu", re: /\b(non ra mau|oi ra mau)\b/, red: "nôn ra máu" },
  { id: "epigastric", label: "đau vùng thượng vị (trên rốn)", re: /\b(dau thuong vi|dau vung thuong vi|dau tren ron|dau bao tu|dau da day|cuon ruot|xot ruot|dau bung luc doi|dau bung khi doi)\b/ },
  { id: "heartburn", label: "ợ chua / nóng rát ngực", re: /\b(o chua|o nong|o hoi|trao nguoc|nong rat (nguc|thuong vi|co hong)|dang mieng|chua mieng)\b/ },
  { id: "bloat", label: "đầy bụng, khó tiêu", re: /\b(day bung|chuong bung|kho tieu|an khong tieu|bung anh ach|xi hoi nhieu)\b/ },
  { id: "bellyache", label: "đau bụng", re: /\b(dau bung|quan bung|dau quan bung|dau tuc bung)\b/ },
  { id: "rightlow", label: "đau bụng dưới bên phải", re: /\b(dau bung duoi ben phai|dau ho chau phai|dau bung phai|dau quanh ron roi lan xuong ben phai)\b/, red: "đau bụng dưới bên phải tăng dần (cần loại trừ ruột thừa)" },
  { id: "diarrhea", label: "tiêu chảy", re: /\b(tieu chay|di ngoai nhieu|phan long|di cau nhieu|di toilet lien tuc|dau bung di ngoai)\b/ },
  { id: "constip", label: "táo bón", re: /\b(tao bon|kho di ngoai|lau khong di ngoai|phan cung|di cau kho)\b/ },
  { id: "bloodstool", label: "đi ngoài ra máu / phân đen", re: /\b(di ngoai ra mau|phan co mau|phan den|di cau ra mau)\b/, red: "đi ngoài ra máu hoặc phân đen" },
  { id: "analpain", label: "đau / sưng hậu môn", re: /\b(dau hau mon|sung hau mon|ngua hau mon|co cuc o hau mon|bi tri|noi tri|ngoai tri)\b/ },
  { id: "noappetite", label: "chán ăn", re: /\b(chan an|an khong ngon|bieng an|khong muon an)\b/ },
  { id: "yellow", label: "vàng da / vàng mắt", re: /\b(vang da|da vang|vang mat|mat vang|nuoc tieu sam)\b/ },
  { id: "afterfood", label: "khó chịu sau khi ăn", re: /\b(sau khi an|an xong|an do an la|an do song|an hai san|an quan|an do de lau|an oc|an goi|an tiet canh|an do de qua dem|an via he|an do la|an nham)\b/ },
  { id: "skipmeal", label: "hay bỏ bữa", re: /\b(bo bua|bo an sang|nhin an sang|khong an sang|an uong that thuong|an khong dung bua)\b/ },
  // Tiết niệu, sinh dục
  { id: "painpee", label: "tiểu buốt, tiểu rắt", re: /\b(tieu buot|tieu rat|tieu gat|tieu dau|buot khi tieu|nong rat khi tieu|di tieu nhieu lan ma it)\b/ },
  { id: "peemuch", label: "tiểu nhiều", re: /\b(tieu nhieu|di tieu nhieu|tieu dem|hay di tieu|tieu lien tuc)\b/ },
  { id: "bloodpee", label: "tiểu ra máu", re: /\b(tieu ra mau|nuoc tieu do|nuoc tieu co mau)\b/ },
  { id: "flankpain", label: "đau lưng vùng hông / thắt lưng một bên", re: /\b(dau hongx? lung|dau hongx? (ben|phai|trai|mot ben)|dau hongx|dau than|dau vung than|dau quan than|dau lung lan xuong bung|dau mot ben hong)\b/ },
  // Cơ xương khớp
  { id: "backpain", label: "đau lưng", re: /\b(dau lung|moi lung|dau that lung|dau cot song|cung lung)\b/ },
  { id: "neckpain", label: "đau cổ vai gáy", re: /\b(dau co vai gay|moi co vai gay|dau vai gay|moi vai gay|cung co|vep co|dau co gay)\b/ },
  { id: "radiate", label: "đau / tê lan xuống tay chân", re: /\b(dau lan xuong chan|te lan xuong chan|dau lan xuong tay|te lan xuong tay|dau than kinh toa)\b/ },
  { id: "numb", label: "tê bì tay chân", re: /\b(te tay|te chan|te bi|kien bo|te dau ngon)\b/ },
  { id: "jointpain", label: "đau khớp", re: /\b(dau khop|nhuc khop|dau goi|dau dau goi|dau co tay|dau ngon chan cai|dau khop ngon)\b/ },
  { id: "jointswell", label: "sưng nóng đỏ khớp", re: /\b(sung khop|khop sung|sung do khop|sung ngon chan|ngon chan cai (sung|do|dau)|khop do nong|sung nong do|sung do dau)\b/ },
  { id: "morningstiff", label: "cứng khớp buổi sáng", re: /\b(cung khop buoi sang|sang day cung khop|cung khop)\b/ },
  { id: "cramp", label: "chuột rút", re: /\b(chuot rut|vop be|rut co)\b/ },
  // Da, tóc
  { id: "itch", label: "ngứa da", re: /\b((bi|hay|de) ngua|ngua (qua|nhieu|khap nguoi|da|ngay|ran|hoai|ve dem)|ngua ngay)\b/ },
  { id: "rash", label: "nổi mẩn, phát ban", re: /\b(di ung|noi man|phat ban|noi ban|man do|noi me day|me day|noi mun do|noi cuc|noi san)\b/ },
  { id: "blister", label: "mụn nước / phỏng nước", re: /\b(mun nuoc|phong nuoc|bong nuoc|mun rop)\b/ },
  { id: "dryskin", label: "da khô, bong tróc", re: /\b(da kho|bong troc|da bong|bong vay|troc da|nut da|da san sui)\b/ },
  { id: "acne", label: "nổi mụn", re: /\b(noi mun|bi mun|mun (viem|mu|boc|trung ca|an|dau den|nhieu)|mun o mat|mun tren mat)\b/ },
  { id: "ringworm", label: "mảng da tròn ngứa, bong vảy", re: /\b(hac lao|lang ben|nam da|vong tron ngua|mang da tron|nam ben)\b/ },
  { id: "hairloss", label: "rụng tóc", re: /\b(rung toc|toc rung|hoi dau|toc mong)\b/ },
  // Nội tiết, tim mạch
  { id: "coldhands", label: "tay chân lạnh", re: /\b(tay chan lanh|lanh tay chan|chan tay lanh|so lanh)\b/ },
  { id: "hotintol", label: "sợ nóng, run tay", re: /\b(so nong|run tay|tay run|nong trong nguoi|buc rut)\b/ },
  { id: "highbp", label: "huyết áp cao", re: /\b(huyet ap cao|tang huyet ap|cao huyet ap|huyet ap len)\b/ },
  { id: "lowbp", label: "huyết áp thấp", re: /\b(huyet ap thap|tut huyet ap|ha huyet ap|tut ap)\b/ },
  { id: "slowheal", label: "vết thương lâu lành", re: /\b(vet thuong lau lanh|lau lanh|nhiem trung hoai)\b/ },
  // Giấc ngủ
  { id: "insomnia", label: "mất ngủ", re: /\b(mat ngu|kho ngu|khong ngu duoc|ngu khong ngon|thuc giac giua dem|trang dem)\b/ },
  { id: "snore", label: "ngáy to, ngưng thở khi ngủ", re: /\b(ngay to|ngu ngay|ngung tho khi ngu|giat minh vi nghet tho)\b/ },
  { id: "sleepy", label: "buồn ngủ cả ngày", re: /\b(buon ngu ca ngay|ngu nhieu ma van met|lo mo ca ngay|ngu gat)\b/ },
  // Phụ khoa
  { id: "periodpain", label: "đau bụng kinh", re: /\b(dau bung kinh|dau khi co kinh|dau bung khi den thang)\b/ },
  { id: "irregular", label: "kinh nguyệt không đều", re: /\b(kinh khong deu|kinh nguyet khong deu|tre kinh|mat kinh|rong kinh|cuong kinh)\b/ },
  { id: "discharge", label: "khí hư bất thường", re: /\b(khi hu|huyet trang|ra dich bat thuong|ngua vung kin|vung kin co mui)\b/ },
  // Hoàn cảnh (tăng/giảm điểm một số bệnh)
  { id: "sun", label: "sau khi ở ngoài nắng nóng", re: /\b(di nang|ngoai nang|nang nong|phoi nang|lam ngoai troi)\b/ },
  { id: "screen", label: "nhìn màn hình nhiều", re: /\b(nhin man hinh|ngoi may tinh|dung dien thoai nhieu|ngoi lau)\b/ },
  { id: "coldweather", label: "khi trời lạnh / bụi", re: /\b(troi lanh|thoi tiet lanh|gio lanh|bui|phan hoa|long cho|long meo|am moc)\b/ },
  { id: "alcohol", label: "sau khi uống rượu bia", re: /\b(uong ruou|uong bia|di nhau|nhau xong|say ruou|say xin)\b/ },
  { id: "stress", label: "đang căng thẳng", re: /\b(cang thang|stress|ap luc|lo lang)\b/ },
];

type Cond = {
  id: string;
  name: string;
  sx: Record<string, number>; // triệu chứng → trọng số (3 = rất đặc trưng, 1 = hay đi kèm)
  need?: string[]; // phải có ít nhất 1 trong các triệu chứng này mới xét
  about: string;
  do: string[];
  avoid: string[];
  doctor: string; // khám khoa nào, khi nào
};

const CONDS: Cond[] = [
  // Hô hấp – tai mũi họng
  {
    id: "cold", name: "Cảm lạnh (cảm thông thường)",
    sx: { runny: 3, stuffy: 2, sneeze: 2, sorethroat: 2, cough: 1, fever: 1, headache: 1, fatigue: 1, coldweather: 1 },
    need: ["runny", "stuffy", "sneeze", "sorethroat"],
    about: "do virus, thường nhẹ và tự khỏi sau khoảng 7–10 ngày.",
    do: ["Nghỉ ngơi, ngủ đủ", "Uống nhiều nước ấm, ăn cháo súp dễ tiêu", "Súc miệng, rửa mũi bằng nước muối sinh lý", "Giữ ấm cổ, ngực, đeo khẩu trang để không lây người khác"],
    avoid: ["Tự ý dùng kháng sinh (không có tác dụng với virus)", "Đồ uống lạnh, thức khuya", "Hút thuốc lá"],
    doctor: "Khám Nội hoặc Tai Mũi Họng nếu sốt cao trên 3 ngày, khó thở, hoặc không đỡ sau 10 ngày.",
  },
  {
    id: "flu", name: "Cúm",
    sx: { fever: 3, highfever: 3, bodyache: 4, chills: 3, fatigue: 2, headache: 2, cough: 2, sorethroat: 1, runny: 1 },
    need: ["fever", "highfever", "bodyache", "chills"],
    about: "do virus cúm, thường khởi phát đột ngột với sốt, đau nhức toàn thân, mệt nhiều hơn cảm lạnh.",
    do: ["Nghỉ ngơi hoàn toàn vài ngày", "Uống đủ nước, ăn đồ lỏng dễ tiêu", "Hỏi dược sĩ/bác sĩ về thuốc hạ sốt phù hợp", "Tiêm vắc xin cúm hằng năm để phòng"],
    avoid: ["Tự ý dùng kháng sinh", "Cố đi làm, đi học khi đang sốt (dễ lây và lâu khỏi)", "Tắm nước lạnh khi đang sốt"],
    doctor: "Khám sớm nếu là người già, trẻ nhỏ, phụ nữ có thai, có bệnh nền; hoặc sốt cao kéo dài, khó thở, đau ngực.",
  },
  {
    id: "dengue", name: "Sốt xuất huyết",
    sx: { highfever: 3, fever: 2, eyepain: 3, headache: 2, bodyache: 2, rash: 2, bleed: 3, nausea: 1, fatigue: 1 },
    need: ["highfever", "fever"],
    about: "do muỗi vằn truyền, rất hay gặp ở Việt Nam. Thường sốt cao đột ngột 2–7 ngày, đau đầu, đau hốc mắt, đau cơ khớp; có thể nổi chấm đỏ, chảy máu cam/chân răng.",
    do: ["Đi khám và xét nghiệm máu sớm để chẩn đoán", "Uống thật nhiều nước (nước lọc, oresol, nước trái cây)", "Nghỉ ngơi, theo dõi sát, nhất là ngày thứ 3–7", "Diệt lăng quăng, ngủ màn, chống muỗi"],
    avoid: ["Tự dùng aspirin hoặc ibuprofen (dễ làm chảy máu nặng hơn) — thuốc hạ sốt nên theo chỉ dẫn bác sĩ", "Cạo gió, chích lể", "Chủ quan khi hết sốt — giai đoạn hết sốt vẫn có thể chuyển nặng"],
    doctor: "Khám ngay khi sốt cao đột ngột. Đi cấp cứu nếu đau bụng nhiều, nôn liên tục, chảy máu, li bì, tay chân lạnh.",
  },
  {
    id: "covid", name: "COVID-19 hoặc bệnh hô hấp do virus",
    sx: { fever: 2, cough: 2, smell: 3, sorethroat: 1, fatigue: 2, bodyache: 1, breath: 2 },
    need: ["smell", "fever", "cough"],
    about: "mất mùi/vị kèm sốt, ho là dấu hiệu gợi ý, có thể test nhanh để biết.",
    do: ["Test nhanh tại nhà hoặc cơ sở y tế", "Nghỉ ngơi, uống đủ nước, đeo khẩu trang, hạn chế tiếp xúc người già, người bệnh nền"],
    avoid: ["Tự ý dùng kháng sinh, thuốc không rõ nguồn gốc"],
    doctor: "Đi khám ngay nếu khó thở, đau tức ngực, môi tím, lơ mơ.",
  },
  {
    id: "pharyngitis", name: "Viêm họng",
    sx: { sorethroat: 3, hoarse: 2, fever: 1, cough: 1 },
    need: ["sorethroat"],
    about: "thường do virus, đôi khi do vi khuẩn; hay nặng hơn khi trời lạnh, nói nhiều, uống đồ lạnh.",
    do: ["Súc miệng nước muối ấm nhiều lần trong ngày", "Uống nước ấm, mật ong chanh ấm (không cho trẻ dưới 1 tuổi dùng mật ong)", "Giữ ấm cổ, nói ít lại"],
    avoid: ["Đá lạnh, đồ cay nóng, rượu bia, thuốc lá", "Tự mua kháng sinh uống"],
    doctor: "Khám Tai Mũi Họng nếu sốt cao, họng có mủ trắng, nuốt quá đau hoặc kéo dài trên 1 tuần.",
  },
  {
    id: "sinusitis", name: "Viêm xoang",
    sx: { stuffy: 2, yellowmucus: 3, facepain: 3, headache: 1, smell: 1, cough: 1, fever: 1 },
    need: ["yellowmucus", "facepain"],
    about: "xoang bị viêm, ứ dịch — hay gây nghẹt mũi, dịch mũi vàng xanh, nhức vùng trán/má, nặng hơn khi cúi đầu.",
    do: ["Rửa mũi nước muối sinh lý đều đặn", "Uống đủ nước, xông hơi ấm nhẹ", "Giữ ấm, tránh bụi, khói"],
    avoid: ["Xịt thuốc co mạch (Otilin…) kéo dài", "Tự dùng kháng sinh khi chưa khám", "Hút thuốc, khói bụi"],
    doctor: "Khám Tai Mũi Họng (có thể nội soi) nếu kéo dài trên 10 ngày, tái đi tái lại, hoặc sưng đau quanh mắt, sốt cao.",
  },
  {
    id: "allergicrhinitis", name: "Viêm mũi dị ứng",
    sx: { sneeze: 3, runny: 2, stuffy: 2, itcheye: 2, coldweather: 3 },
    need: ["sneeze", "runny", "stuffy"],
    about: "mũi “phản ứng” với bụi, mạt nhà, phấn hoa, lông thú, không khí lạnh — hắt hơi từng tràng, chảy mũi trong, ngứa mũi mắt, hay vào sáng sớm.",
    do: ["Rửa mũi nước muối sinh lý", "Giữ nhà sạch bụi, giặt chăn gối nước nóng, phơi nắng", "Đeo khẩu trang khi ra đường, giữ ấm mũi khi trời lạnh"],
    avoid: ["Thú cưng lên giường, thảm nhiều bụi", "Xịt thuốc co mạch kéo dài", "Khói thuốc, nhang, mùi hắc"],
    doctor: "Khám Tai Mũi Họng hoặc chuyên khoa Dị ứng nếu ảnh hưởng giấc ngủ, sinh hoạt — có thể xét nghiệm dị ứng và dùng thuốc phù hợp lâu dài.",
  },
  {
    id: "rhinmed", name: "Viêm mũi do lạm dụng thuốc xịt co mạch",
    sx: { spray: 5, stuffy: 3 },
    need: ["spray"],
    about: "thuốc xịt thông mũi như Otilin, Otrivin, Naphazolin chỉ nên dùng ngắn ngày (hộp thuốc thường ghi vài ngày). Dùng lâu gây “nghẹt mũi dội ngược” — hết thuốc lại nghẹt hơn, phải xịt tiếp, thành vòng lặp lệ thuộc.",
    do: ["Nói rõ với bác sĩ là bạn đang xịt thuốc co mạch thường xuyên và bao lâu rồi", "Rửa mũi nước muối sinh lý", "Nhờ bác sĩ hướng dẫn cách giảm dần và thay bằng thuốc an toàn khi dùng lâu"],
    avoid: ["Tiếp tục xịt co mạch nhiều lần mỗi ngày", "Tự ngưng đột ngột mà không có hướng dẫn (dễ nghẹt nặng, khó chịu)", "Uống thêm thuốc không rõ tác dụng"],
    doctor: "Khám Tai Mũi Họng (nên ở bệnh viện chuyên khoa), xin nội soi mũi xoang để tìm nguyên nhân gốc gây nghẹt (dị ứng, xoang, lệch vách ngăn, polyp…).",
  },
  {
    id: "bronchitis", name: "Viêm phế quản",
    sx: { cough: 3, phlegm: 3, wheeze: 1, fever: 1, fatigue: 1, breath: 1 },
    need: ["cough", "phlegm"],
    about: "đường thở bị viêm, ho nhiều có đờm, thường sau một đợt cảm.",
    do: ["Uống nhiều nước ấm để loãng đờm", "Nghỉ ngơi, giữ ấm", "Tránh khói bụi"],
    avoid: ["Hút thuốc lá (cả hút thụ động)", "Tự dùng kháng sinh, thuốc ho không rõ"],
    doctor: "Khám Hô hấp nếu ho trên 2–3 tuần, sốt cao, khó thở, đờm có máu.",
  },
  {
    id: "pneumonia", name: "Viêm phổi (cần loại trừ)",
    sx: { highfever: 2, fever: 1, cough: 2, phlegm: 2, breath: 3, chestpain: 2, chills: 1, fatigue: 1 },
    need: ["breath"],
    about: "sốt kèm ho và khó thở, đau ngực khi thở là dấu hiệu cần khám sớm để loại trừ viêm phổi.",
    do: ["Đi khám sớm để được nghe phổi, chụp phim nếu cần"],
    avoid: ["Tự điều trị ở nhà khi đang khó thở"],
    doctor: "Khám Hô hấp/Nội ngay; khó thở nặng, tím môi thì gọi 115.",
  },
  {
    id: "asthma", name: "Hen suyễn",
    sx: { wheeze: 3, breath: 2, cough: 2, coldweather: 1 },
    need: ["wheeze"],
    about: "đường thở co thắt — khò khè, khó thở, ho về đêm hoặc khi gặp lạnh, bụi, gắng sức.",
    do: ["Tránh các yếu tố kích phát (khói, bụi, lạnh)", "Nếu đã được chẩn đoán: luôn mang theo thuốc cắt cơn bác sĩ kê"],
    avoid: ["Hút thuốc, khói bếp than", "Bỏ thuốc dự phòng khi thấy đỡ mà không hỏi bác sĩ"],
    doctor: "Khám Hô hấp để đo chức năng hô hấp. Cơn khó thở không đỡ → gọi 115.",
  },
  {
    id: "otitis", name: "Viêm tai",
    sx: { earpain: 3, fever: 1, runny: 1 },
    need: ["earpain"],
    about: "hay xảy ra sau cảm, viêm mũi họng, hoặc khi nước vào tai.",
    do: ["Giữ tai khô sạch", "Khám sớm nếu đau nhiều"],
    avoid: ["Ngoáy tai bằng tăm bông, vật nhọn", "Tự nhỏ thuốc không rõ vào tai"],
    doctor: "Khám Tai Mũi Họng nếu đau tai, chảy dịch/mủ, nghe kém.",
  },
  {
    id: "conjunctivitis", name: "Đau mắt đỏ (viêm kết mạc)",
    sx: { redeye: 3, itcheye: 2 },
    need: ["redeye"],
    about: "mắt đỏ, cộm, nhiều ghèn, chảy nước mắt; rất dễ lây.",
    do: ["Rửa tay thường xuyên, dùng khăn riêng", "Vệ sinh mắt bằng nước muối sinh lý"],
    avoid: ["Dụi mắt", "Tự nhỏ thuốc có corticoid hay đắp lá, đắp chanh"],
    doctor: "Khám Mắt nếu đau nhức nhiều, nhìn mờ, sợ ánh sáng hoặc không đỡ sau vài ngày.",
  },
  {
    id: "dryeye", name: "Khô mắt / mỏi mắt do màn hình",
    sx: { dryeye: 3, screen: 3, headache: 1, redeye: 1 },
    need: ["dryeye"],
    about: "nhìn màn hình lâu khiến mình chớp mắt ít, mắt khô, mỏi, cộm.",
    do: ["Quy tắc 20-20-20: 20 phút nhìn xa 6 mét trong 20 giây", "Chớp mắt thường xuyên, chỉnh độ sáng màn hình vừa phải"],
    avoid: ["Dùng điện thoại trong bóng tối", "Nhìn màn hình liên tục nhiều giờ không nghỉ"],
    doctor: "Khám Mắt nếu nhìn mờ, đau mắt, hoặc khô mắt kéo dài.",
  },
  // Tiêu hoá
  {
    id: "gastritis", name: "Viêm / đau dạ dày",
    sx: { epigastric: 3, bloat: 2, nausea: 1, heartburn: 1, stress: 1, alcohol: 1, noappetite: 1, skipmeal: 2 },
    need: ["epigastric"],
    about: "đau vùng trên rốn, hay đau khi đói hoặc sau ăn; dễ nặng khi căng thẳng, ăn uống thất thường, rượu bia, thuốc giảm đau.",
    do: ["Ăn đúng bữa, chia nhỏ bữa, nhai kỹ", "Ăn đồ mềm, dễ tiêu (cháo, súp, cơm mềm)", "Giảm căng thẳng, ngủ đủ"],
    avoid: ["Đồ cay, chua, chiên nhiều dầu mỡ", "Rượu bia, cà phê, nước có ga, thuốc lá", "Tự uống thuốc giảm đau (nhóm kháng viêm dễ làm hại dạ dày)", "Bỏ bữa, ăn khuya"],
    doctor: "Khám Tiêu hoá nếu đau tái đi tái lại (có thể nội soi, xét nghiệm vi khuẩn HP). Đi cấp cứu nếu nôn ra máu, phân đen, đau dữ dội.",
  },
  {
    id: "gerd", name: "Trào ngược dạ dày – thực quản",
    sx: { heartburn: 3, sorethroat: 1, hoarse: 1, cough: 1, bloat: 1, epigastric: 1 },
    need: ["heartburn"],
    about: "axit trào lên thực quản gây ợ chua, nóng rát sau xương ức, đắng miệng, có khi ho khan, khàn tiếng.",
    do: ["Ăn tối trước khi ngủ 2–3 tiếng", "Kê cao đầu giường", "Ăn chậm, bữa nhỏ, giữ cân nặng hợp lý"],
    avoid: ["Nằm ngay sau ăn", "Đồ chua, cay, nhiều dầu mỡ, sô-cô-la, cà phê, rượu bia", "Mặc đồ bó chặt bụng"],
    doctor: "Khám Tiêu hoá nếu kéo dài trên vài tuần, nuốt nghẹn, sụt cân, nôn ra máu.",
  },
  {
    id: "foodpoison", name: "Ngộ độc thực phẩm / rối loạn tiêu hoá cấp",
    sx: { diarrhea: 3, nausea: 3, bellyache: 2, afterfood: 3, fever: 1 },
    need: ["diarrhea", "nausea"],
    about: "thường xảy ra vài giờ đến 1–2 ngày sau khi ăn đồ không sạch, đồ sống, để lâu.",
    do: ["Bù nước: uống oresol pha đúng hướng dẫn trên gói, nước lọc, nước cháo", "Ăn nhẹ (cháo, súp) khi đỡ nôn", "Nghỉ ngơi"],
    avoid: ["Tự dùng thuốc cầm tiêu chảy khi đang sốt hoặc đi ngoài ra máu", "Sữa, đồ nhiều dầu mỡ, đồ sống trong vài ngày", "Nước ngọt có ga thay oresol"],
    doctor: "Khám ngay nếu nôn không uống được, đi ngoài ra máu, sốt cao, tiểu ít, lơ mơ; trẻ nhỏ và người già cần khám sớm.",
  },
  {
    id: "ibs", name: "Hội chứng ruột kích thích",
    sx: { bellyache: 2, bloat: 2, diarrhea: 1, constip: 1, stress: 2 },
    need: ["bellyache", "bloat"],
    about: "đường ruột nhạy cảm — đau bụng, đầy hơi, rối loạn đi ngoài (lúc lỏng lúc táo), hay nặng khi căng thẳng.",
    do: ["Ăn đúng giờ, ghi nhật ký món ăn để biết món “kỵ”", "Tập thể dục, giảm căng thẳng", "Uống đủ nước"],
    avoid: ["Đồ nhiều dầu mỡ, cay, rượu bia, cà phê", "Ăn quá no, ăn vội"],
    doctor: "Khám Tiêu hoá để loại trừ bệnh khác, nhất là khi có sụt cân, đi ngoài ra máu, người trên 40 tuổi.",
  },
  {
    id: "constipation", name: "Táo bón",
    sx: { constip: 3, bloat: 1, bellyache: 1 },
    need: ["constip"],
    about: "thường do ăn ít chất xơ, uống ít nước, ít vận động, nhịn đi vệ sinh.",
    do: ["Ăn nhiều rau, trái cây, ngũ cốc nguyên hạt", "Uống đủ nước, vận động mỗi ngày", "Tập đi vệ sinh vào giờ cố định"],
    avoid: ["Nhịn đi vệ sinh", "Tự dùng thuốc nhuận tràng kéo dài"],
    doctor: "Khám Tiêu hoá nếu kéo dài, đi ngoài ra máu, sụt cân, đau bụng nhiều.",
  },
  {
    id: "hemorrhoid", name: "Trĩ",
    sx: { analpain: 3, constip: 2, bloodstool: 1 },
    need: ["analpain"],
    about: "búi tĩnh mạch vùng hậu môn bị giãn — đau, ngứa, có khi chảy máu đỏ tươi khi đi ngoài, hay đi kèm táo bón.",
    do: ["Ăn nhiều chất xơ, uống đủ nước để phân mềm", "Ngâm hậu môn nước ấm", "Vận động, tránh ngồi lâu"],
    avoid: ["Rặn mạnh, ngồi toilet lâu (kể cả lướt điện thoại)", "Đồ cay nóng, rượu bia"],
    doctor: "Khám Hậu môn – Trực tràng hoặc Ngoại tiêu hoá, nhất là khi chảy máu (để loại trừ bệnh khác).",
  },
  {
    id: "appendicitis", name: "Viêm ruột thừa (cần loại trừ)",
    sx: { rightlow: 5, bellyache: 1, fever: 1, nausea: 1, noappetite: 1 },
    need: ["rightlow"],
    about: "đau thường bắt đầu quanh rốn rồi khu trú xuống bụng dưới bên phải, tăng dần, có thể kèm sốt, buồn nôn.",
    do: ["Đi khám cấp cứu ngay để được chẩn đoán"],
    avoid: ["Tự uống thuốc giảm đau rồi chờ (dễ che triệu chứng)", "Chườm nóng, xoa bóp bụng"],
    doctor: "Đi cấp cứu ngay — đây là tình huống cần bác sĩ khám trực tiếp.",
  },
  {
    id: "liver", name: "Vấn đề về gan / mật (cần kiểm tra)",
    sx: { yellow: 4, fatigue: 1, noappetite: 1, nausea: 1, alcohol: 1 },
    need: ["yellow"],
    about: "vàng da, vàng mắt, nước tiểu sẫm là dấu hiệu cần xét nghiệm chức năng gan sớm.",
    do: ["Đi khám và xét nghiệm máu sớm"],
    avoid: ["Rượu bia", "Tự dùng thuốc nam, thực phẩm chức năng “mát gan” không rõ nguồn gốc"],
    doctor: "Khám Tiêu hoá – Gan mật sớm.",
  },
  // Tiết niệu
  {
    id: "uti", name: "Nhiễm trùng đường tiểu",
    sx: { painpee: 4, peemuch: 1, bloodpee: 1, fever: 1 },
    need: ["painpee"],
    about: "hay gặp ở nữ — tiểu buốt, tiểu rắt, mắc tiểu liên tục, nước tiểu đục.",
    do: ["Uống nhiều nước", "Đi khám để làm xét nghiệm nước tiểu và dùng thuốc đúng"],
    avoid: ["Nhịn tiểu", "Tự mua kháng sinh uống (dễ kháng thuốc, tái phát)"],
    doctor: "Khám Tiết niệu/Sản phụ khoa. Khám ngay nếu sốt, đau hông lưng (nhiễm trùng có thể lan lên thận).",
  },
  {
    id: "kidneystone", name: "Sỏi thận / sỏi tiết niệu",
    sx: { flankpain: 4, bloodpee: 2, nausea: 1, painpee: 1 },
    need: ["flankpain"],
    about: "đau quặn vùng hông lưng một bên, có thể lan xuống bụng dưới, kèm tiểu máu, buồn nôn.",
    do: ["Uống đủ nước mỗi ngày", "Đi khám, siêu âm để biết kích thước sỏi"],
    avoid: ["Nhịn uống nước, nhịn tiểu", "Tự uống thuốc “tán sỏi” không rõ nguồn gốc"],
    doctor: "Khám Tiết niệu. Đi cấp cứu nếu đau dữ dội kèm sốt, ớn lạnh hoặc bí tiểu.",
  },
  {
    id: "diabetes", name: "Tiểu đường (cần kiểm tra đường huyết)",
    sx: { thirst: 3, peemuch: 3, weightloss: 2, fatigue: 1, slowheal: 2 },
    need: ["thirst", "peemuch"],
    about: "khát nhiều, tiểu nhiều, sụt cân không rõ lý do, vết thương lâu lành là những dấu hiệu nên đo đường huyết.",
    do: ["Đi xét nghiệm đường huyết (lúc đói) và HbA1c", "Duy trì vận động, ăn nhiều rau, bớt đồ ngọt"],
    avoid: ["Nước ngọt, trà sữa, bánh kẹo nhiều đường", "Tự dùng thuốc, thực phẩm chức năng “trị tiểu đường”"],
    doctor: "Khám Nội tiết để làm xét nghiệm và được hướng dẫn cụ thể.",
  },
  // Thần kinh – đầu
  {
    id: "tension", name: "Đau đầu do căng thẳng (căng cơ)",
    sx: { headache: 3, neckpain: 2, stress: 2, insomnia: 1, screen: 1, fatigue: 1 },
    need: ["headache"],
    about: "kiểu đau đầu phổ biến nhất — đau như bó chặt hai bên đầu hoặc sau gáy, hay do căng thẳng, thiếu ngủ, ngồi sai tư thế.",
    do: ["Nghỉ ngơi, ngủ đủ, uống đủ nước", "Thư giãn cổ vai gáy, xoa bóp nhẹ", "Đứng dậy vận động sau mỗi giờ ngồi"],
    avoid: ["Thức khuya, bỏ bữa", "Lạm dụng thuốc giảm đau (dùng quá thường xuyên còn gây đau đầu dội ngược)", "Nhìn màn hình liên tục"],
    doctor: "Khám Nội thần kinh nếu đau đầu thường xuyên, ngày càng nặng, hoặc có dấu hiệu bất thường.",
  },
  {
    id: "migraine", name: "Đau nửa đầu (migraine)",
    sx: { headache: 2, light: 3, nausea: 2, dizzy: 1 },
    need: ["headache"],
    about: "đau theo nhịp mạch đập, thường một bên đầu, kèm buồn nôn, sợ ánh sáng/tiếng ồn, có thể kéo dài vài giờ tới vài ngày.",
    do: ["Nằm nghỉ ở phòng tối, yên tĩnh khi lên cơn", "Ghi nhật ký cơn đau để tìm yếu tố khởi phát (thiếu ngủ, đói, căng thẳng, món ăn…)", "Giữ giờ ngủ, giờ ăn đều đặn"],
    avoid: ["Thiếu ngủ, bỏ bữa", "Rượu vang, cà phê quá nhiều, ánh sáng nhấp nháy", "Tự dùng thuốc giảm đau quá nhiều ngày trong tháng"],
    doctor: "Khám Nội thần kinh để được điều trị cắt cơn và phòng ngừa phù hợp.",
  },
  {
    id: "vertigo", name: "Rối loạn tiền đình",
    sx: { dizzy: 3, nausea: 2, earpain: 1, fatigue: 1 },
    need: ["dizzy"],
    about: "chóng mặt quay cuồng, mất thăng bằng, nhất là khi đổi tư thế, có thể kèm buồn nôn, ù tai.",
    do: ["Ngồi hoặc nằm xuống ngay khi chóng mặt để tránh té ngã", "Đứng dậy từ từ khi đổi tư thế", "Ngủ đủ, hạn chế căng thẳng"],
    avoid: ["Lái xe, leo cao khi đang chóng mặt", "Cà phê, rượu bia, thuốc lá"],
    doctor: "Khám Nội thần kinh hoặc Tai Mũi Họng. Đi cấp cứu nếu chóng mặt kèm yếu tay chân, méo miệng, nói khó.",
  },
  {
    id: "anemia", name: "Thiếu máu",
    sx: { pale: 3, fatigue: 2, dizzy: 2, palp: 1, coldhands: 1, breath: 1, irregular: 1 },
    need: ["pale", "dizzy"],
    about: "da xanh, mệt, hoa mắt chóng mặt khi đứng dậy, tim đập nhanh khi gắng sức.",
    do: ["Xét nghiệm công thức máu để biết có thiếu máu không", "Ăn đủ chất: thịt đỏ, gan, trứng, rau xanh đậm, đậu"],
    avoid: ["Tự uống thuốc bổ máu liều cao kéo dài khi chưa xét nghiệm", "Uống trà, cà phê ngay sau bữa ăn (giảm hấp thu sắt)"],
    doctor: "Khám Nội tổng quát hoặc Huyết học để làm xét nghiệm.",
  },
  {
    id: "lowbp", name: "Huyết áp thấp / hạ đường huyết",
    sx: { lowbp: 4, dizzy: 2, fatigue: 1, faint: 1, coldhands: 1, sweat: 1, skipmeal: 3 },
    need: ["lowbp", "dizzy"],
    about: "choáng váng, hoa mắt khi đứng dậy nhanh, mệt, có khi vã mồ hôi — hay gặp khi thiếu ngủ, bỏ bữa, mất nước.",
    do: ["Ngồi/nằm xuống ngay khi choáng, uống nước, ăn chút gì ngọt nếu đang đói", "Ăn đủ bữa, uống đủ nước", "Đổi tư thế từ từ"],
    avoid: ["Bỏ bữa sáng", "Đứng lâu dưới nắng nóng"],
    doctor: "Khám Tim mạch/Nội nếu hay bị, từng ngất, hoặc đang dùng thuốc huyết áp.",
  },
  {
    id: "highbp", name: "Tăng huyết áp",
    sx: { highbp: 5, headache: 1, dizzy: 1, palp: 1 },
    need: ["highbp"],
    about: "thường không có triệu chứng rõ, đôi khi đau đầu, chóng mặt, nặng gáy — cần đo huyết áp để biết.",
    do: ["Đo huyết áp đều đặn, ghi lại", "Ăn nhạt, nhiều rau, vận động đều, giữ cân nặng hợp lý", "Dùng thuốc đúng theo bác sĩ kê, kể cả khi thấy khoẻ"],
    avoid: ["Ăn mặn, đồ chế biến sẵn", "Rượu bia, thuốc lá", "Tự ý ngưng thuốc huyết áp"],
    doctor: "Khám Tim mạch. Gọi 115 nếu đau ngực, khó thở, yếu liệt, nói khó.",
  },
  {
    id: "heatstroke", name: "Say nắng / mất nước",
    sx: { sun: 3, headache: 2, dizzy: 2, nausea: 1, fatigue: 1, fever: 1, thirst: 1 },
    need: ["sun"],
    about: "xảy ra khi ở ngoài nắng nóng lâu, ra mồ hôi nhiều mà không bù đủ nước.",
    do: ["Vào chỗ mát ngay, nới lỏng quần áo", "Uống nước từ từ, có thể dùng nước điện giải", "Lau mát cơ thể bằng khăn ướt"],
    avoid: ["Tiếp tục làm việc ngoài nắng", "Uống rượu bia, nước quá lạnh một hơi"],
    doctor: "Gọi 115 nếu lơ mơ, co giật, không ra mồ hôi mà người rất nóng, hoặc không đỡ sau khi nghỉ.",
  },
  {
    id: "hangover", name: "Mệt mỏi sau rượu bia",
    sx: { alcohol: 3, headache: 2, nausea: 2, fatigue: 1, thirst: 1 },
    need: ["alcohol"],
    about: "rượu làm mất nước, kích ứng dạ dày và rối loạn giấc ngủ.",
    do: ["Uống nhiều nước lọc, nước điện giải", "Ăn cháo, súp nhẹ bụng", "Nghỉ ngơi"],
    avoid: ["Lái xe khi còn hơi men", "Uống thêm rượu “giã rượu”", "Tự uống thuốc giảm đau khi dạ dày đang khó chịu"],
    doctor: "Gọi 115 nếu người say nôn nhiều, lơ mơ, khó đánh thức, thở chậm (nguy cơ ngộ độc rượu).",
  },
  // Cơ xương khớp
  {
    id: "musclestrain", name: "Đau cơ / đau cột sống do tư thế",
    sx: { backpain: 3, neckpain: 3, screen: 2, fatigue: 1 },
    need: ["backpain", "neckpain"],
    about: "rất hay gặp ở người ngồi nhiều, cúi điện thoại, mang vác sai tư thế.",
    do: ["Cứ 45–60 phút đứng dậy vận động, vươn vai", "Chỉnh bàn ghế: màn hình ngang tầm mắt, lưng có tựa", "Chườm ấm, tập giãn cơ nhẹ, bơi, yoga"],
    avoid: ["Ngồi lâu một tư thế, nằm võng, gối quá cao", "Mang vác nặng sai cách", "Bẻ khớp cổ mạnh"],
    doctor: "Khám Cơ xương khớp hoặc Vật lý trị liệu nếu đau kéo dài trên 2–3 tuần.",
  },
  {
    id: "disc", name: "Thoát vị đĩa đệm / chèn ép thần kinh (cần kiểm tra)",
    sx: { backpain: 2, neckpain: 2, radiate: 4, numb: 2 },
    need: ["radiate", "numb"],
    about: "đau lưng/cổ lan xuống chân hoặc tay, kèm tê bì — gợi ý rễ thần kinh bị chèn ép.",
    do: ["Đi khám để được chụp MRI nếu bác sĩ chỉ định", "Tập vật lý trị liệu theo hướng dẫn"],
    avoid: ["Mang vác nặng, cúi gập đột ngột", "Nắn bóp, bấm huyệt ở nơi không chuyên"],
    doctor: "Khám Cơ xương khớp/Thần kinh. Đi cấp cứu nếu yếu chân tăng dần, rối loạn tiểu tiện, đại tiện.",
  },
  {
    id: "gout", name: "Gút (gout)",
    sx: { jointswell: 3, jointpain: 2, alcohol: 2 },
    need: ["jointswell"],
    about: "khớp (hay gặp ở ngón chân cái) sưng nóng đỏ đau dữ dội, thường khởi phát về đêm, sau bữa nhậu nhiều thịt, hải sản, bia.",
    do: ["Nghỉ ngơi, kê cao khớp đau, chườm lạnh", "Uống nhiều nước", "Đi khám, xét nghiệm axit uric"],
    avoid: ["Bia rượu, nội tạng, hải sản, thịt đỏ nhiều", "Nước ngọt có đường (nhất là đường fructose)"],
    doctor: "Khám Cơ xương khớp để chẩn đoán và điều trị lâu dài.",
  },
  {
    id: "arthritis", name: "Viêm / thoái hoá khớp",
    sx: { jointpain: 3, morningstiff: 3, jointswell: 1 },
    need: ["jointpain", "morningstiff"],
    about: "đau khớp, cứng khớp buổi sáng, hay ở gối, cổ tay, ngón tay.",
    do: ["Vận động nhẹ nhàng đều đặn (đi bộ, bơi, đạp xe)", "Giữ cân nặng hợp lý", "Giữ ấm khớp khi trời lạnh"],
    avoid: ["Tự dùng thuốc giảm đau, corticoid, thuốc nam không rõ nguồn gốc", "Ngồi xổm, quỳ lâu"],
    doctor: "Khám Cơ xương khớp để phân biệt viêm hay thoái hoá.",
  },
  // Da
  {
    id: "urticaria", name: "Dị ứng / mề đay",
    sx: { itch: 2, rash: 3, afterfood: 1, swellface: 2 },
    need: ["rash"],
    about: "nổi mẩn đỏ, sẩn ngứa, có thể do thức ăn (hải sản…), thuốc, thời tiết, côn trùng.",
    do: ["Nhớ lại và tránh thứ vừa ăn/dùng trước khi nổi", "Mặc đồ thoáng, tắm nước mát"],
    avoid: ["Gãi mạnh", "Tự bôi thuốc có corticoid kéo dài", "Tiếp tục ăn món nghi dị ứng"],
    doctor: "Khám Da liễu/Dị ứng nếu tái phát nhiều. Gọi 115 ngay nếu sưng môi, mặt, khó thở (nguy cơ sốc phản vệ).",
  },
  {
    id: "eczema", name: "Viêm da cơ địa (chàm)",
    sx: { itch: 3, dryskin: 3, rash: 1, coldweather: 1 },
    need: ["dryskin"],
    about: "da khô, ngứa nhiều, có mảng đỏ bong vảy, hay nặng khi trời lạnh khô.",
    do: ["Dưỡng ẩm da nhiều lần trong ngày", "Tắm nước ấm (không nóng), thời gian ngắn", "Mặc đồ cotton mềm"],
    avoid: ["Xà phòng mạnh, nước quá nóng", "Gãi, chà xát", "Tự bôi thuốc không rõ thành phần"],
    doctor: "Khám Da liễu để được điều trị phù hợp.",
  },
  {
    id: "fungus", name: "Nấm da (hắc lào, lang ben…)",
    sx: { ringworm: 4, itch: 2 },
    need: ["ringworm"],
    about: "mảng da tròn, viền rõ, ngứa, bong vảy; hay ở vùng ẩm, ra mồ hôi.",
    do: ["Giữ da khô thoáng, thay đồ khi ra mồ hôi", "Dùng khăn, quần áo riêng"],
    avoid: ["Bôi thuốc có corticoid (làm nấm lan rộng)", "Mặc đồ ẩm, bó sát"],
    doctor: "Khám Da liễu để được kê thuốc chống nấm đúng loại.",
  },
  {
    id: "acne", name: "Mụn trứng cá",
    sx: { acne: 4, stress: 1 },
    need: ["acne"],
    about: "do bít tắc lỗ chân lông, nội tiết, căng thẳng, thiếu ngủ, sản phẩm không hợp.",
    do: ["Rửa mặt nhẹ nhàng 2 lần/ngày", "Ngủ đủ, thay vỏ gối thường xuyên", "Chọn sản phẩm không gây bít tắc"],
    avoid: ["Nặn mụn bằng tay", "Mỹ phẩm trôi nổi, kem trộn", "Chà xát mạnh"],
    doctor: "Khám Da liễu nếu mụn viêm nhiều, để lại sẹo, thâm.",
  },
  {
    id: "chickenpox", name: "Thuỷ đậu / zona (cần khám)",
    sx: { blister: 4, fever: 1, itch: 1, rash: 1 },
    need: ["blister"],
    about: "nổi mụn nước — thuỷ đậu thường rải rác toàn thân kèm sốt; zona thường thành dải một bên người, đau rát.",
    do: ["Đi khám để được chẩn đoán đúng", "Giữ vệ sinh, cắt móng tay, tránh gãi vỡ", "Cách ly nếu là thuỷ đậu (rất dễ lây)"],
    avoid: ["Chọc vỡ mụn nước", "Đắp lá, bôi thuốc không rõ"],
    doctor: "Khám Da liễu hoặc Truyền nhiễm; phụ nữ có thai, trẻ nhỏ cần khám sớm.",
  },
  {
    id: "hairloss", name: "Rụng tóc",
    sx: { hairloss: 4, stress: 1, fatigue: 1 },
    need: ["hairloss"],
    about: "có thể do căng thẳng, thiếu ngủ, sau ốm, thay đổi nội tiết, thiếu chất, hoặc chăm sóc tóc sai cách.",
    do: ["Ngủ đủ, ăn đủ đạm và rau xanh", "Gội đầu nhẹ nhàng, hạn chế nhiệt"],
    avoid: ["Nhuộm, uốn, ép liên tục", "Buộc tóc quá chặt"],
    doctor: "Khám Da liễu nếu rụng thành mảng hoặc rụng nhiều kéo dài.",
  },
  // Giấc ngủ
  {
    id: "insomnia", name: "Mất ngủ",
    sx: { insomnia: 4, stress: 2, fatigue: 1, screen: 1 },
    need: ["insomnia"],
    about: "khó vào giấc, hay thức giấc, dậy vẫn mệt — thường liên quan căng thẳng, điện thoại trước khi ngủ, cà phê, giờ giấc thất thường.",
    do: ["Giữ giờ ngủ – thức cố định, kể cả cuối tuần", "Cất điện thoại 30–60 phút trước khi ngủ", "Phòng ngủ tối, mát, yên tĩnh"],
    avoid: ["Cà phê, trà sau buổi chiều", "Ngủ trưa quá dài", "Tự dùng thuốc ngủ không có chỉ định"],
    doctor: "Khám Tâm thần/Thần kinh nếu mất ngủ trên 3 tuần hoặc ảnh hưởng nhiều đến sinh hoạt.",
  },
  {
    id: "apnea", name: "Ngưng thở khi ngủ (cần kiểm tra)",
    sx: { snore: 4, sleepy: 3, headache: 1, fatigue: 1 },
    need: ["snore"],
    about: "ngáy to, có lúc ngưng thở, ngủ dậy vẫn mệt, buồn ngủ cả ngày.",
    do: ["Nằm nghiêng khi ngủ", "Giữ cân nặng hợp lý"],
    avoid: ["Rượu bia, thuốc an thần trước khi ngủ"],
    doctor: "Khám Tai Mũi Họng hoặc Hô hấp (có thể đo đa ký giấc ngủ).",
  },
  // Phụ khoa
  {
    id: "dysmenorrhea", name: "Đau bụng kinh",
    sx: { periodpain: 4, nausea: 1, backpain: 1 },
    need: ["periodpain"],
    about: "co thắt tử cung trong kỳ kinh — thường gặp, nhưng đau dữ dội tới mức không sinh hoạt được thì cần kiểm tra.",
    do: ["Chườm ấm bụng dưới, uống nước ấm", "Vận động nhẹ, nghỉ ngơi", "Hỏi dược sĩ/bác sĩ nếu cần thuốc giảm đau"],
    avoid: ["Đồ lạnh, cà phê nhiều", "Thức khuya, căng thẳng"],
    doctor: "Khám Sản phụ khoa nếu đau ngày càng nặng, ra máu nhiều, hoặc đau cả ngoài kỳ kinh.",
  },
  {
    id: "irregular", name: "Rối loạn kinh nguyệt",
    sx: { irregular: 4, stress: 1, weightloss: 1 },
    need: ["irregular"],
    about: "chu kỳ lệch có thể do căng thẳng, thay đổi cân nặng, thiếu ngủ, nội tiết, hoặc có thai.",
    do: ["Ghi lại ngày hành kinh để theo dõi", "Nếu có khả năng mang thai, thử que sau khi trễ kinh vài ngày", "Ngủ đủ, giảm căng thẳng"],
    avoid: ["Tự uống thuốc nội tiết, thuốc điều kinh không có chỉ định"],
    doctor: "Khám Sản phụ khoa nếu trễ kinh nhiều tháng, rong kinh, ra máu bất thường.",
  },
  {
    id: "vaginitis", name: "Viêm nhiễm phụ khoa",
    sx: { discharge: 4, itch: 1, painpee: 1 },
    need: ["discharge"],
    about: "khí hư thay đổi màu, mùi, kèm ngứa rát vùng kín — rất thường gặp và chữa được.",
    do: ["Vệ sinh nhẹ nhàng bằng nước sạch, mặc đồ lót cotton thoáng", "Đi khám để xác định đúng nguyên nhân (nấm, vi khuẩn…)"],
    avoid: ["Thụt rửa sâu, dung dịch vệ sinh có tính sát khuẩn mạnh", "Tự đặt thuốc, uống kháng sinh không có chỉ định"],
    doctor: "Khám Sản phụ khoa.",
  },
  // Răng miệng
  {
    id: "dental", name: "Vấn đề răng lợi",
    sx: { toothache: 4, mouthulcer: 1 },
    need: ["toothache"],
    about: "đau răng, ê buốt, sưng lợi, chảy máu chân răng thường do sâu răng, viêm lợi, cao răng.",
    do: ["Chải răng 2 lần/ngày, dùng chỉ nha khoa", "Súc miệng nước muối ấm"],
    avoid: ["Đồ quá nóng/lạnh, quá ngọt", "Tự nhổ răng, đắp thuốc không rõ"],
    doctor: "Khám Răng Hàm Mặt; sưng mặt, sốt thì khám sớm.",
  },
  {
    id: "mouthulcer", name: "Nhiệt miệng",
    sx: { mouthulcer: 4, stress: 1 },
    need: ["mouthulcer"],
    about: "vết loét nhỏ trong miệng, đau rát, thường tự lành sau 7–10 ngày; hay gặp khi căng thẳng, thiếu ngủ.",
    do: ["Súc miệng nước muối ấm", "Ăn đồ mềm, mát, uống đủ nước", "Ngủ đủ"],
    avoid: ["Đồ cay, chua, nóng", "Cắn, chạm vào vết loét"],
    doctor: "Khám Răng Hàm Mặt nếu vết loét trên 2 tuần không lành, quá to hoặc tái phát liên tục.",
  },
];

// ═══════════════════════ CẢM XÚC / TÂM LÝ ═══════════════════════
const FEELS: Sym[] = [
  { id: "sad", label: "buồn", re: /\b(buon(?! ban| non| ngu| cuoi)|chan nan|chan doi|khong vui|u sau)\b/ },
  { id: "anhedonia", label: "mất hứng thú", re: /\b(mat hung thu|khong con hung thu|khong thiet|chang thiet|khong muon lam gi|khong con thich gi)\b/ },
  { id: "tired", label: "mệt mỏi, cạn năng lượng", re: /\b(met moi|kiet suc|duoi suc|can nang luong|het pin|met lam|met qua|met ghe|hoi met|thay met|met met)\b/ },
  { id: "insomnia", label: "mất ngủ", re: /\b(mat ngu|kho ngu|ngu khong ngon|thuc giac|trang dem|khong ngu duoc)\b/ },
  { id: "oversleep", label: "ngủ nhiều, không muốn dậy", re: /\b(ngu nhieu|ngu ca ngay|khong muon day|nam lien)\b/ },
  { id: "appetite", label: "ăn uống thay đổi", re: /\b(chan an|an khong ngon|an nhieu hon|an vo do|bo bua)\b/ },
  { id: "worry", label: "lo lắng, bất an", re: /\b(lo lang|lo au|bat an|bon chon|thap thom|lo qua|lo so)\b/ },
  { id: "bodyanx", label: "hồi hộp, tim đập nhanh, run", re: /\b(tim dap nhanh|hoi hop|run tay|toat mo hoi|tuc nguc|kho tho)\b/ },
  { id: "panic", label: "hoảng sợ", re: /\b(hoang loan|hoang so|so hai|so qua|so chet)\b/ },
  { id: "overthink", label: "suy nghĩ nhiều", re: /\b(suy nghi nhieu|nghi nhieu|overthink|dau oc cu chay|khong ngung nghi|nghi lung tung|nghi linh tinh)\b/ },
  { id: "focus", label: "khó tập trung", re: /\b(kho tap trung|mat tap trung|hay quen|dau oc mo|khong tap trung)\b/ },
  { id: "irritable", label: "cáu gắt, dễ nổi nóng", re: /\b(cau gat|de cau|nong nay|buc boi|gian du|de noi nong|hay noi nong|buc minh)\b/ },
  { id: "lonely", label: "cô đơn", re: /\b(co don|mot minh|khong ai hieu|lac long|le loi)\b/ },
  { id: "empty", label: "trống rỗng, tê liệt cảm xúc", re: /\b(trong rong|te liet cam xuc|vo cam|khong cam thay gi)\b/ },
  { id: "worthless", label: "thấy mình vô dụng, tự trách", re: /\b(vo dung|tu trach|toi loi|thay minh te|khong co gia tri|minh that bai|minh kem coi|ghet ban ?than)\b/ },
  { id: "hopeless", label: "tuyệt vọng, bế tắc", re: /\b(tuyet vong|bat luc|khong con hy vong|be tac|khong loi thoat|khong con y nghia)\b/ },
  { id: "cry", label: "hay khóc", re: /\b(hay khoc|muon khoc|khoc mot minh|khoc hoai|khoc suot|de khoc)\b/ },
  { id: "pressure", label: "áp lực, căng thẳng", re: /\b(ap luc|cang thang|stress|qua tai|nhieu viec qua)\b/ },
  { id: "missing", label: "nhớ nhung, tiếc nuối", re: /\b(nho nguoi|nho anh|nho em|nho ho|tiec nuoi|mat mat|nho nhung|hoi han)\b/ },
  { id: "jealous", label: "ghen, sợ mất người ta", re: /\b(ghen|so mat nguoi ta|so bi bo roi|so mat ho|so bi phan boi)\b/ },
  { id: "hurt", label: "tủi thân, tổn thương", re: /\b(tui than|ton thuong|bi phu long|dau long|uat uc)\b/ },
  { id: "shame", label: "xấu hổ", re: /\b(xau ho|nhuc nha|mat mat|ngai ngung)\b/ },
  { id: "trauma", label: "ám ảnh chuyện cũ, ác mộng", re: /\b(am anh|ac mong|hoi tuong lai|giat minh|nho lai la run)\b/ },
  { id: "withdraw", label: "muốn tránh mọi người", re: /\b(ngai gap nguoi|tranh moi nguoi|thu minh|khong muon gap ai|khong muon noi chuyen)\b/ },
  { id: "compare", label: "so sánh, thấy thua kém", re: /\b(so sanh|thua kem|ghen ti|khong bang ai|gioi hon minh|hon minh het|ai cung hon)\b/ },
  { id: "unmotivated", label: "mất động lực", re: /\b(mat dong luc|khong co dong luc|luoi|tri hoan|khong muon lam)\b/ },
];

type State = {
  id: string;
  name: string;
  f: Record<string, number>;
  about: string;
  do: string[];
  avoid: string[];
  pro: string; // khi nào nên gặp chuyên gia
  heavy?: boolean;
};

const STATES: State[] = [
  {
    id: "stress", name: "Căng thẳng kéo dài (stress)",
    f: { pressure: 3, tired: 2, irritable: 2, insomnia: 1, focus: 2, worry: 1, overthink: 1 },
    about: "khi áp lực nhiều hơn khả năng “xả” của mình, cơ thể và đầu óc luôn ở trạng thái căng.",
    do: ["Chia việc thành từng phần nhỏ, làm việc gấp trước", "Nghỉ ngắn giữa giờ, đi bộ 10 phút, hít thở chậm", "Đặt ranh giới: sau giờ nhất định thì không xử lý việc nữa"],
    avoid: ["Ôm hết mọi việc một mình", "Cà phê, rượu bia để “chống chọi”", "Hy sinh giấc ngủ"],
    pro: "khi căng thẳng làm bạn mất ngủ, ăn uống thất thường hoặc ảnh hưởng công việc trên vài tuần.",
  },
  {
    id: "anxiety", name: "Lo âu",
    f: { worry: 3, bodyanx: 2, overthink: 2, insomnia: 1, focus: 1, panic: 1, irritable: 1 },
    about: "cảm giác bất an, lo trước những điều chưa xảy ra, có khi kèm tim đập nhanh, run, khó thở.",
    do: ["Hít vào 4 nhịp – thở ra 6 nhịp, lặp lại vài lần", "Viết điều đang lo ra giấy, chia thành “làm được” và “ngoài tầm tay”", "Vận động đều đặn, ngủ đủ"],
    avoid: ["Cà phê, nước tăng lực", "Đọc tin tiêu cực, tra triệu chứng trên mạng liên tục", "Né tránh mọi thứ gây lo (càng né càng sợ)"],
    pro: "khi lo âu kéo dài, lên cơn hoảng, hoặc làm bạn né tránh học tập, công việc, gặp gỡ.",
  },
  {
    id: "panic", name: "Cơn hoảng loạn",
    f: { panic: 3, bodyanx: 3, worry: 1 },
    about: "nỗi sợ ập đến đột ngột kèm tim đập mạnh, khó thở, run, cảm giác mất kiểm soát — thường tự dịu sau vài phút.",
    do: ["Thở ra thật chậm và dài hơn hơi hít vào", "Đặt chân chạm đất, gọi tên 5 thứ bạn nhìn thấy", "Nhắc mình: “Cơn này sẽ qua, mình an toàn”"],
    avoid: ["Cà phê, chất kích thích", "Tự trách mình yếu đuối"],
    pro: "khi cơn hoảng lặp lại. Lần đầu bị, hoặc đau ngực, khó thở kéo dài thì nên đi khám để loại trừ bệnh tim.",
  },
  {
    id: "depression", name: "Dấu hiệu trầm cảm (cần được đánh giá)",
    f: { sad: 2, anhedonia: 3, empty: 3, worthless: 2, hopeless: 3, tired: 1, insomnia: 1, oversleep: 1, appetite: 1, cry: 1, withdraw: 1, focus: 1 },
    about: "buồn hoặc trống rỗng kéo dài, mất hứng thú với mọi thứ, thấy mình vô dụng, thay đổi ăn ngủ — trầm cảm là bệnh có thể điều trị, không phải do yếu đuối.",
    do: ["Nói với một người bạn tin tưởng: “Dạo này mình không ổn”", "Mỗi ngày làm một việc thật nhỏ: tắm, ra nắng 10 phút, ăn một bữa tử tế", "Giữ giờ ngủ và giờ ăn đều đặn"],
    avoid: ["Ở một mình quá lâu, tự cô lập", "Rượu bia, chất kích thích để quên", "Đưa ra quyết định lớn khi đang rất tệ"],
    pro: "nếu tình trạng kéo dài trên 2 tuần — hãy gặp bác sĩ tâm thần hoặc chuyên gia tâm lý. Nếu có lúc nghĩ tới việc làm hại bản thân, gọi 115 hoặc đường dây Ngày Mai 096 306 1414 ngay nha.",
    heavy: true,
  },
  {
    id: "burnout", name: "Kiệt sức (burnout)",
    f: { tired: 3, pressure: 2, unmotivated: 2, irritable: 1, focus: 1, empty: 1 },
    about: "làm việc/học tập căng thẳng lâu ngày khiến mình cạn năng lượng, mất động lực, thấy mọi thứ vô nghĩa.",
    do: ["Cho mình nghỉ thật sự (không email, không việc) ít nhất một ngày", "Xem lại khối lượng việc, nói chuyện với quản lý nếu quá tải", "Quay lại những việc nhỏ làm mình vui"],
    avoid: ["Cố gồng thêm, làm thêm giờ để “bù”", "Bỏ ngủ, bỏ ăn vì việc"],
    pro: "khi nghỉ ngơi rồi vẫn không hồi lại, hoặc bắt đầu có dấu hiệu trầm cảm, lo âu.",
  },
  {
    id: "lonely", name: "Cô đơn",
    f: { lonely: 3, withdraw: 1, sad: 1 },
    about: "thiếu những kết nối thật sự — có thể cô đơn ngay giữa đám đông.",
    do: ["Nhắn cho một người bạn cũ một câu hỏi thăm", "Tham gia một hoạt động đều đặn (lớp học, CLB, nhóm chạy bộ)", "Thử phòng chat Cộng đồng hoặc mục Làm quen trên Quẹt (/quet)"],
    avoid: ["Ở lì trong phòng, lướt mạng thay cho trò chuyện thật"],
    pro: "khi cô đơn đi kèm buồn kéo dài, mất ngủ, hoặc suy nghĩ tiêu cực về bản thân.",
  },
  {
    id: "grief", name: "Đau buồn sau mất mát",
    f: { missing: 3, sad: 2, cry: 2, empty: 1 },
    about: "nỗi đau khi mất đi một người, một mối quan hệ hay một điều quan trọng — không có thời hạn và không có cách “đúng”.",
    do: ["Cho phép mình buồn, khóc nếu cần", "Ở gần những người thương mình", "Viết ra những điều muốn nói với người/điều đã mất"],
    avoid: ["Ép mình phải “ổn” thật nhanh", "Dùng rượu bia để quên"],
    pro: "khi nỗi đau làm bạn không sinh hoạt được sau nhiều tháng, hoặc có ý nghĩ tiêu cực về bản thân.",
  },
  {
    id: "heartbreak", name: "Tổn thương tình cảm",
    f: { hurt: 3, missing: 2, cry: 1, jealous: 1, sad: 1 },
    about: "khi bị phụ lòng, chia tay, hay không được đối xử như mình mong — cảm giác tủi thân, đau lòng rất thật.",
    do: ["Kể với một người bạn tin tưởng", "Tạm giảm tiếp xúc với điều gợi nhớ (trang cá nhân, tin nhắn cũ)", "Chăm sóc bản thân: ăn, ngủ, vận động"],
    avoid: ["Nhắn tin lúc nửa đêm khi cảm xúc đang dâng", "Tự trách mình là nguyên nhân của mọi chuyện"],
    pro: "khi nỗi buồn kéo dài vài tuần mà không nhẹ đi, ảnh hưởng ăn ngủ, học tập, công việc.",
  },
  {
    id: "insecure", name: "Bất an trong mối quan hệ",
    f: { jealous: 3, worry: 1, overthink: 2 },
    about: "sợ bị bỏ rơi, hay nghi ngờ, cần được trấn an liên tục — thường đến từ trải nghiệm cũ hoặc thiếu tự tin.",
    do: ["Phân biệt “sự thật” và “điều mình đoán”", "Nói ra nhu cầu của mình một cách nhẹ nhàng", "Xây dựng niềm vui, cuộc sống riêng ngoài mối quan hệ"],
    avoid: ["Kiểm tra điện thoại, theo dõi người kia", "Hỏi dồn, trách móc khi chưa rõ chuyện"],
    pro: "khi nỗi sợ làm mối quan hệ căng thẳng liên tục hoặc lặp lại qua nhiều mối quan hệ.",
  },
  {
    id: "lowworth", name: "Tự ti, tự đánh giá thấp bản thân",
    f: { worthless: 3, compare: 2, shame: 2, withdraw: 1 },
    about: "hay chê bản thân, so sánh với người khác và thấy mình kém.",
    do: ["Mỗi tối viết 3 việc mình làm được, dù nhỏ", "Nói với bản thân như nói với một người bạn", "Bớt theo dõi những tài khoản làm mình thấy tệ"],
    avoid: ["So “hậu trường” của mình với “sân khấu” của người khác", "Ở gần người hay chê bai, hạ thấp mình"],
    pro: "khi cảm giác vô dụng đi kèm buồn kéo dài, mất ngủ, hoặc ý nghĩ tiêu cực về bản thân.",
  },
  {
    id: "overthink", name: "Suy nghĩ quá mức (overthinking)",
    f: { overthink: 3, insomnia: 1, worry: 1, focus: 1 },
    about: "đầu óc cứ lặp đi lặp lại một chuyện, phân tích mãi mà không ra quyết định.",
    do: ["Đặt “giờ suy nghĩ” 15 phút mỗi ngày, ngoài giờ đó thì ghi lại để sau", "Viết suy nghĩ ra giấy", "Vận động nhẹ để kéo não ra khỏi vòng lặp"],
    avoid: ["Nằm trên giường suy nghĩ (dậy làm việc nhẹ rồi quay lại)", "Hỏi ý kiến quá nhiều người cùng lúc"],
    pro: "khi suy nghĩ lặp lại gây mất ngủ, lo âu kéo dài.",
  },
  {
    id: "anger", name: "Tức giận, khó kiểm soát cảm xúc",
    f: { irritable: 3, pressure: 1, tired: 1 },
    about: "dễ nổi nóng thường là “lớp vỏ” của mệt mỏi, căng thẳng hoặc tổn thương bên trong.",
    do: ["Tạm rời khỏi tình huống vài phút khi thấy nóng lên", "Đếm chậm tới 10, uống ngụm nước", "Vận động để xả căng thẳng"],
    avoid: ["Nói chuyện quan trọng khi đang giận", "Đói, thiếu ngủ (làm “ngòi nổ” ngắn lại)"],
    pro: "khi cơn giận làm tổn thương người thân hoặc bạn thấy mất kiểm soát nhiều lần.",
  },
  {
    id: "trauma", name: "Ảnh hưởng của trải nghiệm đau buồn (sang chấn)",
    f: { trauma: 3, panic: 1, insomnia: 1, withdraw: 1, worry: 1 },
    about: "hay nhớ lại, gặp ác mộng, giật mình, né tránh những gì gợi nhắc về chuyện cũ.",
    do: ["Ở gần những người làm bạn thấy an toàn", "Giữ nhịp sinh hoạt đều đặn", "Tập thở chậm khi ký ức ùa về"],
    avoid: ["Ép mình kể lại khi chưa sẵn sàng", "Dùng rượu bia, chất kích thích để quên"],
    pro: "nên gặp chuyên gia tâm lý — có những phương pháp trị liệu sang chấn rất hiệu quả.",
    heavy: true,
  },
  {
    id: "socialanx", name: "Lo âu xã hội / ngại giao tiếp",
    f: { withdraw: 2, shame: 2, bodyanx: 1, worry: 1 },
    about: "sợ bị đánh giá, ngại gặp gỡ, hồi hộp khi phải nói chuyện với người khác.",
    do: ["Tập từ tình huống nhỏ: chào hỏi, hỏi một câu đơn giản", "Tập trung vào người đối diện thay vì lo mình trông thế nào"],
    avoid: ["Né tránh hoàn toàn (càng né càng sợ)"],
    pro: "khi nỗi sợ làm bạn bỏ học, bỏ việc hoặc không thể gặp ai.",
  },
  {
    id: "unmotivated", name: "Mất động lực, trì hoãn",
    f: { unmotivated: 3, tired: 1, focus: 1 },
    about: "biết phải làm mà không bắt đầu được — thường vì việc quá lớn, quá chán hoặc sợ làm không tốt.",
    do: ["Luật 5 phút: chỉ làm đúng 5 phút rồi được dừng", "Chia việc thành bước thật nhỏ", "Cất điện thoại xa khi làm"],
    avoid: ["Chờ “có hứng” mới làm", "Tự mắng mình lười"],
    pro: "khi mất động lực đi kèm buồn kéo dài, mất hứng thú với mọi thứ.",
  },
];

// ═══════════════════════ BỘ PHÂN TÍCH ═══════════════════════
const NOTE_BODY = "(Lomi chỉ gợi ý tham khảo dựa trên triệu chứng bạn kể, không thay được chẩn đoán của bác sĩ nha 🩺)";
const NOTE_MIND = "(Đây là gợi ý để bạn hiểu mình hơn, không phải chẩn đoán — Lomi luôn ở đây nghe bạn kể 💚)";

function found(list: Sym[], n: string): Sym[] {
  return list.filter((s) => s.re.test(` ${n} `));
}
const byIdSym = (id: string) => SYMPTOMS.find((s) => s.id === id)!;
const byIdFeel = (id: string) => FEELS.find((s) => s.id === id)!;
const joinVi = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} và ${a[a.length - 1]}`);

export type BodyResult = { text: string; sx: string[] };

// Chi tiết người dùng kể thêm khi ĐANG nói chuyện sức khoẻ (30/09 r6): vị trí, nhiệt độ, mức độ, thời gian, trẻ em.
const CTX_SYM: [RegExp, string][] = [
  [/\b(ngoi may tinh|ngoi lau|ngoi nhieu|cui dien thoai|van phong)\b/, "screen"],
  [/\b(tren ron|vung thuong vi|luc doi|khi doi)\b/, "epigastric"],
  [/\b(duoi ben phai|bung duoi ben phai|ho chau phai)\b/, "rightlow"],
  [/\b(sau xuong uc|nong rat nguc|rat nguc)\b/, "heartburn"],
  [/\b(khac dom|co dom|dom vang|dom xanh)\b/, "phlegm"],
  [/\b(so anh sang|choi mat)\b/, "light"],
];
function tempOf(n: string): number | null {
  const m = n.match(/\b(3[5-9]|4[0-2])(?:\s*(?:do|oc|c))?(?:\s*(ruoi|[,.]?\s*(\d)))?\b/);
  if (!m || !/\b(do|oc|sot|nhiet|ruoi)\b/.test(n)) return null;
  return Number(m[1]) + (m[2] === "ruoi" ? 0.5 : m[3] ? Number(m[3]) / 10 : 0);
}
const KID_RE = /\b(con minh|con toi|con em|con tui|be nha|be minh|be con|em be|tre nho|chau minh|be bi|be \d+ tuoi|\d+ thang tuoi)\b/;
const SEVERE_RE = /\b(bua bo|du doi|dau lam|dau qua troi|khong chiu noi|dau muon xiu|dau chet di duoc)\b/;
const SELF_RE = /\b(minh bi|toi bi|em bi|anh bi|tui bi|dang bi|bi hoai|bi suot|minh dang|toi dang|nay bi|hom nay bi|tu sang|tu qua)\b/;
const KNOW_RE = /\b(la do dau|do dau ma|nguyen nhan|la benh gi|la dau hieu|la gi|thuong do|vi sao bi|tai sao bi|tai sao lai|co nguy hiem khong)\b/;
const DUR_RE = /\b(\d+|mot|hai|ba|bon|nam|may|vai|mo)\s*(ngay|hom|bua|tuan|thang|nam)\b/;
const KID_NOTE =
  "👶 **Với trẻ nhỏ:** đưa bé đi khám ngay nếu bé dưới 3 tháng tuổi mà sốt, hoặc sốt cao khó hạ, li bì, bỏ bú/bỏ ăn, co giật, thở nhanh, phát ban, nôn nhiều. Thuốc hạ sốt cho bé phải tính theo cân nặng — hỏi bác sĩ/dược sĩ, không dùng thuốc của người lớn.";

/**
 * Phân tích triệu chứng cơ thể. prev = triệu chứng đã kể ở các tin trước (cộng dồn).
 * Trả null nếu tin này không có triệu chứng nào (để các luồng khác xử lý).
 */
export function analyzeBody(text: string, prev: string[] = [], inHealth = false, force = false): BodyResult | null {
  const n = normStrict(text, HEALTH);
  const now = found(SYMPTOMS, n).map((s) => s.id);
  // Đang nói chuyện sức khoẻ → hiểu thêm chi tiết kể tiếp ("ở trên rốn, lúc đói", "38 độ rưỡi", "búa bổ", "2 ngày rồi").
  const notes: string[] = [];
  let detail = false;
  if (inHealth) {
    for (const [re, id] of CTX_SYM) if (re.test(` ${n} `) && !now.includes(id)) (now.push(id), (detail = true));
    const t = tempOf(n);
    if (t !== null) {
      detail = true;
      if (t >= 39) now.push("highfever", "fever"), notes.push(`🌡️ ${String(t).replace(".", ",")} độ là **sốt cao** rồi nha.`);
      else if (t >= 37.5) now.push("fever"), notes.push(`🌡️ ${String(t).replace(".", ",")} độ là đang **sốt**.`);
      else notes.push(`🌡️ ${String(t).replace(".", ",")} độ thì chưa tính là sốt đâu, cứ theo dõi thêm nha.`);
    }
    if (SEVERE_RE.test(` ${n} `)) {
      detail = true;
      notes.push("Đau dữ dội như vậy thì đừng chủ quan nha — nếu cơn đau đến **đột ngột**, kèm nôn ói, sốt cao, cứng cổ, yếu tay chân, nói khó hay lơ mơ thì gọi **115** ngay.");
    }
    const d = n.match(DUR_RE);
    if (d) {
      detail = true;
      const long = /tuan|thang|nam/.test(d[2]) || Number(d[1]) >= 3 || ["ba", "bon", "nam", "may", "vai"].includes(d[1]);
      const unit = ({ ngay: "ngày", hom: "hôm", bua: "bữa", tuan: "tuần", thang: "tháng", nam: "năm" } as Record<string, string>)[d[2]];
      const num = ({ mot: "1", hai: "2", ba: "3", bon: "4", nam: "5", may: "mấy", vai: "vài", mo: "mấy" } as Record<string, string>)[d[1]] ?? d[1];
      notes.push(long ? `Bị ${num} ${unit} rồi thì nên đi khám để tìm đúng nguyên nhân nha, đừng tự chịu hoài.` : `Mới ${num} ${unit} thì cứ theo dõi thêm, nhưng nặng lên là đi khám liền nha.`);
    }
  }
  if (KID_RE.test(` ${n} `)) now.push("kid");
  // "đau đầu dữ dội đột ngột" đã bao gồm "đau đầu"; "sốt cao" bao gồm "sốt".
  if (now.includes("highfever") && !now.includes("fever")) now.push("fever");
  if (now.includes("suddenhead") && !now.includes("headache")) now.push("headache");
  if (now.includes("severebreath") && !now.includes("breath")) now.push("breath");
  const real = now.filter((id) => !["sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "kid", "skipmeal"].includes(id));
  if (inHealth && now.some((id) => ["sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "skipmeal"].includes(id))) detail = true;
  // Chỉ có hoàn cảnh (vd "trời lạnh") thì chưa phải kể bệnh — trừ khi đang kể tiếp chi tiết cho triệu chứng trước.
  if (!real.length && !(inHealth && prev.length && (detail || force || KID_RE.test(` ${n} `)))) return null;
  const all = Array.from(new Set([...prev, ...now]));
  const scored = CONDS.filter((c) => !c.need || c.need.some((id) => all.includes(id)))
    .map((c) => {
      const hit = Object.keys(c.sx).filter((id) => all.includes(id));
      const score = hit.reduce((s, id) => s + c.sx[id], 0);
      const total = Object.values(c.sx).reduce((a, b) => a + b, 0);
      return { c, score, fit: score / total, hit };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.fit - a.fit);
  const kid = all.includes("kid");
  const syms = all.filter((id) => id !== "kid");
  const reds = syms.map(byIdSym).filter((s) => s.red);
  const labels = syms.filter((id) => !["sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "skipmeal"].includes(id)).map((id) => byIdSym(id).label);
  const ctx = syms.filter((id) => ["sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "skipmeal"].includes(id)).map((id) => byIdSym(id).label);
  const out: string[] = [];
  if (reds.length)
    out.push(`⚠️ **${joinVi(reds.map((s) => s.red!))}** là dấu hiệu cần đi cấp cứu. Gọi **115** hoặc tới cơ sở y tế gần nhất ngay nha, đừng chờ.`);
  // Kể thêm chi tiết / hỏi "nên làm gì" mà không có triệu chứng mới → đáp gọn, không lặp lại cả bài phân tích.
  const compact = inHealth && prev.length > 0 && !real.some((id) => !prev.includes(id));
  // 04/10: câu hỏi KIẾN THỨC ("đau đầu là do đâu?") ≠ đang bị → không gán triệu chứng cho người hỏi.
  const knowledge = !inHealth && !prev.length && !kid && !SELF_RE.test(` ${normalizeVi(text)} `) && KNOW_RE.test(` ${normalizeVi(text)} `);
  // 04/10: lần đầu kể đúng 1 triệu chứng, chưa có thời gian/chi tiết, không có dấu hiệu nguy hiểm → hỏi thêm trước, chưa nêu bệnh.
  if (!knowledge && !inHealth && !prev.length && !kid && labels.length === 1 && !reds.length && !DUR_RE.test(` ${n} `) && !force && !SEVERE_RE.test(` ${n} `)) {
    out.push(`Bạn đang bị **${labels[0]}** hả. Để gợi ý cho sát, Lomi hỏi thêm 2 điều nha:\n• Bị bao lâu rồi, đau/khó chịu ở mức nào?\n• Có kèm sốt, nôn, hay triệu chứng nào khác không?`);
    out.push("Nếu thấy đau dữ dội đột ngột, khó thở, đau ngực, lơ mơ hay yếu tay chân thì gọi **115** ngay, đừng chờ.");
    out.push(NOTE_BODY);
    return { text: out.join("\n\n"), sx: all };
  }
  if (knowledge) out.push(`Về **${joinVi(labels)}** nói chung (kiến thức tham khảo, không phải chẩn đoán):`);
  else if (!compact) out.push(`Lomi ghi nhận ${kid ? "bé đang có" : "bạn đang có"}: **${joinVi(labels)}**${ctx.length ? ` (${joinVi(ctx)})` : ""}.`);
  out.push(...notes);
  if (kid && !prev.includes("kid")) out.push(KID_NOTE);
  if (!scored.length) {
    out.push(
      "Chừng này triệu chứng thì chưa đủ để Lomi đoán sát được 🤔 Bạn kể thêm giúp Lomi nha: bị bao lâu rồi, có sốt không, đau ở đâu, kèm dấu hiệu gì khác?",
    );
    out.push(NOTE_BODY);
    return { text: out.join("\n\n"), sx: all };
  }
  const top = scored.slice(0, scored[0].score >= 6 && (scored[1]?.score ?? 0) < scored[0].score / 2 ? 1 : 3);
  if (compact) {
    const m = top[0].c;
    out.push(`Với tình trạng **${m.name.toLowerCase()}** như vậy thì:\n💡 ${m.do.slice(0, 3).join("; ")}.\n🚫 Tránh: ${m.avoid.slice(0, 2).join("; ").toLowerCase()}.\n🩺 ${m.doctor}`);
    if (kid && prev.includes("kid")) out.push("👶 Nhớ: bé li bì, bỏ bú/bỏ ăn, co giật, thở nhanh hay sốt cao khó hạ thì đưa đi khám ngay nha.");
    out.push("Có thêm triệu chứng gì khác thì kể Lomi nghe tiếp nha.");
    out.push(NOTE_BODY);
    return { text: out.join("\n\n"), sx: all };
  }
  out.push(
    `Những triệu chứng này hay gặp ở:\n${top
      .map((x, i) => `${i === 0 ? "•" : "•"} **${x.c.name}** — ${x.c.about}`)
      .join("\n")}`,
  );
  const main = top[0].c;
  out.push(`💡 **Nên làm:**\n${main.do.map((d) => `• ${d}`).join("\n")}`);
  out.push(`🚫 **Nên kiêng / tránh:**\n${main.avoid.map((d) => `• ${d}`).join("\n")}`);
  out.push(`🩺 **Đi khám:** ${main.doctor}`);
  // Gợi ý kể thêm để phân biệt (hỏi triệu chứng đặc trưng còn thiếu của 2 khả năng đầu).
  const missing = Array.from(
    new Set(
      top
        .slice(0, 2)
        .flatMap((x) => Object.entries(x.c.sx).sort((a, b) => b[1] - a[1]).map(([id]) => id))
        .filter((id) => !all.includes(id) && !["sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "spray"].includes(id)),
    ),
  ).slice(0, 3);
  if (missing.length && top.length > 1)
    out.push(`Để Lomi phân biệt rõ hơn: bạn có thấy **${joinVi(missing.map((id) => byIdSym(id).label))}** không?${DUR_RE.test(` ${n} `) ? "" : " Bị bao lâu rồi?"}`);
  else out.push(DUR_RE.test(` ${n} `) || prev.length ? "Có thêm triệu chứng gì khác thì kể Lomi nghe tiếp nha." : "Bạn bị như vậy bao lâu rồi? Kể thêm nếu có triệu chứng khác nha.");
  out.push(NOTE_BODY);
  return { text: out.join("\n\n"), sx: all };
}

export type MindResult = { text: string; mood: string[] };

/**
 * Phân tích cảm xúc. Cần ít nhất 2 cảm giác (cộng dồn với prev) mới đưa ra nhận định,
 * 1 cảm giác thì để thư viện tâm sự (lib/lomiHeart) đáp tự nhiên hơn.
 */
export function analyzeMind(text: string, prev: string[] = []): MindResult | null {
  const n = normStrict(text, HEART);
  const now = found(FEELS, n).map((s) => s.id);
  if (!now.length) return null;
  const all = Array.from(new Set([...prev, ...now]));
  // Chỉ 1 cảm giác thì để thư viện tâm sự đáp — trừ cảm giác rất đặc trưng (ám ảnh, tuyệt vọng, hoảng loạn).
  if (all.length < 2 && !["trauma", "hopeless", "panic"].includes(all[0])) return null;
  const scored = STATES.map((s) => {
    const hit = Object.keys(s.f).filter((id) => all.includes(id));
    return { s, score: hit.reduce((a, id) => a + s.f[id], 0), hit };
  })
    .filter((x) => x.score >= (all.length === 1 ? 3 : 4) && x.hit.length >= Math.min(2, all.length))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.slice(0, scored.length > 1 && scored[1].score >= scored[0].score - 2 ? 2 : 1);
  const main = top[0].s;
  const out: string[] = [];
  out.push(`Lomi nghe bạn đang cảm thấy: **${joinVi(all.map((id) => byIdFeel(id).label))}**. Cảm ơn bạn đã nói ra 💚`);
  out.push(`Những cảm giác này thường gặp khi:\n${top.map((x) => `• **${x.s.name}** — ${x.s.about}`).join("\n")}`);
  out.push(`💡 **Bạn có thể thử:**\n${main.do.map((d) => `• ${d}`).join("\n")}`);
  out.push(`🚫 **Nên tránh:**\n${main.avoid.map((d) => `• ${d}`).join("\n")}`);
  out.push(`🧑‍⚕️ **Nên gặp chuyên gia tâm lý** ${main.pro}`);
  out.push("Chuyện gì đang làm bạn thấy như vậy? Kể Lomi nghe thêm nha.");
  out.push(NOTE_MIND);
  return { text: out.join("\n\n"), mood: all };
}

// Triệu chứng "mềm" — hay đi cùng chuyện tâm lý (mệt, mất ngủ, chán ăn…). Nếu câu chỉ có những triệu chứng này
// mà lại có nhiều cảm giác (áp lực, buồn…), ưu tiên phân tích tâm lý thay vì bệnh cơ thể.
const SOFT = new Set(["fatigue", "insomnia", "sleepy", "noappetite", "sun", "screen", "coldweather", "alcohol", "stress", "afterfood", "skipmeal"]);
export function onlySoftSymptoms(text: string): boolean {
  const n = normStrict(text, HEALTH);
  return found(SYMPTOMS, n).every((s) => SOFT.has(s.id));
}

// Triệu chứng cơ thể hay đi cùng lo âu — khi đang tâm sự chuyện lo âu, căng thẳng thì hiểu theo hướng tâm lý.
const ANX_BODY = new Set(["palp", "breath", "sweat", "insomnia", "fatigue", "dizzy", "stress"]);
export function onlyAnxietyBody(text: string): boolean {
  const f = found(SYMPTOMS, normStrict(text, HEALTH));
  return f.length > 0 && f.every((s) => ANX_BODY.has(s.id));
}
/** Chủ đề tâm sự → cảm giác tương ứng (để cộng dồn khi người dùng kể thêm cảm giác). */
export const THEME_MOOD: Record<string, string[]> = {
  anxiety: ["worry"], panic: ["panic"], overthink: ["overthink"], sad: ["sad"], tired: ["tired"], lonely: ["lonely"],
  depress: ["empty"], work: ["pressure"], boss: ["pressure"], study: ["pressure"], money: ["pressure"], insomnia: ["insomnia"],
  selfworth: ["worthless"], breakup: ["hurt"], ex: ["missing"], grief: ["missing"], jealous: ["jealous"], angerself: ["irritable"],
};
