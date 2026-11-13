'use client';

import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const ICON_SIZE_CLASSES = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8 sm:w-9 sm:h-9',
  lg: 'w-12 h-12',
} as const;

export default function BrandLogo({
  size = 'md',
  showText = true,
  subtitle = 'Rekrutmen & Seleksi Terpadu',
  className,
}: BrandLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 sm:gap-3 min-w-0', className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo Kandidat"
        className={cn('shrink-0 transition-transform group-hover:scale-[1.03]', ICON_SIZE_CLASSES[size])}
      >
        <rect x="1" y="1" width="38" height="38" rx="10" fill="#18181B" />
        <rect x="1.5" y="1.5" width="37" height="37" rx="9.5" stroke="#27272A" strokeWidth="1" />
        <rect x="10.75" y="10" width="4.5" height="20" rx="2.25" fill="#FFFFFF" />
        <path
          d="M17.5 19.6L27.75 11"
          stroke="#10B981"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M18.6 20.8L27.75 29"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <circle cx="29.5" cy="10.25" r="2" fill="#34D399" />
      </svg>

      {showText && (
        <div className="leading-tight min-w-0 text-left">
          <span className="font-extrabold text-zinc-900 tracking-tight text-base sm:text-lg block truncate">
            Kandidat
          </span>
          {subtitle && (
            <span className="text-[11px] text-zinc-500 font-medium hidden sm:block truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

