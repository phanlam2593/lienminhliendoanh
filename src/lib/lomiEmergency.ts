// 21/11 (bộ 40 đoạn ChatGPT, nhóm B): GIỮ MẠCH CẤP CỨU qua nhiều lượt.
//   Trước: lượt 1 nhận ra cấp cứu nhưng lượt 2–4 ("chắc không sao", "để mai", "có nên móc họng", "nằm thế nào") rơi vào
//   lời chung / "Lomi chưa biết" / thậm chí mẹo chống lừa đảo. Giờ: tình huống nào đã xuất hiện ở các lượt gần đây thì
//   lượt sau trả lời theo đúng tình huống đó — trả lời thẳng câu hỏi (móc họng? giữ tay chân? cho ngủ?), nhắc gọi 115/113,
//   rồi việc làm trong lúc chờ. Nội dung sơ cứu theo NHS (Anh), không nêu liều thuốc (quy tắc #62).
//   Câu hỏi kiến thức / kể phim ("trong phim", "đang học sơ cứu", "ngoài đời…") KHÔNG bật chế độ cấp cứu.
import { normalizeVi } from "./lomiFaq";
import { VN } from "./viMatch";

export type EmK =
  | "overdose" | "chemical" | "mushroom" | "alcohol" | "seizure" | "burn" | "drowning" | "head" | "heat"
  | "childbreath" | "bleeding" | "violence" | "gas" | "chest" | "anaphylaxis" | "stroke" | "suicide";

type Def = {
  re: RegExp;
  head: string; // vì sao nguy hiểm + gọi ai — 1–2 câu
  delay: string; // khi người dùng muốn chờ / bảo đã đỡ
  wait: string[];
  qa: [RegExp, string][];
  src?: string;
  call?: string; // mặc định 115
  first?: boolean; // xử lý cả lượt đầu (các luồng cũ chưa nhận ra tình huống này)
  firstIf?: RegExp; // …chỉ khi câu đầu có thêm điều kiện này (vd bỏng diện rộng) — lượt sau cũng chỉ giữ mạch khi điều kiện từng xuất hiện
  overCard?: boolean; // lượt đầu vẫn nhận dù có thẻ bệnh (thẻ cũ không đúng tình huống, vd ngã → gãy cổ xương đùi trong khi đập đầu)
};

const RECOVERY = "**nằm nghiêng an toàn**: nằm nghiêng, chân phía trên co lại chống xuống sàn cho khỏi lật, đầu hơi ngửa ra sau cho thông đường thở";
const CPR = "Không tỉnh, **không thở hoặc thở ngáp cá** → ép tim ngay, làm theo hướng dẫn của tổng đài 115 tới khi xe tới";

