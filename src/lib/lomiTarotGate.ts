// ─────────────────────────────────────────────────────────────────────────────
// RANH GIỚI TAROT – Y KHOA (12/10) — chạy trên máy, không gọi AI.
//
// Lỗi cần sửa (benchmark 12/10): lớp chặn cũ (tarot.tarotMedicalAsk) chỉ nhận vài dạng câu CHẨN ĐOÁN, nên Lomi vẫn trải bài cho
//   "bói xem bệnh của mẹ a có mau khỏi không"   → bài kết luận "khá tích cực — tinh thần tốt sẽ giúp mau khoẻ"
//   "bói xem ba e có qua khỏi không"            → trải 3 lá, lá "Kết quả"
//   "bói xem a có nên mổ không" / "… ngưng thuốc huyết áp không" → bài trả lời nên / không nên
//   "bói xem thai của e có khoẻ không"          → như trên
// Một dòng nhắc "hỏi bác sĩ" ở cuối không sửa được việc lá bài đã đưa ra một kết luận y khoa.
//
// Cách làm — mặc định CHẶN, chỉ mở cho điều được phép:
//   1. Câu hỏi có thuộc chuyện Y KHOA không? Không tự liệt kê từng câu: dùng lại chính vốn hiểu biết sức khoẻ của Lomi —
//      chủ đề "health" của bộ bài, bệnh Lomi biết (healthSubjectOf), triệu chứng (analyzeBody), chữ "thuốc", chuyện khỏi / qua khỏi /
//      sống chết, mổ, thai kỳ.
//   2. Nếu có: câu đó có phải lời xin CHIÊM NGHIỆM không — hỏi "thế nào / ra sao / làm sao" về cách giữ tinh thần, đối diện, chăm sóc
//      bản thân, và KHÔNG hỏi kết quả (có … không, bao giờ, bao lâu, khỏi, sống, nên mổ / uống / ngưng)?
//        • có  → "reflect": được bói, nhưng bằng một câu hỏi chiêm nghiệm chuẩn (REFLECT_Q) — lá bài không được nhắc tới bệnh,
//                 thuốc hay kết quả điều trị;
//        • không → "medical": không trải bài. Lomi nói rõ giới hạn, chỉ về bác sĩ, và mời một trải bài chiêm nghiệm nếu muốn.
// Lớp này đứng ở CỬA duy nhất dẫn tới một trải bài theo câu hỏi (AiAssistant.doTarot), nên mọi đường (gõ thẳng, đang chờ câu hỏi,
// "bói lại", "thế còn sức khoẻ thì sao", sửa câu hỏi) đều đi qua nó.
// ─────────────────────────────────────────────────────────────────────────────
import { questionTopic, tarotMedicalAsk } from "@/lib/tarot";
import { healthSubjectOf } from "@/lib/lomiHealthTopic";
import { analyzeBody, onlySoftSymptoms } from "@/lib/lomiSymptoms";
import { normalizeVi } from "@/lib/lomiFaq";
import { expandTeen } from "@/lib/lomiChat";
import { parseVi } from "@/lib/lomiParse";
import { P, txt, type Txt } from "@/lib/lomiStory";

export type TarotGate = "medical" | "reflect";
/** Loại câu hỏi y khoa — để lời từ chối nói đúng điều người dùng đang hỏi. */
//   "unclear": câu không có chữ y khoa nào, chỉ có DÁNG câu lo lắng về một người ("… có sao không", "có bị … không", "còn kịp không") —
//   có thể là hỏi sức khoẻ, cũng có thể là chuyện khác. Không trải bài, nhưng cũng không nói như thể chắc chắn đó là chuyện bệnh:
//   Lomi nói rõ giới hạn nếu là chuyện sức khoẻ và mời hỏi lại rõ hơn nếu là chuyện khác.
export type MedicalKind = "diagnosis" | "prognosis" | "forecast" | "life" | "treatment" | "checkup" | "pregnancy" | "unclear";

/** Câu hỏi chiêm nghiệm chuẩn dùng thay cho câu hỏi gốc khi người dùng xin bài về cách đối diện chuyện sức khoẻ. */
export const REFLECT_Q = "Lúc này mình nên giữ tinh thần và chăm sóc bản thân thế nào?";

// ─────────────────────────────────────────────────────────────────────────────
// 09/10 (sau đợt thử độc lập: 133 / 261 câu y khoa mới lọt qua bộ lọc cũ) — viết lại phần PHÂN LOẠI theo ba tầng:
//
//   CỨNG  — chữ chỉ có nghĩa y khoa: tên bệnh, thủ thuật, thuốc, bệnh viện / bác sĩ, thai sản. Có là chặn, bất kể chủ ngữ.
//   MỀM   — chữ dùng cho cả người lẫn việc: khoẻ, khỏi, lành, hồi phục, sống, chết, qua khỏi, tỉnh lại, nặng thêm… Chỉ tính khi câu
//           nói về MỘT NGƯỜI / CON VẬT (hoặc lược chủ ngữ); "công ty a có khoẻ lại không", "tình yêu này có sống được lâu không" thì không.
//   KHUNG — dáng câu: "(có) bị <điều chưa rõ> không" hỏi lá bài gần như luôn là hỏi mình có mắc gì không → chặn, trừ khi <điều đó> là
//           chuyện công việc / tiền / tình cảm (bị sa thải, bị lừa, bị bỏ…); "… là bị gì", "bị sao vậy".
// Trước khi xét, gỡ các THÀNH NGỮ mượn chữ y khoa (say nắng, cắm sừng, đau đầu vì…, viêm màng túi, mổ xẻ, thai nghén ý tưởng…) và
// bỏ qua chuyện NGHỀ / KINH DOANH ngành y (học bác sĩ, mở tiệm thuốc, làm ở bệnh viện).
// Chữ bỏ dấu dễ trùng (mo = mổ / mở, thai = thai / Thái, tiem = tiêm / tiệm, lieu = liều / liệu, hen = hen / hẹn…) chỉ nhận khi gõ CÓ DẤU,
// hoặc khi đi cùng một chữ làm rõ nghĩa ("ca mo", "pha thai", "tiem ngua", "qua lieu").
// 09/10 (các đợt thử mù R2–R6, xem test/lomiTarotProbe.ts) — thêm:
//   • câu GẦN NHƯ không dấu (chữ tắt đã đổi: "ko" → "không") được xét như câu không dấu (lib/lomiStory.txt().mixed);
//   • CHỨC NĂNG SỐNG của một người thân ("yếu lắm rồi, ăn uống không được", "không nhận ra ai") là bằng chứng cứng;
//   • dáng câu LO LẮNG không có chữ y khoa ("… có sao không", "có nguy hiểm không", "còn kịp không") → loại "unclear": không trải bài,
//     nhưng lời đáp không khẳng định đó là chuyện bệnh mà mời hỏi lại rõ hơn;
//   • chuyện bệnh chỉ là HOÀN CẢNH còn mệnh đề hỏi là việc mình nên làm / nên giữ → bài chiêm nghiệm.
// GIỚI HẠN ĐÃ ĐO: bộ lọc là vốn từ + dáng câu nên KHÔNG kín. Với câu chưa từng thấy, lần chạy đầu của mỗi đợt chặn được 71–95% câu y khoa
// (thấp nhất khi người viết cố ý chỉ tả bằng lời thường). Đừng coi các bộ test "đạt hết" là độ phủ ngoài thực tế.
// Nguyên tắc khi phân vân: CHẶN. Chặn nhầm thì người dùng nhận một lời giải thích + lời mời bói chiêm nghiệm; lọt thì lá bài "trả lời" một
// câu hỏi về bệnh — cái sau mới là lỗi an toàn.
// ─────────────────────────────────────────────────────────────────────────────

// Mọi vốn từ dưới đây viết CÓ DẤU và so bằng P() của lib/lomiStory: câu gõ có dấu thì so có dấu ("đã dậy" ≠ "dạ dày", "đâu có" ≠ "đau cổ",
// "tình" ≠ "tỉnh"); câu gõ KHÔNG dấu mới so bản bỏ dấu — và chữ nào bỏ dấu dễ trùng thì có bản riêng chỉ nhận khi đi cùng chữ làm rõ nghĩa.

