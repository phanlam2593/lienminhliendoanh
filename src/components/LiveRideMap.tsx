import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

// ─────────────────────────────────────────────────────────────────────────────
// BẢN ĐỒ LIVE THEO DÕI TÀI XẾ (25/09, kiểu Grab) — hiện cho KHÁCH khi chuyến đã có tài xế
// (accepted → tài xế đang tới điểm đón; picked_up → đang chở tới điểm đến).
// Vị trí tài xế lấy từ cột rides.driver_lat/lng/driver_loc_at: app tài xế gửi qua RPC
// update_ride_location (~4 giây/lần khi đang chạy), khách nhận qua Realtime của bảng rides
// (RLS chỉ 2 bên + admin đọc được). Chuyến xong/huỷ → trigger tự xoá vị trí.
// Bản đồ nền: CARTO Voyager (miễn phí, không cần key) — thay tile OSM hay lỗi 503.
// ─────────────────────────────────────────────────────────────────────────────

export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface LiveRide {
  status: string;
  vehicle: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  driver_lat?: number | null;
  driver_lng?: number | null;
  driver_heading?: number | null;
  driver_loc_at?: string | null;
}

type LatLng = [number, number];

function kmBetween(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const pinIcon = (color: string, label: string) =>
  L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="background:${color};color:#fff;font:700 10px/1 system-ui;padding:3px 6px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.35);white-space:nowrap">${label}</div><div style="width:12px;height:12px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);margin-top:2px"></div></div>`,
    className: "",
    iconSize: [60, 34],
    iconAnchor: [30, 30],
  });

const driverIcon = (vehicle: string) =>
  L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#00c9a7,#0891b2);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 0 0 6px rgba(8,145,178,.25),0 2px 6px rgba(0,0,0,.35);font-size:20px">${
      vehicle === "xe_may" || vehicle === "giao_hang" ? "🛵" : vehicle === "giao_hang_oto" ? "🚚" : "🚗"
    }</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

// Tài xế di chuyển MƯỢT giữa 2 lần cập nhật (nội suy ~1.2s) thay vì nhảy cóc.
function AnimatedDriverMarker({ pos, vehicle }: { pos: LatLng; vehicle: string }) {
  const markerRef = useRef<L.Marker | null>(null);
  const cur = useRef<LatLng>(pos);
  const icon = useMemo(() => driverIcon(vehicle), [vehicle]);

  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    const from = cur.current;
    const to = pos;
    if (from[0] === to[0] && from[1] === to[1]) return;
    // Nhảy xa bất thường (>2 km, vd GPS vừa bật) → đặt thẳng, không trượt ngang bản đồ.
    if (kmBetween(from, to) > 2) {
      cur.current = to;
      m.setLatLng(to);
      return;
    }
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const p: LatLng = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
      cur.current = p;
      m.setLatLng(p);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pos[0], pos[1]]);

  return <Marker ref={markerRef as any} position={cur.current} icon={icon} zIndexOffset={1000} />;
}

// Tự căn khung cho vừa tài xế + điểm cần tới; người dùng tự kéo/zoom thì thôi tự căn,
// bấm nút "căn giữa" để bật lại.
function AutoFit({ points, follow, onUserMove }: { points: LatLng[]; follow: boolean; onUserMove: () => void }) {
  const map = useMap();
  const key = points.map((p) => p.map((v) => v.toFixed(4)).join(",")).join("|");
  useEffect(() => {
    const onDrag = () => onUserMove();
    map.on("dragstart", onDrag);
    return () => {
      map.off("dragstart", onDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => {
    if (!follow || points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 16, { animate: true });
    else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 17, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, follow]);
  return null;
}

export function LiveRideMap({ ride, className }: { ride: LiveRide; className?: string }) {
  const { t } = useLanguage();
  const [follow, setFollow] = useState(true);
  const [, tick] = useState(0);

  // Cập nhật dòng "x giây trước" mỗi 5 giây.
  useEffect(() => {
    const h = window.setInterval(() => tick((n) => n + 1), 5000);
    return () => window.clearInterval(h);
  }, []);

  const pickup: LatLng = [ride.pickup_lat, ride.pickup_lng];
  const dropoff: LatLng = [ride.dropoff_lat, ride.dropoff_lng];
  const driver: LatLng | null =
    ride.driver_lat != null && ride.driver_lng != null ? [Number(ride.driver_lat), Number(ride.driver_lng)] : null;
  const goingToPickup = ride.status === "accepted";
  const target = goingToPickup ? pickup : dropoff;

  const secondsAgo = ride.driver_loc_at ? Math.max(0, Math.round((Date.now() - new Date(ride.driver_loc_at).getTime()) / 1000)) : null;
  const stale = secondsAgo == null || secondsAgo > 90;

  // Ước lượng đường thật ≈ chim bay × 1.3, tốc độ trung bình trong phố ~25 km/h.
  const kmLeft = driver ? kmBetween(driver, target) * 1.3 : null;
  const minLeft = kmLeft != null ? Math.max(1, Math.round((kmLeft / 25) * 60)) : null;

  const fitPoints: LatLng[] = driver ? [driver, target] : [pickup, dropoff];

  return (
    <div className={className}>
      <div className="relative h-64 rounded-2xl overflow-hidden border isolate">
        <MapContainer center={driver ?? pickup} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl>
          <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTR} subdomains="abcd" maxZoom={19} />
          <Polyline positions={[pickup, dropoff]} pathOptions={{ color: "#94a3b8", weight: 3, dashArray: "4 8", opacity: 0.8 }} />
          {driver && (
            <Polyline positions={[driver, target]} pathOptions={{ color: "#0891b2", weight: 4, dashArray: "8 8", opacity: 0.9 }} />
          )}
          <Marker position={pickup} icon={pinIcon("#10b981", t("ride.map.pickup"))} />
          <Marker position={dropoff} icon={pinIcon("#ef4444", t("ride.map.dropoff"))} />
          {driver && <AnimatedDriverMarker pos={driver} vehicle={ride.vehicle} />}
          <AutoFit points={fitPoints} follow={follow} onUserMove={() => setFollow(false)} />
        </MapContainer>
        {!follow && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            aria-label={t("ride.map.recenter")}
            className="absolute right-2 top-2 z-[500] w-9 h-9 rounded-full bg-background/95 shadow grid place-items-center text-primary"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        {driver ? (
          <span className="font-semibold text-foreground">
            {goingToPickup ? t("ride.map.toPickup") : t("ride.map.toDropoff")} · ~{kmLeft!.toFixed(1)} km · ~{minLeft}{" "}
            {t("ride.map.min")}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("ride.map.waitingLoc")}</span>
        )}
        {driver && (
          <span className={stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
            {stale
              ? t("ride.map.stale")
              : secondsAgo! < 10
                ? t("ride.map.live")
                : t("ride.map.secondsAgo", { n: String(secondsAgo) })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BẢN ĐỒ KHI ĐẶT XE (25/09) — hiện ngay khi đã có điểm đón và/hoặc điểm đến (kể cả lấy từ
// GPS), kiểu Grab: 2 ghim KÉO ĐƯỢC để chỉnh vị trí cho chính xác (thả tay → tự tra lại
// địa chỉ + tính lại giá). Không có điểm nào → không hiện.
// ─────────────────────────────────────────────────────────────────────────────
function DraggablePin({
  pos,
  color,
  label,
  onMove,
}: {
  pos: LatLng;
  color: string;
  label: string;
  onMove: (lat: number, lng: number) => void;
}) {
  const icon = useMemo(() => pinIcon(color, label), [color, label]);
  const handlers = useMemo(
    () => ({
      dragend: (e: any) => {
        const ll = e.target.getLatLng();
        onMove(ll.lat, ll.lng);
      },
    }),
    [onMove],
  );
  return <Marker position={pos} icon={icon} draggable eventHandlers={handlers} />;
}

export function BookingMap({
  pickup,
  dropoff,
  onMove,
}: {
  pickup: { lat: number; lng: number } | null;
  dropoff: { lat: number; lng: number } | null;
  onMove: (which: "pickup" | "dropoff", lat: number, lng: number) => void;
}) {
  const { t } = useLanguage();
  const [follow, setFollow] = useState(true);
  const pts: LatLng[] = [pickup, dropoff].filter(Boolean).map((p) => [p!.lat, p!.lng] as LatLng);
  // Chọn điểm mới (không phải kéo ghim) → tự căn khung lại.
  const key = pts.map((p) => p.map((v) => v.toFixed(3)).join(",")).join("|");
  useEffect(() => setFollow(true), [key]);
  if (pts.length === 0) return null;
  return (
    <div className="space-y-1">
      <div className="relative h-52 rounded-xl overflow-hidden border isolate">
        <MapContainer center={pts[0]} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTR} subdomains="abcd" maxZoom={19} />
          {pickup && dropoff && (
            <Polyline
              positions={[
                [pickup.lat, pickup.lng],
                [dropoff.lat, dropoff.lng],
              ]}
              pathOptions={{ color: "#0891b2", weight: 3, dashArray: "6 8", opacity: 0.85 }}
            />
          )}
          {pickup && (
            <DraggablePin
              pos={[pickup.lat, pickup.lng]}
              color="#10b981"
              label={t("ride.map.pickup")}
              onMove={(la, ln) => {
                setFollow(false);
                onMove("pickup", la, ln);
              }}
            />
          )}
          {dropoff && (
            <DraggablePin
              pos={[dropoff.lat, dropoff.lng]}
              color="#ef4444"
              label={t("ride.map.dropoff")}
              onMove={(la, ln) => {
                setFollow(false);
                onMove("dropoff", la, ln);
              }}
            />
          )}
          <AutoFit points={pts} follow={follow} onUserMove={() => setFollow(false)} />
        </MapContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">{t("ride.map.dragHint")}</p>
    </div>
  );
}