const D: Record<EmK, Def> = {
  overdose: {
    re: VN(/\b(uống (nhầm |lỡ |hết |cả |quá )?(gần hết |nhiều |cả )?(vỉ|lọ|hộp|chai) thuốc|uống (quá|nhiều) thuốc (ngủ|an thần)|thuốc ngủ quá liều|quá liều thuốc|uống (nhầm|lỡ)( \S+){0,3} thuốc ngủ|uống (quá nhiều|gần hết|nhiều|cả)( \S+){0,2} thuốc ngủ)\b/),
    head: "Uống quá nhiều **thuốc ngủ** mà đang **buồn ngủ, nói không rõ** là thuốc đã ngấm — gọi **115** ngay. Ngủ thiếp đi có thể làm **thở chậm, yếu dần** mà người bên cạnh khó nhận ra.",
    delay: "**Đừng để tới mai** — “chỉ buồn ngủ thôi” chính là dấu hiệu thuốc đang tác dụng, và có thể nặng lên trong vài giờ tới.",
    wait: [
      "**Không để em một mình**, gọi tên, nói chuyện để giữ em tỉnh",
      "Theo dõi **hơi thở** liên tục; em ngủ thiếp nhưng còn thở bình thường thì cho " + RECOVERY,
      "**Không gây nôn**, không cho uống sữa, cà phê hay thuốc gì khác để “giải”",
      "**Mang theo vỉ / vỏ thuốc**, ước số viên đã uống và giờ uống để báo đội cấp cứu",
      CPR,
    ],
    qa: [
      [VN(/\b(móc họng|gây nôn|cho nôn|nôn ra)\b/), "**Không tự gây nôn** nha — người đang lơ mơ mà nôn rất dễ sặc vào phổi."],
      [VN(/\b(sữa|cà phê|nước chanh|uống nước)\b/), "**Không cho uống gì** (sữa, cà phê, nước…) khi chưa được 115 dặn — người đang buồn ngủ, nói không rõ dễ sặc."],
      [VN(/\b(cho (nó |em |ảnh |chị )?ngủ|ngủ một (giấc|lúc))\b/), "**Đừng để em ngủ một mình cho qua** — phải có người canh và theo dõi hơi thở liên tục."],
    ],
    src: "NHS (Anh) — Poisoning",
  },
  chemical: {
    re: VN(/\b(uống nhầm|lỡ uống|nuốt nhầm|uống phải)( \S+){0,4} (nước tẩy|chất tẩy|tẩy rửa|tẩy bồn cầu|tẩy nhà vệ sinh|thuốc tẩy|javen|hoá chất|hóa chất|xăng|dầu hoả|thuốc trừ sâu|thuốc chuột)\b/),
    head: "Uống nhầm **chất tẩy rửa / hoá chất** là cấp cứu — gọi **115** ngay hoặc tới cấp cứu gần nhất. **Rát cổ, đau bụng, khó nuốt** là dấu hiệu hoá chất đã gây tổn thương miệng, họng.",
    delay: "**Đỡ rồi cũng vẫn phải đi cấp cứu, đừng chờ** — uống nhầm chất tẩy rửa / hoá chất có thể gây bỏng ở họng, thực quản có thể sưng nặng dần sau vài giờ; đừng dựa vào cảm giác lúc này.",
    wait: [
      "**Không cố làm cho nôn**, không móc họng",
      "Không cho uống sữa, nước chanh hay thứ gì để “trung hoà” — **không cho ăn uống gì** nếu tổng đài chưa dặn",
      "**Mang theo chai / bao bì** (hoặc chụp rõ nhãn) để báo đã uống chất gì, khoảng bao nhiêu, lúc mấy giờ",
      "Hoá chất dính da, mắt, quanh miệng → rửa bằng **nhiều nước sạch**",
      "Có người ở cạnh; lơ mơ hay nôn thì cho nằm nghiêng; " + CPR,
    ],
    qa: [
      [VN(/\b(móc họng|gây nôn|cho (bà |mẹ |ba )?nôn|nôn ra)\b/), "**Không móc họng, không gây nôn** nha — hoá chất trào ngược lên lần nữa sẽ làm bỏng thêm thực quản, họng, và dễ sặc vào phổi."],
      [VN(/\b(uống (nhiều )?nước|sữa|nước chanh|trung hoà|trung hòa|giải độc)\b/), "**Đừng tự cho uống nhiều nước, sữa hay nước chanh để giải** — uống gì cũng đợi nhân viên 115 hướng dẫn, vì có chất uống thêm vào lại gây hại hơn."],
    ],
    src: "NHS (Anh) — Poisoning",
  },
  mushroom: {
    re: VN(/\b(ăn|hái)( \S+){0,3} nấm( \S+){0,6} (nôn|đau bụng|tiêu chảy|ói|chóng mặt|mệt)|nấm (lạ|rừng|dại|hái)( \S+){0,6} (nôn|đau bụng|tiêu chảy|ói)|ngộ độc nấm\b/),
    head: "Ăn **nấm hái ngoài rừng** rồi **nôn, đau bụng liên tục** thì phải nghĩ tới **ngộ độc nấm** — gọi **115** hoặc đi cấp cứu ngay. Có loại nấm độc gây triệu chứng **muộn sau nhiều giờ** và nguy hiểm hơn vẻ ngoài, kể cả khi sau đó thấy đỡ.",
    delay: "**Đừng để mai** — với nấm rừng, chờ tới khi nặng mới đi là trễ; triệu chứng tới muộn (ăn trưa, tối mới bị) càng phải đi ngay.",
    wait: [
      "**Giữ lại phần nấm còn thừa** (hoặc vỏ, gốc nấm) bỏ túi mang theo, hoặc **chụp ảnh** — giúp bác sĩ biết loại nấm",
      "**Ai cùng ăn cũng nên đi khám**, kể cả khi chưa thấy gì",
      "**Không tự uống thuốc cầm nôn, cầm tiêu chảy**, không tự gây nôn",
      "Ghi lại giờ ăn và giờ bắt đầu có triệu chứng",
    ],
    qa: [[VN(/\b(thuốc cầm nôn|thuốc chống nôn|cầm tiêu chảy|uống thuốc)\b/), "**Không tự cho uống thuốc cầm nôn hay cầm tiêu chảy** nha — khi nghi ngộ độc nấm cần bác sĩ đánh giá, vì có loại độc tố nấm gây tổn thương gan muộn mà thuốc uống ở nhà không xử lý được, còn có thể làm khó theo dõi triệu chứng."]],
    src: "NHS (Anh) — Poisoning",
    first: true,
    overCard: true,
  },
  alcohol: {
    re: VN(/\b(uống|say)( \S+){0,5} (rượu|bia)( \S+){0,6} (bất động|bất tỉnh|gọi không tỉnh|không tỉnh|lay không dậy|khò khè|ngáy|co giật)|(say|xỉn) (bí tỉ|mèm)( \S+){0,4} (không tỉnh|bất tỉnh|bất động)|ngộ độc rượu\b/),
    head: "Say rượu mà **gọi không tỉnh, thở khò khè** là **ngộ độc rượu** — có thể **ngừng thở hoặc sặc chất nôn** khi đang “ngủ”. Gọi **115** ngay.",
    delay: "**Đừng để bạn ngủ cho tỉnh** — rượu trong máu vẫn tiếp tục tăng sau khi ngừng uống; người gọi không tỉnh có thể ngừng thở mà người xung quanh không biết. Lomi không rõ quy định xử phạt cụ thể, nhưng **tính mạng của bạn ấy quan trọng hơn** — cứ gọi 115, nói thật bạn ấy uống bao nhiêu để được cứu đúng.",
    wait: [
      "Cho bạn " + RECOVERY + " — để nếu nôn thì không sặc",
      "**Không để bạn một mình**, kiểm tra hơi thở liên tục",
      "Giữ ấm (đắp chăn); **không cho uống cà phê, không tắm nước lạnh, không cố gây nôn**, không cho uống thêm rượu",
      "Không cho đi lại, không để nằm ngửa",
      CPR,
    ],
    qa: [
      [VN(/\b(nằm (thế nào|sao|kiểu gì|như nào)|tư thế)\b/), `Cho bạn ${RECOVERY}. **Không để nằm ngửa** — nôn ra lúc đang mê rất dễ sặc vào phổi.`],
      [VN(/\b(cà phê|nước lạnh|tắm|gây nôn|móc họng|giải rượu)\b/), "**Không** — cà phê, tắm nước lạnh hay móc họng đều không giải được rượu, còn dễ làm sặc hoặc lạnh người thêm."],
    ],
    src: "NHS (Anh) — Alcohol poisoning",
    first: true,
    overCard: true,
  },
  seizure: {
    re: VN(/\b(đang |bị |lên )?co giật|giật (tay chân|liên tục)|lên cơn (giật|động kinh)\b/),
    head: "Đang co giật thì gọi **115** — nhất là co giật **lần đầu**, cơn kéo dài **quá 5 phút**, hoặc sau cơn **khó thở, không tỉnh**; với trẻ nhỏ, kể cả nghi do sốt và cơn đã dừng thì vẫn nên gọi. Làm ngay mấy việc dưới đây.",
    delay: "**Đừng đợi hết cơn rồi tính** — gọi 115 ngay bây giờ; co giật lần đầu cần bác sĩ khám, và cơn kéo dài quá 5 phút là cấp cứu.",
    wait: [
      "Đặt bé **nằm trên sàn, chỗ rộng**, dẹp vật cứng, sắc xung quanh, kê **đồ mềm dưới đầu**",
      "**Không giữ chặt tay chân, không nhét gì vào miệng bé** (khăn, thìa, ngón tay)",
      "**Ghi giờ bắt đầu cơn giật** (quay video nếu được) để báo bác sĩ",
      "Hết giật thì cho bé " + RECOVERY + ", nới quần áo; ở cạnh bé tới khi bé tỉnh hẳn",
      "Không cho ăn uống, uống thuốc bằng miệng khi bé chưa tỉnh hẳn",
    ],
    qa: [[VN(/\b(giữ (chặt )?tay chân|ghì|nhét (khăn|đũa|thìa|muỗng|gì)|cắn (vào )?lưỡi)\b/), "**Không giữ chặt tay chân và không nhét gì vào miệng bé** nha — ghì giữ dễ làm bé bị thương, nhét đồ vào miệng có thể làm gãy răng, nghẹt thở. Bé không “nuốt lưỡi” đâu."]],
    src: "NHS (Anh) — Febrile seizures",
    first: true,
    overCard: true,
    firstIf: VN(/\b(đang co giật|giật (tay chân )?liên tục|co giật liên tục|lên cơn co giật)\b/),
  },
  burn: {
    re: VN(/\b(nước sôi|dầu sôi|nước nóng|lửa|hoá chất|hóa chất)( \S+){0,4} (đổ|văng|tạt|bắn|làm bỏng|bỏng)|bị bỏng( \S+){0,4}(nặng|rộng|phồng|cả)|bỏng (nước sôi|dầu|lửa)\b/),
    head: "Bỏng **nước sôi diện rộng** (nhiều chỗ, ở ngực, mặt, hoặc rộng hơn bàn tay) là bỏng nặng — gọi **115** hoặc đưa đi cấp cứu ngay, không để tới mai; da phồng rộp, đau dữ càng phải đi.",
    delay: "**Đừng để mai** — bỏng rộng hơn bàn tay, có phồng rộp ở ngực là cần cấp cứu hôm nay; vết bỏng có thể sâu hơn nhìn thấy.",
    wait: [
      "**Làm mát bằng nước mát / nước thường chảy nhẹ khoảng 20 phút** — **không dùng nước đá, đá lạnh**",
      "Cởi quần áo, nhẫn, đồng hồ gần vùng bỏng — **trừ chỗ vải đã dính vào da** thì để nguyên",
      "Che lỏng bằng **màng bọc thực phẩm** hoặc túi nilon sạch (không quấn chặt)",
      "**Giữ ấm phần người còn lại** — làm mát diện rộng dễ bị lạnh",
      "**Không bôi kem đánh răng, mỡ, bơ, nước mắm, lòng trắng trứng**; không chọc hay bóc vết phồng rộp",
    ],
    qa: [
      [VN(/\b(kem đánh răng|mỡ|bơ|nước mắm|lòng trắng|thuốc mỡ|dầu)\b/), "**Đừng bôi kem đánh răng** (hay mỡ, bơ, nước mắm…) — giữ nhiệt lại trong da, dễ nhiễm trùng và làm bác sĩ khó xem vết bỏng."],
      [VN(/\b(nước đá|đá lạnh|chườm đá)\b/), "**Không dùng đá** — làm tổn thương da thêm; chỉ dùng nước mát thường chảy nhẹ."],
    ],
    src: "NHS (Anh) — Burns and scalds",
    first: true,
    firstIf: VN(/\b(cả|diện rộng|ngực|mặt|nhiều chỗ|khắp|nặng|lưng|bụng|chân và|tay và)\b/),
  },
  drowning: {
    re: VN(/\b(đuối nước|chết đuối|vớt lên|kéo lên bờ|ngạt nước)\b/),
    head: "Người vừa đuối nước **không tỉnh, không thở bình thường** → gọi **115** và **bắt đầu hồi sức (ép tim + thổi ngạt) ngay** — từng phút đều quan trọng.",
    delay: "**Đừng chờ** — người không thở mà không được ép tim ngay thì não bị tổn thương rất nhanh.",
    wait: [
      "Bật loa ngoài, **làm theo hướng dẫn của tổng đài 115**",
      "Với người đuối nước: **thổi ngạt 5 lần trước**, rồi **ép tim 30 lần – thổi ngạt 2 lần**, lặp lại tới khi xe tới hoặc người đó thở lại; không biết thổi ngạt thì **cứ ép tim liên tục**",
      "Ép **giữa ngực**, mạnh và nhanh; có **máy AED** gần đó thì nhờ người lấy và làm theo hướng dẫn của máy",
      "Người đó thở lại thì cho " + RECOVERY + ", giữ ấm, tiếp tục theo dõi",
      "**Không dốc ngược, không ép bụng để tháo nước**",
    ],
    qa: [[VN(/\b(dốc ngược|lộn ngược|xốc ngược|tháo nước|cho nước chảy ra|ép bụng)\b/), "**Không dốc ngược người đuối nước** — làm mất thời gian quý, không lấy được nước ra khỏi phổi, còn dễ làm nôn và sặc. Việc cần làm ngay là **ép tim + thổi ngạt**."]],
    src: "NHS (Anh) — CPR; RLSS UK — Drowning",
  },
  head: {
    re: VN(/\b(đập đầu|va đầu|đầu (đập|va) (vào|xuống)|té (đập|va) đầu|ngã (đập|va) đầu|chấn thương (sọ|đầu))\b/),
    head: "Ngã **đập đầu** ở người lớn tuổi cần được khám ngay — gọi **115** nếu có **lơ mơ, nói lẫn lộn, nôn, đau đầu tăng dần, co giật** hoặc đang uống thuốc chống đông. Lú lẫn sau khi đập đầu là dấu hiệu chấn thương đầu nặng, **kể cả khi đã hết đau**.",
    delay: "**Hết đau không có nghĩa là hết nguy hiểm** — lú lẫn sau đập đầu có thể do chảy máu trong đầu, nặng dần trong vài giờ.",
    wait: [
      "Để ba **nằm yên**, hạn chế cử động **đầu – cổ**, nhất là khi đau cổ hay ngã từ cao",
      "**Có người canh liên tục**, gọi hỏi chuyện để xem ba còn tỉnh, còn trả lời đúng không",
      "Không cho uống rượu, thuốc ngủ, thuốc an thần",
      "Nôn hay lơ mơ thì xoay nằm nghiêng, giữ đầu – cổ – thân thẳng hàng",
      "Ghi lại giờ ngã và đang uống thuốc gì (nhất là thuốc chống đông) để báo bác sĩ",
    ],
    qa: [[VN(/\b(lẫn lộn|lú lẫn|nói lung tung|lơ mơ|khó đánh thức|nôn (nhiều|liên tục)?)\b/), "Ba **lúc đầu tỉnh, giờ lại nói lẫn lộn** là dấu hiệu **đang nặng lên** sau khi đập đầu — gọi **115 ngay bây giờ**, đừng chờ thêm."],
      [VN(/\b(ngủ một giấc|cho (ba |ông |bà |mẹ )?ngủ|đi ngủ|ngủ (rồi|cho))\b/), "**Đừng cho ba ngủ một giấc rồi theo dõi ở nhà** — lú lẫn sau đập đầu là cần cấp cứu ngay. Trong lúc chờ, ba nằm nghỉ được nhưng **phải có người canh, gọi hỏi liên tục**; khó đánh thức là báo 115 ngay."]],
    src: "NHS (Anh) — Head injury and concussion",
    first: true,
    overCard: true,
  },
  heat: {
    re: VN(/\b((leo núi|đi nắng|phơi nắng|giữa trưa|nắng gắt)( \S+){0,8} (nóng ran|nóng hừng|lộn xộn|lơ mơ|lú lẫn|ngất|đứng không vững)|sốc nhiệt|say nắng nặng|đột quỵ nhiệt)\b/),
    head: "Người **nóng ran, nói năng lộn xộn, đứng không vững** sau khi ở ngoài nắng là dấu hiệu **sốc nhiệt** — gọi **115** ngay, đây là cấp cứu.",
    delay: "**Đừng chờ nghỉ cho đỡ** — nói lộn xộn nghĩa là não đã bị ảnh hưởng vì quá nóng; cần làm mát ngay và đi cấp cứu.",
    wait: [
      "Đưa bạn vào **chỗ mát, bóng râm**, cho nằm nghỉ",
      "Cởi bớt quần áo; **làm mát tích cực**: xịt / lau nước mát khắp người, quạt liên tục, chườm khăn mát ở **cổ, nách, bẹn**",
      "Bạn còn tỉnh táo, nuốt được thì cho **uống từng ngụm nước**; **đang lơ mơ thì không ép uống**",
      "Không để bạn một mình; theo dõi tỉnh táo, hơi thở",
      CPR,
    ],
    qa: [[VN(/\b(uống nước|cho uống)\b/), "Còn tỉnh, nuốt được thì cho **uống từng ngụm nhỏ**; **lơ mơ, nói lộn xộn thì không ép uống** — dễ sặc."]],
    src: "NHS (Anh) — Heat exhaustion and heatstroke",
    first: true,
    overCard: true,
  },
  childbreath: {
    re: VN(/\b(bé|con|cháu|trẻ)( \S+){0,6} (thở (khó|rít|gấp|co kéo)|khó thở|ngực lõm|lõm ngực|rút lõm|môi (hơi )?tím|tím tái)\b/),
    head: "Bé **thở rút lõm ngực, môi tím, khóc yếu** là dấu hiệu bé **đang thiếu oxy** — gọi **115** ngay, không phải nghẹt mũi thường.",
    delay: "**Đừng để mai khám** — môi tím và lõm ngực khi thở là cấp cứu ngay bây giờ.",
    wait: [
      "Giữ bé ở **tư thế bé thấy dễ thở nhất** (thường là bế **ngồi thẳng** trên đùi), đừng ép bé nằm",
      "Giữ bé bình tĩnh, nới quần áo; không cho đông người vây quanh",
      "**Không cho bé ăn uống gì** khi đang khó thở — dễ sặc",
      "Quan sát môi, nhịp thở; nghi bé **hóc dị vật** thì báo ngay cho 115",
      "Bé ngừng thở, không phản ứng → làm theo hướng dẫn ép tim trẻ em của tổng đài 115",
    ],
    qa: [[VN(/\b(uống nước|cho (bé |con )?(uống|bú|ăn))\b/), "**Không cho bé uống nước hay ăn bú** lúc đang khó thở, môi tím — bé dễ sặc; để bé ngồi thẳng, giữ bình tĩnh chờ xe."]],
    src: "NHS (Anh) — Breathing problems in babies and children",
    first: true,
  },
  bleeding: {
    re: VN(/\b(máu (phun|chảy (nhiều|xối xả|không cầm|liên tục)|thấm (liên tục|ướt))|đứt (động mạch|tay sâu)|chảy máu (nhiều|không cầm|không ngừng))\b/),
    head: "Máu **phun hoặc thấm liên tục** là chảy máu nặng — gọi **115** ngay, mất máu nhiều có thể sốc rất nhanh.",
    delay: "**Đừng nghe anh ngại** — máu phun không tự cầm được; gọi 115 không phải làm phiền, đó là việc của họ.",
    wait: [
      "**Ép mạnh, liên tục** trực tiếp lên vết thương bằng gạc / vải sạch — **đừng nhấc ra xem** đã cầm chưa",
      "Máu thấm qua thì **đặt thêm vải lên trên**, đừng bỏ lớp cũ ra",
      "Nâng tay **cao hơn tim** nếu được; cho anh **nằm xuống**, giữ ấm",
      "Còn mảnh kính cắm trong vết thương → **không rút ra**, ép quanh mép vết thương",
      "Anh lơ mơ, tái, vã mồ hôi lạnh → báo ngay cho 115",
    ],
    qa: [[VN(/\b(cầm máu|làm (gì|sao) (để )?(cho )?(cầm|ngừng)|garo|buộc chặt)\b/), "Cách cầm máu tốt nhất là **ép mạnh, liên tục, trực tiếp lên vết thương** bằng vải sạch — giữ yên, không nhấc ra xem."]],
    src: "NHS (Anh) — First aid: bleeding; St John Ambulance",
  },
  violence: {
    re: VN(/\b(cầm (dao|búa|kéo|gậy|mã tấu)|dí dao|kề dao)( \S+){0,6} (doạ|dọa|đe|chém|đâm|đánh)|(doạ|dọa|đe doạ|đe dọa) (giết|chém|đâm)\b/),
    head: "Có người **cầm dao đe doạ** là **nguy hiểm tính mạng** — gọi **113** (công an) ngay, kể cả khi chị bảo đừng gọi. Đây không phải lúc ngồi lại nói chuyện.",
    delay: "**Đừng chờ anh ấy bình tĩnh** — người say đang cầm dao có thể mất kiểm soát bất cứ lúc nào; gọi 113 là bảo vệ cả chị, bé và chính anh ấy.",
    wait: [
      "**Không đối đầu, không giằng dao**, không cãi lại người đang say",
      "Chị ra được **an toàn** (cửa sau, sang nhà hàng xóm) thì đưa bé ra **ngay**, mang theo điện thoại; không cần lấy đồ",
      "Chưa ra được thì **khoá cửa phòng**, chặn thêm đồ nặng **nếu không làm mất đường thoát** của mình; giữ bé im lặng, điện thoại để im tiếng",
      "Bạn ở ngoài: **đừng tự xông vào**; gọi 113 báo rõ địa chỉ, có **dao, người say, trẻ nhỏ**; nhờ hàng xóm hỗ trợ",
      "Có ai bị thương → gọi thêm **115**",
    ],
    qa: [[VN(/\b(ra ngoài an toàn|đưa (chị|bé|em|mẹ)( \S+){0,3} ra|thoát ra|trốn ra)\b/), "Ưu tiên là **ra khỏi nhà mà không phải đi ngang qua anh ấy** — nếu phòng có lối ra khác hoặc anh ấy đang ở xa cửa thì đưa bé ra ngay, sang nhà hàng xóm hay ra chỗ đông người; không có đường an toàn thì **ở yên trong phòng khoá cửa chờ công an**."]],
    call: "113",
    first: true,
    overCard: true,
  },
  gas: {
    re: VN(/\b(đốt than|than (hoa|tổ ong)|lò than|khí than|ngạt khí|khí co|ngộ độc khí|rò (rỉ )?khí|xì gas)\b/),
    head: "Đốt than trong phòng kín gây **ngộ độc khí CO** — khí **không màu, không mùi**, làm người bên trong ngất và có thể làm **cả người cứu ngất theo**. Gọi **114** (cứu nạn) và **115** ngay.",
    delay: "**Đừng chờ** — người đã ngất trong phòng có khí CO cần được đưa ra và cấp cứu ngay, nhưng phải đúng cách để bạn không thành nạn nhân thứ hai.",
    wait: [
      "**Không vào phòng kín có khí than** — nín thở không bảo vệ được bạn; khí CO có thể làm người cứu ngất trong vài hơi thở",
      "Gọi **114** (cứu nạn) và **115**, nói rõ: đốt than trong phòng kín, có người ngất, cửa còn đóng; chờ lực lượng chuyên môn vào cứu",
      "Chỉ làm những gì **đứng ở ngoài** làm được: báo mọi người trong nhà **ra ngoài, tránh xa căn phòng**; không bật lửa, không hút thuốc gần đó",
      "Ai ở gần đó đang chóng mặt, buồn nôn → **ra chỗ thoáng khí ngay**",
      "Người ngất mà còn thở → " + RECOVERY + "; " + CPR,
      "Mọi người tiếp xúc khí đều nên đi khám, kể cả khi đã đỡ",
    ],
    qa: [[VN(/\b(chạy vào|vào (kéo|cứu)|kéo (họ|người) ra|cứu (họ|người)|làm gì trước)\b/), "**Đừng chạy vào phòng** — kể cả nín thở; khí CO không màu, không mùi và có thể làm bạn ngất ngay ở cửa, thành nạn nhân thứ hai. Việc cứu người trong phòng để **114 / 115** làm (họ có thiết bị thở). Việc của bạn lúc này: **gọi 114 và 115**, đưa mọi người **ra xa** căn phòng, ai đang chóng mặt buồn nôn thì ra chỗ thoáng khí và cũng đi khám."]],
    src: "NHS (Anh) — Carbon monoxide poisoning",
    call: "114 và 115",
    first: true,
    overCard: true,
  },
  chest: {
    re: VN(/\b(đau (thắt |tức |nhói )?ngực|tức ngực|thắt ngực|đè ngực)\b/),
    head: "**Đau thắt ngực kèm vã mồ hôi, khó thở** (hay đau lan ra cánh tay, cổ, hàm) là dấu hiệu có thể **nhồi máu cơ tim** — gọi **115** ngay, đừng chờ xem có đỡ không.",
    delay: "**Kể cả khi người bệnh nói đã đỡ** vẫn phải đi cấp cứu — với tim, cơn đau có thể quay lại nặng hơn; khám càng sớm càng ít tổn thương tim.",
    wait: [
      "Cho **ngồi nghỉ yên** ở tư thế dễ chịu (ngồi tựa lưng, co gối), **không đứng dậy đi lại**, không tự lái xe",
      "Nới quần áo chật, để chỗ thoáng",
      "**Không tự cho uống thuốc gì** — làm đúng theo hướng dẫn của tổng đài 115",
      "Ngất, ngừng thở, không phản ứng → **làm theo hướng dẫn ép tim của tổng đài 115**",
    ],
    qa: [[VN(/\b(đi bộ|tự đi|ra đầu (đường|hẻm|ngõ)|ra (ngoài )?đón|tự ra)\b/), "**Không cho mẹ tự đi bộ ra đầu đường** — gắng sức lúc này làm tim thiếu máu thêm. Mẹ ngồi nghỉ yên; **người khác ra đón xe**, hoặc gọi lại 115 chỉ đường, mở sẵn cửa."]],
    src: "NHS (Anh) — Heart attack",
    first: true,
    overCard: true,
    firstIf: VN(/\b(vã mồ hôi|đổ mồ hôi|lan (xuống|ra|sang|lên)|cánh tay trái|thắt ngực)\b/), // "đau ngực khó thở" trơn → luồng cũ (có ghi nhớ triệu chứng)
  },
  anaphylaxis: {
    re: VN(/\b(phản vệ|(sưng|phù) (môi|lưỡi|họng)|môi (\S+ )?sưng|nổi mề đay( \S+){0,6}(khó thở|khò khè|sưng))\b/),
    head: "**Nổi mề đay, sưng môi, khò khè, khó thở** sau khi ăn là **sốc phản vệ** — **dùng bút adrenaline ngay** và gọi **115**.",
    delay: "**Thuốc dị ứng uống không thay được adrenaline** và không đủ nhanh cho phản vệ — đừng để em ngủ cho qua; khò khè, khó thở là đang nặng lên.",
    wait: [
      "Dùng **bút tiêm adrenaline** ngay (cách dùng ở trên / in trên thân bút); ghi lại **giờ tiêm**",
      "Cho **nằm xuống, kê cao chân**; **nếu khó thở thì cho ngồi dậy**; mang thai thì nằm nghiêng trái",
      "**Không đứng dậy hay đi lại**, kể cả khi đỡ hơn",
      "Sau **5 phút** chưa đỡ mà có bút thứ hai → tiêm tiếp",
      CPR,
    ],
    qa: [[VN(/\b(bút (tiêm|adrenaline|epipen)|dùng (bút|thế nào)|tiêm (thế nào|sao|ở đâu))\b/), "Cách dùng bút adrenaline (đúng bút đã được kê):\n1. **Tháo nắp an toàn** theo đúng hình in trên bút (mỗi loại bút khác màu, khác cách), nắm chặt bút\n2. **Ấn mạnh vào mặt ngoài đùi** — qua lớp quần cũng được — tới khi nghe tách\n3. **Giữ yên đúng số giây in trên bút**, rồi rút ra, xoa nhẹ chỗ tiêm\n4. Ghi giờ tiêm; **vẫn gọi 115** kể cả khi em đỡ ngay, đưa bút đã dùng cho đội cấp cứu"]],
    src: "NHS (Anh) — Anaphylaxis",
  },
  stroke: {
    re: VN(/\b(méo miệng|miệng (bị )?méo|(mặt|miệng) (\S+ ){0,2}(xệ|lệch)|nói (không rõ|ngọng|lắp|khó khăn)|yếu (nửa|một bên)|(một bên )?tay( \S+){0,2} yếu)\b/),
    head: "**Méo miệng, nói không rõ, yếu một bên tay** là dấu hiệu **đột quỵ** — gọi **115** ngay.",
    delay: "**Đỡ rồi vẫn phải gọi 115 ngay** — có thể là cơn thiếu máu não thoáng qua (TIA), báo trước một cơn đột quỵ thật; điều trị đột quỵ phụ thuộc rất nhiều vào thời gian.",
    wait: [
      "**Ghi lại giờ bắt đầu có dấu hiệu** (hoặc lần cuối thấy ông còn bình thường)",
      "**Không cho ăn uống gì** — dễ sặc vì có thể khó nuốt",
      "Không tự cho uống thuốc (kể cả thuốc huyết áp)",
      "**Không tự chở bằng xe máy / tự lái** — chờ xe cấp cứu",
      "Cho nằm / ngồi chỗ an toàn, nới quần áo chật; nôn hay lơ mơ thì cho nằm nghiêng",
    ],
    qa: [[VN(/\b(ghi lại|lúc bắt đầu|giờ bắt đầu|mấy giờ bị)\b/), "**Có — rất cần ghi lại**, kể cả khi ông đã đỡ: ghi **giờ bắt đầu có dấu hiệu**, hoặc **lần cuối thấy ông còn bình thường** nếu không biết chính xác. Bác sĩ dựa vào mốc giờ này để chọn cách điều trị (có thuốc chỉ dùng được trong vài giờ đầu)."]],
    src: "NHS (Anh) — Stroke",
  },
  suicide: {
    re: VN(/\b(không muốn sống|muốn chết|tự tử|tự sát|kết thúc (cuộc đời|tất cả)|chuẩn bị (thuốc|dây))\b/),
    head: "Bạn ấy nói **không muốn sống** mà **đã chuẩn bị thuốc, đang ở một mình** — phải coi là **khẩn cấp ngay bây giờ**, bạn ấy có thể đang gặp nguy hiểm. Đừng để bạn ấy một mình.",
    delay: "**Đừng đợi tới sáng mai** 💚 Lúc này bạn ấy có thể đang gặp nguy hiểm.",
    wait: [
      "**Gọi ngay cho người ở gần bạn ấy** — người nhà, bạn cùng phòng, hàng xóm, chủ nhà trọ — nhờ **tới tận nơi**",
      "Biết địa chỉ thì gọi **113** hoặc **115**, nói rõ bạn ấy nói muốn chết, đã chuẩn bị thuốc, đang một mình, không nghe máy",
      "Vẫn gọi, nhắn tiếp cho bạn ấy: “Mình đang lo cho bạn, mình đang tìm người tới với bạn”",
      "Ai tới được thì **ở cạnh bạn ấy, cất thuốc ra xa**; đừng hứa giữ bí mật",
      "Bạn đang hoảng thì cũng cần người bên cạnh — gọi thêm một người bạn tin để cùng lo",
    ],
    qa: [],
    call: "113 / 115",
  },
};

