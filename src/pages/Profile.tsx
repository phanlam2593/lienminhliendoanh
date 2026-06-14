import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Business } from "@/lib/types";
import { BUSINESS_TYPE_LABEL } from "@/lib/types";
import { LogOut, PlusCircle, MessageSquare, Flag } from "lucide-react";

export default function Profile() {
  const { user, profile, role, refresh, signOut } = useAuth();
  const nav = useNavigate();
  const [biz, setBiz] = useState<Business[]>([]);
  const [fullName, setFN] = useState("");
  const [phone, setPh] = useState("");
  const [email, setE] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFN(profile?.full_name ?? "");
    setPh(profile?.phone ?? "");
    setE(profile?.email ?? "");
    supabase.from("businesses").select("*").eq("owner_id", user.id)
      .then(({ data }) => setBiz((data ?? []) as Business[]));
  }, [user?.id, profile?.id]);

  if (!user) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Bạn chưa đăng nhập</p>
        <Link to="/auth/login" className="inline-block px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold">Đăng nhập</Link>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, email }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã lưu");
    refresh();
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center text-2xl font-bold">
          {(profile?.full_name || profile?.username || "?").slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{profile?.full_name}</div>
          <div className="text-xs text-muted-foreground">@{profile?.username} · {role}</div>
          <StatusBadge s={profile?.status} />
        </div>
      </div>

      <section className="space-y-2 bg-card rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-sm">Thông tin cá nhân</h2>
        <input value={fullName} onChange={e => setFN(e.target.value)} placeholder="Họ tên" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input value={email} onChange={e => setE(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <input value={phone} onChange={e => setPh(e.target.value)} placeholder="SĐT" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
        <button onClick={save} disabled={saving} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm">{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
      </section>

      {biz.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-sm">Doanh nghiệp của tôi</h2>
          {biz.map(b => (
            <Link key={b.id} to={`/dn/${b.id}`} className="block p-3 bg-card rounded-xl shadow-sm">
              <div className="font-semibold text-sm">{b.name}</div>
              <div className="text-xs text-muted-foreground">{BUSINESS_TYPE_LABEL[b.type]} · <StatusBadge s={b.status} /></div>
            </Link>
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/de-xuat" className="flex items-center gap-2 p-3 bg-card rounded-xl shadow-sm text-sm font-semibold"><PlusCircle className="w-4 h-4" /> Đề xuất DN</Link>
        <Link to="/tin-nhan" className="flex items-center gap-2 p-3 bg-card rounded-xl shadow-sm text-sm font-semibold"><MessageSquare className="w-4 h-4" /> Tin nhắn</Link>
      </div>

      <button onClick={async () => { await signOut(); nav("/"); }} className="w-full py-2.5 rounded-xl border text-destructive font-semibold flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Đăng xuất
      </button>
    </div>
  );
}

function StatusBadge({ s }: { s?: string }) {
  if (!s) return null;
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const lbl: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
  return <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${map[s] || "bg-muted"}`}>{lbl[s] || s}</span>;
}
