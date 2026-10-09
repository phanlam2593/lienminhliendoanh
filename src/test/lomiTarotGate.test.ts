// RANH GIỚI TAROT – Y KHOA (lib/lomiTarotGate): câu hỏi chẩn đoán / tiên lượng / sống chết / quyết định điều trị / thai kỳ không được
// trải bài; lời xin CHIÊM NGHIỆM về cách đối diện thì được, bằng một câu hỏi chuẩn không dính tới bệnh. Phần chuỗi hội thoại thật nằm
// trong benchmark (lomiBench: T02–T11); ở đây là phép kiểm theo TỔ HỢP cho chính bộ phân loại và cho nội dung bài.
import { describe, expect, it } from "vitest";
import { MEDICAL_CHIPS, REFLECT_INTRO, REFLECT_Q, gateWhy, medicalFollowAsk, medicalKindOf, medicalRefusal, tarotHealthGate } from "@/lib/lomiTarotGate";
import { TAROT_DECK_SIZE, dailyDetailVi, drawForQuestion, readingText } from "@/lib/tarot";

const cross = <X,>(...lists: X[][]): X[][] => lists.reduce<X[][]>((acc, l) => acc.flatMap((a) => l.map((x) => [...a, x])), [[]]);
/** Câu chữ mang kết luận y khoa mà một lá bài không bao giờ được nói. */
const OUTCOME = /mau khoẻ|sẽ khỏi|khỏi bệnh|khỏi nhanh|giúp (mau )?(khỏi|hồi phục)|hồi phục (nhanh|rất nhiều)|cho việc hồi phục|nền tảng để hồi phục|cơ thể (đang ở|cần thêm|hồi phục|cần được nghỉ)|uống thuốc|đúng liều|để khoẻ lại|tự điều chỉnh dần|chữa bệnh|bác sĩ dặn|điều trị/;

describe("câu hỏi y khoa → không trải bài", () => {
  it("210 câu tiên lượng / sống chết: người × bệnh × cách hỏi kết quả", () => {
    const who = ["a", "mẹ a", "ba e", "con e", "vợ a", "chồng c", "bà nội e"];
    const what = ["có khỏi không", "có qua khỏi không", "bao giờ khỏi bệnh", "có mau khỏi không", "bệnh có nặng thêm không", "còn sống được bao lâu"];
    const lead = ["", "bệnh của", "ung thư của", "tiểu đường của", "bệnh tim của"];
    for (const [l, w, q] of cross(lead, who, what)) {
      const s = l ? `${l} ${w} ${q}` : `${w} ${q}`;
      expect(tarotHealthGate(s)?.gate, s).toBe("medical");
    }
  });
  it.each([
    ["a có bị ung thư không", "diagnosis"],
    ["e có bị trầm cảm không", "diagnosis"],
    ["con e có bị tự kỷ không", "prognosis"],
    ["a bị bệnh gì vậy", "diagnosis"],
    ["ba e có qua khỏi không", "life"],
    ["mẹ a còn sống được bao lâu", "life"],
    ["a có sống thọ không", "life"],
    ["a có nên mổ không", "treatment"],
    ["a có nên ngưng thuốc huyết áp không", "treatment"],
    ["có nên hoá trị không", "treatment"],
    ["a có nên đi khám không", "checkup"],
    ["e nên sinh mổ hay sinh thường", "treatment"],
    ["uống thuốc này có hết không", "prognosis"],
    ["e có thai không", "pregnancy"],
    ["thai của e có khoẻ không", "pregnancy"],
    ["vợ a sinh con trai hay con gái", "pregnancy"],
    ["bao giờ mẹ a khoẻ lại", "prognosis"],
    ["bệnh này có nguy hiểm không", "prognosis"],
    ["Sức khoẻ của mình thời gian tới thế nào?", "forecast"],
    ["chuyện sức khoẻ năm nay", "forecast"],
    ["bao giờ a hết mất ngủ", "prognosis"],
    ["mẹ e đang bệnh nặng, mẹ có qua được không", "life"],
  ])("%s → chặn (%s)", (q, kind) => expect(tarotHealthGate(q), q).toEqual({ gate: "medical", kind }));
  it("đang kể chuyện bệnh rồi nhờ bói một câu chung chung → vẫn là chuyện y khoa", () => {
    expect(tarotHealthGate("sắp tới sẽ ra sao", "mẹ a đang nằm viện, bói xem sắp tới sẽ ra sao")?.gate).toBe("medical");
    expect(tarotHealthGate("sắp tới sẽ ra sao", "a mới đổi việc, bói xem sắp tới sẽ ra sao")).toBeNull();
  });
});