const ORDER: EmK[] = ["violence", "gas", "drowning", "anaphylaxis", "stroke", "seizure", "childbreath", "heat", "alcohol", "mushroom", "chemical", "overdose", "burn", "head", "bleeding", "chest", "suicide"];

// câu hỏi kiến thức / kể phim / học sơ cứu — không phải ca đang xảy ra
const TRAP = VN(/\b(trong phim|xem phim|bộ phim|phim (có|này|đó)|nhân vật|đang học|học sơ cứu|lớp sơ cứu|hỏi để học|chỉ hỏi (thôi|để biết)|ngoài đời|người ta bảo|giả sử|nếu (thấy|gặp|có) (người|ai)|nói chung|thường gặp|kiến thức)\b/);

const DELAY = VN(/\b(để (mai|sáng|tối|lát)|mai (đi|đưa|khám)|đợi (sáng|mai|hết|anh|ảnh|ổng|bả|nó)|chờ (thêm|sáng|mai)|chắc (chỉ |nó chỉ )?(không sao|ổn|bình thường|buồn ngủ|đau bụng bình thường|nghẹt mũi|do sốt)|đỡ (rồi|hơn)|hết (đau|rồi)|không (còn )?đau nữa|nghỉ (ngơi )?(là|cho) (được|khỏi|đỡ)|không (cần|phải) gọi|đừng gọi|ngại (gọi|làm phiền)|sợ bị phạt|ngủ một (lúc|giấc|chút)|nghỉ (một )?(chút|lúc)|nằm nghỉ)\b/);
const WAITQ = VN(/\b(trong lúc (chờ|đợi)|trước khi xe|làm gì|làm sao|phải làm|sơ cứu|xử lý|nên làm)\b/);
const CALLED = VN(/\b(đã gọi|gọi rồi|vừa gọi|xe (đang )?tới)\b/);

