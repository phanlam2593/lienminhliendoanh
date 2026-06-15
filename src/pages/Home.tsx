import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Building2, Tag, Lightbulb, ArrowRight } from "lucide-react";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
export default function Home() {
  const { isApproved } = useAuth();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0 });

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
