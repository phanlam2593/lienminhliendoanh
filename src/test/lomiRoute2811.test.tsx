// 28/11 (Kir duyệt: "AI hiểu câu trước ở mọi tab"): các mục khác Tâm sự → AI đọc câu trước (lomi-claude mode "route"), rồi
//   trả lời luôn hoặc viết lại câu cho phần trên máy. Máy vẫn giữ câu nguy hiểm; AI lỗi → chạy như cũ.
import { afterEach, describe, expect, it } from "vitest";
import { chat } from "./lomiChatHarness";
import { parseRoute, routeEligible, routeKindOk } from "@/lib/lomiClaude";

type Body = { mode?: string; tab?: string; messages: { role: string; content: string }[] };
let sent: Body[] = [];
const g = globalThis as { __lomiInvoke?: (n: string, o: unknown) => unknown };
const fake = (route: unknown) => {
  sent = [];
  g.__lomiInvoke = (_n, o) => {
    const body = (o as { body: Body }).body;
    sent.push(body);
    if (body.mode === "route") return { data: route ? { route, remaining: 50 } : { fallback: true, error: "AI_ERROR" }, error: null };
    return { data: { fallback: true, error: "AI_LIMIT" }, error: null };
  };
};
afterEach(() => {
  delete g.__lomiInvoke;
});
const T = 60000;
const routes = () => sent.filter((b) => b.mode === "route");

describe("AI hiểu câu trước (mode route)", () => {
  it("AI tự trả lời: gửi câu kèm tên mục, hiện đúng câu AI", async () => {
    fake({ do: "reply", text: "AI_ĐÁP" });
    const r = await chat(["Quán này nổi tiếng dữ chưa, vô ngồi nửa tiếng chưa ai đem nước."], { tab: "food", talkConsent: null });
    expect(r[0].content).toBe("AI_ĐÁP");
    expect(routes().length).toBe(1);
    expect(routes()[0].tab).toBe("food");
    expect(routes()[0].messages.at(-1)?.content).toBe("[Mục đang chọn: Ăn chơi] Quán này nổi tiếng dữ chưa, vô ngồi nửa tiếng chưa ai đem nước.");
  }, T);

  it("AI viết lại câu → máy chạy câu viết lại (khách sạn, không phải homestay); bong bóng vẫn là câu người dùng gõ", async () => {
    fake({ do: "local", q: "tìm khách sạn có bãi đậu xe ở Đà Lạt" });
    const typed = "Không phải homestay nha, tui muốn tìm khách sạn có bãi đậu xe.";
    const r = await chat([typed], { tab: "food", talkConsent: null });
    expect(r[0].content).not.toMatch(/homestay/i);
    expect(r[0].content).toMatch(/khách sạn/i);
    expect(routes().length).toBe(1);
    const hist = JSON.parse(localStorage.getItem("ai-assistant-history:test-user") ?? "[]") as { role: string; content: string }[];
    expect(hist.filter((m) => m.role === "user").map((m) => m.content)).toEqual([typed]);
  }, T);

  it("máy đáp LỆCH loại việc AI nhận ra (tìm chỗ → thẻ bệnh) → dùng câu dự phòng của AI, không gọi AI lần hai", async () => {
    fake({ do: "local", kind: "place", q: "tìm chỗ chill thư giãn ít phải leo dốc, đi lại dễ ở Đà Lạt", text: "DỰ_PHÒNG" });
    const r = await chat(["dalat co cho nao chill chill ma ko can leo doi nhieu ko e"], { tab: "food", talkConsent: null });
    expect(r[0].content).toBe("DỰ_PHÒNG");
    expect(sent.length).toBe(1);
  }, T);

  it("máy đáp ĐÚNG loại → giữ câu đáp trên máy", async () => {
    fake({ do: "local", kind: "place", q: "tìm khách sạn ở Đà Lạt", text: "DỰ_PHÒNG" });
    const r = await chat(["Không phải homestay nha, tui muốn tìm khách sạn có bãi đậu xe."], { tab: "food", talkConsent: null });
    expect(r[0].content).not.toBe("DỰ_PHÒNG");
    expect(r[0].content).toMatch(/khách sạn/i);
  }, T);

  it("câu hỏi app: AI chép đúng câu hỏi trong danh sách → máy trả lời FAQ đó", async () => {
    fake({ do: "local", q: "Quên mật khẩu thì làm sao?" });
    const r = await chat(["quên pass rồi giờ sao e"], { tab: "app", talkConsent: null });
    expect(r[0].content).toMatch(/Quên mật khẩu/);
  }, T);

  it("câu nguy hiểm: máy trả lời an toàn, KHÔNG gửi AI", async () => {
    fake({ do: "reply", text: "AI_ĐÁP" });
    const r = await chat(["a không muốn sống nữa"], { tab: "food", talkConsent: null });
    expect(r[0].content).not.toBe("AI_ĐÁP");
    expect(r[0].content).toMatch(/096|115|không phải một mình/);
    expect(routes().length).toBe(0);
  }, T);

  it("AI lỗi: chạy như cũ trên máy", async () => {
    fake(null);
    const r = await chat(["Tui mún tìm quán cf mở khuya, có chỗ ngồi làm việc càng tốt."], { tab: "food", talkConsent: null });
    expect(routes().length).toBe(1);
    expect(r[0].content).toMatch(/Cà phê|cà phê/);
  }, T);

  it("câu chào / cảm ơn: máy tự đáp, không tốn lượt AI", async () => {
    fake({ do: "reply", text: "AI_ĐÁP" });
    const r = await chat(["cảm ơn em nha"], { tab: "food", talkConsent: null });
    expect(routes().length).toBe(0);
    expect(r[0].content).not.toBe("AI_ĐÁP");
  }, T);

  it("mục Tâm sự: không dùng đường route (đã có AI trò chuyện)", async () => {
    fake({ do: "reply", text: "AI_ĐÁP" });
    await chat(["hôm nay a buồn quá"], { tab: "heart", talkConsent: null });
    expect(routes().length).toBe(0);
  }, T);

  it("đã tắt AI trên máy (khoá test): không gọi", async () => {
    fake({ do: "reply", text: "AI_ĐÁP" });
    const r = await chat(["Tui mún tìm quán cf mở khuya"], { tab: "food", talkConsent: "no" });
    expect(routes().length).toBe(0);
    expect(r[0].content).not.toBe("AI_ĐÁP");
  }, T);
});

