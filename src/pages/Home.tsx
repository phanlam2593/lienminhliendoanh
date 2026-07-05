import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Building2, Tag, ArrowRight, Mail, Phone, Facebook, X, Search as SearchIcon, Star } from "lucide-react";
import type { Business } from "@/lib/types";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { Avatar } from "@/components/Avatar";
import { StoredImage } from "@/components/StoredImage";
import { OpenBadge } from "@/components/OpenBadge";
import { MemberLevelBadge } from "@/components/MemberLevelBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type StatKind = "members" | "businesses" | "offers";

function getLocation(address?: string | null): string | null {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [featured, setFeatured] = useState<BusinessCardData[]>([]);
  const [modal, setModal] = useState<StatKind | null>(null);

  useEffect(() => {
    (async () => {
      const { data: pub } = await supabase.rpc("get_public_stats").maybeSingle();
      let claimed = 0;
      if (user?.id) {
        const { count } = await supabase
          .from("offer_claims")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        claimed = count ?? 0;
      }
      setStats({
        members: (pub as any)?.members ?? 0,
        businesses: (pub as any)?.businesses ?? 0,
        offers: user?.id ? claimed : ((pub as any)?.offers ?? 0),
      });
    })();
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("created_at", { ascending: false });
      const ids = ((biz as Business[]) ?? []).map((b) => b.id);
      const { data: stats } = ids.length
        ? await supabase.from("business_card_stats").select("*").in("business_id", ids)
        : { data: [] as any[] };
      const sMap = new Map((stats ?? []).map((s: any) => [s.business_id, s]));
      setFeatured(
        ((biz as Business[]) ?? []).map((b) => {
          const s: any = sMap.get(b.id);
          return {
            ...b,
            rating: Number(s?.rating ?? 0),
            reviewCount: s?.review_count ?? 0,
            offerCount: s?.offer_count ?? 0,
            latestOffer: s?.latest_offer ?? null,
            latestOfferClaims: s?.latest_offer_claims ?? 0,
            latestReview:
              s?.latest_review_rating != null
                ? {
                    rating: s.latest_review_rating,
                    comment: s.latest_review_comment,
                    author: s.latest_review_author || "Ẩn danh",
                  }
                : null,
          };
        }),
      );
    })();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <section
        className="text-white px-5 py-10 rounded-b-3xl"
        style={{ background: "linear-gradient(135deg, #00c9a7 0%, #0891b2 100%)" }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
          ✦ Hệ sinh thái cộng đồng
        </div>
        <h1 className="text-2xl font-extrabold leading-tight mt-3">Nơi thành viên và doanh nghiệp cùng phát triển</h1>
        <p className="text-sm opacity-95 mt-1.5">Một cộng đồng – Nhiều giá trị</p>
        <Link
          to="/kham-pha"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white text-cyan-700 font-semibold text-sm shadow-md"
        >
          Khám phá doanh nghiệp <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <section className="px-4 grid grid-cols-3 gap-2 -mt-8 relative z-10">
        <StatBtn icon={Users} value={stats.members} label="Thành viên" onClick={() => user && setModal("members")} />
        <StatBtn
          icon={Building2}
          value={stats.businesses}
          label="Doanh nghiệp"
          onClick={() => user && setModal("businesses")}
        />
        <StatBtn
          icon={Tag}
          value={stats.offers}
          label={user ? "Ưu đãi đã nhận" : "Ưu đãi"}
          onClick={() => user && setModal("offers")}
        />
      </section>

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">Doanh nghiệp nổi bật</h2>
          <Link to="/kham-pha" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Chưa có doanh nghiệp nổi bật</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featured.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 py-4">
        <div className="text-xs font-bold text-muted-foreground text-center mb-3 uppercase tracking-wider">
          Liên hệ ban quản trị
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "mailto:lienminhliendoanh@gmail.com", icon: Mail, label: "Email" },
            { href: "tel:0339565246", icon: Phone, label: "Hotline" },
            { href: "https://www.facebook.com/profile.php?id=61590228346408", icon: Facebook, label: "Facebook" },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-primary/20 shadow-soft hover:shadow-brand active:scale-95 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-brand grid place-items-center animate-pulse-ring">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
            </a>
          ))}
        </div>
      </section>

      <StatsModal kind={modal} onClose={() => setModal(null)} />
    </div>
  );
}

function StatBtn({
  icon: Icon,
  value,
  label,
  onClick,
}: {
  icon: any;
  value: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-3 text-center bg-card border border-primary/20 shadow-soft hover:shadow-brand active:scale-95 transition-all"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-brand mx-auto mb-1.5 grid place-items-center animate-pulse-ring">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-xl font-extrabold text-primary">{value}</div>
      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</div>
    </button>
  );
}

