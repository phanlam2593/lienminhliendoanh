import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { adminLogin } from "@/lib/admin";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Shield } from "lucide-react";

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminLogin(username, password);
      toast.success("Đăng nhập admin thành công");
      nav("/admin");
    } catch (err: any) {
      toast.error(err.message || "Sai thông tin đăng nhập");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-card flex flex-col">
      <div className="px-5 pt-5">
        <button onClick={() => nav("/")} className="w-10 h-10 rounded-full bg-background grid place-items-center shadow-soft">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="mx-auto max-w-md w-full px-5 pt-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-brand grid place-items-center mx-auto mb-4 shadow-brand">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <Logo size={40} className="justify-center" />
        <h1 className="text-2xl font-extrabold mt-3">Quản trị viên</h1>
        <p className="text-sm text-muted-foreground">Khu vực dành riêng cho admin</p>
      </div>
      <form onSubmit={submit} className="mx-auto max-w-md w-full px-5 mt-6 space-y-3">
        <Field label="Tên đăng nhập" value={username} onChange={setU} />
        <Field label="Mật khẩu" type="password" value={password} onChange={setP} />
        <button disabled={busy} className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand active:scale-95 transition mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}ĐĂNG NHẬP ADMIN
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );
}
