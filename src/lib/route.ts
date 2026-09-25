// ─────────────────────────────────────────────────────────────────────────────
// QUÃNG ĐƯỜNG THỰC TẾ (25/09) — lấy tuyến đường đi thật từ bộ định tuyến OSRM (dữ liệu
// OpenStreetMap, miễn phí, không cần khoá). Kết quả (km theo đường đi + các điểm vẽ tuyến) được
// gửi lên quote_ride/create_ride qua `_road_km`; server tự kiểm tra con số có hợp lý không (không
// thấp hơn đường chim bay…), không hợp lý hoặc lấy tuyến lỗi → quay về ước lượng chim bay × 1.3.
// Có bộ nhớ đệm theo toạ độ (làm tròn ~10 m) để kéo ghim qua lại không gọi lặp.
// ─────────────────────────────────────────────────────────────────────────────

export type RoadRoute = { km: number; coords: [number, number][] };

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const cache = new Map<string, RoadRoute | null>();

export async function fetchRoadRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RoadRoute | null> {
  const key = [a.lat, a.lng, b.lat, b.lng].map((v) => v.toFixed(4)).join(",");
  if (cache.has(key)) return cache.get(key) ?? null;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 6000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    const r = j?.routes?.[0];
    const out: RoadRoute | null =
      j?.code === "Ok" && r && typeof r.distance === "number"
        ? {
            km: Math.round(r.distance / 10) / 100,
            coords: (r.geometry?.coordinates ?? []).map((c: [number, number]) => [c[1], c[0]] as [number, number]),
          }
        : null;
    cache.set(key, out);
    return out;
  } catch {
    // Bị huỷ (người dùng đổi điểm) → không lưu đệm; lỗi mạng → trả null, dùng ước lượng.
    return null;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
