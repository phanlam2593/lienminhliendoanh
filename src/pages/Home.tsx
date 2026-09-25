import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { Users, Building2, Tag, ArrowRight, X, Search as SearchIcon, Star, Car, Bike, Package } from "lucide-react";
import { BUSINESS_TYPES, getMemberTierProgress, type Business, type BusinessType } from "@/lib/types";
import { useOnlineUsers } from "@/lib/onlineUsers";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { Avatar } from "@/components/Avatar";
import { StoredImage } from "@/components/StoredImage";
import { OpenBadge } from "@/components/OpenBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/LoadingState";

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
  const { t } = useLanguage();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [featured, setFeatured] = useState<BusinessCardData[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
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
      setStatsLoading(false);
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
        ? await supabase.from("business_card_stats").select("*").in("business_id", ids).range(0, 4999)
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
      setFeaturedLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <section
        className="text-white px-5 py-10 rounded-b-3xl"
        style={{ background: "linear-gradient(135deg, #00c9a7 0%, #0891b2 100%)" }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
          {t("home.badge")}
        </div>
        <h1 className="text-2xl font-extrabold leading-tight mt-3">{t("home.heroTitle")}</h1>
        <p className="text-sm opacity-95 mt-1.5">{t("app.tagline")}</p>
        <Link
          to="/kham-pha"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white text-cyan-700 font-semibold text-sm shadow-md"
        >
          {t("home.exploreBusinesses")} <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <section className="px-4 grid grid-cols-3 gap-2 -mt-8 relative z-10">
        <StatBtn
          icon={Users}
          value={stats.members}
          label={t("stats.members")}
          onClick={() => user && setModal("members")}
          loading={statsLoading}
        />
        <StatBtn
          icon={Building2}
          value={stats.businesses}
          label={t("stats.businesses")}
          onClick={() => user && setModal("businesses")}
          loading={statsLoading}
        />
        <StatBtn
          icon={Tag}
          value={stats.offers}
          label={user ? t("stats.offersClaimed") : t("stats.offers")}
          onClick={() => user && setModal("offers")}
          loading={statsLoading}
        />
      </section>

      {user && (
        // Lối vào Đưa đón & Giao hàng (26/09) — dạng BANNER kiểu Grab: tiêu đề + 2 nút đi thẳng
        // vào đúng loại (Đặt xe / Giao hàng), hình minh hoạ chìm bên phải. Trước đây là 1 dòng
        // giống mục danh sách nên nhìn lạc lõng giữa hàng số liệu và "Doanh nghiệp nổi bật".
        <section className="px-4">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-cyan-500/10 to-transparent p-4">
            <Car
              aria-hidden
              className="absolute -right-4 -bottom-5 w-32 h-32 text-primary/10 rotate-[-8deg] pointer-events-none"
            />
            <div className="relative">
              <div className="font-extrabold text-base leading-tight">{t("quet.rides.title")}</div>
              <p className="text-xs text-muted-foreground mt-0.5 pr-16 leading-snug">{t("home.ridesBanner")}</p>
              <div className="flex gap-2 mt-3">
                <Link
                  to="/dua-don"
                  className="flex-1 h-10 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] transition"
                >
                  <Bike className="w-4 h-4" /> {t("home.rideBook")}
                </Link>
                <Link
                  to="/dua-don?kind=hang"
                  className="flex-1 h-10 rounded-xl bg-card border text-primary text-sm font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition"
                >
                  <Package className="w-4 h-4" /> {t("home.rideDeliver")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">{t("home.featured")}</h2>
        </div>
        {featuredLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <FeaturedCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("home.noFeatured")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featured.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <footer className="px-4 pt-2 pb-4">
        <div className="rounded-2xl bg-accent dark:bg-card dark:border dark:border-border p-5 flex flex-col items-center text-center gap-3">
          <Logo size={44} asLink />
          <p className="text-sm font-bold text-foreground">{t("home.footerThanks")}</p>
          <div className="flex items-center justify-center gap-x-2 gap-y-1.5 text-xs font-medium text-muted-foreground flex-wrap">
            <Link to="/dieu-khoan" className="hover:text-primary transition-colors">
              {t("termsPage.title")}
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/chinh-sach-bao-mat" className="hover:text-primary transition-colors">
              {t("privacyPage.title")}
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/chinh-sach-cookie" className="hover:text-primary transition-colors">
              {t("cookiePage.title")}
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} {t("app.name")} · {t("footer.location")}
          </p>
        </div>
      </footer>

      <StatsModal
        kind={modal}
        onClose={() => setModal(null)}
        totalMembers={stats.members}
        totalBusinesses={stats.businesses}
      />
    </div>
  );
}

function StatBtn({
  icon: Icon,
  value,
  label,
  onClick,
  loading,
}: {
  icon: any;
  value: number;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-3 text-center bg-card border border-primary/20 shadow-soft hover:shadow-brand active:scale-95 transition-all"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-brand mx-auto mb-1.5 grid place-items-center animate-pulse-ring">
        <Icon className="w-4 h-4 text-white" />
      </div>
      {loading ? (
        <div className="h-6 w-8 mx-auto mb-0.5 rounded bg-muted animate-pulse" />
      ) : (
        <div className="text-xl font-extrabold text-primary">{value}</div>
      )}
      <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</div>
    </button>
  );
}

function FeaturedCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-36 bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// DANH SÁCH THỐNG KÊ (thiết kế lại 26/09) — bấm 3 ô số liệu ở Trang chủ.
// • Khung cao cố định (không nhảy chiều cao khi đang tải / tìm), đầu khung có icon + số lớn.
// • Thanh chip lọc: Thành viên (Mới nhất / Tích cực / Đang online), Doanh nghiệp (theo loại
//   hình), Ưu đãi đã nhận (Tất cả / Còn hạn / Hết hạn).
// • Thành viên dạng lưới 3 cột (avatar lớn, chấm online); Doanh nghiệp dạng thẻ có ảnh bìa;
//   Ưu đãi dạng "vé" có mã nổi bật + hạn dùng.
// • Tự tải thêm khi cuộn tới cuối (không cần bấm "Xem thêm").
// ─────────────────────────────────────────────────────────────────────────────
type MemberSort = "new" | "active" | "online";

// Nhãn hạng gọn cho lưới thành viên (không kèm thanh tiến độ như MemberLevelBadge — ô hẹp bị rối).
function MemberTierChip({ points, isAdmin }: { points: number; isAdmin?: boolean }) {
  const { t } = useLanguage();
  if (isAdmin) return <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">👑 BQT</span>;
  const { current } = getMemberTierProgress(points);
  return current ? (
    <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 whitespace-nowrap">
      {current.emoji} {t(`tier.${current.type}`)}
    </span>
  ) : (
    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t("level.newMember")}</span>
  );
}
type ClaimFilter = "all" | "valid" | "expired";

function StatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function StatsModal({
  kind,
  onClose,
  totalMembers,
  totalBusinesses,
}: {
  kind: StatKind | null;
  onClose: () => void;
  totalMembers: number;
  totalBusinesses: number;
}) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const onlineUsers = useOnlineUsers();
  const PAGE_SIZE = 30;
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [memberSort, setMemberSort] = useState<MemberSort>("new");
  const [bizType, setBizType] = useState<BusinessType | "all">("all");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onlineKey = [...onlineUsers.keys()].sort().join(",");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Ký tự đặc biệt trong ô tìm (dấu phẩy, ngoặc…) làm hỏng bộ lọc .or() của PostgREST → bỏ đi.
  const safe = (x: string) => x.replace(/[,()%*\\]/g, " ").trim();

  const loadMembers = async (pageNum: number, append: boolean, search: string) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("profiles_public")
      .select("id, full_name, username, avatar_url, status_message, points, created_at")
      .eq("status", "approved");
    if (memberSort === "online") {
      const ids = [...onlineUsers.keys()];
      if (ids.length === 0) {
        setItems([]);
        setHasMore(false);
        return;
      }
      query = query.in("id", ids.slice(0, 300));
    }
    query =
      memberSort === "active"
        ? query.order("points", { ascending: false }).order("created_at", { ascending: false })
        : query.order("created_at", { ascending: false });
    query = query.range(from, to);
    const s = safe(search);
    if (s) query = query.or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);
    const [{ data }, { data: roles }] = await Promise.all([query, supabase.rpc("get_admin_user_ids")]);
    setAdminIds(new Set((roles ?? []).map((r: any) => r.user_id)));
    const list = data ?? [];
    setItems((prev) => (append ? [...prev, ...list] : list));
    setHasMore(list.length === PAGE_SIZE);
  };

  const loadBusinesses = async (pageNum: number, append: boolean, search: string) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("businesses")
      .select("*")
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (bizType !== "all") query = query.eq("type", bizType);
    const s = safe(search);
    if (s) query = query.ilike("name", `%${s}%`);
    const { data: biz } = await query;
    const bizList = (biz as any[]) ?? [];
    const bizIds = bizList.map((b) => b.id);
    const [{ data: offers }, { data: stats }] = await Promise.all([
      bizIds.length
        ? supabase.from("offers").select("business_id, status").eq("status", "active").in("business_id", bizIds)
        : Promise.resolve({ data: [] as any[] }),
      bizIds.length
        ? supabase.from("business_card_stats").select("business_id, rating, review_count").in("business_id", bizIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const cnt = new Map<string, number>();
    (offers ?? []).forEach((o: any) => cnt.set(o.business_id, (cnt.get(o.business_id) ?? 0) + 1));
    const rMap = new Map((stats ?? []).map((s: any) => [s.business_id, s]));
    const list = bizList.map((b: any) => ({
      ...b,
      offerCount: cnt.get(b.id) ?? 0,
      rating: Number(rMap.get(b.id)?.rating ?? 0),
      reviewCount: rMap.get(b.id)?.review_count ?? 0,
    }));
    setItems((prev) => (append ? [...prev, ...list] : list));
    setHasMore(list.length === PAGE_SIZE);
  };

  const loadOffersClaimed = async () => {
    const { data: claims } = await supabase
      .from("offer_claims")
      .select("id, offer_id, code, claimed_at, expires_at")
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
      ? await supabase.from("businesses").select("id, name, cover_url").in("id", bizIds)
      : ({ data: [] } as any);
    const oMap = new Map((offs ?? []).map((o: any) => [o.id, o]));
    const bMap = new Map((biz ?? []).map((b: any) => [b.id, b]));
    setItems(
      list.map((c: any) => {
        const o = oMap.get(c.offer_id) as any;
        const b = o ? (bMap.get(o.business_id) as any) : null;
        return {
          ...c,
          offer_title: o?.title || t("home.offerDeleted"),
          business_id: o?.business_id ?? null,
          business_name: b?.name || "—",
          business_cover: b?.cover_url ?? null,
        };
      }),
    );
    setHasMore(false);
  };

  // Đóng khung → xoá sạch trạng thái để lần mở sau bắt đầu lại từ đầu.
  useEffect(() => {
    if (kind) return;
    setItems([]);
    setQ("");
    setDebouncedQ("");
    setMemberSort("new");
    setBizType("all");
    setClaimFilter("all");
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    let cancel = false;
    setPage(0);
    setLoading(true);
    setHasMore(true);
    (async () => {
      if (kind === "members") await loadMembers(0, false, debouncedQ);
      else if (kind === "businesses") await loadBusinesses(0, false, debouncedQ);
      else if (kind === "offers") await loadOffersClaimed();
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, debouncedQ, memberSort, bizType, memberSort === "online" ? onlineKey : ""]);

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore || kind === "offers") return;
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    if (kind === "members") await loadMembers(next, true, debouncedQ);
    else if (kind === "businesses") await loadBusinesses(next, true, debouncedQ);
    setLoadingMore(false);
  };

  // Cuộn tới gần cuối danh sách → tự tải trang tiếp.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  });

  const now = Date.now();
  const isExpired = (c: any) => !!c.expires_at && new Date(c.expires_at).getTime() < now;

  const filtered = useMemo(() => {
    if (kind !== "offers") return items;
    const k = q.trim().toLowerCase();
    return items.filter((i) => {
      if (claimFilter === "valid" && isExpired(i)) return false;
      if (claimFilter === "expired" && !isExpired(i)) return false;
      if (!k) return true;
      return (i.offer_title || "").toLowerCase().includes(k) || (i.business_name || "").toLowerCase().includes(k);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, kind, claimFilter]);

  const meta =
    kind === "members"
      ? { Icon: Users, title: t("stats.members"), total: totalMembers, sub: t("home.statsSub.members") }
      : kind === "businesses"
        ? { Icon: Building2, title: t("stats.businesses"), total: totalBusinesses, sub: t("home.statsSub.businesses") }
        : { Icon: Tag, title: t("stats.offersClaimed"), total: items.length, sub: t("home.statsSub.offers") };

  const fmt = (n: number) => n.toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
  const validCount = kind === "offers" ? items.filter((c) => !isExpired(c)).length : 0;

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
        {/* Đầu khung: icon + số lớn */}
        <DialogHeader className="px-4 pt-4 pb-3 text-left space-y-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-brand grid place-items-center shrink-0 shadow-sm">
              <meta.Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-extrabold leading-tight">{meta.title}</DialogTitle>
              <div className="text-xs text-muted-foreground">
                <span className="font-bold text-primary">{fmt(meta.total)}</span> {meta.sub}
                {kind === "offers" && items.length > 0 && <> · {t("home.claimsValid", { n: validCount })}</>}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tìm + lọc */}
        <div className="px-4 pb-2 space-y-2 border-b">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                kind === "members"
                  ? t("home.searchMembers")
                  : kind === "businesses"
                    ? t("home.searchBusinesses")
                    : t("home.searchClaims")
              }
              className="w-full h-10 pl-9 pr-9 rounded-full bg-muted/60 border-0 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label={t("home.clearSearch")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full grid place-items-center text-muted-foreground hover:bg-accent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {kind === "members" &&
              (["new", "active", "online"] as MemberSort[]).map((k) => (
                <StatChip key={k} active={memberSort === k} onClick={() => setMemberSort(k)}>
                  {k === "online" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />}
                  {t(`home.memberSort.${k}`)}
                  {k === "online" && onlineUsers.size > 0 && ` (${onlineUsers.size})`}
                </StatChip>
              ))}
            {kind === "businesses" &&
              (["all", ...BUSINESS_TYPES] as (BusinessType | "all")[]).map((k) => (
                <StatChip key={k} active={bizType === k} onClick={() => setBizType(k)}>
                  {k === "all" ? t("home.filterAll") : t(`type.${k}`)}
                </StatChip>
              ))}
            {kind === "offers" &&
              (["all", "valid", "expired"] as ClaimFilter[]).map((k) => (
                <StatChip key={k} active={claimFilter === k} onClick={() => setClaimFilter(k)}>
                  {t(`home.claimFilter.${k}`)}
                </StatChip>
              ))}
          </div>
        </div>

        {/* Danh sách */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {loading ? (
            kind === "members" ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border p-3 flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-14 h-14 rounded-full bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <meta.Icon className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {kind === "members" && memberSort === "online" && !debouncedQ
                  ? t("home.noneOnline")
                  : kind === "offers" && items.length === 0
                    ? t("home.noClaimsYet")
                    : t("common.noResults")}
              </p>
              {kind === "offers" && items.length === 0 && (
                <Link to="/kham-pha" onClick={onClose} className="inline-block text-sm font-semibold text-primary">
                  {t("home.exploreBusinesses")} →
                </Link>
              )}
            </div>
          ) : kind === "members" ? (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((m: any) => (
                <Link
                  key={m.id}
                  to={`/ho-so/${m.id}`}
                  onClick={onClose}
                  className="rounded-2xl border bg-card p-2.5 pt-3 flex flex-col items-center text-center gap-1 active:scale-95 transition hover:border-primary/40"
                >
                  <div className="relative">
                    <Avatar path={m.avatar_url} name={m.full_name} size={56} />
                    {onlineUsers.has(m.id) && (
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="text-xs font-bold leading-tight line-clamp-2 min-h-[2rem] w-full break-words">
                    {m.full_name || m.username}
                  </div>
                  <MemberTierChip points={m.points} isAdmin={adminIds.has(m.id)} />
                </Link>
              ))}
            </div>
          ) : kind === "businesses" ? (
            <div className="space-y-2">
              {filtered.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/dn/${b.id}`}
                  onClick={onClose}
                  className="flex gap-3 p-2 rounded-2xl border bg-card active:scale-[0.98] transition hover:border-primary/40"
                >
                  <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-muted shrink-0">
                    <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
                    {b.offerCount > 0 && (
                      <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-rose-500/90 rounded-full px-1.5 py-0.5">
                        <Tag className="w-2.5 h-2.5" /> {b.offerCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5 flex flex-col">
                    <div className="text-sm font-bold truncate">{b.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 shrink-0">
                        {t(`type.${b.type}`)}
                      </span>
                      <OpenBadge open={b.hours_open} close={b.hours_close} size="sm" />
                    </div>
                    <div className="mt-auto pt-1 text-[11px] text-muted-foreground flex items-center gap-2 min-w-0">
                      {b.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-foreground">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {b.rating.toFixed(1)}
                          <span className="font-normal text-muted-foreground">({b.reviewCount})</span>
                        </span>
                      ) : (
                        <span className="shrink-0">{t("home.noReviewsYet")}</span>
                      )}
                      {getLocation(b.address) && <span className="truncate">· 📍 {getLocation(b.address)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((c: any) => {
                const expired = isExpired(c);
                return (
                  <div
                    key={c.id}
                    className={cn("flex rounded-2xl border bg-card overflow-hidden", expired && "opacity-60")}
                  >
                    <div className="flex-1 min-w-0 p-3 space-y-1">
                      <div className="text-sm font-bold leading-snug line-clamp-2">{c.offer_title}</div>
                      {c.business_id ? (
                        <Link
                          to={`/dn/${c.business_id}`}
                          onClick={onClose}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary min-w-0"
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.business_name}</span>
                        </Link>
                      ) : (
                        <div className="text-xs text-muted-foreground">{c.business_name}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {t("home.claimedAgo", { time: timeAgo(c.claimed_at, lang) })}
                        {c.expires_at && (
                          <span className={cn("ml-1.5 font-semibold", expired ? "text-destructive" : "text-emerald-600")}>
                            ·{" "}
                            {expired
                              ? t("home.claimExpired")
                              : t("home.claimUntil", { date: new Date(c.expires_at).toLocaleDateString("vi-VN") })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Cuống vé: mã ưu đãi */}
                    <div className="relative w-24 shrink-0 border-l-2 border-dashed border-border bg-primary/5 flex flex-col items-center justify-center px-2 py-3">
                      <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-background border" />
                      <span className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-background border" />
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{t("home.code")}</div>
                      <div className="font-mono font-extrabold text-sm text-primary break-all text-center leading-tight">{c.code}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && hasMore && kind !== "offers" && (
            <div ref={sentinelRef} className="py-4">
              {loadingMore && <LoadingState className="py-2" />}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
