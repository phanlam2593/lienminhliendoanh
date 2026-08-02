import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { StoredImage } from "@/components/StoredImage";
import { BUSINESS_TYPE_LABEL, BusinessType } from "@/lib/types";
import type { BusinessCardData } from "@/components/BusinessCard";
import { useLanguage } from "@/lib/i18n";
import { Navigation } from "lucide-react";

// Fix icon mặc định của Leaflet hay bị vỡ khi qua bundler — lỗi phổ biến cộng đồng hay gặp
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DALAT_CENTER: [number, number] = [11.9404, 108.4583];

// Icon ghim riêng theo từng loại hình — 1 emoji + 1 màu/loại, để nhìn bản đồ là phân biệt
// được ngay Ăn uống/Lưu trú/Buôn bán... không cần mở từng popup mới biết.
const TYPE_EMOJI: Record<BusinessType, string> = {
  food: "🍜",
  service: "🔧",
  stay: "🏠",
  travel: "🧭",
  creator: "📷",
  freelance: "💻",
  broker: "🏘️",
  shopping: "🛍️",
  other: "📍",
};
const TYPE_COLOR: Record<BusinessType, string> = {
  food: "#f97316",
  service: "#0ea5e9",
  stay: "#8b5cf6",
  travel: "#10b981",
  creator: "#ec4899",
  freelance: "#6366f1",
  broker: "#eab308",
  shopping: "#14b8a6",
  other: "#6b7280",
};

function typeIcon(type: BusinessType): L.DivIcon {
  const color = TYPE_COLOR[type] ?? "#6b7280";
  const emoji = TYPE_EMOJI[type] ?? "📍";
  return L.divIcon({
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font-size:14px;line-height:1">${emoji}</span></div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

// Chấm xanh vị trí hiện tại, kiểu Google Maps — vòng mờ bên ngoài + chấm đặc bên trong.
const userLocationIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 0 0 6px rgba(66,133,244,.25)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function BusinessMapView({ businesses }: { businesses: BusinessCardData[] }) {
  const { t } = useLanguage();
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const pinned = businesses.filter((b: any) => b.latitude != null && b.longitude != null);

  // Lấy vị trí hiện tại 1 cách âm thầm — không bắt buộc, không chặn hiển thị bản đồ nếu
  // người dùng từ chối hoặc trình duyệt không hỗ trợ.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  if (pinned.length === 0) {
    return (
      <div className="h-[60vh] rounded-xl border bg-card grid place-items-center text-center px-6">
        <p className="text-sm text-muted-foreground">{t("map.noPinned")}</p>
      </div>
    );
  }

  return (
    <div className="h-[60vh] rounded-xl overflow-hidden border">
      <MapContainer center={myPos ? [myPos.lat, myPos.lng] : DALAT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {myPos && (
          <Marker position={[myPos.lat, myPos.lng]} icon={userLocationIcon}>
            <Popup>{t("map.youAreHere")}</Popup>
          </Marker>
        )}
        {pinned.map((b: any) => (
          <Marker key={b.id} position={[b.latitude, b.longitude]} icon={typeIcon(b.type)}>
            <Popup>
              <div className="w-40 space-y-1.5">
                <div className="w-full h-20 rounded overflow-hidden bg-muted">
                  <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-sm font-semibold">{b.name}</div>
                <div className="text-xs text-muted-foreground">{BUSINESS_TYPE_LABEL[b.type]}</div>
                <Link
                  to={`/dn/${b.id}`}
                  className="block text-center text-xs font-semibold py-1.5 rounded bg-primary text-primary-foreground"
                >
                  {t("map.viewDetail")}
                </Link>
                
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-center text-xs font-semibold py-1.5 rounded border"
                >
                  <Navigation className="w-3 h-3" /> {t("map.directions")}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}