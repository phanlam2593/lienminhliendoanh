import { describe, expect, it } from "vitest";
import { callEndStatus, decideOnOffer, displayCallStatus, isStaleRinging, stillSameCall } from "@/lib/callLogic";

// Mô phỏng 2 máy A (id nhỏ) và B (id lớn) nhận offer của nhau — chỉ phần quyết định.
const A = "11111111-aaaa";
const B = "99999999-bbbb";

describe("callEndStatus — trạng thái ghi nhật ký khi kết thúc", () => {
  it("đã kết nối thì luôn là answered, bất kể lý do", () => {
    expect(callEndStatus("connected")).toBe("answered");
    expect(callEndStatus("connected", "failed")).toBe("answered");
    expect(callEndStatus("connected", "declined")).toBe("answered");
  });
  it("chưa kết nối: từ chối / bận / còn lại là nhỡ", () => {
    expect(callEndStatus("calling", "declined")).toBe("declined");
    expect(callEndStatus("calling", "busy")).toBe("busy");
    expect(callEndStatus("calling", "timeout")).toBe("missed");
    expect(callEndStatus("calling", "hangup")).toBe("missed");
    expect(callEndStatus("incoming", "no-mic")).toBe("missed");
    expect(callEndStatus("calling")).toBe("missed");
  });
});

describe("decideOnOffer — nhận offer", () => {
  it("đang rảnh → đổ chuông", () => {
    expect(decideOnOffer({ myId: A, fromId: B, incomingCallId: "c1", phase: "idle" })).toBe("ring");
  });
  it("người mình đã chặn gọi tới → bỏ qua im lặng, kể cả khi đang rảnh", () => {
    expect(decideOnOffer({ myId: A, fromId: B, incomingCallId: "c1", phase: "idle", blocked: true })).toBe("blocked");
  });
  it("đang trong cuộc gọi với người KHÁC → báo bận", () => {
    for (const phase of ["calling", "incoming", "connected"] as const) {
      expect(
        decideOnOffer({ myId: A, fromId: B, incomingCallId: "c2", phase, curCallId: "c1", curPeerId: "someone-else" }),
      ).toBe("busy");
    }
  });
  it("đang nói chuyện với chính người đó mà họ gửi offer cuộc MỚI → bận (không phá cuộc đang chạy)", () => {
    expect(
      decideOnOffer({ myId: B, fromId: A, incomingCallId: "c2", phase: "connected", curCallId: "c1", curPeerId: A }),
    ).toBe("busy");
  });
  it("offer lặp của đúng cuộc đang đổ chuông / đang nói → bỏ qua, KHÔNG báo bận", () => {
    expect(
      decideOnOffer({ myId: B, fromId: A, incomingCallId: "c1", phase: "incoming", curCallId: "c1", curPeerId: A }),
    ).toBe("duplicate");
    expect(
      decideOnOffer({ myId: B, fromId: A, incomingCallId: "c1", phase: "connected", curCallId: "c1", curPeerId: A }),
    ).toBe("duplicate");
  });
  it("bên kia bấm Nghe qua đường trễ bằng ĐÚNG callId của mình → mình nhường, bất kể id lớn hay nhỏ", () => {
    expect(
      decideOnOffer({ myId: A, fromId: B, incomingCallId: "c1", phase: "calling", curCallId: "c1", curPeerId: B }),
    ).toBe("yield");
    expect(
      decideOnOffer({ myId: B, fromId: A, incomingCallId: "c1", phase: "calling", curCallId: "c1", curPeerId: A }),
    ).toBe("yield");
  });

  it("GLARE: hai người gọi nhau cùng lúc → đúng 1 bên giữ, 1 bên nhường (không còn cả hai cùng nhường)", () => {
    // A đang gọi B (callId a1), B đang gọi A (callId b1); mỗi bên nhận offer của bên kia.
    const atA = decideOnOffer({ myId: A, fromId: B, incomingCallId: "b1", phase: "calling", curCallId: "a1", curPeerId: B });
    const atB = decideOnOffer({ myId: B, fromId: A, incomingCallId: "a1", phase: "calling", curCallId: "b1", curPeerId: A });
    expect(atA).toBe("hold");
    expect(atB).toBe("yield");
    expect([atA, atB].filter((d) => d === "yield")).toHaveLength(1);
  });

  it("GLARE: bên giữ gửi lại offer; bên đã nhường (đang trả lời a1) nhận bản lặp → bỏ qua, không nối 2 lần", () => {
    // B đã nhường và đang trả lời a1: trạng thái calling + callId a1 + calleeOfCallId a1.
    expect(
      decideOnOffer({
        myId: B,
        fromId: A,
        incomingCallId: "a1",
        phase: "calling",
        curCallId: "a1",
        curPeerId: A,
        calleeOfCallId: "a1",
      }),
    ).toBe("duplicate");
  });

  it("GLARE lệch pha: B không nhận được offer đầu của A, B gọi lại → A giữ + gửi lại, B nhận bản gửi lại thì nhường", () => {
    // Tại A: nhận offer b1 trong lúc đang gọi B → hold (gửi lại a1).
    expect(
      decideOnOffer({ myId: A, fromId: B, incomingCallId: "b1", phase: "calling", curCallId: "a1", curPeerId: B }),
    ).toBe("hold");
    // Tại B: đang gọi A (b1), nhận a1 (bản gửi lại) → nhường.
    expect(
      decideOnOffer({ myId: B, fromId: A, incomingCallId: "a1", phase: "calling", curCallId: "b1", curPeerId: A }),
    ).toBe("yield");
  });
});

