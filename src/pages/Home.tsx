import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Business, Offer, Review } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";
import { Users, Building2, Tag, Facebook, Mail, Phone } from "lucide-react";

const FB_URL = "https://www.facebook.com/profile.php?id=61590228346408";

export default function Home() {
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [featured, setFeatured] = useState<BusinessCardData[]>([]);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const [memC, bizC, offC, feat] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("businesses").select("*").eq("status", "approved").eq("is_featured", true).limit(6),
    ]);
    setStats({ members: memC.count ?? 0, businesses: bizC.count ?? 0, offers: offC.count ?? 0 });
    const bizList = (feat.data ?? []) as Business[];
    const bids = bizList.map(b => b.id);
    if (!bids.length) { setFeatured([]); return; }

    const [{ data: offers }, { data: reviews }] = await Promise.all([
      supabase.from("offers").select("*").in("business_id", bids).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").in("business_id", bids).order("created_at", { ascending: false }),
    ]);

    // gather review authors
    const reviewsList = (reviews ?? []) as Review[];
    const uids = [...new Set(reviewsList.map(r => r.user_id))];
    let authorMap = new Map<string, string>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", uids);
      (profs ?? []).forEach((p: any) => authorMap.set(p.id, p.full_name));
    }

    const cards: BusinessCardData[] = bizList.map(b => {
      const bOffers = (offers as Offer[] | null)?.filter(o => o.business_id === b.id) ?? [];
      const bReviews = reviewsList.filter(r => r.business_id === b.id);
      const sum = bReviews.reduce((s, r) => s + r.rating, 0);
      const latestOffer = bOffers[0];
      const latestReview = bReviews[0];
      return {
        ...b,
        rating: bReviews.length ? sum / bReviews.length : 0,
        reviewCount: bReviews.length,
        offerCount: bOffers.length,
        latestOffer: latestOffer?.title ?? null,
        latestOfferClaims: latestOffer?.claim_count ?? 0,
        latestReview: latestReview
          ? { rating: latestReview.rating, comment: latestReview.comment, author: authorMap.get(latestReview.user_id) || "Ẩn danh" }
          : null,
      };
    });
    setFeatured(cards);
  };

  return (
    <div className="space-y-6">
      <section className="bg-gradient-hero text-white px-5 py-10 rounded-b-3xl">
        {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" */}
        <h1 className="text-2xl font-extrabold leading-tight">Liên Minh Liên Doanh</h1>
        <p className="text-sm opacity-90 mt-1">Một cộng đồng – Nhiều giá trị</p>
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
            {featured.slice(0, 6).map(b => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}
      </section>

      <footer className="px-4 py-6 text-xs text-muted-foreground space-y-1.5 border-t mt-6">
        <div className="font-bold text-foreground text-sm">Liên hệ admin:</div>
        <a href="mailto:lienminhliendoanh@gmail.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary"><Mail className="w-3 h-3" /> lienminhliendoanh@gmail.com</a>
        <a href="tel:0339565246" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary"><Phone className="w-3 h-3" /> 0339565246</a>
        <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary">
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
