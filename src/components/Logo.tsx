import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// DO NOT CHANGE: app name is "Liên Minh Liên Doanh"
const APP_NAME_LINE_1 = "LIÊN MINH";
const APP_NAME_LINE_2 = "LIÊN DOANH";

/**
 * Brand mark: circle with two interlocking teal arcs (handshake / union motif).
 * Click area (mark + text) always navigates to "/".
 */
export function Logo({
  size = 40,
  withText = false,
  className,
  asLink = false,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  asLink?: boolean;
}) {
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
        <defs>
          <linearGradient id="lmldGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16a373" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* outer ring */}
        <circle cx="32" cy="32" r="29" fill="white" stroke="url(#lmldGrad)" strokeWidth="3" />
        {/* left arc — opens right */}
        <path
          d="M22 18 C 12 24, 12 40, 22 46"
          stroke="#16a373"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* right arc — opens left, interlocks with left */}
        <path
          d="M42 18 C 52 24, 52 40, 42 46"
          stroke="#0ea5e9"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* central handshake dot — meeting point */}
        <circle cx="32" cy="32" r="4" fill="url(#lmldGrad)" />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-extrabold text-[15px] tracking-tight">{APP_NAME_LINE_1}</div>
          <div className="font-extrabold text-[15px] text-gradient-brand -mt-0.5">{APP_NAME_LINE_2}</div>
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