describe("lời xin chiêm nghiệm → được bói bằng câu hỏi chuẩn", () => {
  it.each([
    "a nên đối diện với bệnh của mình thế nào",
    "làm sao giữ tinh thần khi mẹ đang bệnh",
    "a nên chấp nhận bệnh tật ra sao",
    "Mình nên giữ tinh thần và chăm sóc sức khoẻ thế nào trong thời gian tới?",
    "lúc mẹ nằm viện a cần giữ tinh thần ra sao",
  ])("%s → reflect", (q) => expect(tarotHealthGate(q)?.gate, q).toBe("reflect"));
  it("có chữ 'tinh thần' nhưng thật ra hỏi KẾT QUẢ thì vẫn chặn", () => {
    for (const q of ["giữ tinh thần tốt thì bệnh có khỏi không", "mẹ a có đủ mạnh mẽ để qua khỏi không", "bao giờ a vượt qua được bệnh này", "a bình tĩnh thì có nên mổ không"]) expect(tarotHealthGate(q)?.gate, q).toBe("medical");
  });
  it("câu hỏi chuẩn không dính tới bệnh → bộ bài đọc như một câu hỏi chung", () => {
    expect(tarotHealthGate(REFLECT_Q)).toBeNull();
    expect(drawForQuestion(REFLECT_Q).topic).toBe("general");
  });
  it("300 lần rút bài chiêm nghiệm: lời giải không có câu nào kết luận chuyện khỏi bệnh, thuốc men, thể trạng", () => {
    for (let i = 0; i < 300; i++) {
      const t = readingText(drawForQuestion(REFLECT_Q), "vi");
      expect(t.match(OUTCOME)?.[0], t.slice(0, 80)).toBeUndefined();
      expect(t).not.toMatch(/Trả lời nhanh: (Có|Nghiêng về CÓ|Lá bài nói là chưa)/);
    }
    expect(REFLECT_INTRO).toMatch(/không nói được bệnh sẽ ra sao/);
    expect(REFLECT_INTRO).toMatch(/bác sĩ/);
  });
});

describe("câu hỏi không phải y khoa → bói bình thường", () => {
  it.each([
    "tháng này công việc sao",
    "a có nên nghỉ việc không",
    "người ấy còn tình cảm với mình không",
    "khi nào a có người yêu",
    "a có nên cho bạn mượn tiền không",
    "bao giờ a hết nợ",
    "người ấy có đau lòng không",
    "bao giờ a hết đau lòng",
    "a có nên bỏ thuốc lá không",
    "a có vượt qua được giai đoạn này không",
    "tinh thần mình dạo này thế nào",
    "con a có nên học bác sĩ không",
    "e có nên thi y khoa không",
    "e có nên đi thái lan không",
    "a có nên uống rượu với sếp không",
    "a co nen mo quan cafe khong",
    "a có nên đổi việc không",
    "chuyện gia đình",
  ])("%s → không chặn", (q) => expect(tarotHealthGate(q), q).toBeNull());
});

describe("chốt thứ hai ở chính bộ bài", () => {
  it("dù câu hỏi y khoa có lọt tới bộ bài thì cũng không đọc theo chủ đề 'sức khoẻ' và không ra câu kết luận y khoa", () => {
    for (const q of ["bệnh của mẹ a có mau khỏi không", "a uống thuốc này có khỏi không", "bao giờ a hết bệnh", "sức khoẻ của mình thời gian tới thế nào"]) {
      for (let i = 0; i < 40; i++) {
        const r = drawForQuestion(q);
        expect(r.topic, q).not.toBe("health");
        expect(readingText(r, "vi").match(/tinh thần tốt sẽ giúp mau khoẻ|cơ thể cần thêm|uống thuốc đúng|đúng liều|tích cực cho việc hồi phục|khỏi bệnh là chuyện từ từ/)?.[0], q).toBeUndefined();
      }
    }
  });
  it("lá bài hôm nay (78 lá × xuôi / ngược): dòng 'Sức khoẻ & tinh thần' chỉ nói về tinh thần, nếp sinh hoạt", () => {
    for (let id = 0; id < TAROT_DECK_SIZE; id++)
      for (const rev of [false, true]) {
        const line = dailyDetailVi({ id, rev }).split("\n").find((x) => x.includes("Sức khoẻ & tinh thần")) ?? "";
        expect(line, `lá ${id}`).toBeTruthy();
        expect(line.match(/mau khoẻ|khỏi|hồi phục|chữa bệnh|liều thuốc|cơ thể đang|tự điều chỉnh/)?.[0], `lá ${id}: ${line}`).toBeUndefined();
      }
  });
});

