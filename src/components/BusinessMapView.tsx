import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { StoredImage } from "@/components/StoredImage";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import type { BusinessCardData } from "@/components/BusinessCard";

// Fix icon mặc định của Leaflet hay bị vỡ khi qua bundler — lỗi phổ biến cộng đồng hay gặp
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DALAT_CENTER: [number, number] = [11.9404, 108.4583];

export function BusinessMapView({ businesses }: { businesses: BusinessCardData[] }) {
  const pinned = businesses.filter((b: any) => b.latitude != null && b.longitude != null);

  if (pinned.length === 0) {
    return (
      <div className="h-[60vh] rounded-xl border bg-card grid place-items-center text-center px-6">
        <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp nào ghim vị trí trên bản đồ</p>
      </div>
    );
  }

  return (
    <div className="h-[60vh] rounded-xl overflow-hidden border">
      <MapContainer center={DALAT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((b: any) => (
          <Marker key={b.id} position={[b.latitude, b.longitude]}>
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
                  Xem chi tiết
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
