import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-bold text-sm">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">{children}</div>
    </section>
  );
}

export default function CookieThirdParty() {
  const { t } = useLanguage();
  const appName = t("app.name");
  return (
    <div className="p-4 space-y-4 pb-10 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link
          to="/ho-so"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">{t("cookiePage.title")}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t("legal.lastUpdated")}</p>

      <Section title={t("cookiePage.s1Title")}>
        <p>{t("cookiePage.s1P1", { app: appName })}</p>
      </Section>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary leading-relaxed">
        {t("cookiePage.goodNote")}
      </div>

      <Section title={t("cookiePage.s2Title")}>
        <p>{t("cookiePage.s2P1")}</p>
      </Section>

      <Section title={t("cookiePage.s3Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("cookiePage.s3Item1")}</li>
          <li>{t("cookiePage.s3Item2")}</li>
          <li>{t("cookiePage.s3Item3")}</li>
          <li>{t("cookiePage.s3Item4")}</li>
          <li>{t("cookiePage.s3Item5")}</li>
        </ul>
        <p>{t("cookiePage.s3Footer")}</p>
      </Section>

      <Section title={t("cookiePage.s4Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("cookiePage.s4Item1")}</li>
          <li>{t("cookiePage.s4Item2")}</li>
          <li>{t("cookiePage.s4Item3")}</li>
          <li>{t("cookiePage.s4Item4")}</li>
        </ul>
        <p>{t("cookiePage.s4Footer")}</p>
      </Section>

      <Section title={t("cookiePage.s5Title")}>
        <p>{t("cookiePage.s5P1")}</p>
        <p>
          {t("cookiePage.s5Pre")}{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>{" "}
          {t("cookiePage.s5Post", { app: appName })}
        </p>
      </Section>
    </div>
  );
}
