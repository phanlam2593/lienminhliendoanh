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
      </Section>

      <Section title={t("termsPage.s2Title")}>
        <p>{t("termsPage.s2P1")}</p>
        <p>{t("termsPage.s2P2")}</p>
        <p>{t("termsPage.s2P3")}</p>
      </Section>

      <Section title={t("termsPage.s3Title")}>
        <p>{t("termsPage.s3Intro")}</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s3Li1")}</li>
          <li>{t("termsPage.s3Li2")}</li>
          <li>{t("termsPage.s3Li3")}</li>
          <li>{t("termsPage.s3Li4")}</li>
        </ul>
      </Section>

      <Section title={t("termsPage.s4Title")}>
        <p>{t("termsPage.s4P1")}</p>
        <p>{t("termsPage.s4P2")}</p>
      </Section>

      <Section title={t("termsPage.s5Title")}>
        <p>{t("termsPage.s5P1")}</p>
      </Section>

      <Section title={t("termsPage.s6Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("termsPage.s6Li1")}</li>
          <li>{t("termsPage.s6Li2")}</li>
          <li>{t("termsPage.s6Li3")}</li>
        </ul>
        <p>{t("termsPage.s6P1")}</p>
      </Section>

      <Section title={t("termsPage.s7Title")}>
        <p>{t("termsPage.s7P1")}</p>
      </Section>

      <Section title={t("termsPage.s8Title")}>
        <p>{t("termsPage.s8P1")}</p>
      </Section>

      <Section title={t("termsPage.s9Title")}>
        <p>{t("termsPage.s9P1")}</p>
      </Section>

      <Section title={t("termsPage.s10Title")}>
        <p>
          {t("termsPage.s10Pre")}{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>{" "}
          {t("termsPage.s10Post", { app: appName })}
        </p>
      </Section>
    </div>
  );
}
