// 20/10 — runSearch với dữ liệu giống DB thật: tiệm giặt ủi (service) ở Đà Nẵng không bao giờ được gợi ý "đi chơi Đà Lạt".
import { describe, expect, it, vi } from "vitest";

const ROWS = vi.hoisted(() => [
  { id: "laundry", name: "Giặt Ủi Đại Phát", type: "service", area: "Đà Nẵng", latest_offer: "Giảm 10%", offer_count: 1, rating: 4.9, latitude: 16.07, longitude: 108.21, cover_url: null },
  { id: "spa", name: "Spa Đà Lạt", type: "service", area: "Đà Lạt", latest_offer: "Giảm 20%", offer_count: 1, rating: 4.8, latitude: 11.94, longitude: 108.44, cover_url: null },
  { id: "tour-dn", name: "Tour Bà Nà", type: "travel", area: "Đà Nẵng", latest_offer: "Giảm 5%", offer_count: 1, rating: 4.7, latitude: 16.0, longitude: 108.0, cover_url: null },
  { id: "tour-dl", name: "Tour Langbiang", type: "travel", area: "Đà Lạt", latest_offer: "Tặng nước", offer_count: 1, rating: 4.5, latitude: 12.04, longitude: 108.44, cover_url: null },
  { id: "cafe-dl", name: "Cà phê Đồi", type: "food", area: "Đà Lạt", latest_offer: "Giảm 10%", offer_count: 1, rating: 4.4, latitude: 11.95, longitude: 108.45, cover_url: null },
]);
vi.mock("@/integrations/supabase/client", () => {
  const chain = (rows: unknown[]): unknown => {
    const p: unknown = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (res: (v: unknown) => unknown) => res({ data: rows, error: null }) : () => p) });
    return p;
  };
  return { supabase: { from: () => chain(ROWS) } };
});
import { runSearch } from "@/lib/lomiSearch";

describe("runSearch đi chơi", () => {
  it("có nêu Đà Lạt → chỉ tour/quán ở Đà Lạt, không spa/giặt ủi, không chỗ ở tỉnh khác", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const r = await runSearch({ mode: "go", near: false, offer: true, area: "Đà Lạt" });
      seen.add(r.places[0].id);
      expect(r.text).not.toMatch(/459|Đà Nẵng/);
    }
    expect([...seen].sort()).toEqual(["cafe-dl", "tour-dl"]);
  });
  it("đổi chỗ hết chỗ mới → bốc lại từ đầu, không báo 'không tìm được'", async () => {
    const r = await runSearch({ mode: "go", near: false, offer: true, area: "Đà Lạt" }, ["tour-dl", "cafe-dl"]);
    expect(r.places[0].id).toBe("tour-dl");
    expect(r.text).toMatch(/bốc lại từ đầu/);
  });
  it("không nêu khu vực nhưng có vị trí ở Đà Lạt → chỉ chỗ gần, không bốc chỗ cách vài trăm km", async () => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 11.94, longitude: 108.44 } }) },
    });
    for (let i = 0; i < 30; i++) {
      const r = await runSearch({ mode: "go", near: true, offer: true });
      expect(["tour-dl", "cafe-dl"]).toContain(r.places[0].id);
    }
  });
});