// Thành ngữ mượn chữ y khoa — gỡ khỏi câu trước khi xét.
const IDIOM_ACC = /say nắng|ốm đòn|đau ví|(?:đất|giá|vàng|nhà đất|thị trường|cổ phiếu|chứng khoán) (?:\p{L}+ ){0,3}sốt(?: lại)?|như (?:bị )?điên|(?:là|như) (?:một )?liều thuốc(?: \p{L}+)?(?: hay thuốc \p{L}+)?|phát điên|tức điên|điên (?:lên|đầu|tiết|cuồng|rồ)|dị ứng (?:với|vs) (?:sếp|anh|chị|ông|bà|thằng|con|nó|đồng nghiệp|công ty|môi trường)|sốt vé|sốt hàng|cháy vé|mổ (?:lợn|heo|gà|bò|vịt|cá)|tiêm phòng rủi ro|bắt bệnh|dị ứng với (?:kiểu|người|mấy|những|sự|việc|tính|cái)|gọi (?:\p{L}+ ){0,2}là bác sĩ|(?:xe|máy) (?:\p{L}+ ){0,2}đi khám|khám (?:xe|máy|phá)|(?:hồi|phát|tái|học) sinh|(?:khỏi |hết |thoát )?bệnh (?:lười|nghèo|sĩ|thành tích|ngôi sao|hình thức|ảo tưởng|nghề nghiệp|sạch sẽ)|vết thương lòng|liều thuốc (?:tinh thần|bổ tinh thần)|cắm sừng|(đau|nhức) đầu vì|viêm màng túi|đau lòng|đau khổ|đau thương|đau tim vì|sốt ruột|sốt đất|sốt giá|cơn sốt (đất|giá|vé)|mổ xẻ|thai nghén|cấp cứu (dự án|công ty|tình|kế hoạch|doanh số)|chết (mê|mệt|đứng|cười|tiệt)|sống (ảo|chết với)|tê liệt|liệt kê|liều (mình|lĩnh|mạng|một phen)|gãy gánh|u mê|trái tim|tim (a|e|anh|em|mình|tui|tôi)? ?(còn|vẫn|đã|chỉ|thuộc|rung)/giu;
const IDIOM_BARE = /\b(say nang|om don|om (?:hang|do|tien|no|dat|lo|von|mong|ap|han)|dau vi|benh vuc|duong tinh (?:duyen|yeu|cam|toi|em|anh|minh|a|e)|bau (?:lop truong|chon|cu|ban|ra)|ho hang|nhu (?:bi )?dien|(?:cu|cung|hay|luon|toan|chi|co|lai|di|dung|ra) benh (?:thang|con|chi|anh|em|vo|chong|nguoi|ban|no|ai|ben|me|ba)|sot (?:cau|bai|ten|don|hang|mon|phan|viec|y nao)|phat dien|tuc dien|dien (?:len|dau|tiet)|sot ve|chay ve|mo (?:lon|heo|ga|bo|vit)|tiem phong rui ro|bat benh|di ung voi (?:kieu|nguoi|may|nhung|su|viec|tinh|cai)|(?:xe|may) (?:\S+ ){0,2}di kham|kham (?:xe|may|pha)|(?:hoi|phat|tai|hoc) sinh|(?:khoi |het |thoat )?benh (?:luoi|ngheo|si|thanh tich|ngoi sao|hinh thuc|ao tuong|nghe nghiep)|vet thuong long|lieu thuoc tinh than|cam sung|(dau|nhuc) dau vi|viem mang tui|dau long|dau kho|sot ruot|sot dat|sot gia|mo xe|thai nghen|cap cuu (du an|cong ty|tinh|ke hoach|doanh so)|chet (me|met|dung|cuoi|tiet)|song ao|te liet|liet ke|trai tim)\b/g;
// Chuyện NGHỀ / HỌC / KINH DOANH ngành y — không phải chuyện sức khoẻ ("con a có nên học bác sĩ không", "a có nên mở tiệm thuốc không").
const CAREER = P("(?:là|học|thi|thi vào|ngành|nghề|làm|theo|trường|đại học|tốt nghiệp|xin việc) (?:\\S+ ){0,2}(?:bác sĩ|y khoa|ngành y|dược sĩ|ngành dược|điều dưỡng|y sĩ|nha khoa|y tế)");
const BUSINESS = P("(?:mở|bán|kinh doanh|buôn|đầu tư(?: vào)?|làm (?:ở|tại|cho)|xin (?:vào|việc)|nhận việc|thuê|sang (?:nhượng|lại)|quản lý|hùn vốn|góp vốn|làm (?:\\S+ ){1,3}(?:ở|tại|cho)|đồ án|đề tài|khoá luận|khóa luận|dự án|phần mềm|app) (?:\\S+ ){0,3}(?:tiệm thuốc|nhà thuốc|quán thuốc|hiệu thuốc|thuốc (?:tây|bắc|nam)|bệnh viện|phòng khám|nha khoa|dược phẩm|thiết bị y tế|spa)");

// Cơ sở y tế được nói tới như một VIỆC LÀM ĂN: "nhà thuốc mới mở của chị có đông khách không", "bệnh viện tư a góp vốn có lời không".
const BIZ_NOUN = "tiệm thuốc|nhà thuốc|quán thuốc|hiệu thuốc|bệnh viện|phòng khám|nha khoa|spa|thẩm mỹ viện";
const BIZ_OUT = "đông khách|vắng khách|có khách|có lời|có lãi|lời không|lãi không|lỗ không|hoà vốn|hòa vốn|doanh thu|doanh số|buôn bán|làm ăn|khai trương|góp vốn|sinh lời|lợi nhuận";
const BUSINESS2 = P(`(?:${BIZ_NOUN}) (?:\\S+ ){0,7}(?:${BIZ_OUT})|(?:${BIZ_OUT}) (?:\\S+ ){0,7}(?:${BIZ_NOUN})`);

const JOB_CUE = P("lương|thực tập|đồng nghiệp|trưởng khoa|chi nhánh|nhân viên|ứng tuyển|tuyển dụng|ca trực|mở thêm|thăng chức|hợp đồng lao động");
const WORKPLACE = P("bệnh viện(?: tư| công)?|phòng khám(?: nha khoa)?|khoa (?:cấp cứu|nội|ngoại|sản|nhi|ung bướu)|nha khoa");

