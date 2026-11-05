// 05/11 — BỘ HỘI THOẠI NHIỀU LƯỢT (ChatGPT soạn, Kir chuyển qua): 40 đoạn × 4 lượt, 8 kiểu — hỏi nối không nhắc tên, đổi chủ đề,
// quay lại chủ đề cũ, sửa lại ý, hỏi cho người khác, kể trước hỏi sau, hỏi món liên tục, tâm sự rồi hỏi thực tế.
// Điểm lần đầu 85,6% → 95,6% sau đợt sửa 05/11. Cả bộ (≈20 phút): LOMI_CONVO=1 npx vitest run src/test/lomiConvoBank.test.tsx
import { describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import bank from "./lomiConvoBank.json";

type Luot = { u: string; topic: string; y: string; mon?: string };
type Convo = { id: string; kieu: number; luot: Luot[] };
const E: Record<string, RegExp> = {
  ho: /\*\*Ho\b|Ho\*\*|\bho\b/i, sot: /Sốt|sốt/, daudau: /Đau đầu/i, tieuchay: /Tiêu chảy/i, taobon: /Táo bón/i, matngu: /Mất ngủ|ngủ/i,
  daday: /dạ dày|bao tử/i, cam: /Cúm|Cảm lạnh|cảm/i, viemhong: /Viêm họng|Đau họng|họng/i, nghetmui: /Nghẹt mũi|mũi/i, romsay: /Rôm sảy/i,
  mun: /Mụn/i, muoi: /Côn trùng đốt|muỗi/i, daubungkinh: /Đau bụng kinh/i, stress: /Căng thẳng|stress|áp lực|lo âu|bất an|Suy nghĩ/i,
  gout: /Gout|gút/i, tieuduong: /Tiểu đường|Đái tháo đường/i, huyetap: /huyết áp/i, panadol: /Paracetamol|Panadol/i, paracetamol: /Paracetamol/i,
  amoxicillin: /Amoxicillin/i, ibuprofen: /Ibuprofen/i, oresol: /Oresol|ORS|bù nước/i, berberin: /Berberin/i, smecta: /Smecta|diosmectite/i,
  menvisinh: /Men vi sinh/i, lavoi: /Lá vối|vối/i, ngaicuu: /Ngải cứu/i, gung: /Gừng/i, rauma: /Rau má/i, cafe: /cà phê|quán|tìm được|mấy chỗ/i,
  choo: /chỗ ở|lưu trú|khách sạn|homestay|phòng|tìm được|mấy chỗ/i, dangky: /doanh nghiệp|đăng ký|việc/i, uudai: /ưu đãi/i, tarot: /lá bài|🔮|Lá|bài/i,
  buon: /buồn|ôm|nghe|thương|💚/i, thatnghiep: /việc|🫂|ôm|thương|khúc quanh/i,
};
const BAD = /chưa được tiếp thu|chưa biết cái này|chưa được học|chưa có kiến thức|chưa hiểu|chưa theo kịp|nói rõ thêm|Rảnh thì tám|bày trò|chưa chắc hiểu|mất mát|Bạn hỏi về chuyện gì/;
const C = bank as Convo[];
const pass = (l: Luot, a: string) => !BAD.test(a) && (l.y === "tam_su" || l.y === "app" || E[l.topic].test(a));

describe("hội thoại nhiều lượt — đoạn đã sửa 05/11", () => {
  for (const id of ["c02", "c08", "c11", "c14", "c17", "c20", "c21", "c23", "c40"])
    it(id, async () => {
      const c = C.find((x) => x.id === id)!;
      const r = (await chat(c.luot.map((l) => l.u))).filter((t) => t.role === "assistant");
      c.luot.forEach((l, i) => expect(pass(l, r[i]?.content ?? ""), `${id}#${i} "${l.u}" → ${r[i]?.content.slice(0, 100)}`).toBe(true));
    }, 120000);
});

describe.skipIf(!process.env.LOMI_CONVO)("hội thoại nhiều lượt — cả bộ", () => {
  it("điểm ≥ 95%", async () => {
    let ok = 0, n = 0;
    const miss: string[] = [];
    for (const c of C) {
      const r = (await chat(c.luot.map((l) => l.u))).filter((t) => t.role === "assistant");
      c.luot.forEach((l, i) => { n++; const a = r[i]?.content ?? ""; if (pass(l, a)) ok++; else miss.push(`${c.id}#${i} ${l.u} => ${a.slice(0, 80).replace(/\n/g, " ")}`); });
    }
    console.log(`ĐIỂM ${ok}/${n} = ${((100 * ok) / n).toFixed(1)}%\n${miss.join("\n")}`);
    expect(ok / n).toBeGreaterThanOrEqual(0.95);
  }, 1800000);
});
