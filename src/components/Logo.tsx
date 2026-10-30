import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import logo64 from "@/assets/logo-64.png.asset.json";
import logo128 from "@/assets/logo-128.png.asset.json";
import logo256 from "@/assets/logo-256.png.asset.json";
import logo512 from "@/assets/logo-512.png.asset.json";

// DO NOT CHANGE: app name is "iLomi" — hiện qua t("app.name") để đổi theo ngôn ngữ
// (31/10) màu thương hiệu cũ của chữ tên app — chữ giờ dùng Wordmark bên dưới

// Responsive srcset — browser picks the smallest variant that satisfies
// the rendered CSS size × devicePixelRatio. Keeps mobile crisp without
// shipping the full 1024px master to every viewport.
const SRCSET = [`${logo64.url} 64w`, `${logo128.url} 128w`, `${logo256.url} 256w`, `${logo512.url} 512w`].join(", ");

/**
 * (31/10, Kir chốt) Chữ "iLomi": font Baloo 2 đậm, "Lomi" chuyển màu xanh lá → xanh dương,
 * dấu chấm chữ i là chiếc lá. Nền sáng dùng dải màu đậm hơn để chữ không bị mờ.
 */
export function Wordmark({ name, fontSize, className }: { name: string; fontSize: number; className?: string }) {
  const lead = name.startsWith("i") ? "ı" : name.charAt(0);
  const rest = name.slice(1);
  return (
    <span
      className={cn("whitespace-nowrap", className)}
      style={{ fontFamily: "'Baloo 2', 'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize, lineHeight: 1, letterSpacing: "-0.02em" }}
    >
      <span className="relative inline-block text-[#059669] dark:text-[#34d399]">
        {lead}
        {name.startsWith("i") && (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="absolute fill-current"
            style={{ left: "50%", top: "-0.16em", width: "0.4em", height: "0.4em", transform: "translateX(-46%) rotate(-12deg)" }}
          >
            <path d="M4 20C4 10 10 4 21 3c0 11-6 17-17 17z" />
          </svg>
        )}
      </span>
      <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#059669_0%,#0891b2_55%,#2563eb_100%)] dark:bg-[linear-gradient(90deg,#34d399_0%,#22d3ee_55%,#3b82f6_100%)]">
        {rest}
      </span>
    </span>
  );
}

function pickSrc(size: number) {
  if (size <= 48) return logo64.url;
  if (size <= 96) return logo128.url;
  if (size <= 192) return logo256.url;
  return logo512.url;
}

/**
 * Brand mark: gradient circle with mountains, 3 people, and a handshake.
 * Serves responsive variants (64/128/256/512) via srcset for sharp rendering
 * on every DPR without overshipping bytes on small viewports.
 */
export function Logo({
  size = 40,
  withText = false,
  withTagline,
  className,
  asLink = false,
}: {
  size?: number;
  withText?: boolean;
  withTagline?: boolean;
  className?: string;
  asLink?: boolean;
}) {
  const { t } = useLanguage();
  // (31/10, Kir) Thanh đầu trang KHÔNG kèm khẩu hiệu — trang chủ đã có dòng "Một cộng đồng – Nhiều giá trị", để thì bị trùng.
  const showTagline = withText && (withTagline ?? false);
  const appName = t("app.name");

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={pickSrc(size)}
        srcSet={SRCSET}
        sizes={`${size}px`}
        alt={`${appName} logo`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="eager"
        decoding="async"
        className="object-contain shrink-0"
      />
      {withText && (
        <div className="flex flex-col gap-[3px] leading-tight min-w-0">
          <span aria-label={appName}>
            <Wordmark name={appName} fontSize={size <= 36 ? 25 : size <= 56 ? 32 : 40} />
          </span>
          {showTagline && (
            <div className="text-muted-foreground whitespace-nowrap" style={{ fontSize: size <= 36 ? 10 : 12 }}>
              {t("app.tagline")}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" aria-label={`${t("nav.home")} ${appName}`}>
        {content}
      </Link>
    );
  }
  return content;
}
