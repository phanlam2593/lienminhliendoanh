import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { maskUsername } from "@/lib/passwordHint";
import { useLanguage } from "@/lib/i18n";

const ATTEMPT_KEY = "fp_attempts";
const LOCK_KEY = "fp_lock_until";
const MAX_ATTEMPTS = 3;
const LOCK_MS = 5 * 60 * 1000;

type Result = {
  username: string;
  password_hint: string | null;
};

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [lockUntil, setLockUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const [attempts, setAttempts] = useState<number>(0);

  useEffect(() => {
    const l = Number(localStorage.getItem(LOCK_KEY) ?? 0);
    if (l > Date.now()) setLockUntil(l);
    else localStorage.removeItem(LOCK_KEY);
    setAttempts(Number(localStorage.getItem(ATTEMPT_KEY) ?? 0));
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

    // Server tự báo khoá → khoá ngay, không tính vào số lần thử của máy này
    if (data?.locked) {
      const until = Date.now() + LOCK_MS;
      localStorage.setItem(LOCK_KEY, String(until));
      setLockUntil(until);
      localStorage.removeItem(ATTEMPT_KEY);
      setAttempts(0);
      setError(data?.message || t("fp.tryLater"));
      return;
    }

    // Lỗi mạng/hệ thống hoặc không tìm thấy tài khoản → tính 1 lần thử sai
    if (fnErr || !data || !data.found) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      localStorage.setItem(ATTEMPT_KEY, String(nextAttempts));
      if (nextAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_MS;
        localStorage.setItem(LOCK_KEY, String(until));
        setLockUntil(until);
        localStorage.removeItem(ATTEMPT_KEY);
        setAttempts(0);
        setError(t("fp.tooManyAttempts"));
      } else {
        setError(t("fp.notFound", { n: MAX_ATTEMPTS - nextAttempts }));
      }
      return;
    }

    // Thành công → reset đếm lần thử
    localStorage.removeItem(ATTEMPT_KEY);
    setAttempts(0);
    setResult({ username: data.username as string, password_hint: data.password_hint ?? null });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3 flex flex-col items-center">
          <Logo size={64} asLink />
          <h1 className="text-2xl font-bold">{t("fp.title")}</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            {t("app.name")}
          </Link>
        </div>

        {!result && (
          <form onSubmit={submit} className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("fp.emailPlaceholder")}
              type="email"
              required
              disabled={locked}
              className="w-full px-4 py-3 rounded-xl border bg-card"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("fp.phonePlaceholder")}
              required
              disabled={locked}
              className="w-full px-4 py-3 rounded-xl border bg-card"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {locked && (
              <p className="text-sm text-destructive">{t("fp.lockedMins", { n: lockMinsLeft })}</p>
            )}
            <button
              type="submit"
              disabled={loading || locked}
              className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
            >
              {loading ? t("fp.checking") : t("fp.confirm")}
            </button>
          </form>
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <p className="font-semibold text-emerald-600">{t("fp.successTitle")}</p>
            <div className="text-sm space-y-1">
              <div>
                {t("fp.usernameLabel")}: <span className="font-mono font-bold">{maskUsername(result.username)}</span>
              </div>
              {result.password_hint ? (
                <div>
                  {t("fp.hintLabel")}: <span className="font-mono font-bold">{result.password_hint}</span>
                </div>
              ) : (
                <div className="text-destructive">{t("fp.noHint")}</div>
              )}
            </div>
            {result.password_hint && (
              <div className="text-xs text-muted-foreground bg-accent rounded-lg p-3">
                {t("fp.tip")}
                <br />
                {t("fp.tipExample")}
              </div>
            )}
            <div className="text-xs space-y-1 pt-2 border-t">
              <p className="font-semibold">{t("fp.contactAdmin")}</p>
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
                  {t("app.name")}
                </a>
              </p>
            </div>
            <Link to="/auth/login" className="block text-center py-2 rounded-xl border text-sm font-semibold">
              ← {t("fp.backToLogin")}
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth/login">← {t("fp.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
