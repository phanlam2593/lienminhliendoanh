import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Business } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { useLanguage } from "@/lib/i18n";

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
  const { t } = useLanguage();
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
        // Tải theo từng đợt 1000 cho cả 2 nguồn — số DN có ghim vị trí đã tiệm cận/vượt
        // 1000, query 1 lần trước đây bị Supabase âm thầm cắt bớt, khiến DN gần bạn nhất
        // có thể bị thiếu trong danh sách mà không có dấu hiệu báo lỗi gì.
        const fetchAllChunked = async (build: (from: number, to: number) => any) => {
          let rows: any[] = [];
          let from = 0;
          const CHUNK = 1000;
          while (true) {
            const { data } = await build(from, from + CHUNK - 1);
            const chunk = data ?? [];
            rows = rows.concat(chunk);
            if (chunk.length < CHUNK) break;
            from += CHUNK;
          }
          return rows;
        };
        const bizRows = await fetchAllChunked((from, to) =>
          supabase
            .from("businesses")
            .select("*")
            .eq("status", "approved")
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .range(from, to),
        );
        const rows = bizRows as Business[];
        const statRows = await fetchAllChunked((from, to) =>
          supabase.from("business_card_stats").select("*").range(from, to),
        );
        const sMap = new Map(statRows.map((s: any) => [s.business_id, s]));
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
        <h1 className="text-xl font-extrabold mb-4">{t("nearby.title")}</h1>
        <div className="bg-card rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 grid place-items-center mx-auto">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          {status === "unsupported" ? (
            <p className="text-sm text-muted-foreground">{t("explore.locationUnsupported")}</p>
          ) : status === "denied" ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("nearby.denied")}
              </p>
              <button
                onClick={start}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              >
                {t("common.retry")}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("nearby.enablePrompt")}
              </p>
              <button
                onClick={start}
                disabled={status === "requesting"}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Navigation className="w-4 h-4" />
                {status === "requesting" ? t("sort.requestingLocation") : t("nearby.enableCta")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">{t("nearby.title")}</h1>
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
        <p className="text-sm text-center py-12 text-muted-foreground">{t("nearby.searching")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">
          {t("explore.noResultsRadius", { r: radius })}
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
