import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Vui lòng nhập đầy đủ thông tin");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return toast.error(error.message === "Invalid login credentials" ? "Email hoặc mật khẩu không đúng" : error.message); }
    const { data: roleData } = await (supabase as any).rpc("get_my_role");
    setBusy(false);
    toast.success("Đăng nhập thành công");
    if (roleData === "admin") nav("/admin"); else nav("/");
  };

  return (
    <div className="min-h-screen bg-gradient-card flex flex-col">
      <div className="px-5 pt-5">
        <button onClick={() => nav("/")} className="w-10 h-10 rounded-full bg-background grid place-items-center shadow-soft">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 pt-3 text-center">
        <Logo size={56} className="justify-center" />
        <h1 className="text-2xl font-extrabold mt-3">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Chào mừng quay lại Liên Minh</p>
      </div>
      <form onSubmit={submit} className="px-5 mt-6 space-y-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />
        <button disabled={busy} className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand active:scale-95 transition mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}ĐĂNG NHẬP
        </button>
        <p className="text-center text-sm text-muted-foreground pt-2">
          Chưa có tài khoản? <Link to="/auth/register" className="text-primary font-bold">Đăng ký</Link>
        </p>
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
