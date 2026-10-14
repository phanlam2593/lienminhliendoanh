// Chốt cuối "hiểu đúng câu hỏi chưa" (lib/lomiReplyGate).
import { describe, expect, it } from "vitest";
import { replyMismatch } from "@/lib/lomiReplyGate";
import { findMedTopicId } from "@/lib/lomiMed";
import { findDrug } from "@/lib/lomiDrugData";

const HTN = findMedTopicId("tăng huyết áp")!;
const GOUT = findMedTopicId("bệnh gout")!;
const ASP = findDrug("aspirin")!.id;
const PARA = findDrug("paracetamol")!.id;

describe("câu đáp lạc chủ đề bị chặn", () => {
  it("có đủ dữ liệu để thử", () => expect([HTN, GOUT, ASP, PARA].every(Boolean)).toBe(true));
  it("hỏi thuốc mà đáp bài bệnh khác", () => {
    const g = replyMismatch("Uống aspirin để làm gì", { med: { id: HTN } });
    expect(g?.text).toMatch(/chưa chắc hiểu đúng.*aspirin/i);
  });
  it("hỏi bệnh mà rút bài Tarot", () => expect(replyMismatch("Tăng huyết áp là gì?", { tarot: {} })?.asked).toBe("Tăng huyết áp"));
  it("hỏi bệnh này mà đáp bệnh khác", () => expect(replyMismatch("bệnh gout kiêng gì", { med: { id: HTN } })).not.toBeNull());
  it("hỏi thuốc này mà đáp thuốc khác", () => expect(replyMismatch("paracetamol uống mấy viên", { drug: { id: ASP } })).not.toBeNull());
});

describe("câu đáp đúng chủ đề / theo ngữ cảnh thì để yên", () => {
  it("đúng bệnh, đúng thuốc", () => {
    expect(replyMismatch("Tăng huyết áp là gì?", { med: { id: HTN } })).toBeNull();
    expect(replyMismatch("Uống aspirin để làm gì", { drug: { id: ASP } })).toBeNull();
  });
  it("câu hỏi nối giữ chủ đề / thuốc của lượt trước", () => {
    expect(replyMismatch("người tăng huyết áp uống được không", { drug: { id: ASP } }, { drug: { id: ASP } })).toBeNull();
    expect(replyMismatch("aspirin thì sao", { med: { id: GOUT } }, { med: { id: GOUT } })).toBeNull();
  });
  it("câu hỏi nhắc cả hai", () => expect(replyMismatch("bị gout uống aspirin được không", { med: { id: GOUT } })).toBeNull());
  it("xin bói rõ ràng thì rút bài là đúng", () => expect(replyMismatch("bói tarot xem bệnh gout của mẹ", { tarot: {} })).toBeNull());
  it("Lomi vừa hỏi 'muốn hỏi bài điều gì' thì câu trả lời là câu hỏi cho bài", () => expect(replyMismatch("sức khoẻ, bệnh gout của mẹ", { tarot: {} }, { tarotAwait: true })).toBeNull());
  it("câu không nhắc bệnh / thuốc nào thì không xét", () => expect(replyMismatch("hôm nay buồn quá", { tarot: {} })).toBeNull());
});