// ── CỨNG ──
const DISEASE = P(
  "bệnh|bịnh|ốm|sốt|cúm|bỏng|lẫn nhiều|minh mẫn|tái nghiện|bóng cười|hàng trắng|chơi kẹo|bại não|cổ trướng|xơ gan|cách ly|nhậu (?:\\S+ ){0,8}bỏ được|hay quên|lẫn (?:lắm|quá)|tiểu đêm|đi tiểu|nói ngọng|nhói|tụt (?:\\d+ )?(?:ký|kí|kg|cân)|ói|xỉu|ngất|tê nửa người|méo xệch|run lẩy bẩy|tay run|chân (?:\\S+ )?sưng|vàng da|mắt (?:\\S+ )?vàng|vết bầm|bầm tím|băng huyết|trễ kinh|chậm kinh|khò khè|nghe tiếng (?:\\S+ ){0,3}trong đầu|chó cắn|mèo cắn|chơi đá|đập đá|hút cỏ|cắn kẹo|thành nghiện|muốn biến mất|ngưng tim|ngừng tim|ngực (?:trái|phải)|trong ngực|màn đen|cục (?:cứng|lạ|gì)|cái cục|nổi cục|glôcôm|glaucoma|cườm (?:nước|khô|mắt)|thuỷ tinh thể|thủy tinh thể|răng khôn|bướu|gãy (?:\\S+ ){0,2}xương|xương (?:\\S+ ){0,3}liền|ra máu|trĩ|đi cầu|đi ngoài|méo miệng|liệt mặt|(?:bị|bệnh) không (?:gan|phổi|vú|dạ dày|đại tràng|máu|vòm|cổ tử cung|tuyến giáp)|phổi|thận(?! trọng)|não bộ|sọ não|mạch máu não|teo não|não (?:của|bị)|tử cung|buồng trứng|tuyến giáp|tuyến tiền liệt|đại tràng|lá gan|gan (?:của|ổng|bả|ông|bà|ba|bố|mẹ|a|e|anh|em|chồng|vợ|con)|u (?:có|teo|to ra|lớn|nhỏ lại)|cai (?:rượu|thuốc|ma tuý|ma túy|nghiện|máy|được máy)|trại cai|đi cai|nghiện (?:cỏ|đá|ke|heroin|thuốc lắc|cần)|tự tử|tự sát|tự hại|tự làm đau|muốn chết|bị lẫn|lẫn rồi|lú lẫn|dậy thì (?:sớm|muộn)|có kinh(?! nghiệm| doanh| phí| tế)|sụt (?:\\d+ )?(?:ký|kí|kg|cân)|hạch(?! toán| sách)|(?:bị|chân|tay|xương|vai|sườn) gãy|gãy (?:tay|chân|xương|vai|sườn)|liền xương|lành tính|ác tính|lành hay ác|ác hay lành|(?:bị|cái|cục|khối) u|u của|mụn|đau|nhức|sưng|ngứa|ho|ung thư|khối u|cục u|u xơ|u nang|u ác|u lành|u não|u vú|u gan|u phổi|u tuyến|nổi hạch|cái hạch|cục hạch|hạch (?:ở|nách|cổ)|k (?:phổi|vú|gan|dạ dày|đại tràng|máu|vòm|cổ tử cung)|tiểu đường|huyết áp|đột quỵ|tai biến|nhồi máu|suy (?:tim|thận|gan|hô hấp)|trầm cảm|tâm thần|rối loạn|ám ảnh cưỡng chế|tự kỷ|tự kỉ|tăng động|chậm (?:nói|phát triển|lớn)|hội chứng|bị down|alzheimer|parkinson|mất trí nhớ|covid|corona|lao phổi|bị lao|bệnh lao|hiv|sida|viêm|nhiễm (?:trùng|khuẩn|virus)|ngộ độc|dị ứng|béo phì|suy dinh dưỡng|đa nang|mãn kinh|yếu sinh lý|tinh trùng|sùi mào gà|giang mai|bị dại|bệnh dại|chó dại|bị liệt|liệt (?:nửa người|giường|chân|tay)|bị mù|mù (?:mắt|loà|lòa|luôn)|điếc|hôn mê|động kinh|co giật|dương tính|âm tính|bị lây|lây bệnh|dịch bệnh|nấm da|vảy nến|hen suyễn|bị hen|cơn hen|viêm xoang|dạ dày|bao tử|sỏi (?:thận|mật)|gout|gút|thoái hoá|thoái hóa|loãng xương|thiếu máu|mất ngủ|khó ngủ|cai nghiện|bị nghiện|nghiện (?:ma tuý|ma túy|rượu)|triệu chứng|dị tật|chấn thương|vết thương|gãy (?:tay|chân|xương)|bị bỏng|thần kinh|trí nhớ|gan nhiễm mỡ|mỡ máu|men gan|cholesterol|tim mạch|xương khớp|cột sống|tiền đình|bệnh trĩ|táo bón|tiêu chảy|kinh nguyệt|chóng mặt|buồn nôn|nôn ói|khó thở|tức ngực|tê (?:tay|chân)|nổi mẩn|phát ban|chảy máu|ù tai|mờ mắt|đầy bụng|khàn tiếng|sụt cân|bỏ ăn|điên|loạn thần|hoang tưởng",
  "benh|lan nhieu|minh man|tai nghien|bong cuoi|hang trang|choi keo|bai nao|co truong|cach ly|nhau (?:\\S+ ){0,8}bo duoc|ngu (?:co |duoc )?\\d tieng|lo mo|hong nao|tieu dem|noi ngong|tut (?:\\d+ )?(?:ky|kg|can)|bi xiu|xiu (?:trong|hoai|lien|\\d)|ngat xiu|te nua nguoi|run lay bay|chan (?:\\S+ )?sung|vang da|mat (?:\\S+ )?vang|vet bam|bam tim|bang huyet|tre kinh|cham kinh|kho khe|cho can|dap da|choi da|hut co|thanh nghien|muon bien mat|ngung tim|oi (?:ra|miet|hoai|mua)|nguc trai|trong nguc|(?:tim|gan|phoi|mau|nguc) (?:\\S+ ){0,2}co (?:on|van de|sao|bi)|noi cuc|cuc cung|glocom|glaucoma|thuy tinh the|rang khon|buou co|buou giap|gay (?:\\S+ ){0,2}xuong|ra mau|meo mieng|liet mat|nhin ro lai|(?:bi|benh) khong (?:gan|phoi|vu|da day|dai trang|mau|vom|tuyen giap)|(?:la|hai|vien|lao|nuoc trong) phoi|phoi (?:cua|co van de|bi)|tu cung|buong trung|tuyen giap|tuyen tien liet|dai trang|la gan|xo gan|viem gan|u co teo|cai (?:ruou|ma tuy|nghien|duoc may)|trai cai|nghien (?:da|co|ke|heroin|ma tuy|ruou)|(?:y dinh|muon|doi) tu tu|tu tu that|tu sat|muon chet|lu lan|bi lan (?:roi|nang)|day thi (?:som|muon)|co kinh(?! nghiem| doanh| phi| te)|sut (?:\\d+ )?(?:ky|ki|kg|can)|cai hach|hach (?:o|nach|co)|cham (?:\\S+ ){1,2}om|(?:con|be|me|ba|bo|vo|chong) (?:dang |bi |hay )?om|nguoi om|bi binh|binh (?:gi|cua|nang|tinh)|vet bong|bi bong|(?:tay|chan|xuong|vai|suon) gay|gay (?:tay|chan|xuong|vai|suon)|lien xuong|lanh tinh|ac tinh|lanh hay ac|ac hay lanh|(?:bi|cai|cuc|khoi) u|u cua|bi om|dang om|om (?:nang|dau|lau)|bi sot|het sot|con sot|sot (?:cao|xuat huyet|ret|sieu vi)|bi cum|benh cum|bi mun|het mun|noi mun|dau (?:bung|dau|nguc|lung|rang|hong|khop|da day|bao tu|bung kinh)|nhuc dau|het ho|ho (?:hoai|keo dai|ra mau|khan|co dom)|ung thu|khoi u|cuc u|u (?:xo|nang|ac|lanh|nao|vu|gan|phoi|tuyen)|noi hach|cuc hach|k (?:phoi|vu|gan|da day|dai trang|mau|vom)|tieu duong|huyet ap|dot quy|tai bien|nhoi mau|suy (?:tim|than|gan|ho hap)|tram cam|tam than|roi loan|am anh cuong che|tu ky|tu ki|tang dong|cham (?:noi|phat trien|lon)|hoi chung|bi down|alzheimer|parkinson|mat tri nho|covid|corona|lao phoi|bi lao|hiv|sida|viem|nhiem (?:trung|khuan|virus)|ngo doc|di ung|beo phi|suy dinh duong|da nang buong trung|buong trung da nang|man kinh|yeu sinh ly|tinh trung|sui mao ga|giang mai|bi dai|benh dai|bi liet|bi mu|bi diec|hon me|dong kinh|co giat|duong tinh|am tinh|bi lay|lay benh|dich benh|nam da|vay nen|hen suyen|bi hen|viem xoang|da day|bao tu|soi (?:than|mat)|gout|gut|thoai hoa|loang xuong|thieu mau|mat ngu|kho ngu|cai nghien|bi nghien|trieu chung|di tat|chan thuong|vet thuong|gay (?:tay|chan|xuong)|bi bong|than kinh|tri nho|gan nhiem mo|mo mau|men gan|cholesterol|tim mach|xuong khop|cot song|tien dinh|benh tri|tao bon|tieu chay|kinh nguyet|chong mat|buon non|kho tho|tuc nguc|phat ban|chay mau|sut can|bo an|bi dien|loan than|hoang tuong",
);
const PROC = P(
  "mổ|tiêm|chích|liều|xạ|dao kéo|ông lang|thầy lang|thầy thuốc|tây y|đông y|bó lá|vật lý trị liệu|viên uống|uống (?:\\S+ ){0,2}viên|một vạch|lên vạch|gắn (?:\\S+ )?phôi|thả (?:\\S+ ){0,2}(?:phôi|bé tuyết)|lên beta|beta hcg|lasik|máy tạo nhịp|tạo nhịp|thay van|chọc ối|nipt|double test|triple test|que (?:thử|lên)|\\d vạch|hai vạch|thở (?:oxy|ô xy|ôxy)|ăn qua ống|chiếu đèn|bó bột|cắt chỉ|test nhanh|soi cổ tử cung|truyền đạm|vô thuốc|hpv|đi tâm lý|tuyến trên|(?:bị|viện|bác sĩ) trả về|thở máy|cai máy|icu|hồi sức|đặt nội khí quản|nội khí quản|chạy tia|vô hoá chất|vô hóa chất|truyền hoá chất|truyền hóa chất|iui|icsi|hút mỡ|nâng mũi|nâng ngực|cắt mí|căng da|thẩm mỹ viện|xn|kq xn|(?:thử|kết quả) máu|kết quả (?:xét nghiệm|sinh thiết|siêu âm|chụp|khám)|phẫu thuật|hoá trị|hóa trị|xạ trị|điều trị|chữa (?:bệnh|trị|khỏi|được)|chạy thận|lọc máu|ghép (?:thận|gan|tim|tuỷ|tủy|phổi|tạng)|truyền (?:nước|máu|dịch|đạm)|vắc xin|vaccine|filler|botox|ivf|thụ tinh|chuyển phôi|niềng răng|nhổ (?:\\S+ ){0,3}răng|trám răng|cắt (?:amidan|ruột thừa|khối u|tử cung)|đặt (?:stent|vòng)|que cấy|thay khớp|triệt sản|phá thai|nạo thai|hút thai|sinh mổ|sinh thường|đẻ mổ|đẻ thường|phác đồ|xét nghiệm|siêu âm|chụp (?:phim|ct|mri|x quang)|sinh thiết|nội soi|tái khám|đi khám|khám (?:bệnh|thai|tổng quát|sức khoẻ|sức khỏe)|nhập viện|chuyển viện|xuất viện|ra viện|nằm viện|đi viện|cấp cứu|ca mổ|vết mổ|ca ghép|ca sinh",
  "di xa ve|xa (?:nua|them|xong|truoc)|hoa truoc|dao keo|ong lang|thay lang|tay y|dong y|bo la|vat ly tri lieu|vien uong|len vach|mot vach|gan (?:\\S+ )?phoi|be tuyet|len vien|lasik|may tao nhip|tao nhip|thay van tim|choc oi|nipt|double test|que (?:thu|len)|\\d vach|hai vach|tho oxy|an qua ong|chieu den|bo bot|cat chi|test nhanh|truyen dam|vo thuoc|hpv|tuyen tren|bi tra ve|chich nua|chua chich|chich mui|tho may|cai may|icu|hoi suc|noi khi quan|chay tia|vo hoa chat|truyen hoa chat|iui|icsi|hut mo|nang mui|nang nguc|cat mi|tham my vien|kq xn|xn mau|(?:thu|ket qua) mau|ket qua (?:xet nghiem|sinh thiet|sieu am|chup|kham)|(?:co nen|nen|phai|can|di|sap|cho|chua|duoc|bi) mo(?: (?:khong|ko|k|hk|hong|chua|a|ha|nhi|roi))* $|mo (?:tim|ruot|nao|khop|u|de|lay thai|noi soi|bat con|da day|cot song)|mo mat (?:can|vien|loan|lac)|ca mo|vet mo|tiem (?:ngua|phong|vac xin|mui|filler|chung|botox)|chich ngua|tang lieu|giam lieu|lieu thuoc|qua lieu|phau thuat|hoa tri|xa tri|dieu tri|chua (?:benh|tri|khoi)|chay than|loc mau|ghep (?:than|gan|tim|tuy|phoi|tang)|truyen (?:nuoc|mau|dich|dam)|vac xin|vaccine|filler|botox|ivf|thu tinh (?:ong nghiem|nhan tao)|chuyen phoi|nieng rang|nho rang|tram rang|cat (?:amidan|ruot thua|khoi u|tu cung)|dat (?:stent|vong)|thay khop|triet san|pha thai|nao thai|hut thai|sinh mo|sinh thuong|de mo|de thuong|phac do|xet nghiem|sieu am|chup (?:phim|ct|mri|x quang)|sinh thiet|noi soi|tai kham|di kham|kham (?:benh|thai|tong quat|suc khoe)|nhap vien|chuyen vien|xuat vien|ra vien|nam vien|di vien|cap cuu|ca ghep|ca sinh",
);
const PLACE = P(
  "bệnh viện|bv|(?:bên|trong|ở|vào|tại|trực ở) viện(?! nghiên cứu| nghiên cú| hàn lâm| kiểm sát| đào tạo| kinh tế| ngôn ngữ)|phòng khám|trạm xá|bác sĩ|bs|thú y|dược sĩ|y tá|khoa (?:cấp cứu|nội|ngoại|sản|nhi|ung bướu)|phòng (?:mổ|cấp cứu|hồi sức)",
  "benh vien|bv|(?:ben|trong|o|vao|tai) vien(?! nghien cu| han lam| kiem sat| dao tao| kinh te| ngon ngu)|phong kham|tram xa|bac si|bs|thu y|duoc si|y ta|khoa (?:cap cuu|noi|ngoai|san|nhi|ung buou)|phong (?:mo|cap cuu|hoi suc)",
);
const MEDS = P(
  "thuốc(?! lá| lào| nhuộm| nổ| súng| bảo vệ thực vật| trừ sâu| diệt| chuột| pháo| tẩy)|uống (?:\\S+ ){0,2}viên|lệ thuộc (?:thuốc|cả đời)|insulin|paracetamol|panadol|aspirin|ibuprofen|corticoid|morphin|morphine|kháng sinh|toa thuốc|đơn thuốc|thực phẩm chức năng",
  "uong thuoc|bo thuoc|insulin|paracetamol|panadol|aspirin|ibuprofen|corticoid|morphin|morphine|ngung thuoc|doi thuoc|thuoc (?:nay|do|men|tay|nam|bac|bo|giam dau|ha sot|ngu|khang sinh|huyet ap|tieu duong)|toa thuoc|don thuoc|khang sinh|thuc pham chuc nang",
);
const PREG = P(
  "thai|bào thai|vỡ ối|ối vỡ|doạ sinh|dọa sinh|(?:cưới|lấy nhau|kết hôn) (?:\\S+ ){0,4}chưa có (?:con|bầu|em bé)|chậm có con|khó có con|mong con|cầu con|có bầu|mang bầu|dính bầu|em bé trong bụng|sinh con|sinh (?:được|nở|non|an toàn)|sắp sinh|đẻ (?:non|khó|dễ|được)|vợ (?:\\S+ )?(?:đẻ|sinh)|chuyển dạ|vô sinh|hiếm muộn|mẹ tròn con vuông|con trai hay con gái|làm mẹ|con (?:\\S+ )?sinh ra|bao giờ (?:\\S+ ){0,3}có (?:con|em bé)|(?:e|em|c|chị|mình|tui|vợ \\S+|vợ chồng \\S+|tụi \\S+) (?:\\S+ ){0,3}có (?:con|em bé) (?:không|ko|k|chưa|được)",
  "(?:pha|giu|bo|duong|kham|sieu am|co|mang|say|luu|thu|tim|doa say) thai|vo oi|doa sinh|(?:cuoi|lay nhau|ket hon) (?:\\S+ ){0,4}chua co (?:con|bau|em be)|cham co con|kho co con|thai \\d+ (?:tuan|thang)|thai (?:cua|nhi|ky|ngoai|luu|duoc|may tuan|may thang|co khoe|khoe)|co bau|mang bau|dinh bau|em be trong bung|sinh con|sinh (?:duoc|no|non|an toan)|sap sinh|de (?:non|kho|duoc)|vo (?:\\S+ )?(?:de|sinh)|chuyen da|vo sinh|hiem muon|me tron con vuong|con trai hay con gai|lam me|bao gio (?:\\S+ ){0,3}co (?:con|em be)",
);

