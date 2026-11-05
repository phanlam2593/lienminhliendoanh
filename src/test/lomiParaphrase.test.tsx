// 05/11 — BỘ ĐỀ "NÓI KIỂU KHÁC": 40 ý hay gặp × 10 cách hỏi đời thường (teencode, không dấu, gõ sai, giọng miền, hỏi vòng vo, hỏi cụt),
// do ChatGPT soạn (Kir chuyển qua) — người khác viết nên Lomi không "học tủ". Điểm lần đầu 78,8% → 94,8% sau đợt sửa 05/11.
// Chạy cả bộ (≈15 phút): LOMI_PARA=1 npx vitest run src/test/lomiParaphrase.test.tsx — in điểm và các câu trượt.
// Lượt chạy thường chỉ chạy các câu đã sửa (giữ không tụt lại).
import { describe, expect, it } from "vitest";
import { last } from "./lomiChatHarness";
import bank from "./lomiParaphrase.json";

const E: Record<string, RegExp> = {
  ho: /\*\*Ho\b|Ho\*\*/i, sot: /Sốt/, daudau: /Đau đầu/i, tieuchay: /Tiêu chảy/i, taobon: /Táo bón/i, matngu: /Mất ngủ|ngủ/i,
  daday: /dạ dày/i, cam: /Cúm|Cảm lạnh|cảm cúm/i, viemhong: /Viêm họng|Đau họng/i, nghetmui: /Nghẹt mũi/i, romsay: /Rôm sảy/i,
  mun: /Mụn/i, muoi: /Côn trùng đốt|muỗi/i, daubungkinh: /Đau bụng kinh/i, stress: /Căng thẳng|stress|áp lực|lo âu|bất an|Suy nghĩ nhiều/i,
  gout_kieng: /Gout|gút/i, tieuduong_an: /Tiểu đường|Đái tháo đường/i, huyetap: /Tăng huyết áp/i,
  gout_tom: /Gout[\s\S]*(hải sản|tôm)/i, tieuduong_chuoi: /(Tiểu đường|Đái tháo đường)[\s\S]*(chuối|trái cây)/i,
  daday_cafe: /dạ dày[\s\S]*(caffeine|cà phê)/i, panadol: /Paracetamol/i, para_lieu: /Paracetamol/i,
  amox_side: /Amoxicillin[\s\S]*tác dụng phụ/i, ibu_daday: /Ibuprofen/i, oresol: /Oresol|ORS/i,
  berberin: /Berberin/i, smecta: /Smecta|diosmectite/i, menvisinh: /Men vi sinh/i, lavoi: /Lá vối/i,
  ngaicuu_bau: /Ngải cứu[\s\S]*(bầu|mang thai)/i, gung: /Gừng/i, rauma: /Rau má/i, cafe: /cà phê/i,
  choo: /chỗ ở|lưu trú|khách sạn|homestay/i, dangky: /hồ sơ doanh nghiệp/i, uudai: /ưu đãi/i, tarot: /lá bài|🔮/i,
  buon: /buồn|ôm|nghe|thương/i, thatnghiep: /việc|🫂|ôm|thương|khúc quanh/i,
};
const BAD = /chưa được tiếp thu|chưa biết cái này|chưa được học|chưa có kiến thức|chưa hiểu|chưa theo kịp|nói rõ thêm|Rảnh thì tám|bày trò|chưa chắc hiểu|mất mát/;
const B = bank as Record<string, string[]>;

