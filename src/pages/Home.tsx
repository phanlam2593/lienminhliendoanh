import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { Users, Building2, Tag, ArrowRight, X, Search as SearchIcon, Star } from "lucide-react";
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
  const { t } = useLanguage();
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
        />
        <StatBtn
          icon={Building2}
          value={stats.businesses}
          label={t("stats.businesses")}
          onClick={() => user && setModal("businesses")}
        />
        <StatBtn
          icon={Tag}
          value={stats.offers}
          label={user ? t("stats.offersClaimed") : t("stats.offers")}
          onClick={() => user && setModal("offers")}
        />
      </section>

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">{t("home.featured")}</h2>
        </div>
        {featured.length === 0 ? (
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
            <Link to="/huong-dan" className="hover:text-primary transition-colors">
              {t("profile.guide")}
            </Link>
            <span className="text-primary/50">•</span>
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
  const { t } = useLanguage();
  const PAGE_SIZE = 30;
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const loadMembers = async (pageNum: number, append: boolean, search: string) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("profiles")
      .select("id, full_name, avatar_url, status_message, points, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
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
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) query = query.ilike("name", `%${search}%`);
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
    setHasMore(false);
  };

  useEffect(() => {
    if (!kind) {
      setItems([]);
      setQ("");
      setDebouncedQ("");
      return;
    }
    setPage(0);
    setLoading(true);
    (async () => {
      if (kind === "members") await loadMembers(0, false, debouncedQ);
      else if (kind === "businesses") await loadBusinesses(0, false, debouncedQ);
      else if (kind === "offers") await loadOffersClaimed();
      setLoading(false);
    })();
  }, [kind, debouncedQ]);

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    if (kind === "members") await loadMembers(next, true, debouncedQ);
    else if (kind === "businesses") await loadBusinesses(next, true, debouncedQ);
    setLoadingMore(false);
  };

  const filtered = useMemo(() => {
    if (kind !== "offers") return items;
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (i) => (i.offer_title || "").toLowerCase().includes(k) || (i.business_name || "").toLowerCase().includes(k),
    );
  }, [items, q, kind]);

  const title =
    kind === "members" ? t("stats.members") : kind === "businesses" ? t("stats.businesses") : t("stats.offersClaimed");

  const countLabel =
    kind === "members" && !debouncedQ
      ? totalMembers
      : kind === "businesses" && !debouncedQ
        ? totalBusinesses
        : filtered.length;

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>
            {title} ({countLabel})
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("common.noResults")}</p>
          ) : kind === "members" ? (
            <>
              {filtered.map((m: any) => (
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
                      <MemberLevelBadge points={m.points} isAdmin={adminIds.has(m.id)} />
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
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  {loadingMore ? t("common.loading") : t("common.loadMore")}
                </button>
              )}
            </>
          ) : kind === "businesses" ? (
            <>
              {filtered.map((b: any) => (
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
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  {loadingMore ? t("common.loading") : t("common.loadMore")}
                </button>
              )}
            </>
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