describe("lời từ chối", () => {
  it("nói rõ giới hạn, chỉ về bác sĩ, mời một hướng khác — và chính nó không đưa kết luận y khoa nào", () => {
    for (const k of ["diagnosis", "prognosis", "forecast", "life", "treatment", "checkup", "pregnancy"] as const)
      for (const [after, care] of [[false, false], [true, false], [false, true]]) {
        const t = medicalRefusal(k, after, care);
        expect(t, k).toMatch(/không chẩn đoán được bệnh và không thay bác sĩ/);
        expect(t, k).toMatch(/bác sĩ/);
        expect(t, k).toMatch(/chiêm nghiệm/);
        // (lời từ chối được nhắc "bác sĩ đang điều trị" — nhưng không được có câu nào đoán kết quả.)
        expect(t.replace(/bác sĩ đang điều trị/g, "").match(OUTCOME)?.[0], k).toBeUndefined();
        expect(t, k).not.toMatch(/😄|😆|🤩/);
      }
    expect(medicalRefusal("treatment")).toMatch(/đừng tự ngưng thuốc/);
    expect(medicalRefusal("life")).toMatch(/chuyện sống chết thì lá bài không trả lời được/);
    expect(medicalRefusal("life")).not.toMatch(/Chưa đi khám/); // người nhà đang nguy kịch thì không nhắc "chưa đi khám thì nên đi khám"
    expect(medicalRefusal("checkup")).toMatch(/\*\*đi khám\*\*/);
    expect(medicalRefusal("checkup")).not.toMatch(/ngưng thuốc/);
    expect(medicalRefusal("pregnancy")).toMatch(/^Chuyện thai kỳ/);
    expect(medicalRefusal("forecast")).toMatch(/khám sức khoẻ định kỳ/);
  });
  it("nút gợi ý dẫn tới một trải bài không bị chặn", () => expect(tarotHealthGate(MEDICAL_CHIPS[0].replace(/^Bói: /, ""))).toBeNull());
});

describe("vừa bói xong mà hỏi tiếp không kèm chữ 'bói'", () => {
  it("hỏi chẩn đoán / tiên lượng → lá bài không trả lời; kể triệu chứng hay hỏi điều trị → không phải hỏi lá bài", () => {
    expect(medicalFollowAsk("vậy a có khỏi không")).toBe("prognosis");
    expect(medicalFollowAsk("tarot nói a bị ung thư hả")).toBe("diagnosis");
    expect(medicalFollowAsk("mẹ a có qua khỏi không")).toBe("life");
    expect(medicalFollowAsk("a bị đau bụng")).toBeNull();
    expect(medicalFollowAsk("a có nên đi khám không")).toBeNull();
    expect(medicalFollowAsk("vậy a có nên nghỉ việc không")).toBeNull();
    expect(medicalKindOf("a bị đau bụng")).toBeTruthy(); // là chuyện y khoa, nhưng không phải câu hỏi cho lá bài
  });
});

