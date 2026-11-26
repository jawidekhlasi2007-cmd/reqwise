import Link from "next/link";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#1b2742" />
      <rect x="7" y="8" width="13" height="2.5" rx="1.25" fill="#94a3b8" />
      <rect x="7" y="14.5" width="18" height="2.5" rx="1.25" fill="url(#brand-gradient)" />
      <rect x="7" y="21" width="10" height="2.5" rx="1.25" fill="#94a3b8" />
      <path d="M21 20.5l2.2 2.2 4-4.6" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLink() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <BrandMark />
      <span className="text-[17px] font-semibold tracking-tight text-fg">ReqWise</span>
    </Link>
  );
}