describe("stillSameCall — kiểm lại sau mỗi bước chờ", () => {
  it("đã rảnh (người dùng cúp máy giữa chừng) → dừng", () => {
    expect(stillSameCall({ status: "idle" }, "c1")).toBe(false);
  });
  it("đã chuyển sang cuộc khác → dừng", () => {
    expect(stillSameCall({ status: "calling", callId: "c2" }, "c1")).toBe(false);
  });
  it("vẫn cuộc đó, đúng giai đoạn → tiếp", () => {
    expect(stillSameCall({ status: "calling", callId: "c1" }, "c1", ["calling"])).toBe(true);
    expect(stillSameCall({ status: "connected", callId: "c1" }, "c1", ["calling"])).toBe(false);
    expect(stillSameCall({ status: "incoming", callId: "c1" }, "c1")).toBe(true);
  });
});

describe("dòng ringing quá hạn", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  it("đang đổ chuông trong hạn → vẫn là ringing", () => {
    expect(isStaleRinging("ringing", "2026-11-14T09:59:50Z", now, 30_000)).toBe(false);
    expect(displayCallStatus("ringing", "2026-11-14T09:59:50Z", now)).toBe("ringing");
  });
  it("ringing đã quá hạn (người gọi đóng app) → hiện như cuộc nhỡ, không phải máy bận", () => {
    expect(isStaleRinging("ringing", "2026-11-14T09:50:00Z", now, 30_000)).toBe(true);
    expect(displayCallStatus("ringing", "2026-11-14T09:50:00Z", now)).toBe("missed");
  });
  it("các trạng thái khác giữ nguyên; lạ → nhỡ", () => {
    expect(displayCallStatus("answered", "2026-11-14T09:50:00Z", now)).toBe("answered");
    expect(displayCallStatus("declined", "2026-11-14T09:50:00Z", now)).toBe("declined");
    expect(displayCallStatus("busy", "2026-11-14T09:50:00Z", now)).toBe("busy");
    expect(displayCallStatus("???", "2026-11-14T09:50:00Z", now)).toBe("missed");
    expect(isStaleRinging("missed", "2026-11-14T09:50:00Z", now, 30_000)).toBe(false);
  });
});