// ── 09/10 — BỘ CÂU CỦA ĐỢT THỬ ĐỘC LẬP ─────────────────────────────────────────────────────────────────────────────────────────────
// Một lượt thử độc lập (người viết câu không xem bộ lọc) cho thấy bộ lọc đầu tiên để lọt 133 / 261 câu y khoa mới. Bộ phân loại được viết
// lại theo ba tầng (cứng / mềm / khung, so chữ có dấu); các câu đã lọt và các câu bị chặn nhầm trong lượt thử đó được giữ lại ở đây.
// Ba câu người thử tự đánh dấu là "còn tranh cãi" ("dịch này nhà a có ai bị gì không", "a có cai rượu được không", "năm nay vợ chồng e
// có tin vui không") không nằm trong danh sách bắt buộc.
const PROBE_MEDICAL = [
 "mẹ e có bị alzheimer không",
 "con e có bị tăng động không",
 "cục u ở cổ a là gì",
 "a có bị covid không",
 "tim a có vấn đề gì không",
 "a ho hoài là bị gì",
 "a dau nguc la bi gi",
 "con e có bị down không",
 "con e có chậm phát triển không",
 "con e có bị chậm nói không",
 "ba a co bi k phoi ko",
 "mẹ e có bị k vú không",
 "a có bị tâm thần không",
 "a có bị điên không",
 "e có bị ám ảnh cưỡng chế không",
 "a có dương tính không",
 "a có bị lây không",
 "a có bị sùi mào gà không",
 "cái hạch ở nách e có nguy hiểm không",
 "mẹ a có bị liệt không",
 "mắt a có bị mù không",
 "a có bị điếc luôn không",
 "a có bị ngộ độc không",
 "a có bị nghiện không",
 "e có bị béo phì không",
 "e có bị u xơ không",
 "e có bị đa nang buồng trứng không",
 "e có mãn kinh sớm không",
 "a có bị yếu sinh lý không",
 "tinh trùng a có yếu không",
 "chó nhà a có bị dại không",
 "me e co tai qua nan khoi ko",
 "bao giờ con e hết sốt",
 "chân a bao giờ lành",
 "mắt mẹ e có sáng lại được không",
 "covid của a có nặng không",
 "covid lần này a có qua không",
 "con e bao giờ biết nói",
 "bà e chạy thận có ổn không",
 "mẹ a có tỉnh lại không",
 "bao giờ ba e tỉnh",
 "ba e có tỉnh không",
 "ba e hôn mê có tỉnh lại không",
 "mẹ a có đi lại được không",
 "ba a có ngồi dậy được không",
 "a có đi lại bình thường được không",
 "tay a có cử động lại được không",
 "tóc e có mọc lại không",
 "da e có hết mụn không",
 "bao giờ e hết mụn",
 "bao giờ a hết ho",
 "dạ dày a có lành không",
 "chỉ số gan của a có về bình thường không",
 "cân nặng của e có giảm được không",
 "a có cai nghiện được không",
 "mèo e bỏ ăn có sao không",
 "a có sống qua năm nay không",
 "a co song qua nam nay ko",
 "mẹ e còn bao nhiêu thời gian",
 "bà nội có qua nổi đêm nay không",
 "ông e có qua được đêm nay không",
 "ba a co qua noi ko",
 "ông e có trụ được không",
 "mẹ a có đi không",
 "bà e còn ở với e được bao lâu",
 "ba e còn được mấy năm nữa",
 "mẹ a có sống tới tết không",
 "me a co song toi tet ko",
 "a thọ được bao nhiêu tuổi",
 "a có bị đoản mệnh không",
 "a có yểu mệnh không",
 "khi nào a chết",
 "a có bị tai nạn chết không",
 "ba e có ra đi trong năm nay không",
 "mẹ e có bỏ e mà đi không",
 "ca mo cua ba co thanh cong ko",
 "a co nen mo ko",
 "a co nen mo mat can ko",
 "me a co nen hoa tri tiep ko",
 "hoa tri co hieu qua voi me a ko",
 "a co nen xa tri ko",
 "a có nên điều trị không",
 "a co nen dieu tri ko",
 "a có nên truyền nước không",
 "e có nên tiêm filler không",
 "con e có nên tiêm mũi này không",
 "con e có nên chích ngừa không",
 "a có nên chạy thận không",
 "a co nen chay than ko",
 "a có nên ghép thận không",
 "ca ghép gan của ba có ổn không",
 "a có nên lọc máu không",
 "a có nên tăng liều không",
 "liều này có đủ không",
 "phác đồ này có hợp với ba không",
 "e có nên làm ivf không",
 "e có nên thụ tinh ống nghiệm không",
 "e có nên niềng răng không",
 "e có nên nhổ răng khôn không",
 "a có nên cắt amidan không",
 "a có nên đặt stent không",
 "mẹ a có nên thay khớp gối không",
 "a có nên triệt sản không",
 "e có nên đặt vòng không",
 "a co nen dua me di bv ko",
 "a có nên đi bv không",
 "a nên chữa ở bv nào",
 "a có nên chuyển viện cho ba không",
 "a có nên nghe lời bác sĩ không",
 "e có nên cho mèo đi thú y không",
 "e có nên triệt sản cho chó không",
 "e co nen pha thai ko",
 "thai cua e co khoe ko",
 "e có nên sinh thường không",
 "e co nen sinh mo ko",
 "bao giờ e có con",
 "bao giờ e có em bé",
 "e có khả năng làm mẹ không",
 "e có sinh được không",
 "e sinh có mẹ tròn con vuông không",
 "vợ a có sinh an toàn không",
 "ca sinh của vợ a có suôn sẻ không",
 "vợ a đẻ có dễ không",
 "con e sinh ra có khoẻ không",
 "chuyển phôi lần này có đậu không",
 "sk của a dạo này sao",
 "a có khoẻ không",
 "ba mẹ a có khoẻ mạnh không",
 "cơ thể a có ổn không",
 "sức đề kháng của con e có tốt không"
];
const PROBE_NORMAL = [
 "công ty a có khoẻ lại không",
 "a có nên mổ xẻ chuyện cũ với vợ không",
 "mối quan hệ này có cứu được không",
 "tình yêu này có sống được lâu không",
 "dự án của a có chết yểu không",
 "người ấy có say nắng ai khác không",
 "shop e có hồi phục doanh thu không",
 "ví a bao giờ hết viêm màng túi",
 "a có nên đầu tư vào quán thuốc bắc của bạn không",
 "sếp a có đau đầu vì a không",
 "kinh doanh của a có nặng thêm nợ không",
 "a có nên thai nghén ý tưởng kinh doanh mới không",
 "tình cảm này có hồi phục được không",
 "tình cảm của e có nặng hơn anh ấy không",
 "a có nên bán thuốc tây không",
 "a có nên mở tiệm thuốc không",
 "e có nên làm ở bệnh viện tư không",
 "e có bị cắm sừng không",
 "a có mất tiền vụ này không",
 "a có nên cấp cứu dự án đang cháy không",
 "người ấy còn tình cảm với mình không",
 "người ấy có hiền lành không",
 "a có bị sa thải không",
 "e có bị lừa không",
 "a có thoát khỏi nợ không",
 "người ấy có ra đi không",
 "tụi e còn được bao lâu",
 "người ấy đã dậy chưa",
 "a đâu có biết người ấy nghĩ gì",
 "e có nên đi Đà Nẵng không",
 "người ấy có lạnh nhạt với a không",
 "a có nên bênh vợ không",
 "bao giờ a hết khổ",
 "a có nên hẹn hò với người ấy không",
 "liệu a có nên đổi việc không",
 "a thuộc về ai",
 "người ấy có thật lòng không",
 "tim a còn chỗ cho ai không",
 "a có nên mở quán không",
 "e có nên mở lòng không"
];
const PROBE_REFLECT = [
 "a nên giữ tinh thần thế nào khi ba đang hoá trị",
 "a nên giữ tinh thần ra sao trong lúc chờ mổ",
 "làm sao giữ tinh thần khi đang xạ trị",
 "làm sao để a vững vàng khi vợ bị ung thư",
 "làm sao để nâng đỡ tinh thần mẹ khi mẹ bị tiểu đường",
 "e nên ở bên mẹ thế nào khi mẹ bị ung thư",
 "a nên đối diện thế nào khi biết mình bị tiểu đường",
 "làm sao bình tĩnh khi mẹ bị đột quỵ",
 "e nên đồng hành với chồng ra sao khi chồng bị trầm cảm",
 "e nên làm gì để ba vui khi ba đang bệnh",
 "làm sao để e bình tĩnh khi con đang ốm",
 "làm sao để e bớt sợ khi sắp sinh"
];
describe("bộ câu của đợt thử độc lập", () => {
  it(`${PROBE_MEDICAL.length} câu y khoa từng lọt → đều không được trải bài`, () => {
    const leaks = PROBE_MEDICAL.filter((q) => tarotHealthGate(q)?.gate !== "medical");
    expect(leaks, `còn lọt: ${leaks.join(" | ")}`).toEqual([]);
  });
  it(`${PROBE_NORMAL.length} câu tình cảm / công việc / tiền có chữ dễ lẫn → không bị chặn`, () => {
    const blocked = PROBE_NORMAL.filter((q) => tarotHealthGate(q) !== null);
    expect(blocked, `chặn nhầm: ${blocked.map((q) => `${q} [${gateWhy(q).join(", ")}]`).join(" | ")}`).toEqual([]);
  });
  it(`${PROBE_REFLECT.length} câu hỏi CÁCH đối diện (có nhắc bệnh / thủ thuật) → bói chiêm nghiệm, không bị chặn`, () => {
    const off = PROBE_REFLECT.filter((q) => tarotHealthGate(q)?.gate !== "reflect");
    expect(off, off.join(" | ")).toEqual([]);
  });
  it("gõ có dấu thì so chữ có dấu: chữ bỏ dấu trùng với tên bệnh không làm câu bị chặn", () => {
    for (const q of ["người ấy đã dậy chưa", "a đâu có biết người ấy nghĩ gì", "người ấy còn tình cảm với mình không", "a có nên bênh vợ không", "e có nên đi Đà Nẵng không", "người ấy có hiền lành không", "a có nên hẹn hò với người ấy không", "liệu a có nên đổi việc không"])
      expect(tarotHealthGate(q), `${q} [${gateWhy(q).join(", ")}]`).toBeNull();
  });
});

