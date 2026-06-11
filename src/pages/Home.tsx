import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Store, Gift, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { BusinessCard } from "@/components/BusinessCard";
import { Logo } from "@/components/Logo";

export default function Home() {
  const { businesses, users, usages } = useStore();
  const approved = businesses.filter(b => b.status === "approved");
  const featured = approved.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-white px-5 pt-6 pb-10 rounded-b-[2.5rem]">
        <div className="absolute inset-0 bg-gradient-glow opacity-60 pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> Cộng đồng ưu đãi #1
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">
            Một cộng đồng<br/><span className="text-white/90">Nhiều giá trị</span>
          </h1>
          <p className="text-sm text-white/80 mt-2 max-w-[260px]">
            Kết nối thành viên & doanh nghiệp đối tác. Nhận ưu đãi độc quyền ngay hôm nay.
          </p>

          <div className="mt-5 flex gap-2">
            <Link to="/dang-ky"
              className="flex-1 inline-flex items-center justify-center gap-1 bg-white text-primary font-bold text-sm py-3 rounded-2xl shadow-soft active:scale-95 transition">
              Tham gia ngay <ArrowRight className="w-4 h-4"/>
            </Link>
            <Link to="/kham-pha"
              className="px-4 inline-flex items-center justify-center gap-1 bg-white/15 backdrop-blur border border-white/30 font-semibold text-sm py-3 rounded-2xl">
              Khám phá
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            {[
              { icon: Users, label: "Thành viên", value: users.length },
              { icon: Store, label: "Doanh nghiệp", value: approved.length },
              { icon: Gift, label: "Lượt ưu đãi", value: usages.length },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl p-2.5 text-center border border-white/20">
                <s.icon className="w-4 h-4 mx-auto mb-1 opacity-90"/>
                <div className="text-lg font-extrabold">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-5 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/de-xuat" className="rounded-2xl p-4 bg-gradient-card border border-border shadow-soft active:scale-95 transition">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white grid place-items-center mb-2">
              <Plus className="w-5 h-5"/>
            </div>
            <div className="font-bold text-sm">Đề xuất doanh nghiệp</div>
            <div className="text-[11px] text-muted-foreground">Giới thiệu nơi bạn yêu thích</div>
          </Link>
          <Link to="/uu-dai" className="rounded-2xl p-4 bg-gradient-card border border-border shadow-soft active:scale-95 transition">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white grid place-items-center mb-2">
              <Gift className="w-5 h-5"/>
            </div>
            <div className="font-bold text-sm">Mã của tôi</div>
            <div className="text-[11px] text-muted-foreground">Xem mã ưu đãi đã nhận</div>
          </Link>
        </div>
      </section>

      {/* Featured */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-lg">Nổi bật trong cộng đồng</h2>
          <Link to="/kham-pha" className="text-xs font-semibold text-primary">Xem tất cả</Link>
        </div>
        <div className="space-y-3">
          {featured.map(b => <BusinessCard key={b.id} b={b} />)}
        </div>
      </section>

      <section className="px-5 mt-8 mb-4">
        <div className="rounded-3xl bg-gradient-brand text-white p-5 shadow-brand relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-20"><Logo size={120}/></div>
          <div className="relative">
            <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">Bạn đang kinh doanh?</div>
            <div className="font-extrabold text-lg mt-1">Trở thành đối tác của Liên Minh</div>
            <p className="text-sm opacity-90 mt-1">Tiếp cận hàng nghìn khách hàng cộng đồng.</p>
            <Link to="/dang-ky" className="mt-3 inline-flex items-center gap-1 bg-white text-primary font-bold text-sm px-4 py-2 rounded-xl">
              Đăng ký đối tác <ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
