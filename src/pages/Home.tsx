import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Building2, Tag, Lightbulb, ArrowRight, Mail, Phone } from "lucide-react";
import type { Business, Offer, Review } from "@/lib/types";
import { BusinessCard, BusinessCardData } from "@/components/BusinessCard";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
export default function Home() {
  const { isApproved } = useAuth();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });
  const [featured, setFeatured] = useState<BusinessCardData[]>([]);

  useEffect(() => {
    (async () => {
      const [m, b, o] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setStats({ members: m.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0 });
    })();
  }, []);

  yEffect(() => {
    (async () => {
      const [{ data: biz }, { data: offers }, { data: reviews }] = await Promise.all([
        supabase.from("businesses").select("*").eq("status", "approved").eq("is_featured", true).order("created_at", { ascending: false }),
        supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      ]);
      const offersList = (offers as Offer[] | null) ?? [];
      const reviewsList = (reviews as Review[] | null) ?? [];

      const uids = [...new Set(reviewsList.map(r => r.user_id))];
      let authorMap = new Map<string, string>();
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", uids);
        (profs ?? []).forEach((p: any) => authorMap.set(p.id, p.full_name));
      }

      setFeatured(((biz as Business[]) ?? []).map(b => {
        const bOffers = offersList.filter(o => o.business_id === b.id);
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
      }));
    })();
  }, []);

  return (
    <div className="space-y-6 pb-6">
      {/* Section 1 — Hero */}
      <section
        className="text-white px-5 py-10 rounded-b-3xl"
        style={{ background: "linear-gradient(135deg, #00c9a7 0%, #0891b2 100%)" }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
          ✦ Cộng đồng đối tác
        </div>
        <h1 className="text-2xl font-extrabold leading-tight mt-3">
          Kết nối thành viên và doanh nghiệp đối tác
        </h1>
        <p className="text-sm opacity-95 mt-1.5">Một cộng đồng – Nhiều giá trị</p>
        <Link
          to="/kham-pha"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white text-cyan-700 font-semibold text-sm shadow-md"
        >
          Khám phá doanh nghiệp <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Section 2 — Stats */}
      <section className="px-4 grid grid-cols-3 gap-2 -mt-8 relative z-10">
        <Stat icon={Users} value={stats.members} label="Thành viên" />
        <Stat icon={Building2} value={stats.businesses} label="Đối tác" />
        <Stat icon={Tag} value={stats.offers} label="Ưu đãi" />
      </section>

      {/* Section 3 — Suggest card (approved members only) */}
      {isApproved && (
        <section className="px-4">
          <Link
            to="/de-xuat"
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-11 h-11 rounded-xl grid place-items-center bg-amber-100 shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Đề xuất doanh nghiệp mới</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Giới thiệu đối tác cho cộng đồng
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        </section>
      )}

      {/* Section 4 — Featured businesses */}
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
            {featured.map(b => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}
      </section>

      {/* Section 5 — Contact */}
      <section className="px-4 py-6 text-center">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Liên hệ admin</h3>
        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          <a href="mailto:lienminhliendoanh@gmail.com" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Mail className="w-3.5 h-3.5" /> lienminhliendoanh@gmail.com
          </a>
          <a href="tel:0339565246" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Phone className="w-3.5 h-3.5" /> 0339565246
          </a>
          <a href="https://www.facebook.com/profile.php?id=61590228346408" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            Facebook
          </a>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="bg-card rounded-2xl p-3 shadow-md text-center">
      <Icon className="w-5 h-5 text-primary mx-auto" />
      <div className="text-xl font-extrabold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</div>
    </div>
  );
}
