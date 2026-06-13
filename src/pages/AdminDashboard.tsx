import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LogOut, Users, Store, Ticket, Star, Shield } from "lucide-react";

export default function AdminDashboard() {
  const nav = useNavigate();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0, reviews: 0 });

  useEffect(() => {
    (async () => {
      const [m, b, o, r] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);
      setStats({ members: m.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0, reviews: r.count ?? 0 });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero text-primary-foreground px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <div>
            <div className="text-[10px] uppercase font-bold opacity-80 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </div>
            <div className="text-sm font-extrabold">{profile?.full_name || "Quản trị"}</div>
          </div>
        </div>
        <button onClick={async () => { await signOut(); nav("/"); }}
          className="w-9 h-9 grid place-items-center rounded-full bg-white/15">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="p-5 grid grid-cols-2 gap-3">
        <Card icon={Users} label="Thành viên" n={stats.members} />
        <Card icon={Store} label="Doanh nghiệp" n={stats.businesses} />
        <Card icon={Ticket} label="Ưu đãi" n={stats.offers} />
        <Card icon={Star} label="Đánh giá" n={stats.reviews} />
      </div>

      <div className="px-5 pb-10 text-xs text-muted-foreground">
        Bạn đang đăng nhập với quyền <b>admin</b>. Để quản lý chi tiết (duyệt, xóa…),
        dùng cổng quản trị tại{" "}
        <button className="text-primary font-bold" onClick={() => nav("/admin/login")}>/admin/login</button>.
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, n }: any) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-card">
      <Icon className="w-5 h-5 text-primary" />
      <div className="text-2xl font-extrabold mt-2">{n}</div>
      <div className="text-[11px] text-muted-foreground uppercase font-bold">{label}</div>
    </div>
  );
}
