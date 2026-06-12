import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Business, Offer, Review } from "@/lib/types";
import { Sparkles, Store, Ticket, Users, Lightbulb, ArrowRight, Star } from "lucide-react";
import { BusinessCard } from "@/components/BusinessCard";

export default function Home() {
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [latestBiz, setLatestBiz] = useState<Business[]>([]);
  const [latestOffers, setLatestOffers] = useState<(Offer & { business?: Business })[]>([]);
  const [latestReviews, setLatestReviews] = useState<(Review & { business?: Business })[]>([]);

  useEffect(() => {
    (async () => {
      const [m, b, o, latest, oList, rList] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("offers").select("*", { count: "exact", head: true }),
        supabase.from("businesses").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(4),
        supabase.from("offers").select("*, business:businesses(*)").order("created_at", { ascending: false }).limit(3),
        supabase.from("reviews").select("*, business:businesses(*)").order("created_at", { ascending: false }).limit(3),
      ]);
      setStats({ members: m.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0 });
      setLatestBiz((latest.data as Business[]) || []);
      setLatestOffers((oList.data as any) || []);
      setLatestReviews((rList.data as any) || []);
    })();
  }, []);

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="relative px-5 pt-6 pb-8 bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white/20 rounded-full backdrop-blur">
            <Sparkles className="w-3 h-3" />Cộng đồng đối tác
          </div>
          <h1 className="text-2xl font-extrabold mt-3 leading-tight">
            Kết nối thành viên<br />và doanh nghiệp đối tác
          </h1>
          <p className="text-sm text-white/85 mt-2">Một cộng đồng - Nhiều giá trị</p>
          <div className="flex gap-2 mt-4">
            <Link to="/doanh-nghiep" className="flex-1 bg-white text-primary font-bold text-sm py-3 rounded-xl text-center shadow-soft">
              Khám phá doanh nghiệp
            </Link>
            <Link to="/uu-dai" className="flex-1 bg-white/15 backdrop-blur text-white font-bold text-sm py-3 rounded-xl text-center border border-white/30">
              Khám phá ưu đãi
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 -mt-5">
        <div className="grid grid-cols-3 gap-2 bg-card rounded-2xl p-3 shadow-card border border-border/60">
          <Stat icon={Users} label="Thành viên" n={stats.members} />
          <Stat icon={Store} label="Đối tác" n={stats.businesses} />
          <Stat icon={Ticket} label="Ưu đãi" n={stats.offers} />
        </div>
      </section>

      {/* CTA Suggest */}
      <section className="px-5 mt-5">
        <Link to="/de-xuat" className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-card border-2 border-primary/30 active:scale-[0.98] transition">
          <div className="w-11 h-11 rounded-xl bg-gradient-brand grid place-items-center shadow-brand">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Đề xuất doanh nghiệp mới</div>
            <div className="text-[11px] text-muted-foreground">Giới thiệu đối tác cho cộng đồng</div>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </Link>
      </section>

      {/* Latest businesses */}
      <Section title="Doanh nghiệp mới" to="/doanh-nghiep">
        {latestBiz.length === 0 ? (
          <EmptyHint>Chưa có doanh nghiệp nào. Hãy là người đầu tiên!</EmptyHint>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {latestBiz.map(b => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}
      </Section>

      {/* Latest offers */}
      <Section title="Ưu đãi mới" to="/uu-dai">
        {latestOffers.length === 0 ? (
          <EmptyHint>Chưa có ưu đãi nào.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {latestOffers.map(o => (
              <Link key={o.id} to={`/dn/${o.business_id}`} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-soft border border-border/60">
                <div className="w-10 h-10 rounded-lg bg-gradient-brand grid place-items-center text-white">
                  <Ticket className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm line-clamp-1">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">{o.business?.name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Latest reviews */}
      <Section title="Đánh giá mới nhất">
        {latestReviews.length === 0 ? (
          <EmptyHint>Chưa có đánh giá nào.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {latestReviews.map(r => (
              <Link key={r.id} to={`/dn/${r.business_id}`} className="block p-3 bg-card rounded-xl shadow-soft border border-border/60">
                <div className="flex items-center gap-1 text-warning">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="text-xs text-foreground mt-1 line-clamp-2">{r.content || "—"}</p>
                <div className="text-[10px] text-muted-foreground mt-1">{r.business?.name}</div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({ icon: Icon, label, n }: any) {
  return (
    <div className="text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <div className="text-xl font-extrabold text-foreground">{n}</div>
      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</div>
    </div>
  );
}

function Section({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <section className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-extrabold">{title}</h2>
        {to && <Link to={to} className="text-xs font-bold text-primary">Xem tất cả →</Link>}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="p-5 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl">{children}</div>;
}
