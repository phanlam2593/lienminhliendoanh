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
