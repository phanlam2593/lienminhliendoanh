export function VNFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" width="22" height="15" className={className} aria-hidden="true">
      <rect width="30" height="20" rx="2" fill="#DA251D" />
      <path
        d="M15 3l1.4 4.3h4.5l-3.65 2.65 1.4 4.3L15 11.6l-3.65 2.65 1.4-4.3-3.65-2.65h4.5z"
        fill="#FFCD00"
      />
      <text
        x="15"
        y="19"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill="#fff"
        stroke="#000"
        strokeWidth="0.4"
      >
        VN
      </text>
    </svg>
  );
}

export function UKFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" width="22" height="15" className={className} aria-hidden="true">
      <rect width="30" height="20" rx="2" fill="#00247D" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#CF142B" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#CF142B" strokeWidth="3.2" />
      <text
        x="15"
        y="19"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fill="#fff"
        stroke="#000"
        strokeWidth="0.4"
      >
        EN
      </text>
    </svg>
  );
}
