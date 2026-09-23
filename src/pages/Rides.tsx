import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Car,
  Check,
  ChevronRight,
  Clock,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Search,
  UtensilsCrossed,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { timeAgo } from "@/lib/time";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { StoredImage } from "@/components/StoredImage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─────────────────────────────────────────────────────────────────────────────
// ĐƯA ĐÓN / GIAO NHẬN (#7) — route /dua-don, vào từ thẻ dưới 4 mục của trang Quẹt.
// Giá = giá mở cửa + giá/km (admin đặt ở bảng ride_pricing), tính ở SERVER (create_ride)
// theo quãng đường chim bay × 1.3. Tài xế phải đăng ký + admin duyệt (ride_drivers).
// Trả tiền mặt trực tiếp cho tài xế — app không giữ tiền.
// ─────────────────────────────────────────────────────────────────────────────

const db = supabase as any;

type Kind = "nguoi" | "hang" | "do_an";
type Vehicle = "xe_may" | "oto_4" | "oto_7" | "giao_hang";
type RideStatus = "searching" | "accepted" | "picked_up" | "completed" | "cancelled";

interface Place {
  label: string;
  lat: number;
  lng: number;
}

interface Ride {
  id: string;
  customer_id: string;
  driver_id: string | null;
  kind: Kind;
  vehicle: Vehicle;
  passengers: number;
  pickup_text: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_text: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number;
  price: number;
  note: string | null;
  status: RideStatus;
  created_at: string;
}

interface DriverRow {
  user_id: string;
  vehicle: "xe_may" | "oto_4" | "oto_7";
  plate: string;
  vehicle_desc: string | null;
  vehicle_photo_url: string | null;
  license_photo_url: string | null;
  also_delivery: boolean;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  is_online: boolean;
  created_at: string;
}

interface Pricing {
  vehicle: Vehicle;
  base_fare: number;
  per_km: number;
  min_fare: number;
  active: boolean;
}

const ACTIVE: RideStatus[] = ["searching", "accepted", "picked_up"];
const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const mapsDir = (lat: number, lng: number, fromLat?: number, fromLng?: number) =>
  `https://www.google.com/maps/dir/?api=1${fromLat != null ? `&origin=${fromLat},${fromLng}` : ""}&destination=${lat},${lng}`;

function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function getGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no geo"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

