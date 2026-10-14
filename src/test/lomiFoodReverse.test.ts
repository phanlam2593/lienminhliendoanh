// Hỏi NGƯỢC theo món (14/10): "có bệnh gì kiêng ăn cá không", "dưa leo thì bệnh gì không được ăn" — lib/lomiMed.
import { beforeAll, describe, expect, it } from "vitest";
import { foodReverseAsk, loadAllMedTopics, renderFoodAcross, type MedTopic } from "@/lib/lomiMed";
import { beginViTurn } from "@/lib/viMatch";

let all: MedTopic[] = [];
beforeAll(async () => {
  all = await loadAllMedTopics();
});
const ask = (q: string) => {
  beginViTurn([q], q.normalize("NFD") !== q.normalize("NFD").replace(/[̀-ͯ]/g, ""));
  return foodReverseAsk(q);
};
const answer = (q: string) => {
  const r = ask(q);
  expect(r, q).not.toBeNull();
  return renderFoodAcross(all, r!.phrase, r!.shown);
};

describe("nhận ra câu hỏi ngược", () => {
  it("các cách hỏi thường gặp", () => {
    for (const [q, food] of [
      ["Có bệnh gì kiêng ăn cá k?", "cá"],
      ["dưa leo thì bệnh gì k đc ăn", "dưa leo"],
      ["ai không nên ăn măng", "măng"],
      ["cà chua kiêng với bệnh gì", "cà chua"],
      ["bị bệnh gì thì không được ăn chuối", "chuối"],
      ["bệnh gì không nên uống cà phê", "cà phê"],
      ["những ai không nên ăn trứng", "trứng"],
      ["ăn tôm hại cho ai", "tôm"],
      ["người bệnh gì cữ ăn thịt bò", "thịt bò"],
      ["co benh gi kieng an ca chua k", "ca chua"],
    ] as const)
      expect(ask(q)?.shown, q).toBe(food);
  });
  it("hỏi theo BỆNH hay câu khác thì không phải hỏi ngược", () => {
    for (const q of ["gout kiêng gì", "bệnh gout ăn cá được không", "bệnh gì nguy hiểm nhất", "hôm nay ăn gì", "ai rảnh đi cà phê không"]) expect(ask(q), q).toBeNull();
  });
});

describe("gom đúng bệnh theo nguồn", () => {
  it("cá: mang thai, gout, dị ứng; có nguồn", () => {
    const r = answer("Có bệnh gì kiêng ăn cá k?");
    expect(r.text).toMatch(/mang thai/i);
    expect(r.text).toMatch(/Gout/);
    expect(r.text).toMatch(/dị ứng/);
    expect(r.text).toMatch(/NHS/);
  });
  it("cà chua: trào ngược, khó tiêu, thận mạn (kali)", () => {
    const r = answer("cà chua kiêng với bệnh gì");
    for (const t of [/Trào ngược/, /Khó tiêu/, /thận mạn/]) expect(r.text).toMatch(t);
  });
  it("dưa leo: không bệnh nào phải kiêng, thận mạn ăn được", () => {
    const r = answer("dưa leo thì bệnh gì k đc ăn");
    expect(r.text).toMatch(/Chưa nguồn nào .* \*\*kiêng\*\* dưa leo/);
    expect(r.text).toMatch(/Bệnh thận mạn/);
  });
  it("món không nguồn nào nêu → nói thật, không bịa", () => {
    const r = answer("ai không nên ăn măng");
    expect(r.partial).toBe(true);
    expect(r.text).toMatch(/chưa nguồn nào/);
  });
  it("gõ dấu khác thì là món khác: 'cà' không phải 'cá', 'măng' không phải 'măng tây'", () => {
    expect(answer("có bệnh gì kiêng ăn cà không").partial).toBe(true);
    expect(answer("ai không nên ăn măng").text).not.toMatch(/măng tây/);
  });
});
