// KIẾN THỨC THUỐC CÓ NGUỒN (lib/lomiDrugData) — test ÉP quy tắc dữ liệu: mỗi ý về một thuốc phải có nguồn chính thống + ngày đối chiếu;
// không có con số liều; tương tác chỉ được nói khi có bản ghi cho đúng cặp đó. Thêm một thuốc mà thiếu nguồn thì test này đỏ.
import { describe, expect, it } from "vitest";
import { DRUGS, DRUG_CLAIMS, DRUG_CLAIMS_UNVERIFIED, REVIEW_AFTER_DAYS, TRUSTED, drugById, findDrug, findInteraction, renderDrug, sourceLine, type DrugEntry, type DrugSource } from "@/lib/lomiDrugData";
import { drugAsk } from "@/lib/lomiDrug";
import { contextReply } from "@/lib/lomiContext";
import { normalizeVi } from "@/lib/lomiFaq";

const DOSE_NUM = /\d+\s?(mg|ml|mcg|viên|gói|ống)\b/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const checkSource = (s: DrugSource, where: string) => {
  expect(s.url, where).toMatch(/^https:\/\//);
  const host = new URL(s.url).hostname.replace(/^www\./, "");
  expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), `${where}: ${host} không nằm trong danh sách nguồn chính thống`).toBe(true);
  expect(s.title.length, where).toBeGreaterThan(3);
  expect(s.publisher.length, where).toBeGreaterThan(1);
  if (s.reviewed) expect(s.reviewed, where).toMatch(ISO);
};
const allFacts = (d: DrugEntry) => [...d.uses, ...d.sideEffects.common, ...d.sideEffects.serious, ...d.contraindications, ...d.overdose, ...d.children];