// người có nguy cơ là NGƯỜI KHÁC (bạn thân, em trai…) — lượt sau "nó bảo đã chuẩn bị thuốc, đang ở một mình" không phải người dùng tự nói về mình
const THIRD = VN(/\b(bạn (mình|thân|tôi|em|tớ|tui)|bạn thân|em (trai|gái) (mình|tôi)|anh (trai )?(mình|tôi)|chị (gái )?(mình|tôi)|con (mình|tôi|gái|trai)|người yêu (mình|tôi)|(vợ|chồng|mẹ|ba|bố) (mình|tôi)|đồng nghiệp|nó (bảo|nói|nhắn))\b/);
const SELF = VN(/\b(mình|tôi|em|tớ|tui|t) (cũng )?(không muốn sống|muốn chết|muốn tự tử)\b/);
const SUI_NOW = VN(/\b(chuẩn bị|một mình|không (nghe|bắt) máy|tắt máy|uống thuốc|đã uống|cầm (dao|dây))\b/);
function thirdParty(recent: string[]): boolean {
  const first = recent.find((t) => D.suicide.re.test(` ${normalizeVi(t)} `));
  if (!first) return false;
  const f = ` ${normalizeVi(first)} `;
  return THIRD.test(f) && !SELF.test(f);
}

export function emKindIn(text: string): EmK | null {
  const n = ` ${normalizeVi(text)} `;
  for (const k of ORDER) {
    if (k === "seizure" && VN(/\b(mí mắt|mắt|khoé mắt|cơ bắp|bắp (chân|tay)|chuột rút|nấc)\b/).test(n)) continue; // giật mí mắt, chuột rút ≠ co giật
    if (D[k].re.test(n)) return k;
  }
  return null;
}