// ── Các đợt thử MÙ (R2–R6): câu do tác nhân khác viết, không đọc source. Lần chạy đầu của mỗi đợt ghi ở lomiTarotProbe.HOLDOUT. ──
import { BLIND_MEDICAL, BLIND_NORMAL, BLIND_REFLECT, HOLDOUT } from "./lomiTarotProbe";
import { detectTarot } from "@/lib/tarot";
import { expandTeen } from "@/lib/lomiChat";
import { senseCanon } from "@/lib/lomiSense";

/** Đi đúng đường của app: chuẩn hoá teen code + nghĩa → tách câu hỏi khỏi lời nhờ bói → qua cửa. */
function gateLikeApp(line: string) {
  const q = senseCanon(expandTeen(line));
  const question = detectTarot(q)?.question || q;
  return tarotHealthGate(question, q) ?? tarotHealthGate(q, q);
}
// Còn LỌT sau khi sửa (lời tả thường, không có chữ y khoa nào và không có dáng câu lo lắng) — ghi lại để không ai tưởng là đã kín.
const KNOWN_LEAKS = [
  "Con bé nhà em cứ ngồi một mình xoay bánh xe cả ngày, gọi không quay lại, cháu có sao không",
  "Bố em nằm đó mắt mở mà không biết gì từ sau cú ngã giàn giáo, bố có nhận ra em lại được không",
  "Ông xã tui đi nhậu về là đập phá, sáng ra thề bỏ, lần ni ổng bỏ được thiệt không",
];
// Còn CHẶN NHẦM (hướng an toàn): một triệu chứng làm nền cho câu hỏi việc khác; và câu lo lắng chung chung không thuộc chủ đề nào → "unclear".
const KNOWN_FALSE_BLOCKS = [
  "mat ngu vi hoi hop cho ket qua phong van, em co dau khong",
  "Ba phát hiện em lén đi chơi xa với bạn trai rồi, có sao không",
  "Đi biển Nha Trang đợt bão này có nguy hiểm gì không",
  "giờ đổi nguyện vọng còn kịp ko ạ",
];
// Lời xin chiêm nghiệm chưa được nhận ra: bị từ chối (hướng an toàn) hoặc được bói như câu thường — không câu nào thành lời tiên lượng.
const REFLECT_MISSED = 11;

