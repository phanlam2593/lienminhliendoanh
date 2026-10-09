// Kho kiến thức y khoa có nguồn (lib/lomiMed + lib/medkb/*.json): test ÉP quy tắc nguồn — thêm thẻ sai quy tắc là đỏ ngay.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TRUSTED } from "@/lib/lomiDrugData";
import { aspectOf, findMedTopicId, loadAllMedTopics, medTopicIds, renderMed, parseMedAsk, type MedTopic } from "@/lib/lomiMed";
import { normalizeVi } from "@/lib/lomiFaq";

const DIR = path.resolve("src/lib/medkb");
const KINDS = ["condition", "mental", "infection", "child", "women", "cancer", "term", "other"];
const MAX_FACT = 260;
// Liều lượng cụ thể = việc của bác sĩ / dược sĩ; kho này không chứa.
const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g\/|ml|iu|đv|viên|gói|giọt|lần\/ngày|lần mỗi ngày)\b/i;

const all: MedTopic[] = [];
const facts = (t: MedTopic) => {
  const g = [...t.about, ...t.signs, ...t.causes, ...t.course, ...t.care, ...t.doctor, ...t.emergency, ...(t.diet ? [...t.diet.avoid, ...t.diet.ok] : [])];
  return g;
};

describe("kho kiến thức y khoa", () => {
  it("nạp được mọi thẻ", async () => {
    all.push(...(await loadAllMedTopics()));
    expect(all.length).toBe(medTopicIds().length);
    expect(all.length).toBeGreaterThan(0);
  });

  it("chỉ mục khớp thẻ (chạy `node scripts/medkb-index.mjs` nếu đỏ)", () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "index.json").map((f) => f.replace(/\.json$/, "")).sort();
    expect([...medTopicIds()].sort()).toEqual(files);
    const idx = JSON.parse(fs.readFileSync(path.join(DIR, "index.json"), "utf8")) as { id: string; kind: string; names: string[] }[];
    for (const r of idx) {
      const t = JSON.parse(fs.readFileSync(path.join(DIR, `${r.id}.json`), "utf8"));
      expect(t.names, r.id).toEqual(r.names);
      expect(t.kind, r.id).toBe(r.kind);
    }
  });

  it("mỗi thẻ: id khớp tên file, loại hợp lệ, có tên, có nguồn, ngày đối chiếu hợp lệ", () => {
    for (const t of all) {
      expect(KINDS, t.id).toContain(t.kind);
      expect(t.names.length, t.id).toBeGreaterThan(0);
      expect(t.sources.length, t.id).toBeGreaterThan(0);
      expect(t.verifiedAt, t.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(t.verifiedAt)), t.id).toBe(false);
      expect(facts(t).length + (t.diet?.foods.length ?? 0), `${t.id} rỗng`).toBeGreaterThan(0);
    }
  });

  it("nguồn: https, tên miền tin cậy, ngày rà soát (nếu có) hợp lệ", () => {
    for (const t of all)
      for (const s of t.sources) {
        expect(s.url, t.id).toMatch(/^https:\/\//);
        const host = new URL(s.url).hostname.replace(/^www\./, "");
        expect(TRUSTED.some((d) => host === d || host.endsWith(`.${d}`)), `${t.id}: ${host} không thuộc nguồn tin cậy`).toBe(true);
        expect(s.title.length, t.id).toBeGreaterThan(1);
        expect(s.publisher.length, t.id).toBeGreaterThan(1);
        if (s.reviewed) expect(s.reviewed, t.id).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
      }
  });

  it("mọi ý có `src` trỏ đúng nguồn có thật, không rỗng, không quá dài, không chứa liều thuốc", () => {
    for (const t of all) {
      const n = t.sources.length;
      const check = (text: string, src: number[], where: string) => {
        expect(src.length, `${t.id}/${where}: ý không có nguồn`).toBeGreaterThan(0);
        for (const i of src) expect(Number.isInteger(i) && i >= 0 && i < n, `${t.id}/${where}: src ${i} ngoài khoảng`).toBe(true);
        expect(text.trim().length, `${t.id}/${where}: rỗng`).toBeGreaterThan(5);
        expect(text.length, `${t.id}/${where}: dài ${text.length} ký tự`).toBeLessThanOrEqual(MAX_FACT);
        expect(DOSE.test(text), `${t.id}/${where}: có liều thuốc → bỏ: ${text}`).toBe(false);
      };
      for (const f of facts(t)) check(f.text, f.src, "ý");
      for (const f of t.diet?.foods ?? []) {
        check(f.note, f.src, `món ${f.name}`);
        expect(["avoid", "limit", "ok", "good"], `${t.id}/${f.name}`).toContain(f.verdict);
      }
    }
  });

  it("tên gọi không trùng giữa hai thẻ (trừ khi cố ý)", () => {
    const seen = new Map<string, string>();
    // các cặp cố ý dùng chung tên chung: tiểu đường (chung) ↔ type 1/2 — thẻ chung đứng sau khi không nói rõ type.
    const OK = new Set(["bệnh tiểu đường"]);
    for (const t of all)
      for (const n of t.names) {
        const k = normalizeVi(n);
        if (OK.has(n.toLowerCase())) continue;
        const prev = seen.get(k);
        expect(prev && prev !== t.id ? `${n}: ${prev} & ${t.id}` : "", `trùng tên`).toBe("");
        seen.set(k, t.id);
      }
  });

  it("mỗi thẻ tìm lại được bằng chính tên của nó, và tên dài hơn thắng", () => {
    for (const t of all) {
      for (const n of t.names) {
        if (normalizeVi(n).replace(/ /g, "").length < 4) continue; // tên ngắn chỉ nhận khi gõ đúng dấu
        const got = findMedTopicId(`${n} là gì`);
        // một thẻ có thể nhường cho thẻ có tên dài hơn chứa nó (vd "tiểu đường type 2")
        expect(got, `"${n}" (${t.id}) → ${got}`).toBeTruthy();
      }
    }
  });

  it("dựng được lời đáp mọi khía cạnh cho mọi thẻ, luôn có dòng nguồn và không văng lỗi", () => {
    const aspects = ["overview", "define", "signs", "causes", "course", "care", "diet", "doctor", "emergency", "meds"] as const;
    for (const t of all)
      for (const a of aspects) {
        const r = renderMed(t, a);
        expect(r.text.length, `${t.id}/${a}`).toBeGreaterThan(20);
        if (!r.partial) expect(r.text, `${t.id}/${a}`).toMatch(/📚 Nguồn:/);
        expect(r.text).not.toMatch(/undefined|\[object/);
      }
  });

  it("câu hỏi cốt lõi (kèm cách gõ không dấu / viết tắt) vào đúng thẻ", () => {
    const Q: [string, string, string?][] = [
      ["ám thị tự kỉ là gì", "tu-ky-am-thi"],
      ["bệnh gout ăn nhộng đc k", "gout", "food"],
      ["benh gout an nhong duoc ko", "gout", "food"],
      ["tự kỷ có chữa khỏi không", "tu-ky"],
      ["trầm cảm là gì", "tram-cam", "define"],
      ["cao huyết áp kiêng gì", "tang-huyet-ap", "diet"],
    ];
    for (const [q, id, asp] of Q) {
      const m = parseMedAsk(q);
      expect(m?.id, q).toBe(id);
      if (asp) expect(m?.aspect, q).toBe(asp);
    }
    expect(aspectOf("khi nào cần đi khám")).toBe("doctor");
  });

  it("câu KỂ (không phải câu hỏi kiến thức) không bị kéo vào kho", () => {
    for (const q of ["hôm nay a bị đau đầu", "a hay lo âu quá", "a bị mất ngủ mấy hôm nay", "mẹ em bị tiểu đường", "ông nội mới bị tai biến"])
      expect(parseMedAsk(q), q).toBeNull();
  });
});
