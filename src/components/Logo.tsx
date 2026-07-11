import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import logo64 from "@/assets/logo-64.png.asset.json";
import logo128 from "@/assets/logo-128.png.asset.json";
import logo256 from "@/assets/logo-256.png.asset.json";
import logo512 from "@/assets/logo-512.png.asset.json";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh" — hiện qua t("app.name") để đổi theo ngôn ngữ
const BRAND = "#0891b2";

// Responsive srcset — browser picks the smallest variant that satisfies
// the rendered CSS size × devicePixelRatio. Keeps mobile crisp without
// shipping the full 1024px master to every viewport.
const SRCSET = [`${logo64.url} 64w`, `${logo128.url} 128w`, `${logo256.url} 256w`, `${logo512.url} 512w`].join(", ");

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
  const showTagline = withText && (withTagline ?? size >= 56);

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={pickSrc(size)}
        srcSet={SRCSET}
        sizes={`${size}px`}
        alt="Liên Minh Liên Doanh logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="eager"
        decoding="async"
        className="object-contain shrink-0"
      />
      {withText && (
        <div className="leading-tight">
          <div
            className="font-extrabold"
            style={{
              color: BRAND,
              letterSpacing: "1.5px",
              fontSize: size <= 36 ? 12 : size <= 56 ? 14 : 17,
            }}
          >
            {APP_NAME}
          </div>
          {showTagline && <div className="text-muted-foreground text-[11px] mt-0.5">{TAGLINE}</div>}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" aria-label="Trang chủ Liên Minh Liên Doanh">
        {content}
      </Link>
    );
  }
  return content;
}
