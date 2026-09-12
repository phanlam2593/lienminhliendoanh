import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { triggerWelcomeOverlay } from "@/components/WelcomeOverlay";
import { useLanguage } from "@/lib/i18n";

export default function Login() {
  const nav = useNavigate();
  const { t } = useLanguage();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error) {
      setErr(t("login.wrongCredentials"));
      return;
    }
    triggerWelcomeOverlay();
    nav("/", { replace: true });
  };

  const loginWithGoogle = async () => {
    setErr(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setGoogleLoading(false);
      setErr(t("login.googleError"));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3 flex flex-col items-center">
          <Logo size={64} asLink />
          <h1 className="text-2xl font-bold">{t("common.login")}</h1>
          {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" — t("app.name") tự đổi theo ngôn ngữ */}
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            {t("app.name")}
          </Link>
        </div>
        <div className="space-y-3">
          <input
            value={username}
            onChange={(e) => setU(e.target.value)}
            placeholder={t("login.usernamePlaceholder")}
            autoCapitalize="none"
            autoComplete="username"
            required
            className="w-full px-4 py-3 rounded-xl border bg-card"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl border bg-card"
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <button
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
        >
          {loading ? t("login.loggingIn") : t("common.login")}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t("login.orDivider")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={googleLoading}
          className="w-full py-3 rounded-xl border bg-card font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <GoogleIcon className="w-5 h-5" />
          {t("login.continueWithGoogle")}
        </button>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-primary font-semibold">
            {t("login.forgotPassword")}
          </Link>
        </p>
        <p className="text-center text-sm">
          {t("login.noAccount")}{" "}
          <Link to="/auth/register" className="text-primary font-semibold">
            {t("common.register")}
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/">{t("login.backToHome")}</Link>
        </p>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.5l6.3 5.3C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}