describe("routeEligible / parseRoute", () => {
  const base = { tab: "food" as const, typed: "kiếm quán bún bò", risk: null, danger: false };
  it("câu thường ở mục khác Tâm sự → có", () => expect(routeEligible(base)).toBe(true));
  it("Tâm sự / nguy hiểm → không", () => {
    expect(routeEligible({ ...base, tab: "heart" })).toBe(false);
    expect(routeEligible({ ...base, danger: true })).toBe(false);
  });
  it("lượt sau câu hỏi han an toàn → không", () =>
    expect(routeEligible({ ...base, prev: { role: "assistant", content: "Nếu nguy hiểm gọi 115 hoặc 096 306 1414 nha" } })).toBe(false));
  it("đang làm dở luồng có cấu trúc / bấm chip → không", () => {
    expect(routeEligible({ ...base, prev: { role: "assistant", content: "Bạn kinh doanh gì?", bizPick: true } })).toBe(false);
    expect(routeEligible({ ...base, typed: "Thêm ý khác", prev: { role: "assistant", content: "…", quick: ["Thêm ý khác"] } })).toBe(false);
  });
  it("routeKindOk: câu an toàn luôn giữ; đúng loại thì giữ", () => {
    expect(routeKindOk("place", { role: "assistant", content: "🚨 gọi 115 ngay" })).toBe(true);
    expect(routeKindOk("place", { role: "assistant", content: "Về Kỹ thuật thở…", med: { id: "breath" } })).toBe(false);
    expect(routeKindOk("health", { role: "assistant", content: "…", med: { id: "gout" } })).toBe(true);
    expect(routeKindOk("app", { role: "assistant", content: "…", faqId: "forgot" })).toBe(true);
    expect(routeKindOk(undefined, { role: "assistant", content: "…" })).toBe(true);
  });
  it("parseRoute chỉ nhận đúng dạng", () => {
    expect(parseRoute({ do: "local", q: "x", kind: "place", text: " dp " })).toEqual({ do: "local", q: "x", kind: "place", text: "dp" });
    expect(parseRoute({ do: "local", q: "x", kind: "lạ" })).toEqual({ do: "local", q: "x" });
    expect(parseRoute({ do: "reply", text: " hi " })).toEqual({ do: "reply", text: "hi" });
    expect(parseRoute({ do: "local", q: "tìm quán" })).toEqual({ do: "local", q: "tìm quán" });
    expect(parseRoute({ do: "local", q: "" })).toBeNull();
    expect(parseRoute({ do: "x" })).toBeNull();
    expect(parseRoute(null)).toBeNull();
  });
});