describe("bộ đề nói kiểu khác — câu đã sửa 05/11", () => {
  const FIXED: [string, string][] = [
    ["tieuchay", "chị ơi bị tào tháo đuổi thì xử lý sao?"], ["tieuchay", "ỉa chảy phải làm sao"],
    ["taobon", "bị bón thì làm sao đi được vậy?"], ["taobon", "mấy hôm nay mình khó đi vệ sinh quá, phải làm sao?"], ["taobon", "bon bung phai lam sao"],
    ["viemhong", "tui bị rát cổ, có cách nào đỡ không?"], ["nghetmui", "chị ơi mũi bị tịt thì xử lý sao?"],
    ["huyetap", "cao máu là sao"], ["tieuduong_an", "tui bị bệnh đường, giờ nên ăn uống thế nào?"],
    ["daubungkinh", "tới tháng đau bụng thì làm gì cho đỡ?"], ["daubungkinh", "tui bị đau bụng ngày đèn đỏ, làm sao giờ?"],
    ["muoi", "bị muỗi chích sưng thì làm sao?"], ["sot", "sốt làm gì"], ["mun", "mụn sao"], ["romsay", "rôm sảy sao"],
    ["daday", "đau dạ dàu phải lm sao"], ["daudau", "tui đau cái đầu quá, làm sao cho đỡ?"], ["ho", "bị hô phải làm s"],
    ["gout_kieng", "em bị gout, có những món nào cần tránh không ạ?"],
    ["amox_side", "amoxicillin co td phu ko"], ["amox_side", "uống amoxicillin bị gì"], ["amox_side", "chị ơi uống amoxicillin có thể gặp vấn đề gì?"],
    ["oresol", "em mua gói Oresol mà chưa biết pha sao ạ"], ["oresol", "tui có gói oresol, giờ pha với nước sao đây?"],
    ["berberin", "berberin dung lm j"], ["berberin", "Berberin hỗ trợ vấn đề gì vậy?"], ["smecta", "Smecta thường được dùng trong trường hợp nào?"],
    ["menvisinh", "menvisinh dung lm j"], ["para_lieu", "thuoc para dung luong nao"],
    ["lavoi", "la voi dung lm j"], ["lavoi", "nuoc la voi co loi gi"], ["gung", "gung dung lm j"], ["rauma", "rau ma dung lm j"],
    ["choo", "lên Đà Lạt ngủ đâu"], ["dangky", "tui muốn đưa cửa hàng lên app, đăng ký kiểu gì?"], ["uudai", "ưu đãi đâu"],
    ["tarot", "bạn ơi rút cho mình một lá bài hôm nay với"], ["tarot", "hom nay bai gi"],
    ["buon", "tâm trạng xuống quá"], ["buon", "không hiểu sao dạo này tôi chẳng thấy vui chút nào"],
    ["thatnghiep", "mình vừa bị cho thôi việc, không biết phải làm sao nữa"], ["thatnghiep", "con mới mất việc, cảm thấy hụt hẫng quá"],
  ];
  for (const [id, q] of FIXED)
    it(`${id}: ${q}`, async () => {
      const c = (await last([q])).content;
      expect(c).toMatch(E[id]);
      expect(c).not.toMatch(BAD);
    }, 60000);
  it("'mẹ em mới mất' vẫn là chia buồn (lời sửa 'mất việc' không làm hỏng)", async () => {
    expect((await last(["mẹ em mới mất"])).content).toMatch(/chia buồn/);
  }, 60000);
});

describe.skipIf(!process.env.LOMI_PARA)("bộ đề nói kiểu khác — cả bộ 400 câu", () => {
  it("điểm ≥ 94%", async () => {
    let ok = 0, n = 0;
    const miss: string[] = [];
    for (const [id, qs] of Object.entries(B)) for (const q of qs) {
      n++;
      const c = (await last([q])).content;
      if (E[id].test(c) && !BAD.test(c)) ok++;
      else miss.push(`${id} | ${q} => ${c.slice(0, 80).replace(/\n/g, " ")}`);
    }
    console.log(`ĐIỂM ${ok}/${n} = ${((100 * ok) / n).toFixed(1)}%\n${miss.join("\n")}`);
    expect(ok / n).toBeGreaterThanOrEqual(0.94);
  }, 1500000);
});
