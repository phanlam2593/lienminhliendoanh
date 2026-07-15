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

export default function Terms() {
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
        <h1 className="font-bold text-lg">{t("termsPage.title")}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t("legal.lastUpdated")}</p>

      <Section title={t("termsPage.s1Title")}>
        <p>{t("termsPage.s1P1", { app: appName })}</p>
        <p>{t("termsPage.s1P2")}</p>
      </Section>

      <Section title={t("termsPage.s2Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s2Li1", { app: appName })}</li>
          <li>{t("termsPage.s2Li2")}</li>
          <li>{t("termsPage.s2Li3")}</li>
          <li>{t("termsPage.s2Li4")}</li>
          <li>{t("termsPage.s2Li5")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s3Title")}>
        <p>{t("termsPage.s3P1")}</p>
        <p>{t("termsPage.s3P2")}</p>
      </Section>

      <Section title={t("termsPage.s4Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s4Li1")}</li>
          <li>{t("termsPage.s4Li2")}</li>
          <li>{t("termsPage.s4Li3")}</li>
          <li>{t("termsPage.s4Li4")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s5Title")}>
        <p>{t("termsPage.s5Intro")}</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s5Li1")}</li>
          <li>{t("termsPage.s5Li2")}</li>
          <li>{t("termsPage.s5Li3")}</li>
          <li>{t("termsPage.s5Li4")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s6Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s6Li1")}</li>
          <li>{t("termsPage.s6Li2")}</li>
          <li>{t("termsPage.s6Li3")}</li>
          <li>{t("termsPage.s6Li4")}</li>
          <li>{t("termsPage.s6Li5")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s7Title")}>
        <p>{t("termsPage.s7P1")}</p>
        <p>{t("termsPage.s7P2", { app: appName })}</p>
      </Section>

      <Section title={t("termsPage.s8Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s8Li1")}</li>
          <li>{t("termsPage.s8Li2")}</li>
          <li>{t("termsPage.s8Li3")}</li>
          <li>{t("termsPage.s8Li4")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s9Title")}>
        <p>{t("termsPage.s9P1")}</p>
        <p>{t("termsPage.s9P2")}</p>
      </Section>

      <Section title={t("termsPage.s10Title")}>
        <p>{t("termsPage.s10P1")}</p>
        <p>{t("termsPage.s10P2")}</p>
        <p>{t("termsPage.s10P3")}</p>
      </Section>

      <Section title={t("termsPage.s11Title")}>
        <p>{t("termsPage.s11P1")}</p>
        <p>{t("termsPage.s11P2")}</p>
      </Section>

      <Section title={t("termsPage.s12Title")}>
        <p>{t("termsPage.s12P1")}</p>
      </Section>

      <Section title={t("termsPage.s13Title")}>
        <p>{t("termsPage.s13P1")}</p>
      </Section>

      <Section title={t("termsPage.s14Title")}>
        <p>{t("termsPage.s14P1")}</p>
      </Section>

      <Section title={t("termsPage.s15Title")}>
        <p>{t("termsPage.s15P1")}</p>
      </Section>

      <Section title={t("termsPage.s16Title")}>
        <p>{t("termsPage.s16P1")}</p>
        <p>
          {t("termsPage.s16Pre")}{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>{" "}
          {t("termsPage.s16Post", { app: appName })}
        </p>
      </Section>
    </div>
  );
}
