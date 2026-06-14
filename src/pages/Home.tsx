import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review, Profile } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { Users, Building2, Tag, Star, Facebook, Mail, Phone } from "lucide-react";
import { timeAgo } from "@/lib/time";

interface OfferWithBiz extends Offer { business?: { id: string; name: string } | null }
interface ReviewWithMeta extends Review { profile?: { full_name: string; avatar_url: string | null } | null; business?: { id: string; name: string } | null }

export default function Home() {
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [featured, setFeatured] = useState<BusinessCardData[]>([]);
  const [offers, setOffers] = useState<OfferWithBiz[]>([]);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const [memC, bizC, offC, feat, latestOffers, latestReviews] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("businesses").select("*").eq("status", "approved").eq("is_featured", true).limit(6),
      supabase.from("offers").select("*, business:businesses(id,name)").eq("status", "active").order("created_at", { ascending: false }).limit(5),
      supabase.from("reviews").select("*, business:businesses(id,name)").order("created_at", { ascending: false }).limit(5),
    ]);
    setStats({ members: memC.count ?? 0, businesses: bizC.count ?? 0, offers: offC.count ?? 0 });
    setFeatured(((feat.data ?? []) as Business[]).map(b => ({ ...b })));
    setOffers((latestOffers.data ?? []) as OfferWithBiz[]);
    const reviewsList = (latestReviews.data ?? []) as any[];
    const uids = [...new Set(reviewsList.map(r => r.user_id))];
    let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uids);
      (profs ?? []).forEach((p: any) => profMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    setReviews(reviewsList.map(r => ({ ...r, profile: profMap.get(r.user_id) ?? null })) as ReviewWithMeta[]);
  };

  return (
    <div className="space-y-6">
      <section className="bg-gradient-hero text-white px-5 py-10 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold leading-tight">Liên Minh Liên Đoàn</h1>
        <p className="text-sm opacity-90 mt-1">Kết nối thành viên & doanh nghiệp đối tác</p>
      </section>

      <section className="px-4 grid grid-cols-3 gap-2 -mt-8 relative z-10">
        <Stat icon={Users} value={stats.members} label="Thành viên" to="/admin" />
        <Stat icon={Building2} value={stats.businesses} label="Đối tác" to="/kham-pha" />
        <Stat icon={Tag} value={stats.offers} label="Ưu đãi" to="/uu-dai" />
      </section>

      <section className="px-4 space-y-3">
        <h2 className="font-bold text-lg flex items-center justify-between">
          Doanh nghiệp nổi bật
          <Link to="/kham-pha" className="text-xs text-primary font-medium">Xem tất cả</Link>
        </h2>
        {featured.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có doanh nghiệp nổi bật</p>
        ) : (
          <div className="grid gap-4">
            {featured.slice(0, 4).map(b => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}
      </section>

      <section className="px-4 space-y-3">
        <h2 className="font-bold text-lg">Ưu đãi mới</h2>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ưu đãi nào</p>
        ) : (
          <div className="space-y-2">
            {offers.map(o => (
              <Link key={o.id} to={`/dn/${o.business?.id}`} className="block p-3 rounded-xl bg-card shadow-sm hover:shadow-md">
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm line-clamp-1">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.business?.name}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 space-y-3">
        <h2 className="font-bold text-lg">Đánh giá mới nhất</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có đánh giá nào</p>
        ) : (
          <div className="space-y-2">
            {reviews.map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-bold">
                    {(r.profile?.full_name || "?").slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{r.profile?.full_name || "Ẩn danh"}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)} · <Link to={`/dn/${r.business?.id}`} className="text-primary">{r.business?.name}</Link></div>
                  </div>
                  <div className="flex items-center gap-0.5 text-yellow-500 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400" : "opacity-30"}`} />)}
                  </div>
                </div>
                {r.comment && <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="px-4 py-6 text-xs text-muted-foreground space-y-1 border-t mt-6">
        <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> lienminhliendoanh@gmail.com</div>
        <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> 0339565246</div>
        <a href="https://www.facebook.com/profile.php?id=61590228346408" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary">
          <Facebook className="w-3 h-3" /> Facebook
        </a>
      </footer>
    </div>
  );
}

function Stat({ icon: Icon, value, label, to }: { icon: any; value: number; label: string; to: string }) {
  return (
    <Link to={to} className="bg-card rounded-2xl p-3 shadow-md text-center">
      <Icon className="w-5 h-5 text-primary mx-auto" />
      <div className="text-xl font-extrabold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</div>
    </Link>
  );
}