// ── MỀM (chỉ tính khi câu nói về người / con vật) ──
// Chuyện khỏi bệnh / tiến triển / vận động lại.
const RECOVER = P(
  "qua khỏi|khỏi bệnh|hết bệnh|lành bệnh|bình phục|hồi phục|(?:có|sẽ|mau|sớm|chưa|đã) khỏi|khỏi (?:hẳn|không|ko|k|chưa|được)|(?:bao giờ|khi nào|bao lâu) (?:\\S+ ){0,3}(?:khỏi|lành|tỉnh|đỡ|liền)|chữa được|đáp ứng (?:thuốc|điều trị|hoá trị|hóa trị|phác đồ)|(?<!hiền |làm )lành (?:hẳn|lại|không|ko|chưa|được)|tái phát|di căn|biến chứng|nặng thêm|nặng hơn|trở nặng|khoẻ lại|khỏe lại|khoẻ lên|khỏe lên|hết (?:ốm|ho|sốt|đau|mụn)|tai qua nạn khỏi|tỉnh lại|có tỉnh|đi lại (?:được|bình thường)|ngồi dậy được|cử động|mọc lại|sáng lại|biết nói|về bình thường|giảm cân|giảm được|tăng cân",
  "qua khoi|chua duoc khong|dap ung (?:thuoc|dieu tri|hoa tri|phac do)|khoi benh|het benh|lanh benh|binh phuc|hoi phuc|mau khoi|co khoi|khoi (?:khong|ko|k|chua|duoc|han)|chua khoi|tai phat|di can|bien chung|nang them|tro nang|khoe lai|khoe len|het (?:om|ho|sot|mun)|tai qua nan khoi|tinh lai|di lai (?:duoc|binh thuong)|ngoi day duoc|cu dong (?:lai|duoc)|moc lai|mat (?:\\S+ ){0,2}sang lai|biet noi|ve binh thuong|giam can|tang can",
);
// Sống chết — nhóm RÕ (tính với mọi người / con vật) và nhóm DỄ LẪN với chuyện tình cảm, công việc (chỉ tính khi câu không thuộc chủ đề khác).
const LIFE = P(
  "qua khỏi|sống (?:qua|tới|đến|thọ|bao lâu|thêm|được (?:bao lâu|mấy))|còn sống|có chết|sẽ chết|sắp chết|bao giờ chết|khi nào (?:\\S+ )?chết|chết (?:không|ko|k)|tử vong|nguy kịch|qua đời|đoản mệnh|yểu mệnh|chết yểu|thọ (?:được )?bao nhiêu|qua (?:nổi|được) (?:đêm nay|cơn này|lần này|năm nay|tết này|tết nay|mùa \\S+ này|tháng này|tuần này)|bao nhiêu thời gian nữa|cuối đời|những ngày cuối|hấp hối|về với (?:ông bà|tổ tiên|đất)|nhắm mắt xuôi tay|lìa đời|tính mạng",
);
const LIFE_WEAK = P("ra đi|mà đi|có đi không|cứu được|trụ được|sống (?:được )?lâu|còn (?:ở với (?:\\S+ ){1,3})?được (?:bao lâu|mấy năm|mấy tháng|mấy cái tết|mấy mùa)|còn được mấy (?:năm|tháng|tuần|ngày|hôm|bữa)|còn bao nhiêu thời gian|tỉnh (?:không|ko|k) $|bao giờ (?:\\S+ ){0,2}tỉnh");
const QUA = P("(?:có )?qua (?:nổi|được) (?:không|ko|k) $");
// Chức năng sống cơ bản của MỘT NGƯỜI THÂN đang suy đi ("bà yếu lắm rồi, ăn uống không được", "ông không nhận ra ai", "bé chưa biết đi") —
// không có tên bệnh nào, nhưng hỏi lá bài về người đó lúc này là hỏi chuyện sức khoẻ. Chỉ tính khi câu có nhắc một người thân.
const FUNC = P(
  "yếu (?:lắm|dần|đi|quá|hơn|rồi)|ngày càng yếu|già yếu|nằm một chỗ|nằm liệt|(?:ăn|ăn uống|ngủ|đi lại|thở|nuốt) (?:không|chẳng|hổng|hông) (?:được|nổi)|(?:không|chẳng|chưa|hổng) (?:ăn|ăn uống) (?:được|gì|uống)|bỏ ăn|chưa biết (?:nói|đi|bò|lật|ngồi)|chưa nói được (?:từ|chữ|câu|tiếng)|(?:không|chẳng|hổng) (?:còn )?nhận ra|lơ mơ|mê man",
  "ngay cang yeu|gia yeu|yeu dan|nam mot cho|nam liet|(?:an|an uong) (?:khong|ko|k|hong) (?:duoc|noi)|(?:khong|ko|k|chua) (?:an|an uong) (?:duoc|gi|uong)|bo an|chua biet (?:noi|di|bo|lat|ngoi)|chua noi duoc|(?:khong|ko|k) (?:con )?nhan ra|me man",
);
// Hỏi chung về thể trạng: "a có khoẻ không", "sức khoẻ năm nay", "cơ thể a có ổn không".
const WELL = P("sức khoẻ|sức khỏe|sk|khoẻ mạnh|khỏe mạnh|(?:có )?(?:khoẻ|khỏe) (?:không|ko|k)|cơ thể|sức đề kháng|thể trạng|thể lực");
// Bộ phận cơ thể + tình trạng (chỉ so trên câu gõ có dấu — bỏ dấu thì "mat / tai / tay / da / co" trùng quá nhiều chữ khác).
const BODY_ACC = /(?<![\p{L}])(tim|gan|thận|phổi|mắt|tai|chân|tay|da|tóc|não|xương|khớp|răng|mũi|họng|ruột|lưng|cổ|vai|đầu gối|bụng|ngực|cơ thể|chỉ số \p{L}+|cân nặng)(?![\p{L}])(?: \p{L}+){0,4}? (?:có )?(vấn đề|bị|lành|sáng lại|mù|điếc|cử động|mọc lại|hết|khoẻ|khỏe|yếu|ổn|sao không|giảm được|về bình thường)(?![\p{L}])/u;

