import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME = "LIÊN MINH LIÊN DOANH";
const TAGLINE = "Một cộng đồng – Nhiều giá trị";
const GREEN = "#3a8a5a";

/**
 * Brand mark: forest-green circle.
 *   Top half  — 3 person silhouettes side by side (center taller).
 *   Bottom half — handshake (two hands clasping).
 * Beside it: "LIÊN MINH LIÊN DOANH" + tagline (when withText).
 * Whole control links to "/" when asLink.
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
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Liên Minh Liên Doanh logo"
      >
        {/* thin circle border, no fill */}
        <circle cx="32" cy="32" r="29" fill="none" stroke={GREEN} strokeWidth="2.5" />

        {/* top half — 3 person silhouettes (head circle + rounded body) */}
        {/* left person */}
        <circle cx="18" cy="20" r="3" fill={GREEN} />
        <path d="M13 30c0-2.8 2.2-5 5-5s5 2.2 5 5v3h-10v-3z" fill={GREEN} />
        {/* center person — slightly taller */}
        <circle cx="32" cy="17" r="3.5" fill={GREEN} />
        <path d="M26 28.5c0-3.3 2.7-6 6-6s6 2.7 6 6V33H26v-4.5z" fill={GREEN} />
        {/* right person */}
        <circle cx="46" cy="20" r="3" fill={GREEN} />
        <path d="M41 30c0-2.8 2.2-5 5-5s5 2.2 5 5v3H41v-3z" fill={GREEN} />

        {/* divider hairline */}
        <line x1="10" y1="36" x2="54" y2="36" stroke={GREEN} strokeWidth="0.6" opacity="0.4" />

        {/* bottom half — handshake (two hands clasping toward center) */}
        {/* left forearm */}
        <path d="M10 50 L22 44 L30 47 L24 52 L14 54 Z" fill={GREEN} />
        {/* right forearm */}
        <path d="M54 50 L42 44 L34 47 L40 52 L50 54 Z" fill={GREEN} />
        {/* clasping fingers in the middle */}
        <path
          d="M27 46c2-1.2 4-1.2 6 0c2-1.2 4-1.2 6 0l-2.5 3.5c-1.4 1-3.6 1-5 0c-1.4 1-3.6 1-5 0L27 46z"
          fill={GREEN}
        />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div
            className="font-extrabold"
            style={{
              color: GREEN,
              letterSpacing: "2px",
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
