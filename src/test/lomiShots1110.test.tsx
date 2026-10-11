// 11/10 — Lỗi Kir chụp màn hình (acc quản trị): đang nói tăng huyết áp, hỏi "Uống aspirin để làm gì" → Lomi đọc lại bài tăng huyết áp;
// hỏi tiếp "Tăng huyết áp là gì?" → Lomi đọc lại lá bài Tarot rút trước đó. Gốc rễ:
//   • chữ "là" bỏ dấu trùng chữ "lá" (lá bài) → mọi câu "X là gì" sau một trải bài bị coi là hỏi nghĩa lá bài;
//   • "… để làm gì" (hỏi MỤC ĐÍCH của một thứ) bị coi là "nên làm gì" với bệnh đang nói;
//   • tên thuốc đứng sau "uống" mà câu không có chữ "thuốc" thì lớp hỏi-thuốc không nhận ra.
// Sửa kèm (cùng gốc "một tiếng bỏ dấu / một tiếng trong từ ghép"): "tình cảm là gì", "cảm xúc là gì" từng bị đáp bằng bài Cảm lạnh;
// "sếp em là nữ" từng bị hiểu là bị sếp la mắng.
import { describe, expect, it } from "vitest";
import { chat, last } from "./lomiChatHarness";
import { drugAsk } from "@/lib/lomiDrug";
import { findMedTopicId } from "@/lib/lomiMed";
import { mentionsCard } from "@/lib/lomiConvo";
import { senseCanon } from "@/lib/lomiSense";
import { tarotCard } from "@/lib/tarot";

const T = 30000;
const CARD = /vừa rút nói thế này/;

describe("đúng chuỗi trong ảnh: rút bài → tăng huyết áp → aspirin → tăng huyết áp là gì", () => {
  it("mỗi câu được trả lời đúng chuyện của nó", async () => {
    const r = await chat(["bói cho anh 1 lá", "tăng huyết áp nên làm gì", "Uống aspirin để làm gì", "Tăng huyết áp là gì?"], { seed: 7 });
    expect(r[1].med?.id).toBe("tang-huyet-ap");
    // aspirin: trả lời về aspirin (có nguồn), không đọc lại bài tăng huyết áp
    expect(r[2].content).toMatch(/\*\*Aspirin\*\* là thuốc/);
    expect(r[2].content).toMatch(/📚 Nguồn: /);
    expect(r[2].content).not.toMatch(/Với \*\*Tăng huyết áp\*\*/);
    expect(r[2].drug?.id).toBe("aspirin");
    // "Tăng huyết áp là gì?": kiến thức, không phải lá bài
    expect(r[3].content).toMatch(/📖 \*\*Tăng huyết áp\*\* là gì/);
    expect(r[3].content).not.toMatch(CARD);
    expect(r[3].tarotRef).toBeUndefined();
  }, T);
  it("ngay sau trải bài hỏi 'X là gì' về một thứ khác → không đọc lại lá bài", async () => {
    for (const q of ["Tăng huyết áp là gì?", "gout là gì", "trầm cảm là gì", "điểm thưởng là gì"]) {
      const r = await chat(["rút cho anh 1 lá bài", q], { seed: 7 });
      expect(r[1].content, q).not.toMatch(CARD);
    }
  }, T);
});

describe("hỏi nghĩa lá bài thì vẫn là hỏi bài", () => {
  it("'lá này nghĩa là gì', 'là sao?', 'giải thích thêm đi', gõ không dấu, gọi tên lá", async () => {
    const r = await chat(["rút cho anh 1 lá bài", "lá này nghĩa là gì", "là sao?", "giải thích thêm đi"], { seed: 7 });
    for (const m of r.slice(1)) expect(m.content).toMatch(CARD);
    expect((await chat(["rút cho anh 1 lá bài", "la nay nghia la gi"], { seed: 7 }))[1].content).toMatch(CARD);
    const first = await chat(["rút cho anh 1 lá bài"], { seed: 7 });
    const name = tarotCard((first[0].tarot!.cards[0] as { id: number }).id).name.vi;
    expect((await chat(["rút cho anh 1 lá bài", `${name} là gì`], { seed: 7 }))[1].content).toMatch(CARD);
  }, T);
  it("đã nói sang chuyện khác vài câu: nhắc rõ 'lá' thì vẫn đúng trải bài đó; 'X là gì' thì không", async () => {
    const r = await chat(["rút cho anh 1 lá bài", "hôm nay a hơi mệt", "lá bài đó nói gì", "nếu lá ngược thì sao"], { seed: 7 });
    expect(r[2].content).toMatch(CARD);
    expect(r[3].content).toMatch(/đang ra (ngược|xuôi)/);
    const r2 = await chat(["rút cho anh 1 lá bài", "hôm nay a hơi mệt", "stress là gì"], { seed: 7 });
    expect(r2[2].content).not.toMatch(CARD);
  }, T);
  it("'lá' là lá bài, 'là' thì không (kể cả khi bỏ dấu trùng nhau)", () => {
    for (const s of ["lá này nghĩa là gì", "Nếu lá ngược thì sao?", "mấy lá đó nói gì", "la nay nghia la gi", "la thu 2 noi gi", "bài nói gì", "tarot nói vậy hả"]) expect(mentionsCard(s), s).toBe(true);
    for (const s of ["Tăng huyết áp là gì?", "là sao", "vậy là có hay không", "gout la gi", "nghĩa là sao"]) expect(mentionsCard(s), s).toBe(false);
  });
});