// Hỏi có nên ĐI KHÁM / xét nghiệm không — cũng không phải việc của lá bài, nhưng lời đáp khác hẳn chuyện mổ hay ngưng thuốc.
const CHECKUP = /\b(co nen|nen|co can|can|co phai|phai) (\S+ ){0,3}(di kham|kham|tai kham|xet nghiem|di vien|di benh vien|di bv|nhap vien|sieu am|chup (phim|ct|mri)|thu y)\b/;
const SURGERY = P("mổ|phẫu thuật|hoá trị|hóa trị|xạ trị", "phau thuat|hoa tri|xa tri|ca mo|(?:co nen|nen|phai|can) mo(?: (?:khong|ko|k|hk|chua))* $");
// Quyết định điều trị: nên / có nên + một việc y khoa; hoặc hỏi một thủ thuật có thành công / hiệu quả không.
const DECIDE = /\b(co nen|nen|co can|can|co phai|phai|nen hay)\b/;
const TREAT_WORD = /\b(uong|ngung|bo thuoc|doi thuoc|doi (bac si|bs|benh vien|bv)|chuyen vien|nghe loi (bac si|bs))\b/;
const TREAT_NOUN = P("ca mổ|ca ghép|ca sinh|phác đồ|liều|hoá trị|hóa trị|xạ trị|điều trị|chạy thận|lọc máu", "ca mo|ca ghep|ca sinh|phac do|lieu thuoc|hoa tri|xa tri|dieu tri|chay than|loc mau");
// Đang nói chuyện một người ốm mà hỏi bài một câu chung chung về sắp tới → vẫn là hỏi bệnh sẽ ra sao.
const FUTURE = /\b(sap toi|thoi gian toi|tuong lai|roi se|se ra sao|se the nao|ra sao|co on khong|co sao khong|moi chuyen|tai qua nan khoi)\b/;

const FUTURE_STRICT = /\b(sap toi|thoi gian toi|tuong lai|roi se|se ra sao|se the nao|co on khong|co sao khong|moi chuyen|tai qua nan khoi)\b/;

// ── KHUNG ──
// "(có) bị <…> không", "… là bị gì", "bị sao vậy".
const DX_FRAME = /\b(?:co (?:phai )?(?:dang )?(?:bi|mac|dinh)|co khi nao (?:bi|mac)|lieu co (?:bi|mac)|(?:a|anh|e|em|c|chi|minh|toi|tui|no|me|ba|bo|con|vo|chong|ong|ba noi|ba ngoai) (?:bi|mac)) ((?:\S+ ){1,4}?)(?:khong|ko|k|hk|hong|chua|ha|nhi)\s*$/;
const DX_WHAT = /\b(la )?bi (gi|sao|lam sao|benh gi)( (vay|the|day|nhi|ha|ta))*\s*$|\b(bi|mac) (gi|benh gi|sao) ma\b/;
// <điều đó> là chuyện công việc / tiền / tình cảm / đời thường → không phải hỏi bệnh.
const NOT_ILL = /\b(delay|hoan|huy|lo|phat hien|bat gap|hack|ket|cam|khoa|danh rot|tre chuyen|sa thai|duoi|cho nghi|mat viec|giang chuc|ky luat|phat|lua|quyt|giat|xu ep|pha san|lo von|thua lo|no|phan boi|bo( roi)?|da|chia tay|ghet|noi xau|choi xau|ham hai|hai|kien|bat|di tu|tu|truot|rot|loai|tu choi|ghost|block|chan|theo doi|ghen|nghi ngo|oan|trach|mang|chui|la|danh gia|soi|de y|thay the|qua mat|ep|ap luc|lam phien|quay roi|trom|cuop|mat (tien|do|xe|viec|cap)|tre|muon|ket xe|lac|quen|hieu lam|coi thuong|xem thuong|loi dung|dua|troll|stress)\b/;

// Khung LO LẮNG về một người: "… có sao không", "có nguy hiểm không", "trong người đang có chuyện gì", "bị chi rứa", "còn kịp không",
// "lành hay dữ". Người dùng tả một tình trạng bằng lời thường (không có tên bệnh nào) rồi hỏi lá bài như vậy thì gần như luôn là hỏi sức khoẻ.
// Chỉ tính khi câu không thuộc chủ đề tình cảm / công việc / tiền / học / đi lại và không nói về một việc / vật.
//   (đo trên 322 câu Tarot thường của các đợt thử: không chặn nhầm câu nào; trên 43 câu y khoa tả bằng lời thường từng lọt: bắt thêm 17.)
const CONCERN = /\b(co sao khong|co bi (gi|sao|lam sao|chi|rang) khong|co (lam sao|rang) khong|bi (gi|chi|sao|lam sao)\b|co nguy hiem|nguy hiem khong|co dang (lo|so)|co van de gi|trong nguoi|mac chung gi|con kip|het cuu|tro lai binh thuong|binh thuong lai (duoc )?khong|lanh hay (du|ac)|thu du khong|tot hay xau|co hai gi|hu chua)\b/;

