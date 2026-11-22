import { useGoBack } from "@/lib/navigation";
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

// 22/11/2026 (Kir): viết lại theo luật VN hiện hành (An ninh mạng 2025, Bảo vệ dữ liệu cá nhân 2025, Trí tuệ nhân tạo 2025,
//   Bảo vệ quyền lợi người tiêu dùng 2023, NĐ 147/2024) và tính năng hiện có (Lomi có dùng AI cho câu bí, thuốc nam Long Châu…).
//   Nội dung ở i18n.tsx (termsPage.<mục>.<số>); thêm / bớt ý thì sửa số lượng ở đây.
const SECTIONS: [key: string, kind: "p" | "li", count: number][] = [
  ["intro", "p", 2],
  ["def", "li", 6],
  ["cond", "p", 3],
  ["acc", "li", 6],
  ["conduct", "li", 6],
  ["biz", "li", 6],
  ["quet", "li", 6],
  ["ride", "li", 6],
  ["chat", "li", 4],
  ["lomi", "li", 11],
  ["member", "li", 4],
  ["data", "li", 5],
  ["ip", "p", 2],
  ["ban", "li", 8],
  ["report", "li", 4],
  ["end", "p", 3],
  ["liab", "li", 4],
  ["indem", "p", 1],
  ["law", "p", 2],
  ["force", "p", 1],
  ["lang", "p", 1],
  ["change", "p", 1],
];

export default function Terms() {
  const goBack = useGoBack();
  const { t } = useLanguage();
  const appName = t("app.name");
  return (
    <div className="p-4 space-y-4 pb-10 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goBack("/")}
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">{t("termsPage.title")}</h1>
      </div>
      <p className="text-xs text-muted-foreground">{t("termsPage.lastUpdated")}</p>

      {SECTIONS.map(([key, kind, n]) => {
        const items = Array.from({ length: n }, (_, i) => t(`termsPage.${key}.${i + 1}`, { app: appName }));
        return (
          <Section key={key} title={t(`termsPage.${key}.t`)}>
            {kind === "li" ? (
              <ul className="list-disc pl-4 space-y-1">
                {items.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            ) : (
              items.map((x, i) => <p key={i}>{x}</p>)
            )}
            {key === "change" && (
              <p>
                {t("termsPage.contactPre")}{" "}
                <a href="https://zalo.me/0339565246" className="text-primary font-semibold">
                  0339565246
                </a>{" "}
                {t("termsPage.contactPost", { app: appName })}
              </p>
            )}
          </Section>
        );
      })}

      <div className="pt-4 flex justify-center">
        <button
          type="button"
          onClick={() => goBack("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </button>
      </div>
    </div>
  );
}
