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

export default function PrivacyPolicy() {
  const { t } = useLanguage();
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
        <h1 className="font-bold text-lg">{t("privacyPage.title")}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t("legal.lastUpdated")}</p>

      <Section title={t("privacyPage.s1Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("privacyPage.s1Li1")}</li>
          <li>{t("privacyPage.s1Li2")}</li>
          <li>{t("privacyPage.s1Li3")}</li>
          <li>{t("privacyPage.s1Li4")}</li>
          <li>{t("privacyPage.s1Li5")}</li>
        </ul>
      </Section>

      <Section title={t("privacyPage.s2Title")}>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("privacyPage.s2Li1")}</li>
          <li>{t("privacyPage.s2Li2")}</li>
          <li>{t("privacyPage.s2Li3")}</li>
          <li>{t("privacyPage.s2Li4")}</li>
          <li>{t("privacyPage.s2Li5")}</li>
        </ul>
      </Section>

      <Section title={t("privacyPage.s3Title")}>
        <p>{t("privacyPage.s3P1")}</p>
      </Section>

      <Section title={t("privacyPage.s4Title")}>
        <p>
          {t("privacyPage.s4Pre")} <b>{t("privacyPage.s4Bold")}</b> {t("privacyPage.s4Post")}
        </p>
      </Section>

      <Section title={t("privacyPage.s5Title")}>
        <p>{t("privacyPage.s5P1")}</p>
      </Section>

      <Section title={t("privacyPage.s6Title")}>
        <p>{t("privacyPage.s6P1")}</p>
      </Section>

      <Section title={t("privacyPage.s7Title")}>
        <p>{t("privacyPage.s7Intro")}</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>{t("privacyPage.s7Li1")}</li>
          <li>{t("privacyPage.s7Li2")}</li>
          <li>{t("privacyPage.s7Li3")}</li>
          <li>{t("privacyPage.s7Li4")}</li>
          <li>{t("privacyPage.s7Li5")}</li>
          <li>{t("privacyPage.s7Li6")}</li>
        </ul>
        <p>
          {t("privacyPage.s7Pre")}{" "}
          <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
            0339565246
          </a>
          . {t("privacyPage.s7Post")}
        </p>
      </Section>

      <Section title={t("privacyPage.s8Title")}>
        <p>{t("privacyPage.s8P1")}</p>
      </Section>

      <Section title={t("privacyPage.s9Title")}>
        <p>{t("privacyPage.s9P1")}</p>
      </Section>
    </div>
  );
}
