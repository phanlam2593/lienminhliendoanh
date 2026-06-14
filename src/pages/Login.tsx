import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { usernameToEmail } from "@/lib/types";
import { Logo } from "@/components/Logo";

export default function Login() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error) { setErr("Sai tên đăng nhập hoặc mật khẩu"); return; }
    toast.success("Đăng nhập thành công");
    nav("/");
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Đăng nhập Google thất bại");
      }
      // If redirected is true, browser is navigating away — no further action needed
      if (result.redirected) return;
      // If tokens were returned directly, session is already set
      if (!result.error && !result.redirected) {
        toast.success("Đăng nhập thành công");
        nav("/");
      }
    } catch (e: any) {
      toast.error(e.message || "Đăng nhập Google thất bại");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3 flex flex-col items-center">
          <Logo size={64} asLink />
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" */}
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Liên Minh Liên Doanh</Link>
        </div>
        <div className="space-y-3">
          <input value={username} onChange={e => setU(e.target.value)} placeholder="Tên đăng nhập"
            autoCapitalize="none" autoComplete="username" required
            className="w-full px-4 py-3 rounded-xl border bg-card" />
          <input type="password" value={password} onChange={e => setP(e.target.value)} placeholder="Mật khẩu"
            required minLength={6}
            className="w-full px-4 py-3 rounded-xl border bg-card" />
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50">
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>

        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <span className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="w-full py-3 rounded-xl border bg-card font-semibold flex items-center justify-center gap-2 hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Đang xử lý…" : "Đăng nhập với Google"}
        </button>

        <p className="text-center text-sm">
          Chưa có tài khoản? <Link to="/auth/register" className="text-primary font-semibold">Đăng ký</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/">← Quay lại trang chủ</Link>
        </p>
      </form>
    </div>
  );
}
