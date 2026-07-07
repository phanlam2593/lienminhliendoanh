import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";

type NearbyItem = BusinessCardData & { distanceKm: number };

const RADIUS_OPTIONS = [1, 5, 10] as const;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Nearby() {
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [radius, setRadius] = useState<(typeof RADIUS_OPTIONS)[number]>(5);
  const [loading, setLoading] = useState(false);

  const start = () => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("granted");
        setLoading(true);
        const { latitude: myLat, longitude: myLng } = pos.coords;
        const { data: biz } = await supabase
          .from("businesses")
          .select("*")
          .eq("status", "approved")
          .not("latitude", "is", null)
          .not("longitude", "is", null);
        const rows = (biz as Business[]) ?? [];
        const ids = rows.map((b) => b.id);
        const { data: stats } = ids.length
          ? await supabase.from("business_card_stats").select("*").in("business_id", ids)
          : { data: [] as any[] };
        const sMap = new Map((stats ?? []).map((s: any) => [s.business_id, s]));
        const withDistance: NearbyItem[] = rows.map((b) => {
          const s: any = sMap.get(b.id);
          return {
            ...b,
            rating: Number(s?.rating ?? 0),
            reviewCount: s?.review_count ?? 0,
            offerCount: s?.offer_count ?? 0,
            latestOffer: s?.latest_offer ?? null,
            latestOfferClaims: s?.latest_offer_claims ?? 0,
            distanceKm: haversineKm(myLat, myLng, b.latitude!, b.longitude!),
          };
        });
        withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
        setItems(withDistance);
        setLoading(false);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const filtered = items.filter((i) => i.distanceKm <= radius);

  if (status === "idle" || status === "requesting" || status === "denied" || status === "unsupported") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-extrabold mb-4">Doanh nghiệp quanh bạn</h1>
        <div className="bg-card rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          {status === "unsupported" ? (
            <p className="text-sm text-muted-foreground">Trình duyệt của bạn không hỗ trợ định vị.</p>
          ) : status === "denied" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Bạn đã từ chối quyền định vị. Vào cài đặt trình duyệt để bật lại rồi thử lại.
              </p>
              <button
                onClick={start}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              >
                Thử lại
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Bật định vị để xem doanh nghiệp gần bạn nhất, kèm ưu đãi đang chạy.
              </p>
              <button
                onClick={start}
                disabled={status === "requesting"}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Navigation className="w-4 h-4" />
                {status === "requesting" ? "Đang xin quyền…" : "Bật định vị"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Doanh nghiệp quanh bạn</h1>
      <div className="flex gap-2">
        {RADIUS_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              radius === r ? "bg-primary text-primary-foreground border-primary" : "bg-card"
            }`}
          >
            ≤ {r}km
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-center py-12 text-muted-foreground">Đang tìm doanh nghiệp gần bạn…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">
          Chưa có doanh nghiệp nào trong bán kính {radius}km. Thử tăng bán kính lên xem sao.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="space-y-1">
              <div className="flex items-center gap-1 px-1 text-xs font-semibold text-primary">
                <MapPin className="w-3 h-3" /> {b.distanceKm.toFixed(1)} km
              </div>
              <BusinessCard b={b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