describe("hỏi một thuốc dùng để làm gì (không có chữ 'thuốc')", () => {
  it("thuốc có mục → trả lời từ dữ liệu có nguồn; câu nối vẫn về thuốc đó", async () => {
    const r = await chat(["tăng huyết áp là gì", "Uống aspirin để làm gì", "trẻ em uống được không", "uống với thuốc huyết áp được không"]);
    expect(r[1].content).toMatch(/\*\*Aspirin\*\* là thuốc/);
    expect(r[2].content).toMatch(/Không cho trẻ từ 15 tuổi trở xuống dùng aspirin/);
    expect(r[3].content).toMatch(/\*\*aspirin\*\* dùng chung với \*\*thuốc hạ huyết áp\*\*/);
    for (const m of r.slice(1)) expect(m.content).toMatch(/📚 Nguồn: /);
  }, T);
  it("thuốc chưa có mục → nói thật là chưa có dữ liệu về ĐÚNG thuốc đó, không đọc bài bệnh đang nói", async () => {
    const r = await chat(["tăng huyết áp nên làm gì", "uống amlodipin để làm gì", "nó có tác dụng phụ gì không"]);
    expect(r[1].content).toMatch(/chưa có dữ liệu đã kiểm chứng về \*\*amlodipin\*\*/);
    expect(r[1].content).not.toMatch(/Tăng huyết áp/);
    expect(r[2].content).toMatch(/chưa có dữ liệu đã kiểm chứng về \*\*amlodipin\*\*/);
  }, T);
  it("nhận theo DÁNG câu: tên ngoại lai sau động từ dùng thuốc; thức uống thường ngày / đồ không phải thuốc thì không", () => {
    for (const [q, name] of [["uống omeprazol để làm gì", "omeprazol"], ["tiêm insulin để làm gì", "insulin"], ["a uống amlodipin để làm gì vậy e", "amlodipin"], ["berberin uống để làm gì", "berberin"], ["omeprazol trị gì", "omeprazol"], ["uống collagen có tác dụng gì", "collagen"]] as const) {
      const d = drugAsk(q)!;
      expect(d?.kind, q).toBe("what");
      expect(d.name, q).toBe(name);
      expect(d.text, q).toMatch(/chưa có dữ liệu đã kiểm chứng/);
    }
    for (const q of ["uống nước để làm gì", "uống bia để làm gì", "uống trà gừng để làm gì", "ăn cơm để làm gì", "wifi dùng để làm gì", "zalo để làm gì"]) expect(drugAsk(q), q).toBeNull();
  });
  it("'… để làm gì' không còn bị coi là hỏi 'nên làm gì' với bệnh đang nói", async () => {
    const r = await chat(["tăng huyết áp nên làm gì", "uống nước để làm gì"]);
    expect(r[1].content).not.toMatch(/Với \*\*Tăng huyết áp\*\*/);
  }, T);
});

describe("tên bệnh một tiếng không khớp bên trong từ ghép khác nghĩa", () => {
  it("'tình cảm', 'cảm xúc', 'cảm ơn', 'lao động', 'hàng lậu'… không phải Cảm lạnh / Lao / Lậu", async () => {
    for (const q of ["tình cảm là gì", "cảm xúc là gì", "cảm giác thèm ăn là sao", "thông cảm là gì", "cảm ơn là gì", "linh cảm là gì", "lao động là gì", "hàng lậu là gì", "mẹ ghẻ là gì", "ấu trĩ là gì"]) expect(findMedTopicId(q), q).toBeNull();
    for (const q of ["tình cảm là gì", "cảm xúc là gì"]) expect((await last([q])).content, q).not.toMatch(/Cảm lạnh/);
  }, T);
  it("đứng riêng thì vẫn là tên bệnh; tên dài hơn vẫn thắng", () => {
    expect(findMedTopicId("a bị cảm phải làm sao")).toBe("cam-lanh");
    expect(findMedTopicId("cảm là gì")).toBe("cam-lanh");
    expect(findMedTopicId("trầm cảm là gì")).toBe("tram-cam");
    expect(findMedTopicId("cảm nắng là gì")).toBe("say-nang");
    expect(findMedTopicId("bệnh lao có lây không")).toBe("lao-phoi");
    expect(findMedTopicId("bị lậu thì làm sao")).toBe("benh-lau");
    expect(findMedTopicId("bị nghẹn phải làm sao")).toBe("hoc-di-vat");
    expect(findMedTopicId("trĩ là gì")).toBe("tri");
  });
  it("vừa xem bài tình cảm mà hỏi 'tình cảm là sao' → vẫn là hỏi bài, không phải Cảm lạnh", async () => {
    const r = await chat(["bói tình yêu cho anh", "tình cảm là sao"], { seed: 7 });
    expect(r[1].content).not.toMatch(/Cảm lạnh/);
    expect(r[1].content).toMatch(CARD);
  }, T);
});

describe("'là' không phải 'la' (la mắng)", () => {
  it("'sếp em là nữ' không bị hiểu là bị sếp mắng; 'sếp la a hoài' thì có", () => {
    for (const q of ["sếp em là nữ", "sếp a là người rất khó tính", "trưởng phòng là ai"]) expect(senseCanon(q), q).not.toMatch(/bị sếp mắng/);
    expect(senseCanon("sếp la a hoài")).toMatch(/bị sếp mắng/);
    expect(senseCanon("sếp mắng a hoài")).toMatch(/bị sếp mắng/);
  });
});
