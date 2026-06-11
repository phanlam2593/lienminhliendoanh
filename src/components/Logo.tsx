import { cn } from "@/lib/utils";

export function Logo({ size = 40, withText = false, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        {/* outer ring */}
        <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-90" />
        <span className="absolute inset-[3px] rounded-full bg-background" />
        {/* connecting nodes */}
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="absolute top-1/2 -right-0.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-secondary" />
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="absolute top-1/2 -left-0.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-secondary" />
        {/* L */}
        <span
          className="relative text-gradient-brand font-extrabold leading-none"
          style={{ fontSize: size * 0.55, fontFamily: "'Plus Jakarta Sans', serif", fontStyle: "italic" }}
        >
          L
        </span>
      </div>
      {withText && (
        <div className="leading-tight">
          <div className="font-extrabold text-[15px] tracking-tight">LIÊN MINH</div>
          <div className="font-extrabold text-[15px] text-gradient-brand -mt-0.5">LIÊN DOANH</div>
        </div>
      )}
    </div>
  );
}