describe("schema: mỗi mục thuốc đều có nguồn và ngày đối chiếu", () => {
  it("có ít nhất một mục, mã không trùng", () => {
    expect(DRUGS.length).toBeGreaterThan(0);
    expect(new Set(DRUGS.map((d) => d.id)).size).toBe(DRUGS.length);
  });
  for (const d of DRUGS) {
    describe(d.id, () => {
      it("đủ trường: hoạt chất, công dụng, tác dụng phụ, chống chỉ định, tương tác, nguồn, ngày đối chiếu", () => {
        expect(d.ingredient).toBeTruthy();
        expect(d.uses.length).toBeGreaterThan(0);
        expect(d.sideEffects.common.length + d.sideEffects.serious.length).toBeGreaterThan(0);
        expect(d.contraindications.length).toBeGreaterThan(0);
        expect(Array.isArray(d.interactions)).toBe(true);
        expect(d.sources.length).toBeGreaterThan(0);
        expect(d.verifiedAt).toMatch(ISO);
        expect(Date.parse(d.verifiedAt)).not.toBeNaN();
      });
      it("nguồn là trang https của cơ quan y tế / thư viện y khoa trong danh sách tin cậy", () => d.sources.forEach((s, i) => checkSource(s, `${d.id}.sources[${i}]`)));
      it("mỗi ý (kể cả từng tương tác) trỏ tới ít nhất một nguồn có thật trong mục", () => {
        for (const f of [...allFacts(d), ...d.interactions]) {
          const label = "text" in f ? f.text : f.with;
          expect(f.src.length, label).toBeGreaterThan(0);
          for (const i of f.src) expect(d.sources[i], `${label} → nguồn #${i}`).toBeTruthy();
        }
      });
      it("không có con số liều ở bất kỳ đâu", () => {
        for (const f of allFacts(d)) expect(f.text).not.toMatch(DOSE_NUM);
        for (const x of d.interactions) expect(x.note).not.toMatch(DOSE_NUM);
        for (const a of ["info", "side", "caution", "overdose", "children", "interactions"] as const) expect(renderDrug(d, a), a).not.toMatch(DOSE_NUM);
      });
      it("mọi lời đáp ghép từ mục này đều kèm dòng nguồn + ngày đối chiếu", () => {
        for (const a of ["info", "side", "caution", "overdose", "children", "interactions"] as const) {
          const t = renderDrug(d, a);
          expect(t, a).toMatch(/📚 Nguồn: /);
          expect(t, a).toContain(`đối chiếu ngày ${d.verifiedAt.split("-").reverse().join("/")}`);
        }
      });
      it("tên nhận diện khớp được với bộ nhận diện", () => {
        for (const n of d.names) expect(findDrug(`thuốc ${n} là gì`)?.id, n).toBe(d.id);
      });
    });
  }
  it("các lời dặn về thuốc nằm rải ở phần triệu chứng cũng có nguồn + ngày đối chiếu", () => {
    expect(DRUG_CLAIMS.length).toBeGreaterThan(0);
    for (const c of DRUG_CLAIMS) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      c.sources.forEach((s, i) => checkSource(s, `${c.id}.sources[${i}]`));
      expect(c.verifiedAt, c.id).toMatch(ISO);
      expect(c.where.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe("điều CHƯA xác minh được ghi riêng, không lẫn vào kiến thức đã có nguồn", () => {
  it("mỗi mục chưa xác minh có ghi chú vì sao và nằm ở đâu; không trùng mã với mục đã có nguồn", () => {
    expect(DRUG_CLAIMS_UNVERIFIED.length).toBeGreaterThan(0);
    const verified = new Set(DRUG_CLAIMS.map((c) => c.id));
    for (const u of DRUG_CLAIMS_UNVERIFIED) {
      expect(verified.has(u.id), u.id).toBe(false);
      expect(u.note.length, u.id).toBeGreaterThan(10);
      expect(u.where.length, u.id).toBeGreaterThan(0);
      expect("sources" in u, u.id).toBe(false); // chưa có nguồn thì không được giả vờ có
    }
  });
});

describe("dữ liệu cũ không được trình bày như mới", () => {
  const d = DRUGS[0];
  it("trong hạn thì không có ghi chú; quá hạn thì lời đáp tự nhắc nên hỏi lại dược sĩ", () => {
    const at = Date.parse(d.verifiedAt);
    expect(sourceLine(d, [0], at + 10 * 86_400_000)).not.toMatch(/đã hơn một năm/);
    expect(sourceLine(d, [0], at + (REVIEW_AFTER_DAYS + 5) * 86_400_000)).toMatch(/đã hơn một năm/);
  });
});

describe("phân biệt NHẬN RA câu hỏi thuốc với CÓ kiến thức về thuốc", () => {
  it("thuốc có mục → trả lời từ dữ liệu, kèm nguồn; thuốc không có mục → nói rõ chưa có dữ liệu đã kiểm chứng", () => {
    const known = drugAsk("paracetamol có tác dụng phụ gì")!;
    expect(known.drugId).toBe("paracetamol");
    expect(known.text).toMatch(/📚 Nguồn: /);
    for (const q of ["amoxicillin có tác dụng phụ gì", "thuốc omeprazol trị gì", "Colchicine là thuốc gì?"]) {
      const r = drugAsk(q)!;
      expect(r.drugId, q).toBeUndefined();
      expect(r.text, q).toMatch(/chưa có dữ liệu đã kiểm chứng/);
      expect(r.text, q).not.toMatch(/Nguồn:/);
    }
  });
  it("câu hỏi nối không nhắc lại tên vẫn biết đang nói thuốc nào (và vẫn nói thật là chưa có dữ liệu)", () => {
    const r = drugAsk("nó có tác dụng phụ gì không", { afterDrug: true, name: "amoxicillin" })!;
    expect(r.kind).toBe("side");
    expect(r.text).toMatch(/chưa có dữ liệu đã kiểm chứng về \*\*amoxicillin\*\*/);
  });
});

describe("tương tác: chỉ nói khi có bản ghi có nguồn cho ĐÚNG cặp đó", () => {
  const para = drugById("paracetamol")!;
  it("cặp có bản ghi → nêu đúng ghi chú của bản ghi + nguồn", () => {
    for (const x of para.interactions) {
      const sample = { same: "thuốc cảm", ibuprofen: "ibuprofen", warfarin: "warfarin", antisick: "domperidone", flucloxacillin: "flucloxacillin", alcohol: "bia" }[x.id]!;
      expect(findInteraction(para, `uống chung với ${sample}`)?.id, x.id).toBe(x.id);
      const r = drugAsk(`paracetamol uống chung với ${sample} được không`)!;
      expect(r.kind, x.id).toBe("interact");
      expect(r.drugId, x.id).toBe("paracetamol");
      expect(r.text, x.id).toContain(x.note);
      expect(r.text, x.id).toMatch(/📚 Nguồn: /);
    }
  });
  it("cặp KHÔNG có bản ghi → nói rõ chưa xác minh được, không suy ra từ tên thuốc", () => {
    for (const other of ["thuốc huyết áp", "amoxicillin", "thuốc tiểu đường", "aspirin", "thuốc tránh thai", "thuốc dạ dày"]) {
      expect(findInteraction(para, `uống chung với ${other}`), other).toBeNull();
      const r = drugAsk(`paracetamol uống chung với ${other} được không`)!;
      expect(r.kind, other).toBe("interact");
      expect(r.text, other).toMatch(/chưa xác minh được/);
      expect(r.text, other).toMatch(/không có nghĩa là dùng chung an toàn/);
      expect(r.text, other).not.toMatch(/có thể dùng|dùng chung được|không sao/);
    }
  });
  it("hai thuốc đều không có mục → không có dữ liệu tương tác, không đoán", () => {
    for (const q of ["amoxicillin uống chung với omeprazol được không", "thuốc huyết áp uống chung với thuốc cảm được không", "thuốc này uống với bia được không"]) {
      const r = drugAsk(q)!;
      expect(r.kind, q).toBe("interact");
      expect(r.drugId, q).toBeUndefined();
      expect(r.text, q).toMatch(/không có dữ liệu tương tác thuốc/);
      expect(r.text, q).not.toMatch(/Nguồn:/);
    }
  });
});

describe("lớp trả lời theo chủ thể (lomiContext) dùng đúng dữ liệu có nguồn", () => {
  const q = (s: string) => normalizeVi(s);
  it("paracetamol: thông tin chung / quá liều / trẻ em / rượu bia đều kèm nguồn; hỏi liều thì không có con số", () => {
    for (const s of ["paracetamol có tác dụng phụ gì?", "uống quá liều paracetamol thì sao", "paracetamol cho trẻ em được không", "paracetamol uống với bia được không"]) {
      const r = contextReply(q(s))!;
      expect(r.text, s).toMatch(/📚 Nguồn: /);
      expect(r.text, s).not.toMatch(DOSE_NUM);
    }
    const dose = contextReply(q("paracetamol uống bao nhiêu viên?"))!;
    expect(dose.anchor.aspect).toBe("dose");
    expect(dose.text).not.toMatch(DOSE_NUM);
    expect(dose.text).toMatch(/dược sĩ/);
  });
  it("rượu bia: nói đúng theo nguồn (không cấm tuyệt đối khi uống bình thường, nhưng uống nhiều thì tránh)", () => {
    const r = contextReply(q("paracetamol uống với bia được không"))!;
    expect(r.text).toMatch(/vẫn có thể ăn uống bình thường, kể cả rượu bia/);
    expect(r.text).toMatch(/không nên dùng/);
    expect(r.text).toMatch(/hỏi dược sĩ/);
  });
  it("quá liều: cấp cứu + không tự gây nôn + cùng một đường dây hỗ trợ như phần tâm lý", () => {
    const r = contextReply(q("uống quá liều paracetamol thì sao"))!;
    expect(r.urgent).toBe(true);
    expect(r.text).toMatch(/115/);
    expect(r.text).toMatch(/Không tự gây nôn/);
    expect(r.text).toMatch(/096 306 1414/);
    expect(r.text).not.toMatch(/1900 1267/);
  });
});
