import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import logoAsset from "@/assets/logo.webp.asset.json";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME = "LIÊN MINH LIÊN DOANH";
const TAGLINE = "Một cộng đồng – Nhiều giá trị";
const GREEN = "#1a5c35";

/**
 * Brand mark: forest-green circle with mountains, 3 people, and a handshake.
 * Uses the official uploaded brand asset. Clicking always navigates to "/".
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
        src={logoAsset.url}
        alt="Liên Minh Liên Doanh logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
      />
      {withText && (
        <div className="leading-tight">
          <div
            className="font-extrabold"
            style={{
              color: GREEN,
              letterSpacing: "1.5px",
              fontSize: size <= 36 ? 12 : size <= 56 ? 14 : 17,
            }}
          >
            {APP_NAME}
          </div>
          {showTagline && (
            <div className="text-muted-foreground text-[11px] mt-0.5">{TAGLINE}</div>
          )}
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
