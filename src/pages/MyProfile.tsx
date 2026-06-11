import { useStore } from "@/lib/store";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LogOut, Shield, User as UserIcon, Plus, Store, Phone, Mail, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function MyProfile() {
  const { currentUser, session, logout, loginAdmin, businesses, usages } = useStore();
  const nav = useNavigate();
  const myUsages = currentUser ? usages.filter(u => u.userId === currentUser.id).length : 0;
  const myBiz = currentUser ? businesses.find(b => b.ownerId === currentUser.id) : null;

  if (!currentUser && !session.isAdmin) {
    return (
      <div className="px-5 pt-6 text-center">
        <Logo size={64} className="justify-center mb-3"/>
        <h1 className="text-xl font-extrabold">Chào mừng đến Liên Minh</h1>
        <p className="text-sm text-muted-foreground mb-6">Đăng ký để nhận ưu đãi độc quyền</p>
        <Link to="/dang-ky" className="block w-full py-4 rounded-2xl bg-gradient-brand text-white font-bold shadow-brand mb-3">
          Đăng ký thành viên
        </Link>
        <button onClick={() => { loginAdmin(); toast.success("Đã vào chế độ Admin"); nav("/admin"); }}
          className="w-full py-3 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2">
          <Shield className="w-4 h-4"/> Vào chế độ Admin (demo)
        </button>
      </div>
    );
  }

  if (session.isAdmin) {
    return (
      <div className="px-5 pt-5">
        <div className="rounded-3xl bg-gradient-brand text-white p-5 shadow-brand">
          <Shield className="w-8 h-8 mb-2"/>
          <div className="font-extrabold text-lg">Quản trị viên</div>
          <div className="text-xs opacity-90">Truy cập dashboard quản lý cộng đồng</div>
        </div>
        <Link to="/admin" className="mt-4 block w-full py-3.5 rounded-2xl bg-card border border-border font-bold text-sm text-center">
          Mở Dashboard Admin
        </Link>
        <button onClick={() => { logout(); toast.success("Đã đăng xuất"); }}
          className="mt-3 w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4"/> Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5">
      <div className="rounded-3xl bg-gradient-hero text-white p-5 shadow-brand relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-20"><Logo size={120}/></div>
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <UserIcon className="w-7 h-7"/>
          </div>
          <div>
            <div className="font-extrabold text-lg">{currentUser!.name}</div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              {currentUser!.isVerified && <Sparkles className="w-3 h-3"/>}
              {currentUser!.isVerified ? "Thành viên đã xác thực" : "Chưa xác thực"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <div className="text-2xl font-extrabold">{myUsages}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">Ưu đãi đã nhận</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
            <div className="text-2xl font-extrabold">{myBiz ? "1" : "0"}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">Doanh nghiệp</div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <InfoRow icon={Phone} label="Số điện thoại" value={currentUser!.phone}/>
        {currentUser!.email && <InfoRow icon={Mail} label="Email" value={currentUser!.email}/>}
        <InfoRow icon={MapPin} label="Thành phố" value={currentUser!.city}/>
      </div>

      {myBiz && (
        <Link to={`/dn/${myBiz.id}`} className="mt-4 block p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary"/>
            <div>
              <div className="font-bold text-sm">{myBiz.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {myBiz.status === "approved" ? "Đã duyệt" : myBiz.status === "pending" ? "Chờ duyệt" : "Từ chối"}
              </div>
            </div>
          </div>
        </Link>
      )}

      <Link to="/de-xuat" className="mt-3 flex items-center gap-2 p-3.5 rounded-2xl bg-card border border-border font-semibold text-sm">
        <Plus className="w-4 h-4 text-primary"/> Đề xuất doanh nghiệp
      </Link>
      <button onClick={() => { loginAdmin(); nav("/admin"); }}
        className="mt-2 w-full flex items-center gap-2 p-3.5 rounded-2xl bg-card border border-border font-semibold text-sm">
        <Shield className="w-4 h-4 text-secondary"/> Vào chế độ Admin (demo)
      </button>
      <button onClick={() => { logout(); toast.success("Đã đăng xuất"); }}
        className="mt-2 w-full p-3.5 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4"/> Đăng xuất
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
      <Icon className="w-4 h-4 text-primary"/>
      <div>
        <div className="text-[10px] uppercase text-muted-foreground font-bold">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
