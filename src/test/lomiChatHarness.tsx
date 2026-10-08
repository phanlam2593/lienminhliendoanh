// Bộ chạy HỘI THOẠI THẬT cho test (08/10): dựng đúng khung chat <AiChat/>, gõ từng tin như người dùng,
// rồi đọc lại lịch sử (kèm cờ ngữ cảnh trên từng tin Lomi). Nhờ vậy test chuỗi nhiều lượt chạy qua
// CHÍNH AiAssistant.send() — không phải bản mô phỏng thứ tự xử lý — nên sửa routing ở đâu test thấy ở đó.
// Chỉ giả phần ngoài máy: đăng nhập, Supabase (3 quán mẫu), âm thanh, popup + hình lá bài.
import { vi } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const UID = "test-user";

// Vài quán mẫu (bộ lọc của Supabase không chạy trong test — phần lọc theo điều kiện người dùng nói là code của Lomi).
const PLACES = vi.hoisted(() => [
  { id: "p1", name: "Cà phê Sân Thượng", type: "food", area: "Đà Lạt", latest_offer: "Giảm 10% buổi sáng", offer_count: 1, rating: 4.6, latitude: null, longitude: null, cover_url: null, description: "Không gian yên tĩnh, hợp ngồi làm việc", latest_review_comment: null },
  { id: "p2", name: "Tiệm Pizza Lò Củi", type: "food", area: "Đà Lạt", latest_offer: null, offer_count: 0, rating: 4.4, latitude: null, longitude: null, cover_url: null, description: "Pizza nướng lò củi, đông vui", latest_review_comment: "Pizza ngon" },
  { id: "p3", name: "Phở Hai Nhỏ", type: "food", area: "Đà Lạt", latest_offer: "Tặng trà đá", offer_count: 2, rating: 4.2, latitude: null, longitude: null, cover_url: null, description: "Phở bò, cà phê sáng", latest_review_comment: null },
]);
vi.mock("@/integrations/supabase/client", () => {
  const chain = (rows: unknown[]): unknown => {
    const p: unknown = new Proxy(function () {}, {
      get: (_t, k) => (k === "then" ? (res: (v: unknown) => unknown) => res({ data: rows, error: null }) : () => p),
    });
    return p;
  };
  return {
    supabase: {
      rpc: () => Promise.resolve({ data: null, error: null }),
      from: (t: string) => chain(t === "businesses_explore_view" ? PLACES : []),
      auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    },
  };
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "test-user" }, profile: { full_name: "" }, isAdmin: false, isApproved: true }) }));
vi.mock("@/lib/lomiSound", () => ({ lomiSound: () => {}, lomiSoundOn: () => false, onLomiSoundChange: () => () => {}, setLomiSound: () => {} }));
vi.mock("@/components/LomiDailyCard", () => ({ LomiDailyCard: () => null, shouldShowDaily: () => false }));
vi.mock("@/components/LomiTarot", () => ({ TarotCards: () => null })); // hình lá bài không phải thứ cần test ở đây

import { AiChat } from "@/pages/AiAssistant";

export type Turn = {
  role: "user" | "assistant";
  content: string;
  raw?: string;
  quick?: string[];
  heart?: string;
  health?: { subject?: string; label?: string; diet?: string; cond?: string };
  rel?: string;
  hsub?: string;
  sx?: string[];
  diet?: string;
  dish?: string;
  dishPick?: boolean;
  dishAsk?: { drink: boolean; shown: string[] };
  search?: { mode: string; kind?: { noun?: string } };
  tarot?: { question?: string; cards: unknown[] };
  tarotAwait?: boolean;
  biz?: unknown;
  faqId?: string;
  unk?: string;
  unkKey?: string;
  issue?: string;
  talk?: number;
  places?: { id: string; name: string }[];
};

const history = (): Turn[] => JSON.parse(localStorage.getItem(`ai-assistant-history:${UID}`) ?? "[]");

/** Gõ lần lượt các tin vào khung chat thật; trả về các tin LOMI đáp (theo thứ tự), kèm cờ ngữ cảnh. */
export async function chat(turns: string[]): Promise<Turn[]> {
  cleanup();
  localStorage.clear();
  Element.prototype.scrollIntoView = () => {};
  const { container } = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AiChat />
    </MemoryRouter>,
  );
  for (let i = 0; i < turns.length; i++) {
    const box = [...container.querySelectorAll("textarea")].pop()!;
    await act(async () => {
      fireEvent.change(box, { target: { value: turns[i] } });
    });
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter", code: "Enter" });
    });
    await waitFor(() => {
      if (history().length < (i + 1) * 2) throw new Error(`Lomi chưa đáp tin thứ ${i + 1}: "${turns[i]}"`);
    });
  }
  const out = history().filter((m) => m.role === "assistant");
  cleanup();
  return out;
}

/** Tin Lomi đáp cho lượt cuối của chuỗi. */
export async function last(turns: string[]): Promise<Turn> {
  const r = await chat(turns);
  return r[r.length - 1];
}
