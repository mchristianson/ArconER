// Shield split red / blue with a gold flagstick: Arcon vs 838.
export function Crest({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" className={className} aria-hidden="true">
      <defs>
        <clipPath id="shield">
          <path d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#shield)">
        <rect x="0" y="0" width="20" height="46" fill="#c8102e" />
        <rect x="20" y="0" width="20" height="46" fill="#003c71" />
      </g>
      <path d="M20 1 L38 6 V22 C38 34 30 41 20 45 C10 41 2 34 2 22 V6 Z" fill="none" stroke="#b8912a" strokeWidth="2" />
      <line x1="19" y1="10" x2="19" y2="34" stroke="#fff" strokeWidth="1.6" />
      <path d="M19.8 10 L28 13 L19.8 16 Z" fill="#b8912a" />
      <ellipse cx="19" cy="35" rx="6" ry="1.6" fill="#fff" opacity=".85" />
    </svg>
  );
}