function StatsModal({ kind, onClose }: { kind: StatKind | null; onClose: () => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!kind) {
      setItems([]);
      setQ("");
      return;
    }
    setLoading(true);
    (async () => {
      if (kind === "members") {
        const [{ data }, { data: roles }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, status_message, points, level, created_at")
            .eq("status", "approved")
            .order("created_at", { ascending: false }),
          supabase.rpc("get_admin_user_ids"),
        ]);
        setAdminIds(new Set((roles ?? []).map((r: any) => r.user_id)));
        setItems(data ?? []);
      } else if (kind === "businesses") {
        const [{ data: biz }, { data: offers }] = await Promise.all([
          supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false }),
          supabase.from("offers").select("business_id, status").eq("status", "active"),
        ]);
        const cnt = new Map<string, number>();
        (offers ?? []).forEach((o: any) => cnt.set(o.business_id, (cnt.get(o.business_id) ?? 0) + 1));
        const bizIds = ((biz as any[]) ?? []).map((b) => b.id);
        const { data: stats } = bizIds.length
          ? await supabase
              .from("business_card_stats")
              .select("business_id, rating, review_count")
              .in("business_id", bizIds)
          : { data: [] as any[] };
        const rMap = new Map((stats ?? []).map((s: any) => [s.business_id, s]));
        setItems(
          (biz ?? []).map((b: any) => ({
            ...b,
            offerCount: cnt.get(b.id) ?? 0,
            rating: Number(rMap.get(b.id)?.rating ?? 0),
            reviewCount: rMap.get(b.id)?.review_count ?? 0,
          })),
        );
      } else if (kind === "offers") {
        const { data: claims } = await supabase
          .from("offer_claims")
          .select("id, offer_id, code, claimed_at")
          .eq("user_id", user?.id ?? "")
          .order("claimed_at", { ascending: false })
          .limit(500);
        const list = claims ?? [];
        const offerIds = [...new Set(list.map((c: any) => c.offer_id))];
        const { data: offs } = offerIds.length
          ? await supabase.from("offers").select("id, title, business_id").in("id", offerIds)
          : { data: [] as any[] };
        const bizIds: string[] = Array.from(new Set(((offs ?? []) as any[]).map((o) => o.business_id as string)));
        const { data: biz } = bizIds.length
          ? await supabase.from("businesses").select("id, name").in("id", bizIds)
          : ({ data: [] } as any);
        const oMap = new Map((offs ?? []).map((o: any) => [o.id, o]));
        const bMap = new Map((biz ?? []).map((b: any) => [b.id, b.name]));
        setItems(
          list.map((c: any) => {
            const o = oMap.get(c.offer_id) as any;
            return {
              ...c,
              offer_title: o?.title || "(đã xóa)",
              business_name: o ? bMap.get(o.business_id) || "—" : "—",
            };
          }),
        );
      }
      setLoading(false);
    })();
  }, [kind]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    if (kind === "members")
      return items.filter(
        (i) => (i.full_name || "").toLowerCase().includes(k) || (i.username || "").toLowerCase().includes(k),
      );
    if (kind === "businesses")
      return items.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(k) ||
          (BUSINESS_TYPE_LABEL[i.type as keyof typeof BUSINESS_TYPE_LABEL] || "").toLowerCase().includes(k),
      );
    if (kind === "offers")
      return items.filter(
        (i) => (i.offer_title || "").toLowerCase().includes(k) || (i.business_name || "").toLowerCase().includes(k),
      );
    return items;
  }, [items, q, kind]);

  const title = kind === "members" ? "Thành viên" : kind === "businesses" ? "Doanh nghiệp" : "Ưu đãi đã nhận";

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>
            {title} ({filtered.length})
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Đang tải…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Không có kết quả</p>
          ) : kind === "members" ? (
            filtered.map((m: any) => (
              <Link
                key={m.id}
                to={`/ho-so/${m.id}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
              >
                <Avatar path={m.avatar_url} name={m.full_name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    <span className="truncate">{m.full_name}</span>
                    <MemberLevelBadge level={m.level} points={m.points} isAdmin={adminIds.has(m.id)} />
                  </div>
                  {m.status_message ? (
                    <div className="text-[11px] text-primary italic truncate font-medium">{m.status_message}</div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground truncate">
                      Tham gia {new Date(m.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : kind === "businesses" ? (
            filtered.map((b: any) => (
              <Link
                key={b.id}
                to={`/dn/${b.id}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 flex-wrap">
                    <span>{BUSINESS_TYPE_LABEL[b.type as keyof typeof BUSINESS_TYPE_LABEL] || b.type}</span>
                    <OpenBadge open={b.hours_open} close={b.hours_close} size="sm" />
                    <span>· {b.offerCount} ưu đãi</span>
                    {b.reviewCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        · <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {b.rating.toFixed(1)}
                      </span>
                    )}
                    {getLocation(b.address) && <span>· 📍 {getLocation(b.address)}</span>}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            filtered.map((c: any) => (
              <div key={c.id} className="p-3 rounded-lg bg-card border space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate flex-1">{c.offer_title}</div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    {c.code}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">🏢 {c.business_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(c.claimed_at).toLocaleString("vi-VN")}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
