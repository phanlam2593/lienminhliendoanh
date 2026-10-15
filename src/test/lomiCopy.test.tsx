// Chạm vào một tin nhắn trong khung chat Lomi → hiện nút "Sao chép" (15/10, theo ý Kir).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { renderChat } from "./lomiChatHarness";

afterEach(() => cleanup());

describe("sao chép tin nhắn", () => {
  it("chạm vào tin → hiện nút Sao chép; bấm → chép chữ thuần (bỏ **đậm**)", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: write }, configurable: true });
    renderChat([
      { role: "user", content: "sỏi thận ăn gà được không" },
      { role: "assistant", content: "Với **Sỏi thận**: **đạm động vật** nên **hạn chế**.", local: true } as never,
    ]);
    expect(screen.queryByText("Sao chép")).toBeNull();
    fireEvent.click(screen.getByText("đạm động vật").closest("div.rounded-2xl")!);
    fireEvent.click(await screen.findByText("Sao chép"));
    await vi.waitFor(() => expect(write).toHaveBeenCalledWith("Với Sỏi thận: đạm động vật nên hạn chế."));
    expect(screen.queryByText("Sao chép")).toBeNull();
  });
  it("tin của người dùng cũng chép được; chạm lần nữa thì ẩn nút", async () => {
    renderChat([{ role: "user", content: "gout kiêng gì" }]);
    const bubble = screen.getByText("gout kiêng gì");
    fireEvent.click(bubble);
    expect(await screen.findByText("Sao chép")).toBeTruthy();
    fireEvent.click(bubble);
    expect(screen.queryByText("Sao chép")).toBeNull();
  });
});
