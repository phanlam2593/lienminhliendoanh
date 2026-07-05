import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { maskUsername } from "@/lib/passwordHint";

const ATTEMPT_KEY = "fp_attempts";
const LOCK_KEY = "fp_lock_until";
const MAX_ATTEMPTS = 3;
const LOCK_MS = 5 * 60 * 1000;

type Result = {
  username: string;
  password_hint: string | null;
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [lockUntil, setLockUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const l = Number(localStorage.getItem(LOCK_KEY) ?? 0);
    if (l > Date.now()) setLockUntil(l);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const locked = lockUntil > now;
  const lockMinsLeft = Math.ceil((lockUntil - now) / 60000);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError(null);
    setResult(null);
    setLoading(true);
    const { data, error: fnErr } = await supabase.functions.invoke("forgot-password", {
      body: { email: email.trim(), phone: phone.trim() },
    });
    setLoading(false);

    if (fnErr || !data || data.locked) {
      const until = Date.now() + LOCK_MS;
      localStorage.setItem(LOCK_KEY, String(until));
      setLockUntil(until);
      setError(data?.message || "Vui lòng thử lại sau ít phút hoặc liên hệ admin");
      return;
    }
    if (!data.found) {
      setError("Không tìm thấy tài khoản với thông tin này");
      return;
    }
    setResult({ username: data.username as string, password_hint: data.password_hint ?? null });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3 flex flex-col items-center">
          <Logo size={64} asLink />
          <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            Liên Minh Liên Doanh
          </Link>
        </div>

        {!result && (
          <form onSubmit={submit} className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email đã đăng ký"
              type="email"
              required
              disabled={locked}
              className="w-full px-4 py-3 rounded-xl border bg-card"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại đã đăng ký"
              required
              disabled={locked}
              className="w-full px-4 py-3 rounded-xl border bg-card"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {locked && (
              <p className="text-sm text-destructive">Vui lòng thử lại sau {lockMinsLeft} phút hoặc liên hệ admin</p>
            )}
            <button
              type="submit"
              disabled={loading || locked}
              className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
            >
              {loading ? "Đang kiểm tra…" : "Xác nhận"}
            </button>
          </form>
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <p className="font-semibold text-emerald-600">✅ Xác nhận thành công! Gợi ý tài khoản của bạn:</p>
            <div className="text-sm space-y-1">
              <div>
                Tên đăng nhập: <span className="font-mono font-bold">{maskUsername(result.username)}</span>
              </div>
              {result.password_hint ? (
                <div>
                  Mật khẩu gợi ý: <span className="font-mono font-bold">{result.password_hint}</span>
                </div>
              ) : (
                <div className="text-destructive">Tài khoản này chưa có gợi ý mật khẩu. Vui lòng liên hệ admin.</div>
              )}
            </div>
            {result.password_hint && (
              <div className="text-xs text-muted-foreground bg-accent rounded-lg p-3">
                💡 Tip: Mật khẩu thường là tên + số bạn hay dùng
                <br />
                Ví dụ: tên123, ngaysinh, tensdt...
              </div>
            )}
            <div className="text-xs space-y-1 pt-2 border-t">
              <p className="font-semibold">Vẫn không nhớ? Liên hệ admin:</p>
              <p>
                Zalo:{" "}
                <a
                  href="https://zalo.me/0339565246"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-semibold"
                >
                  0339565246
                </a>
              </p>
              <p>
                Facebook:{" "}
                <a
                  href="https://www.facebook.com/profile.php?id=61590228346408"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-semibold"
                >
                  Liên Minh Liên Doanh
                </a>
              </p>
            </div>
            <Link to="/auth/login" className="block text-center py-2 rounded-xl border text-sm font-semibold">
              ← Quay lại đăng nhập
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth/login">← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