export type EmReply = { text: string; kind: EmK };

/** prevUser: các lượt người dùng trước (cũ → mới). Trả null nếu không ở trong mạch cấp cứu. */
export function emergencyReply(raw: string, prevUser: string[], opt: { hasCard?: boolean } = {}): EmReply | null {
  const n = ` ${normalizeVi(raw)} `;
  const recent = prevUser.slice(-3);
  if (TRAP.test(n) || recent.some((t) => TRAP.test(` ${normalizeVi(t)} `))) return null;
  const nowK = emKindIn(raw);
  // tình huống = sự việc NÊU ĐẦU TIÊN trong mấy lượt gần đây (lượt sau hay kể thêm triệu chứng — "nói không rõ" sau khi uống thuốc ngủ
  //   không phải đột quỵ, "khò khè, khó thở" sau ăn tôm vẫn là phản vệ)
  let prevK: EmK | null = null;
  for (let i = 0; i < recent.length && !prevK; i++) prevK = emKindIn(recent[i]);
  const kind = prevK ?? nowK;
  if (!kind) return null;
  const d = D[kind];
  if (!prevK) {
    // lượt đầu nhắc tới tình huống: chỉ nhận những tình huống luồng cũ chưa xử lý đúng
    if (!d.first || (opt.hasCard && !d.overCard) || (d.firstIf && !d.firstIf.test(n))) return null; // đã có thẻ bệnh / sơ cứu có nguồn cho câu này → để luồng cũ đưa thẻ
  } else if (kind === "suicide" && !DELAY.test(n) && !(thirdParty(recent) && SUI_NOW.test(n))) return null; // luồng khủng hoảng sẵn có lo phần còn lại
  else if (d.firstIf && ![raw, ...recent].some((t) => d.firstIf!.test(` ${normalizeVi(t)} `))) return null; // bỏng nhỏ → luồng cũ
  if (n.split(/\s+/).length > 40) return null;

  const call = d.call ?? "115";
  const qa = d.qa.find(([re]) => re.test(n))?.[1];
  const waitTxt = d.wait.map((t) => `• ${t}`).join("\n");
  const src = d.src ? `\n\n_Nguồn: ${d.src}._` : "";
  let text: string;
  if (CALLED.test(n) && !qa) text = `👍 Gọi ${call} rồi là đúng nha. Trong lúc chờ:\n${waitTxt}${src}\n\nĐể điện thoại luôn bật, có người ra đón / mở sẵn cửa. Lomi ở đây với bạn 💚`;
  else if (qa) text = `🚨 ${qa}\n\nChưa gọi **${call}** thì gọi ngay nha. Trong lúc chờ:\n${waitTxt}${src}`;
  else if (DELAY.test(n) && prevK) text = `🚨 ${d.delay} Gọi **${call}** ngay nha.\n\nTrong lúc chờ:\n${waitTxt}${src}`;
  else if (WAITQ.test(n) && prevK) text = `🚨 Gọi **${call}** ngay nếu chưa gọi. Trong lúc chờ:\n${waitTxt}${src}`;
  else text = `${kind === "chest" && !prevK ? "⚠️" : "🚨"} ${d.head}\n\nTrong lúc chờ:\n${waitTxt}${src}\n\nGọi xong rồi thì báo Lomi nha, Lomi ở đây với bạn 💚`;
  return { text, kind };
}