// Lời xin chiêm nghiệm: hỏi CÁCH (thế nào / ra sao / làm sao / điều gì) + nói về tinh thần, đối diện, ở bên, chăm sóc.
const REFLECT =
  /\b(doi dien|doi mat|giu tinh than|tinh than|binh tinh|binh an|chap nhan|manh me|vung vang|bot lo|do lo|het lo|bot so|do so|het so|dong hanh|o ben|cham soc|yeu thuong ban than|giu vung|thong diep|loi nhan|can gi luc nay|nang do|dong vien|an ui|yen tam|an long|vuot qua (noi so|giai doan|chuyen nay|luc nay)|(de|cho) (\S+ ){0,3}vui|ho tro tinh than|binh tam|vung long|vung tin|guc nga|nhe long|thanh than|niem vui|y nghia|tran trong|nuoi duong|tam the|thai do|bot co don|do co don|kien nhan|hy vong|niem tin|nhan gi|nhan nhu|bai hoc|long minh|giu long|chan nan|nan long|buong|long yen|yen long|biet on|nuong tua|chu tam|hoi tiec|di tiep|buoc tiep|cho dua|cam xuc|day (em|a|anh|chi|minh|toi|tui) (dieu|bai))\b/;
const HOW = /\b(the nao|ra sao|lam sao|nhu the nao|dieu gi|can gi|nen lam gi|nen nghi gi|thong diep|loi nhan|cach nao|\S+ nao|o dau|tu dau|vao dau|suc dau|sao cho|sao de|lam gi|gi|(cho|xin) (\S+ ){0,3}(mot |1 )?(loi|thong diep))\b/;
// Mệnh đề hỏi là lời hỏi về VIỆC MÌNH NÊN LÀM / NÊN GIỮ ("em nên…", "làm sao để…", "tôi tìm … ở đâu"), không phải hỏi chuyện sẽ ra sao.
const SELF_ACT = /\b(nen|can|phai|lam sao de|lam the nao de|lam gi de|lam gi cho|tim|hoc cach|co the)\b/;
// Ranh giới mệnh đề: dấu câu, hoặc chữ nối hoàn cảnh ("… khi mẹ đang nằm viện", "… trong thời gian nằm viện").
const CLAUSE = /[,;.!?…]+|\s(?:khi|trong lúc|trong luc|trong thời gian|trong thoi gian|giữa lúc|giua luc|trong những ngày|trong nhung ngay)\s/giu;
// Hỏi KẾT QUẢ: câu có / không, hỏi mốc thời gian, hoặc câu quyết định "có nên…".
const YESNO = /\b(khong|ko|k|hk|hong|hok|khum|chua|ha|nhi|phai khong|dung khong)\s*$/;
const WHEN = /\b(bao gio|khi nao|bao lau|may (thang|nam)(?! (roi|nay|qua|truoc|lien))|luc nao|chung nao)\b/;

// Chủ ngữ là một VIỆC / VẬT ("công ty a", "tình yêu này", "dự án", "shop e") → chữ MỀM không mang nghĩa y khoa.
const THING = /^(?:(?:boi|xem|coi|thu|giup|cho|a|e|c|anh|em|chi|minh) )*(?:(?:cai|chuyen|viec|cuoc|moi|con) )?(cong ty|du an|shop|quan|tiem|cua hang|tinh yeu|tinh cam|quan he|chuyen tinh|hon nhan|kinh doanh|doanh thu|doanh so|cong viec|su nghiep|vi|tai khoan|thi truong|co phieu|nha (?:nay|do|moi|cu|dat|tro|thue)|xe|dien thoai|may|ke hoach|y tuong|hop dong|vu nay|team|nhom|lop|truong|app|web|kenh|page|thuong hieu|san pham|don hang|luong|tien)\b/;

const ABSTRACT = /^(?:(?:boi|xem|coi|thu|giup|cho) )*(?:(?:cai|chuyen|viec|cuoc|moi) )?(cong ty|du an|shop|cua hang|tinh yeu|tinh cam|quan he|chuyen tinh|hon nhan|kinh doanh|doanh thu|doanh so|cong viec|su nghiep|thi truong|co phieu|thuong hieu|san pham|team|con xe|chiec xe)\b/;
const THING_NEAR = /\b(kinh te|tai chinh|cong ty|du an|shop|quan|tiem|cua hang|tinh yeu|tinh cam|quan he|chuyen tinh|hon nhan|kinh doanh|doanh thu|doanh so|cong viec|su nghiep|thi truong|co phieu|chung khoan|bat dong san|gia vang|gia dat|don hang|thuong hieu|niem tin|long tin)\b/;
const norm = (x: string) => ` ${normalizeVi(expandTeen(x)).replace(/[?!.,…]/g, " ").replace(/\s+/g, " ").trim()} `;