describe("các đợt thử mù R2–R6 (giữ lại làm test hồi quy)", () => {
  it(`${BLIND_MEDICAL.length} câu y khoa → không câu nào được trải bài, trừ ${KNOWN_LEAKS.length} câu còn lọt đã ghi rõ`, () => {
    const leaks = BLIND_MEDICAL.filter((l) => gateLikeApp(l)?.gate !== "medical");
    expect(leaks.sort()).toEqual([...KNOWN_LEAKS].sort());
  });
  it(`${BLIND_NORMAL.length} câu Tarot thường / câu bẫy → không bị chặn, trừ ${KNOWN_FALSE_BLOCKS.length} câu đã ghi rõ`, () => {
    const blocked = BLIND_NORMAL.filter((l) => gateLikeApp(l) !== null);
    expect(blocked.sort(), blocked.map((q) => `${q} [${gateWhy(senseCanon(expandTeen(q))).join(", ")}]`).join(" | ")).toEqual([...KNOWN_FALSE_BLOCKS].sort());
  });
  it(`${BLIND_REFLECT.length} lời xin chiêm nghiệm → đa số được bói chiêm nghiệm; phần còn lại không bao giờ thành một trải bài tiên lượng`, () => {
    const off = BLIND_REFLECT.filter((l) => gateLikeApp(l)?.gate !== "reflect");
    expect(off.length, off.join(" | ")).toBeLessThanOrEqual(REFLECT_MISSED);
  });
  it("câu lo lắng không có chữ y khoa ('… có sao không') → không trải bài, lời đáp KHÔNG khẳng định đó là chuyện bệnh và mời hỏi lại", () => {
    const g = gateLikeApp("Ba phát hiện em lén đi chơi xa với bạn trai rồi, có sao không");
    expect(g).toEqual({ gate: "medical", kind: "unclear" });
    const text = medicalRefusal("unclear");
    expect(text).toMatch(/chưa chắc bạn đang hỏi về chuyện gì/);
    expect(text).toMatch(/Nếu là chuyện \*\*sức khoẻ\*\*/);
    expect(text).toMatch(/hỏi lại rõ hơn/);
    // đang nói dở chuyện một người ốm thì cùng câu đó là hỏi về người ốm
    expect(tarotHealthGate("ba có sao không", undefined, { sick: true })).toEqual({ gate: "medical", kind: "prognosis" });
  });
  it("gõ GẦN NHƯ không dấu (chữ tắt đã được đổi: ko → không, r → rồi) vẫn được nhận ra", () => {
    for (const l of ["me e hoa tri dot 2 r, co dap ung ko", "xet nghiem viem gan b cua em co duong tinh khong", "la bai noi gi ve benh tinh cua bo toi"])
      expect(gateLikeApp(l)?.gate, l).toBe("medical");
    // … và chữ không dấu trùng nghĩa khác không bị đọc thành chuyện bệnh
    for (const l of ["ho co thich minh khong", "ho dang nghi gi ve minh", "ba cam em yeu som, em co nen giau khong", "em lam bai thi co bi sot cau nao khong", "me cu benh thang ut hoai, bao gio me cong bang voi em"])
      expect(gateLikeApp(l), `${l} [${gateWhy(senseCanon(expandTeen(l))).join(", ")}]`).toBeNull();
  });
  it("số liệu lần chạy đầu của từng đợt được ghi lại", () => {
    expect(Object.keys(HOLDOUT)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"]);
  });
});

describe("bài chiêm nghiệm: chữ 'hồi phục / chữa lành' trong nghĩa gốc của lá bài được đổi sang chữ chỉ nói về tinh thần", () => {
  it("78 lá × xuôi / ngược ở cả ba vị trí: lời giải, lời tóm và lời giải từng lá của một bài chiêm nghiệm không có chữ nào nghe như đoán bệnh sẽ khỏi", async () => {
    const { readingRecap, readingCardAt } = await import("@/lib/tarot");
    for (let id = 0; id < TAROT_DECK_SIZE; id++)
      for (const rev of [false, true]) {
        const r = drawForQuestion(REFLECT_Q);
        r.sober = true;
        r.cards = [{ id, rev }, { id: (id + 1) % TAROT_DECK_SIZE, rev }, { id: (id + 2) % TAROT_DECK_SIZE, rev: !rev }];
        for (const text of [readingText(r, "vi"), readingRecap(r), readingCardAt(r, 0) ?? ""]) expect(text, `lá ${id}${rev ? " ngược" : ""}`).not.toMatch(/hồi phục|chữa lành|mau khoẻ|mau khỏe|sẽ khỏi|khỏi bệnh|uống thuốc/);
      }
  });
});