// ── câu hỏi kiến thức (bẫy) hay gặp: trả lời kiến thức, không coi là ca đang xảy ra ──
const ELEC = VN(/\b(điện giật|bị giật điện|giật điện)\b/);
const STAB = VN(/\b(đâm|dao đâm|bị đâm)( \S+){0,3} (bụng|ngực)|vết đâm\b/);
const FOODP = VN(/\b(ngộ độc thực phẩm|ngộ độc thức ăn)\b/);
const KNOW: [RegExp, RegExp, string][] = [
  // — điện giật: trả lời riêng từng câu hỏi tiếp, không lặp nguyên khối —
  [ELEC, VN(/\b(cây gỗ|que gỗ|gậy|cán chổi|kéo ra)\b/),
    "Dùng gỗ chỉ là **cách cuối cùng**, khi **không ngắt được điện** ⚡\n• Ưu tiên luôn là **rút phích / gạt cầu dao** trước\n• Nếu buộc phải dùng: vật phải **khô hẳn, không dẫn điện** (gỗ khô, nhựa), bạn **đứng trên chỗ khô** (tấm gỗ, giấy bìa, thảm cao su), **đẩy** nguồn điện ra xa chứ không kéo người vào mình\n• **Gỗ ẩm, tay ướt, chân đứng chỗ nước** thì không an toàn\n• **Điện cao thế** (dây ngoài trời, trạm điện): không áp dụng cách này — tránh xa ít nhất vài chục mét, gọi điện lực và 115\n\n_Nguồn: NHS (Anh) — Electric shock._"],
  [ELEC, VN(/\b(sao không|không được chạm|chạm (trực tiếp|vào))\b/),
    "Vì khi người đó **còn dính với nguồn điện**, cơ thể họ đang là một phần của mạch điện ⚡ Bạn chạm vào thì dòng điện **đi tiếp qua người bạn xuống đất** — người cứu bị giật, có khi nặng hơn cả nạn nhân. Dòng điện còn làm **co cứng cơ**, nên tay bạn có thể bị “dính” lại không buông ra được.\n\nVì vậy luôn **ngắt điện trước**; chỉ chạm vào người đó khi chắc chắn đã ngắt điện. Ngắt rồi thì chạm được bình thường — người bị điện giật không còn “tích điện” nữa.\n\n_Nguồn: NHS (Anh) — Electric shock._"],
  [ELEC, VN(/\b(xử lý|làm sao|làm gì|phải làm|sơ cứu|nguy hiểm|có sao)\b/),
    "Điện giật nguy hiểm thật ngoài đời ⚡ — với nạn nhân (bỏng, co giật, rối loạn nhịp tim) và cả **người cứu**, vì **dòng điện có thể truyền qua người nạn nhân sang người chạm vào**.\n• Việc đầu tiên là **ngắt nguồn điện**: rút phích, gạt cầu dao / tháo cầu chì (chỉ tắt công tắc thiết bị có thể chưa ngắt hẳn)\n• Không ngắt được thì mới dùng **vật khô, không dẫn điện** đẩy nguồn điện ra xa — đứng trên chỗ khô\n• Điện cao thế (đường dây ngoài trời) thì **tránh xa**, gọi 115 / điện lực, không tự cứu\n• Ngắt điện xong: nạn nhân bất tỉnh, bỏng, co giật thì **gọi 115**; ngừng thở thì ép tim\n\nNếu chuyện này đang xảy ra thật ngay lúc này thì gọi **115** trước nha.\n\n_Nguồn: NHS (Anh) — Electric shock._"],
  // — vết đâm bụng (kể phim) —
  [STAB, VN(/\b(đứng dậy|nói chuyện bình thường|vẫn tỉnh|vẫn đi)\b/),
    "Chỗ đó phim không hẳn sai đâu 😄 Ngoài đời người bị đâm **vẫn có thể tỉnh táo, đứng dậy, nói chuyện lúc đầu** — nhưng đó không có nghĩa là nhẹ. Máu có thể **chảy từ từ vào trong bụng**, vài chục phút sau mới **tái, choáng, lơ mơ** vì mất máu. Chỗ vô lý là phim cho nhân vật cứ thế đi tiếp như không có gì, thay vì được đưa đi cấp cứu ngay."],
  [STAB, VN(/\b(đâm nhẹ|không sao|nhẹ thì|vết (nhỏ|nông))\b/),
    "Với bụng thì **không có “đâm nhẹ”** để yên tâm được đâu nha 🩸 Vết ở ngoài nhỏ nhưng lưỡi dao có thể đi sâu, làm **thủng ruột, rách gan, lách hay mạch máu** — nhìn bên ngoài không đoán được bên trong. Ngoài đời bị đâm vào bụng là **luôn đi cấp cứu / gọi 115**, kể cả khi người đó thấy bình thường; **không rút vật đâm ra**, ép quanh vết thương, cho nằm yên.\n\n_Nguồn: NHS (Anh) — First aid: bleeding._"],
  [STAB, VN(/\b(nguy hiểm|có sao|vô lý|cảnh|nhỏ)\b/),
    "Phim hay cho nhân vật đứng dậy nói chuyện, nhưng ngoài đời **vết đâm ở bụng nhìn nhỏ vẫn có thể rất nguy hiểm** 🩸\n• Lưỡi dao có thể đi sâu, làm **thủng ruột, rách gan, lách hay mạch máu** — máu **chảy vào trong bụng** nên bên ngoài trông không nhiều\n• Người bị đâm có thể vẫn tỉnh táo lúc đầu rồi **sốc vì mất máu** sau đó\n• Ngoài đời bị đâm vào bụng, ngực là **luôn gọi 115**; **không rút dao / vật đâm ra**, ép quanh vết thương, cho nằm yên\n\n_Nguồn: NHS (Anh) — First aid: bleeding._"],
  // — ngộ độc thực phẩm (đang học sơ cứu) —
  [FOODP, VN(/\b(đau bụng nhẹ|chỉ (bị )?(đau bụng|tiêu chảy)|nhẹ (thì sao|thôi)|tiêu chảy (nhẹ|thì sao))\b/),
    "Ngộ độc thực phẩm **nhẹ** (đau bụng nhẹ, tiêu chảy, vẫn uống được) thường **tự đỡ sau vài ngày**, chăm ở nhà là chính 🙂\n• **Uống đủ nước**, uống từng ngụm nhỏ nếu buồn nôn; người lớn tuổi, trẻ nhỏ hay người có bệnh nền thì dùng **dung dịch bù nước (ORS)**, pha đúng hướng dẫn trên gói\n• **Nghỉ ngơi**; ăn lại khi thấy muốn ăn, bắt đầu bằng món nhẹ, dễ tiêu\n• Rửa tay kỹ, không nấu ăn cho người khác khi đang bị\n• Theo dõi dấu hiệu nặng: **nôn ra máu / đi ngoài ra máu, mất nước nặng** (rất ít tiểu, chóng mặt khi đứng), **sốt cao**, đau bụng dữ dội, hay kéo dài quá vài ngày → đi khám\n\n_Nguồn: NHS (Anh) — Food poisoning._"],
  [FOODP, VN(/\b(trường hợp nào|khi nào|lúc nào)( \S+){0,4} (cấp cứu|đi khám|gọi 115|đi viện)\b/),
    "Khi học sơ cứu, nhớ mấy nhóm dấu hiệu này là cần **đi cấp cứu / gọi 115** với ngộ độc thực phẩm 🚑\n• **Nôn ra máu** hoặc **đi ngoài ra máu**\n• **Lơ mơ, lú lẫn, ngất**, co giật, khó thở\n• **Mất nước nặng**: rất ít hoặc không đi tiểu, môi khô, mắt trũng, chóng mặt khi đứng, tim đập nhanh\n• Đau bụng **dữ dội**, không giữ được bất kỳ thứ gì uống vào\n• Nghi do **nấm rừng, hoá chất, đồ có độc**, hoặc có **nhiều người cùng ăn** bị một lúc\n• Trẻ nhỏ, người già, phụ nữ có thai, người bệnh nền thì nên đi khám **sớm hơn**, đừng đợi tới mức nặng\n\n_Nguồn: NHS (Anh) — Food poisoning._"],
  [FOODP, VN(/\b(gọi 115|cần gọi|có cần|để học)\b/),
    "Chỉ hỏi để học thì **không cần gọi 115** đâu nha 😄 115 là khi **đang có người gặp nạn** cần cấp cứu.\n\nVới ngộ độc thực phẩm, gọi 115 / đi cấp cứu khi người bệnh: **nôn ra máu, đi ngoài ra máu**, **lơ mơ, ngất**, **khó thở**, có **dấu hiệu mất nước nặng** (rất ít tiểu, môi khô, chóng mặt khi đứng), đau bụng dữ dội, hoặc nghi do **nấm, hoá chất, đồ có độc**. Trẻ nhỏ, người già, phụ nữ có thai thì nên đi khám sớm hơn.\n\n_Nguồn: NHS (Anh) — Food poisoning._"],
];

export function emergencyKnowledge(raw: string, prevUser: string[]): string | null {
  const n = ` ${normalizeVi(raw)} `;
  const ctx = ` ${normalizeVi([...prevUser.slice(-3), raw].join(" "))} `;
  if (!TRAP.test(ctx) && !VN(/\b(sao không (được )?chạm|có cần gọi)\b/).test(n)) return null;
  for (const [topic, q, ans] of KNOW) if (topic.test(ctx) && q.test(n)) return ans;
  return null;
}