type Evidence = { hard: boolean; soft: boolean; life: boolean; preg: boolean; dx: boolean; named: boolean; /** chỉ có DÁNG câu lo lắng / "(có) bị … không", không có chữ y khoa nào */ weak?: boolean; /** bằng chứng duy nhất là một triệu chứng thoáng qua */ sxOnly?: boolean };
function evidenceOf(question: string): Evidence & { n: string; t: Txt; why: string[] } {
  // Gỡ thành ngữ trước khi xét.
  //   (để lại một dấu "idiomx" ở chỗ thành ngữ: chữ "lành / khỏi" đứng ngay sau nó là nói về thành ngữ đó — "vết thương lòng này bao giờ lành".)
  let acc = question.normalize("NFC").toLowerCase().replace(IDIOM_ACC, " idiomx ").replace(IDIOM_BARE, " idiomx ");
  let t = txt(acc);
  // Chuyện NGHỀ / KINH DOANH ngành y: gỡ đúng CỤM đó rồi xét tiếp phần còn lại ("em làm bác sĩ, em có bị ung thư không" vẫn là hỏi bệnh).
  //   Câu có chữ chỉ CHỖ LÀM (lương, thực tập, trưởng khoa, chi nhánh…) thì bệnh viện / phòng khám / khoa trong câu là nơi làm việc.
  for (const pat of [CAREER, BUSINESS, BUSINESS2, ...(JOB_CUE(t) ? [WORKPLACE] : [])]) {
    const m = pat(t);
    if (!m || m.index === undefined) continue;
    acc = `${t.s.slice(0, m.index)} idiomx ${t.s.slice(m.index + m[0].length)}`; // (t.s và t.b dài bằng nhau nên vị trí khớp dùng chung được)
    t = txt(acc);
  }
  const n = norm(acc);
  // Chủ ngữ là một VIỆC trừu tượng ("công ty em đang ốm yếu quá", "hôn nhân của em như đang nằm phòng cấp cứu", "team em hấp hối") và sau đó
  // không nhắc tới người thân nào → chữ y khoa trong câu là lối nói ví von, không phải chuyện sức khoẻ.
  const abs = n.trim().match(ABSTRACT);
  const kinAfter = t.loose || t.mixed ? /\b(ba|bo|me|ma|ong|vo|chong|con|be|chau|ngoai|bac|chu)\b/.test(n.trim().slice(abs?.[0].length ?? 0)) : /(?<![\p{L}])(ba|bố|mẹ|má|ông|bà|vợ|chồng|con|bé|cháu|nội|ngoại|bác|chú|dì|cậu)(?![\p{L}])/u.test(t.s);
  if (abs && !kinAfter) return { hard: false, soft: false, life: false, preg: false, dx: false, named: false, n, t, why: [] };
  // Bộ nhận triệu chứng / tên bệnh / chủ đề của các lớp khác so trên chữ ĐÃ BỎ DẤU ("đâu có" → "đau cổ", "bênh vợ" → "bệnh") — chỉ dùng thêm
  // khi câu gõ không dấu; câu gõ có dấu thì đã có vốn từ có dấu ở trên.
  //   (câu GẦN NHƯ không dấu — txt().mixed — cũng tính: "xet nghiem viem gan b cua em co duong tinh không".)
  const L = t.loose || !!t.mixed;
  const body = L && (analyzeBody(acc)?.sx.length ?? 0) > 0 && !onlySoftSymptoms(acc);
  // Vốn từ sức khoẻ của bộ đọc câu (lib/lomiParse): ốm, mổ, có bầu… đã được gắn loại ở đó.
  //   (câu gần như không dấu thì đưa bản bỏ dấu cho bộ đọc câu, để nó đọc theo lối không dấu: "ho co thich minh không" = họ có thích…)
  const f = parseVi(t.mixed ? acc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").normalize("NFC") : acc, { hour: 12 });
  //   (chỉ tính khi đó là VỊ NGỮ của câu — "tình cảm" có chữ "cảm" nhưng không phải bị cảm.)
  const parsed = !!f.pred && (f.pred.cls === "ill" || f.pred.cls === "preg") && f.subject !== "thing" && f.subject !== "place";
  const topic = questionTopic(acc);
  const preg = !!PREG(t) || f.pred?.cls === "preg";
  const named = (L && !!healthSubjectOf(acc)) || body || !!DISEASE(t) || !!MEDS(t);
  // Bộ phận cơ thể + tình trạng ("tim a có vấn đề gì không", "tóc e có mọc lại không") cũng là bằng chứng cứng.
  const bodyPart = !t.loose && BODY_ACC.test(t.s);
  const kin = f.toks.some((x) => x.r === "KIN") || /\b(be|chau|noi|ngoai|ong|ba|bo|me|ma)\b/.test(n);
  const func = kin && !!FUNC(t);
  const hard = named || parsed || preg || bodyPart || func || !!PROC(t) || !!PLACE(t) || (L && topic === "health") || tarotMedicalAsk(acc);
  // Chữ MỀM chỉ tính khi không phải chuyện của một việc / vật (danh sách danh từ chỉ việc ở đầu câu).
  const nonPerson = THING.test(n.trim());
  const plain = topic === "general" || topic === "health";
  //   ("tụi e còn được bao lâu" — nói về HAI NGƯỜI thì "còn được bao lâu" là chuyện tình cảm, không phải chuyện sống chết.)
  const us = /^(tui|bon|chung (minh|ta|toi|em)|hai (dua|nguoi|ta)|vo chong) /.test(n.trim());
  //   "… có qua nổi / qua được không" đứng trống: chỉ là chuyện sống chết khi nói về một người lớn tuổi trong nhà ("ba a có qua nổi không");
  //   "thi lần này a có qua được không" thì không.
  //   Tương tự "còn được bao lâu": nói về cha mẹ / ông bà thì là chuyện sống chết dù câu có chữ "chồng", "vợ" ("mẹ chồng em còn được bao lâu nữa").
  const elder = /^(?:(?:boi|xem|coi|thu|giup|cho|bai oi) )*(?:\S+ )?(ba|bo|me|ma|cha|ong|ba noi|ba ngoai|noi|ngoai|bac|chu|co|di) /.test(n.trim());
  const life = !nonPerson && (!!LIFE(t) || (elder && !!QUA(t)) || ((plain || elder) && !us && !!LIFE_WEAK(t)));
  //   Chữ "hồi phục / khoẻ lại" đứng ngay sau một danh từ chỉ VIỆC ("kinh tế nhà em bao giờ hồi phục") cũng không phải chuyện sức khoẻ.
  const rec = RECOVER(t) ?? WELL(t);
  const before = rec ? t.b.slice(0, rec.index ?? 0).trim().split(" ") : []; // (t.b dài đúng bằng t.s)
  const recOfThing = !!rec && (THING_NEAR.test(before.slice(-6).join(" ")) || before.slice(-3).includes("idiomx"));
  const soft = !nonPerson && (life || (!!rec && !recOfThing));
  // Khung "(có) bị … không": điều chưa rõ đó không phải chuyện việc / tiền / tình → coi là hỏi bệnh.
  const m = n.match(DX_FRAME);
  const concern = plain && !nonPerson && CONCERN.test(n);
  const frame = !!m && !NOT_ILL.test(` ${m[1]} `) && !m[1].includes("idiomx") && plain && !nonPerson;
  const dx = DX_WHAT.test(n);
  const weak = concern || frame;
  const sxOnly = body && !DISEASE(t) && !MEDS(t) && !PROC(t) && !PLACE(t) && !preg && !parsed && !soft && !dx && !weak && !healthSubjectOf(acc);
  const hit = (name: string, m: RegExpMatchArray | null | boolean | undefined) => (m ? [`${name}${typeof m === "object" ? `:${m[0].trim()}` : ""}`] : []);
  const why = [
    ...hit("disease", DISEASE(t)), ...hit("meds", MEDS(t)), ...hit("proc", PROC(t)), ...hit("place", PLACE(t)), ...hit("preg", preg && (PREG(t) ?? true)),
    ...hit("func", func && FUNC(t)), ...hit("body", bodyPart), ...hit("symptom", body), ...hit("knownDisease", L && !!healthSubjectOf(acc)),
    ...hit(`parsed:${f.pred?.head ?? ""}`, parsed), ...hit("topicHealth", L && topic === "health"), ...hit("dxAsk", tarotMedicalAsk(acc)),
    ...hit("life", life && (LIFE(t) ?? LIFE_WEAK(t) ?? QUA(t) ?? true)), ...hit("recover", soft && !!rec && !recOfThing && rec), ...hit("dxAsk2", dx), ...hit("concern", concern), ...hit("dxFrame", frame),
  ];
  return { hard, soft, life, preg, dx, named, weak, sxOnly, n, t, why };
}

/** Vì sao một câu bị coi là y khoa (để test và để rà lỗi chặn nhầm / lọt): tên các nhóm bằng chứng mà bộ phân loại THẬT SỰ đã dùng. */
export function gateWhy(question: string): string[] {
  return evidenceOf(question).why;
}

/** Câu hỏi bài có thuộc chuyện y khoa không; có thì là loại nào. */
export function medicalKindOf(question: string, context?: string): MedicalKind | null {
  const e = evidenceOf(question);
  const { n, t } = e;
  // Câu hỏi chung chung ("sắp tới sẽ ra sao") đi kèm một đoạn kể chuyện bệnh ("mẹ a đang nằm viện, bói xem…") → xét theo đoạn kể đó.
  let viaContext = false;
  if (!e.hard && !e.soft && !e.dx && context && questionTopic(question) === "general") {
    const c = evidenceOf(context);
    viaContext = c.hard || c.soft;
    if (viaContext && (c.life || !!LIFE_WEAK(t))) return "life";
  }
  if (!e.hard && !e.soft && !e.dx && !viaContext) return e.weak ? "unclear" : null;
  if (e.life || ((e.hard || e.soft) && !!LIFE_WEAK(t))) return "life";
  if (e.preg) return "pregnancy";
  if (CHECKUP.test(n) && !SURGERY(t)) return "checkup";
  if (DECIDE.test(n) && (!!PROC(t) || !!MEDS(t) || TREAT_WORD.test(n))) return "treatment";
  if (TREAT_NOUN(t) || SURGERY(t)) return "treatment";
  if (RECOVER(t) || WHEN.test(n)) return "prognosis";
  if (tarotMedicalAsk(question) || e.dx || (e.weak && !e.named)) return "diagnosis";
  // Không nêu bệnh hay triệu chứng nào, chỉ hỏi "sức khoẻ sắp tới thế nào" → xin một lời DỰ BÁO sức khoẻ (khác với hỏi một bệnh đang có).
  return !e.named && !viaContext && !!WELL(t) ? "forecast" : "prognosis";
}

/**
 * Quyết định ở cửa bói: null = câu hỏi không dính tới y khoa (bói bình thường); "reflect" = bói theo hướng chiêm nghiệm
 * với REFLECT_Q; "medical" = không trải bài.
 */
export function tarotHealthGate(question: string, context?: string, opts: { sick?: boolean } = {}): { gate: TarotGate; kind: MedicalKind; own?: boolean } | null {
  const q = question.trim();
  if (!q) return null;
  let kind = medicalKindOf(q, context);
  const n = norm(q);
  // Một triệu chứng thoáng qua chỉ làm NỀN cho câu hỏi về chuyện khác ("tim dap nhanh moi lan gap crush, nguoi ta co thich minh khong"):
  //   cả câu thuộc chủ đề tình cảm / công việc / tiền / học, và mệnh đề hỏi (mệnh đề cuối) tự nó không dính tới y khoa → bói bình thường.
  if (kind && evidenceOf(q).sxOnly) {
    const parts = q.split(/[,;.!?…]+/).map((x) => x.trim()).filter(Boolean);
    const lastQ = parts[parts.length - 1] ?? "";
    const tp = parts.length > 1 ? questionTopic(q) : "general";
    const lq = evidenceOf(lastQ);
    if (tp !== "general" && tp !== "health" && !lq.hard && !lq.soft && !lq.dx && !lq.weak) kind = null;
  }
  // Hỏi KẾT QUẢ / xin QUYẾT ĐỊNH: câu có–không, hỏi mốc thời gian, "có nên…", "… có thành công / hiệu quả không".
  //   (câu hỏi CÁCH — "nên giữ tinh thần thế nào khi ba đang hoá trị" — có nhắc tên bệnh hay thủ thuật vẫn không phải hỏi kết quả.)
  //   ("bài có lời nhắn gì cho tinh thần của em … không" kết thúc bằng "không" nhưng là xin một lời nhắn, không phải hỏi có / không.)
  const msgAsk = /\bco (\S+ ){0,2}(loi nhan|thong diep|loi nao|loi gi|dieu gi)\b/.test(n);
  const asksOutcome = (YESNO.test(n.trim()) && !msgAsk) || WHEN.test(n) || /\b(co nen|nen hay|thanh cong|hieu qua|bao nhieu phan tram|co on khong|co sao khong)\b/.test(n);
  //   (đang nói dở chuyện một người ốm thì câu lo lắng chung chung — "có sao không" — chính là hỏi về người đó.)
  if (kind === "unclear" && opts.sick) kind = "prognosis";
  if (kind === "unclear") return { gate: "medical", kind };
  if (!kind) {
    // Câu hỏi tự nó không dính tới y khoa, nhưng đang nói dở chuyện một người ốm (opts.sick) và câu hỏi không thuộc chủ đề nào khác:
    //   • hỏi kết quả / chuyện sắp tới ("sắp tới sẽ ra sao", "mọi chuyện có ổn không") → thật ra là hỏi bệnh sẽ ra sao → không trải bài;
    //   • còn lại ("e nên làm gì cho mẹ vui") → bói được bằng chính câu hỏi đó, nhưng với giọng chiêm nghiệm (own).
    if (!opts.sick || questionTopic(q) !== "general") return null;
    return asksOutcome || FUTURE.test(n) ? { gate: "medical", kind: "prognosis" } : { gate: "reflect", kind: "prognosis", own: true };
  }
  if (!asksOutcome && HOW.test(n)) {
    if (REFLECT.test(n)) return { gate: "reflect", kind };
    // Chuyện bệnh chỉ là HOÀN CẢNH ("em đang chăm ba ốm, …"), còn mệnh đề hỏi thì hỏi việc mình nên làm / nên giữ và tự nó không dính tới
    // y khoa ("… làm sao để không gục ngã", "… tôi nên trân trọng điều gì mỗi ngày") → cũng là lời xin chiêm nghiệm. Bài vẫn đọc bằng
    // REFLECT_Q, nên câu hỏi gốc có lệch sang chuyện chăm sóc cụ thể thì lá bài cũng không trả lời chuyện đó.
    const parts = q.split(CLAUSE).map((x) => x.trim()).filter(Boolean);
    const ask = parts.length > 1 ? parts.find((x) => HOW.test(norm(x)) && SELF_ACT.test(norm(x))) : undefined;
    if (ask) {
      const a = evidenceOf(ask);
      if (!a.hard && !a.soft && !a.dx && !a.weak && !FUTURE_STRICT.test(a.n)) return { gate: "reflect", kind };
    }
  }
  return { gate: "medical", kind };
}

/**
 * Vừa có một trải bài mà người dùng hỏi tiếp một câu Y KHOA không kèm chữ "bói" ("vậy a có khỏi không", "tarot nói a bị ung thư hả"):
 * chỉ nhận khi đó là câu HỎI về chẩn đoán / tiên lượng / sống chết / thai kỳ — câu kể triệu chứng ("a bị đau bụng") hay câu hỏi điều trị
 * ("a có nên đi khám không") là nói với Lomi chứ không phải hỏi lá bài, để lớp sức khoẻ trả lời.
 */
export function medicalFollowAsk(text: string): MedicalKind | null {
  const kind = medicalKindOf(text);
  if (!kind || kind === "treatment" || kind === "checkup" || kind === "unclear") return null;
  const n = norm(text);
  return tarotMedicalAsk(text) || YESNO.test(n.trim()) || WHEN.test(n) ? kind : null;
}

/** Lời từ chối trải bài cho một câu hỏi y khoa. afterReading = vừa có một trải bài (người dùng hỏi bài "nói" gì về bệnh). */
export function medicalRefusal(kind: MedicalKind, afterReading = false, underCare = false): string {
  if (kind === "unclear")
    return [
      "Câu này Lomi chưa chắc bạn đang hỏi về chuyện gì nên chưa trải bài 🙏",
      "Nếu là chuyện **sức khoẻ** — của bạn hay của người thân — thì lá bài không trả lời được: Tarot **không chẩn đoán được bệnh và không thay bác sĩ**. Bạn kể Lomi nghe đang thấy thế nào, Lomi chia sẻ kiến thức tham khảo; muốn biết chắc thì đi khám nha.",
      "Còn nếu bạn hỏi chuyện khác (tình cảm, công việc, gia đình, học hành…) thì hỏi lại rõ hơn một chút giúp Lomi — ví dụ “bói xem chuyện này có ảnh hưởng tới công việc không” — Lomi trải bài liền.",
    ].join("\n\n");
  const head =
    kind === "life"
      ? "Lomi hiểu chuyện này đang đè nặng lên bạn lắm 🥺 Nhưng chuyện sống chết thì lá bài không trả lời được đâu bạn."
      : afterReading
        ? "Không đâu bạn — lá bài không nói ai bị bệnh gì, cũng không nói bệnh sẽ ra sao 🙏"
        : kind === "pregnancy"
          ? "Chuyện thai kỳ thì lá bài không trả lời được đâu bạn 🙏"
          : kind === "diagnosis"
          ? "Chuyện có bệnh hay không thì lá bài không trả lời được đâu bạn 🙏"
          : "Chuyện này thì lá bài không trả lời được đâu bạn 🙏";
  const limit = "Tarot **không chẩn đoán được bệnh và không thay bác sĩ**, cũng không đoán được bệnh sẽ tiến triển thế nào hay nên chữa ra sao — nên Lomi không trải bài cho câu hỏi này.";
  const where =
    kind === "treatment"
      ? "Mổ hay không, sinh thế nào, dùng hay ngưng thuốc gì là quyết định y khoa: bạn bàn với bác sĩ đang điều trị, chưa yên tâm thì xin thêm ý kiến của một bác sĩ khác — và đừng tự ngưng thuốc đang dùng trong lúc chờ."
      : kind === "checkup"
        ? "Đang phân vân có nên đi khám hay không thì cách yên tâm nhất là **đi khám**: không sao thì nhẹ lòng, có gì thì biết sớm. Bạn kể Lomi nghe đang thấy thế nào, Lomi chia sẻ kiến thức tham khảo và những dấu hiệu cần đi ngay nha."
        : kind === "pregnancy"
        ? "Muốn biết chắc chuyện thai kỳ thì que thử, siêu âm và bác sĩ sản khoa mới trả lời được; đi khám thai đúng lịch là cách yên tâm nhất."
        : kind === "diagnosis"
          ? "Nếu bạn đang lo về một triệu chứng nào đó thì kể Lomi nghe, Lomi chia sẻ kiến thức tham khảo được; còn muốn biết chắc thì đi khám, làm xét nghiệm mới có câu trả lời nha."
          : kind === "forecast"
            ? "Sức khoẻ thời gian tới thế nào thì không lá bài nào đoán được. Muốn biết tình hình thật của mình thì khám sức khoẻ định kỳ là cách chắc nhất; đang thấy khó chịu ở đâu thì kể Lomi nghe nha."
            : kind === "life" || underCare
              ? "Tình hình sẽ ra sao thì bác sĩ đang theo dõi là người nói được rõ nhất, dựa trên khám và xét nghiệm. Điều gì đang làm bạn sợ nhất, bạn cứ hỏi thẳng bác sĩ — hỏi rõ được thì đỡ phải tự đoán."
              : "Bao giờ đỡ, tiến triển ra sao thì chỉ bác sĩ khám trực tiếp mới nói được, dựa trên khám và xét nghiệm. Chưa đi khám mà chuyện này kéo dài thì nên đi khám; đã có bác sĩ theo dõi rồi thì điều gì làm bạn lo nhất, bạn cứ hỏi thẳng bác sĩ nha.";
  const offer = "Nếu muốn, Lomi có thể rút bài theo hướng **chiêm nghiệm** — lúc này mình nên giữ tinh thần và chăm sóc bản thân thế nào — hoặc ngồi nghe bạn kể.";
  return `${head} ${limit}\n\n${where}\n\n${offer}`;
}

/** Lời mở cho một trải bài chiêm nghiệm (đặt trước lời giải): nói rõ bài KHÔNG nói về bệnh hay kết quả điều trị. */
export const REFLECT_INTRO =
  "Lomi đọc bài này theo hướng **chiêm nghiệm** nha: lá bài không nói được bệnh sẽ ra sao hay nên chữa thế nào — chuyện đó là của bác sĩ. Bài chỉ gợi cho mình cách giữ tinh thần và đối diện với giai đoạn này.";
export const MEDICAL_CHIPS = ["Bói: lúc này mình nên giữ tinh thần thế nào", "🩺 Sức khoẻ"];