// Tìm địa chỉ bằng OpenStreetMap (Nominatim) — miễn phí, ưu tiên gần vị trí hiện tại.
async function searchPlaces(q: string, near?: { lat: number; lng: number } | null): Promise<Place[]> {
  const params = new URLSearchParams({ format: "json", q, countrycodes: "vn", limit: "6", "accept-language": "vi" });
  if (near) {
    const d = 0.35;
    params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=vi`,
    );
    const j = await res.json();
    return (j?.display_name as string) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function VehicleIcon({ v, className }: { v: string; className?: string }) {
  if (v === "xe_may") return <Bike className={className} />;
  if (v === "giao_hang") return <Package className={className} />;
  return <Car className={className} />;
}

// ── Ô chọn địa điểm ──
function PlaceField({
  label,
  value,
  onChange,
  near,
  allowGps,
}: {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  near: { lat: number; lng: number } | null;
  allowGps?: boolean;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }
    const h = setTimeout(async () => {
      setBusy(true);
      setResults(await searchPlaces(query, near).catch(() => []));
      setBusy(false);
    }, 600);
    return () => clearTimeout(h);
  }, [q, near?.lat]);

  const useGps = async () => {
    setBusy(true);
    try {
      const g = await getGps();
      onChange({ label: await reverseGeocode(g.lat, g.lng), lat: g.lat, lng: g.lng });
    } catch {
      toast.error(t("ride.gpsFail"));
    }
    setBusy(false);
  };

  if (value) {
    return (
      <div className="flex items-start gap-2 rounded-xl border p-2.5">
        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
          <div className="text-sm line-clamp-2">{value.label}</div>
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label={t("common.close")} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ride.searchPlace")} className="pl-9 h-10" />
        </div>
        {allowGps && (
          <button
            type="button"
            onClick={() => void useGps()}
            aria-label={t("ride.useGps")}
            className="h-10 w-10 shrink-0 rounded-md bg-primary/10 text-primary grid place-items-center"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
      </div>
      {busy && <div className="text-[11px] text-muted-foreground">{t("common.loading")}</div>}
      {results.length > 0 && (
        <div className="rounded-xl border divide-y max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(r);
                setQ("");
                setResults([]);
              }}
              className="w-full text-left p-2.5 text-xs hover:bg-accent"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Thẻ 1 cuốc xe (dùng cho cả khách lẫn tài xế) ──
function RideCard({
  ride,
  viewer,
  myPos,
  onChanged,
}: {
  ride: Ride;
  viewer: "customer" | "driver";
  myPos?: { lat: number; lng: number } | null;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [parties, setParties] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void db.rpc("get_ride_parties", { _rid: ride.id }).then(({ data }: any) => setParties(data));
  }, [ride.id, ride.status, ride.driver_id]);

  const act = async (fn: "accept" | "picked_up" | "completed" | "cancelled") => {
    setBusy(true);
    const { error } =
      fn === "accept"
        ? await db.rpc("accept_ride", { _rid: ride.id })
        : await db.rpc("update_ride_status", { _rid: ride.id, _status: fn });
    setBusy(false);
    if (error) {
      const m = String(error.message);
      toast.error(
        m.includes("RIDE_TAKEN") ? t("ride.errTaken") : m.includes("DRIVER_BUSY") ? t("ride.errBusy") : m,
      );
    }
    onChanged();
  };

  const other = viewer === "customer" ? parties?.driver : parties?.customer;
  const kmAway =
    myPos && viewer === "driver" ? kmBetween(myPos.lat, myPos.lng, ride.pickup_lat, ride.pickup_lng) : null;

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-brand text-primary-foreground grid place-items-center shrink-0">
          <VehicleIcon v={ride.vehicle} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">
            {t(`ride.kind.${ride.kind}`)} · {t(`ride.vehicle.${ride.vehicle}`)}
            {ride.kind === "nguoi" && ride.passengers > 1 ? ` · ${ride.passengers} ${t("ride.people")}` : ""}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t(`ride.status.${ride.status}`)} · {timeAgo(ride.created_at)}
            {kmAway != null && ` · ${t("ride.kmAway", { km: kmAway.toFixed(1) })}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-extrabold text-primary">{money(ride.price)}</div>
          <div className="text-[10px] text-muted-foreground">~{Number(ride.distance_km).toFixed(1)} km</div>
        </div>
      </div>
      <div className="text-xs space-y-1">
        <a
          href={mapsDir(ride.pickup_lat, ride.pickup_lng)}
          target="_blank"
          rel="noreferrer"
          className="flex gap-1.5 items-start hover:text-primary"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
          <span className="line-clamp-2">{ride.pickup_text}</span>
        </a>
        <a
          href={mapsDir(ride.dropoff_lat, ride.dropoff_lng, ride.pickup_lat, ride.pickup_lng)}
          target="_blank"
          rel="noreferrer"
          className="flex gap-1.5 items-start hover:text-primary"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
          <span className="line-clamp-2">{ride.dropoff_text}</span>
        </a>
        {ride.note && <div className="text-muted-foreground italic">"{ride.note}"</div>}
      </div>

      {other && (
        <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2">
          <Avatar path={other.avatar_url} name={other.full_name} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{other.full_name}</div>
            {viewer === "customer" && other.plate && (
              <div className="text-[11px] text-muted-foreground truncate">
                {other.plate}
                {other.vehicle_desc ? ` · ${other.vehicle_desc}` : ""}
              </div>
            )}
          </div>
          {other.phone && (
            <a href={`tel:${other.phone}`} aria-label={t("ride.call")} className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center">
              <Phone className="w-4 h-4" />
            </a>
          )}
          <Link to={`/tin-nhan/${other.id}`} aria-label={t("common.message")} className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center">
            <MessageCircle className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="flex gap-2">
        {viewer === "driver" && ride.status === "searching" && (
          <button onClick={() => void act("accept")} disabled={busy} className="flex-1 h-10 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {t("ride.accept")}
          </button>
        )}
        {viewer === "driver" && ride.status === "accepted" && (
          <button onClick={() => void act("picked_up")} disabled={busy} className="flex-1 h-10 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {ride.kind === "nguoi" ? t("ride.pickedUpPerson") : t("ride.pickedUpGoods")}
          </button>
        )}
        {viewer === "driver" && ride.status === "picked_up" && (
          <button onClick={() => void act("completed")} disabled={busy} className="flex-1 h-10 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {t("ride.complete")}
          </button>
        )}
        {((viewer === "customer" && (ride.status === "searching" || ride.status === "accepted")) ||
          (viewer === "driver" && ride.status === "accepted")) && (
          <button onClick={() => void act("cancelled")} disabled={busy} className="h-10 px-4 rounded-xl border text-sm font-semibold text-destructive disabled:opacity-50">
            {t("ride.cancel")}
          </button>
        )}
        {viewer === "driver" && ride.status !== "searching" && ACTIVE.includes(ride.status) && (
          <a
            href={
              ride.status === "accepted"
                ? mapsDir(ride.pickup_lat, ride.pickup_lng, myPos?.lat, myPos?.lng)
                : mapsDir(ride.dropoff_lat, ride.dropoff_lng, ride.pickup_lat, ride.pickup_lng)
            }
            target="_blank"
            rel="noreferrer"
            aria-label={t("ride.directions")}
            className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"
          >
            <Navigation className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Tab KHÁCH: đặt cuốc ──
function CustomerTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rides, setRides] = useState<Ride[]>([]);
  const [kind, setKind] = useState<Kind>("nguoi");
  const [vehicle, setVehicle] = useState<Vehicle>("xe_may");
  const [passengers, setPassengers] = useState(1);
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<{ distance_km: number; price: number } | null>(null);
  const [booking, setBooking] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await db.from("rides").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(15);
    setRides((data ?? []) as Ride[]);
  };

  useEffect(() => {
    void load();
    if (!user) return;
    const ch = supabase
      .channel(`rides-c:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `customer_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    if (kind !== "nguoi") setVehicle("giao_hang");
    else if (vehicle === "giao_hang") setVehicle("xe_may");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    if (vehicle === "xe_may") setPassengers(1);
    if (vehicle === "oto_4" && passengers > 4) setPassengers(4);
  }, [vehicle]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setQuote(null);
      return;
    }
    void db
      .rpc("quote_ride", { _vehicle: vehicle, plat: pickup.lat, plng: pickup.lng, dlat: dropoff.lat, dlng: dropoff.lng })
      .then(({ data }: any) => setQuote(data));
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, vehicle]);

  const active = rides.find((r) => ACTIVE.includes(r.status));
  const history = rides.filter((r) => !ACTIVE.includes(r.status));

  const book = async () => {
    if (!pickup || !dropoff || booking) return;
    setBooking(true);
    const { error } = await db.rpc("create_ride", {
      _kind: kind,
      _vehicle: vehicle,
      _passengers: passengers,
      _pickup_text: pickup.label,
      plat: pickup.lat,
      plng: pickup.lng,
      _dropoff_text: dropoff.label,
      dlat: dropoff.lat,
      dlng: dropoff.lng,
      _note: note,
    });
    setBooking(false);
    if (error) {
      const m = String(error.message);
      toast.error(
        m.includes("RIDE_ACTIVE_EXISTS")
          ? t("ride.errActive")
          : m.includes("TOO_FAR")
            ? t("ride.errTooFar")
            : m.includes("TOO_MANY_PASSENGERS")
              ? t("ride.errPassengers")
              : m,
      );
      return;
    }
    toast.success(t("ride.booked"));
    setNote("");
    setDropoff(null);
    void load();
  };

  const vehicleOptions: Vehicle[] = kind === "nguoi" ? ["xe_may", "oto_4", "oto_7"] : ["giao_hang"];

  return (
    <div className="space-y-4">
      {active ? (
        <div className="space-y-2">
          <div className="text-sm font-bold">{t("ride.yourActive")}</div>
          <RideCard ride={active} viewer="customer" onChanged={() => void load()} />
          {active.status === "searching" && (
            <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse" /> {t("ride.searchingHint")}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border bg-card p-3">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["nguoi", Users],
                ["hang", Package],
                ["do_an", UtensilsCrossed],
              ] as const
            ).map(([k, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-xl border p-2.5 flex flex-col items-center gap-1 text-xs font-semibold",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
                {t(`ride.kind.${k}`)}
              </button>
            ))}
          </div>
          {kind === "nguoi" && (
            <div className="flex gap-2">
              {vehicleOptions.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVehicle(v)}
                  className={cn(
                    "flex-1 h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1",
                    vehicle === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <VehicleIcon v={v} className="w-4 h-4" /> {t(`ride.vehicle.${v}`)}
                </button>
              ))}
            </div>
          )}
          {kind === "nguoi" && vehicle !== "xe_may" && (
            <div className="flex items-center justify-between rounded-xl border px-3 h-10">
              <span className="text-xs font-semibold text-muted-foreground">{t("ride.passengers")}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPassengers((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-full bg-muted font-bold">
                  −
                </button>
                <span className="text-sm font-bold w-4 text-center">{passengers}</span>
                <button
                  type="button"
                  onClick={() => setPassengers((p) => Math.min(vehicle === "oto_4" ? 4 : 7, p + 1))}
                  className="w-7 h-7 rounded-full bg-muted font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}
          <PlaceField label={kind === "nguoi" ? t("ride.pickup") : t("ride.pickupGoods")} value={pickup} onChange={setPickup} near={pickup ?? dropoff} allowGps />
          <PlaceField label={kind === "nguoi" ? t("ride.dropoff") : t("ride.dropoffGoods")} value={dropoff} onChange={setDropoff} near={pickup} />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder={kind === "nguoi" ? t("ride.notePerson") : t("ride.noteGoods")}
            className="min-h-[60px] text-sm"
          />
          {quote && (
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">~{Number(quote.distance_km).toFixed(1)} km · {t("ride.cashNote")}</span>
              <span className="text-lg font-extrabold text-primary">{money(quote.price)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => void book()}
            disabled={!pickup || !dropoff || booking}
            className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
          >
            {booking ? t("common.loading") : t("ride.book")}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold">{t("ride.history")}</div>
          {history.map((r) => (
            <div key={r.id} className="rounded-xl border p-2.5 flex items-center gap-2">
              <VehicleIcon v={r.vehicle} className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">{r.dropoff_text}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t(`ride.status.${r.status}`)} · {timeAgo(r.created_at)}
                </div>
              </div>
              <div className="text-xs font-bold">{money(r.price)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab TÀI XẾ: đăng ký / bật nhận cuốc / danh sách cuốc ──
function DriverTab() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [driver, setDriver] = useState<DriverRow | null | undefined>(undefined);
  const [rides, setRides] = useState<Ride[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ vehicle: "xe_may", plate: "", desc: "", also: true });
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const heartbeat = useRef<number | null>(null);

  const loadDriver = async () => {
    if (!user) return;
    const { data } = await db.from("ride_drivers").select("*").eq("user_id", user.id).maybeSingle();
    setDriver((data as DriverRow) ?? null);
    if (data) setForm({ vehicle: data.vehicle, plate: data.plate, desc: data.vehicle_desc ?? "", also: data.also_delivery });
  };

  const loadRides = async () => {
    if (!user) return;
    const [{ data: open }, { data: mine }] = await Promise.all([
      db.from("rides").select("*").eq("status", "searching").neq("customer_id", user.id).order("created_at", { ascending: false }).limit(30),
      db.from("rides").select("*").eq("driver_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setRides([...(mine ?? []), ...(open ?? [])] as Ride[]);
  };

  useEffect(() => {
    void loadDriver();
  }, [user?.id]);

  const approved = driver?.status === "approved";

  useEffect(() => {
    if (!approved || !user) return;
    void loadRides();
    const ch = supabase
      .channel(`rides-d:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => void loadRides())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [approved, user?.id]);

  // Đang bật "Nhận cuốc" → cứ 4 phút báo vị trí + còn online 1 lần (server chỉ báo cuốc mới
  // cho tài xế hoạt động trong 30 phút gần nhất).
  useEffect(() => {
    if (!driver?.is_online) return;
    const beat = async () => {
      let g = pos;
      try {
        g = await getGps();
        setPos(g);
      } catch {
        /* giữ vị trí cũ */
      }
      await db.rpc("set_driver_online", { _online: true, _lat: g?.lat ?? null, _lng: g?.lng ?? null });
    };
    void beat();
    heartbeat.current = window.setInterval(() => void beat(), 4 * 60 * 1000);
    return () => {
      if (heartbeat.current) window.clearInterval(heartbeat.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.is_online]);

  const toggleOnline = async () => {
    if (!driver) return;
    const next = !driver.is_online;
    let g: { lat: number; lng: number } | null = null;
    if (next) {
      try {
        g = await getGps();
        setPos(g);
      } catch {
        toast.error(t("ride.gpsFail"));
      }
    }
    const { error } = await db.rpc("set_driver_online", { _online: next, _lat: g?.lat ?? null, _lng: g?.lng ?? null });
    if (error) return toast.error(error.message);
    setDriver({ ...driver, is_online: next });
  };

  const apply = async () => {
    if (!user || form.plate.trim().length < 4) return toast.error(t("ride.errPlate"));
    setSaving(true);
    try {
      const vp = vehiclePhoto ? await uploadImage(vehiclePhoto, "drivers", user.id) : null;
      const lp = licensePhoto ? await uploadImage(licensePhoto, "drivers", user.id) : null;
      const { error } = await db.rpc("apply_driver", {
        _vehicle: form.vehicle,
        _plate: form.plate,
        _desc: form.desc,
        _vehicle_photo: vp,
        _license_photo: lp,
        _also_delivery: form.also,
      });
      if (error) throw error;
      toast.success(t("ride.applied"));
      void loadDriver();
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
    setSaving(false);
  };

  if (driver === undefined) return <div className="text-center text-sm text-muted-foreground py-8">{t("common.loading")}</div>;

  if (!approved) {
    return (
      <div className="space-y-3">
        {driver && (
          <div
            className={cn(
              "rounded-xl p-3 text-sm",
              driver.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-destructive/10 text-destructive",
            )}
          >
            <div className="font-semibold">{t(`ride.driverStatus.${driver.status}`)}</div>
            {driver.admin_note && <div className="text-xs mt-1">{driver.admin_note}</div>}
          </div>
        )}
        <div className="rounded-2xl border bg-card p-3 space-y-2.5">
          <div className="text-sm font-bold">{driver ? t("ride.reapply") : t("ride.applyTitle")}</div>
          <p className="text-xs text-muted-foreground">{t("ride.applyDesc")}</p>
          <div className="flex gap-2">
            {(["xe_may", "oto_4", "oto_7"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, vehicle: v }))}
                className={cn(
                  "flex-1 h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1",
                  form.vehicle === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                <VehicleIcon v={v} className="w-4 h-4" /> {t(`ride.vehicle.${v}`)}
              </button>
            ))}
          </div>
          <Input value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.slice(0, 20) }))} placeholder={t("ride.plate")} />
          <Input value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value.slice(0, 200) }))} placeholder={t("ride.vehicleDesc")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.also} onChange={(e) => setForm((f) => ({ ...f, also: e.target.checked }))} />
            {t("ride.alsoDelivery")}
          </label>
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-muted-foreground">{t("ride.vehiclePhoto")}</span>
            <input type="file" accept="image/*" onChange={(e) => setVehiclePhoto(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
          </label>
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-muted-foreground">{t("ride.licensePhoto")}</span>
            <input type="file" accept="image/*" onChange={(e) => setLicensePhoto(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
          </label>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={saving || driver?.status === "pending"}
            className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
          >
            {saving ? t("common.loading") : driver?.status === "pending" ? t("ride.driverStatus.pending") : t("ride.submitApply")}
          </button>
        </div>
      </div>
    );
  }

  const myActive = rides.filter((r) => r.driver_id === user?.id && ACTIVE.includes(r.status));
  const open = rides
    .filter((r) => r.status === "searching" && r.driver_id == null)
    .sort((a, b) =>
      pos ? kmBetween(pos.lat, pos.lng, a.pickup_lat, a.pickup_lng) - kmBetween(pos.lat, pos.lng, b.pickup_lat, b.pickup_lng) : 0,
    );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void toggleOnline()}
        className={cn(
          "w-full rounded-2xl p-4 flex items-center gap-3 text-left transition",
          driver!.is_online ? "bg-gradient-brand text-primary-foreground" : "bg-card border",
        )}
      >
        <span className={cn("w-3 h-3 rounded-full", driver!.is_online ? "bg-white animate-pulse" : "bg-muted-foreground/40")} />
        <div className="flex-1">
          <div className="font-bold">{driver!.is_online ? t("ride.online") : t("ride.offline")}</div>
          <div className={cn("text-xs", driver!.is_online ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {t(`ride.vehicle.${driver!.vehicle}`)} · {driver!.plate}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 opacity-60" />
      </button>

      {myActive.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold">{t("ride.yourTrip")}</div>
          {myActive.map((r) => (
            <RideCard key={r.id} ride={r} viewer="driver" myPos={pos} onChanged={() => void loadRides()} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-bold">{t("ride.openRides", { n: String(open.length) })}</div>
        {!driver!.is_online ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("ride.turnOnHint")}</p>
        ) : open.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("ride.noOpen")}</p>
        ) : (
          open.map((r) => <RideCard key={r.id} ride={r} viewer="driver" myPos={pos} onChanged={() => void loadRides()} />)
        )}
      </div>
    </div>
  );
}

export default function Rides() {
  const nav = useNavigate();
  const { t } = useLanguage();
  const { user, isApproved } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "driver" ? "driver" : "customer";
  const rideParam = params.get("ride");

  // Mở từ thông báo (?ride=<id>): nếu mình là tài xế của chuyến / chuyến đang chờ tài xế → tab Tài xế.
  useEffect(() => {
    if (!rideParam || !user) return;
    void db
      .from("rides")
      .select("customer_id, driver_id")
      .eq("id", rideParam)
      .maybeSingle()
      .then(({ data }: { data: { customer_id: string; driver_id: string | null } | null }) => {
        setParams(data && data.customer_id !== user.id ? { tab: "driver" } : {}, { replace: true });
      });
  }, [rideParam, user?.id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needApproval")}</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav("/quet")} aria-label={t("common.back")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold flex-1">{t("ride.title")}</h1>
      </div>
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        {(["customer", "driver"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setParams(k === "driver" ? { tab: "driver" } : {})}
            className={cn("flex-1 py-2 rounded-lg text-sm font-semibold", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {k === "customer" ? t("ride.tabBook") : t("ride.tabDriver")}
          </button>
        ))}
      </div>
      {tab === "customer" ? <CustomerTab /> : <DriverTab />}
    </div>
  );
}

// ── Quản trị: duyệt tài xế + chỉnh bảng giá (nhúng vào trang Admin) ──
export function RideAdminPanel() {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<(DriverRow & { profile?: { full_name: string; phone: string | null } })[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: d }, { data: p }] = await Promise.all([
      db.from("ride_drivers").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("ride_pricing").select("*").order("vehicle"),
    ]);
    const rows = (d ?? []) as DriverRow[];
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids) : { data: [] };
    const byId = new Map(((profs ?? []) as any[]).map((x) => [x.id, x]));
    setDrivers(rows.map((r) => ({ ...r, profile: byId.get(r.user_id) })));
    setPricing((p ?? []) as Pricing[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (uid: string, status: "approved" | "rejected") => {
    const { error } = await db.rpc("admin_set_driver_status", { _uid: uid, _status: status, _note: note[uid] || null });
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? t("ride.admin.approved") : t("ride.admin.rejected"));
    void load();
  };

  const savePrice = async (p: Pricing) => {
    const { error } = await db.rpc("admin_update_ride_pricing", {
      _vehicle: p.vehicle,
      _base: Math.round(Number(p.base_fare) || 0),
      _per_km: Math.round(Number(p.per_km) || 0),
      _min: Math.round(Number(p.min_fare) || 0),
      _active: p.active,
    });
    if (error) return toast.error(error.message);
    toast.success(t("common.saved"));
  };

  const pending = drivers.filter((d) => d.status === "pending");
  const others = drivers.filter((d) => d.status !== "pending");

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="font-bold text-sm">{t("ride.admin.pricing")}</h2>
        {pricing.map((p, i) => (
          <div key={p.vehicle} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <VehicleIcon v={p.vehicle} className="w-4 h-4" /> {t(`ride.vehicle.${p.vehicle}`)}
              </div>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => setPricing((arr) => arr.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))}
                />
                {t("ride.admin.active")}
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["base_fare", "per_km", "min_fare"] as const).map((k) => (
                <label key={k} className="text-[11px] space-y-1">
                  <span className="text-muted-foreground">{t(`ride.admin.${k}`)}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={p[k]}
                    onChange={(e) =>
                      setPricing((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: Math.max(0, Number(e.target.value) || 0) } : x)))
                    }
                    className="h-9"
                  />
                </label>
              ))}
            </div>
            <button onClick={() => void savePrice(p)} className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
              {t("common.save")}
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm">{t("ride.admin.pendingDrivers", { n: String(pending.length) })}</h2>
        {pending.length === 0 && <p className="text-xs text-muted-foreground">{t("ride.admin.none")}</p>}
        {pending.map((d) => (
          <div key={d.user_id} className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/ho-so/${d.user_id}`} className="font-semibold text-sm hover:text-primary truncate">
                {d.profile?.full_name ?? d.user_id}
              </Link>
              <span className="text-xs text-muted-foreground shrink-0">{d.profile?.phone}</span>
            </div>
            <div className="text-xs">
              {t(`ride.vehicle.${d.vehicle}`)} · <b>{d.plate}</b>
              {d.vehicle_desc ? ` · ${d.vehicle_desc}` : ""}
              {d.also_delivery ? ` · ${t("ride.alsoDelivery")}` : ""}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {d.vehicle_photo_url && <StoredImage path={d.vehicle_photo_url} alt="" className="rounded-lg w-full h-24 object-cover" />}
              {d.license_photo_url && <StoredImage path={d.license_photo_url} alt="" className="rounded-lg w-full h-24 object-cover" />}
            </div>
            <Input
              value={note[d.user_id] ?? ""}
              onChange={(e) => setNote((n) => ({ ...n, [d.user_id]: e.target.value }))}
              placeholder={t("ride.admin.notePlaceholder")}
              className="h-9"
            />
            <div className="flex gap-2">
              <button onClick={() => void decide(d.user_id, "approved")} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> {t("ride.admin.approve")}
              </button>
              <button onClick={() => void decide(d.user_id, "rejected")} className="flex-1 h-9 rounded-lg border text-destructive text-xs font-semibold">
                {t("ride.admin.reject")}
              </button>
            </div>
          </div>
        ))}
      </section>

      {others.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="font-bold text-sm">{t("ride.admin.allDrivers")}</h2>
          {others.map((d) => (
            <div key={d.user_id} className="flex items-center gap-2 text-xs rounded-lg border p-2">
              <span className={cn("w-2 h-2 rounded-full", d.is_online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
              <span className="flex-1 truncate font-semibold">{d.profile?.full_name}</span>
              <span className="text-muted-foreground">{d.plate}</span>
              <span className={d.status === "approved" ? "text-primary" : "text-destructive"}>{t(`ride.driverStatus.${d.status}`)}</span>
              {d.status === "approved" && (
                <button onClick={() => void decide(d.user_id, "rejected")} className="text-destructive underline">
                  {t("ride.admin.suspend")}
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
