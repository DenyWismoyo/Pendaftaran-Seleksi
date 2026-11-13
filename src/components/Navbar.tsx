'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileCheck, FileDown, Search, Settings2 } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { BRAND } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Program Seleksi', icon: FileCheck },
    { href: '/template-dokumen', label: 'Template Dokumen', icon: FileDown },
    { href: '/cek-status', label: 'Lacak Pendaftaran', icon: Search },
  ];

  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 backdrop-blur-sm no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-4">
        <Link href="/" className="group min-w-0">
          <BrandLogo subtitle={BRAND.shortTagline} />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/' || pathname.startsWith('/seleksi')
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
                    active
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="h-5 w-px bg-zinc-200 mx-1 hidden sm:block" />

          <Link
            href="/admin"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap',
              isAdmin
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Panel Admin</span>
          </Link>
        </nav>
      </div>

      {/* Navigasi mobile penuh lebar tanpa pembatas kiri-kanan */}
      <nav className="sm:hidden border-t border-zinc-200/80 bg-zinc-50/75 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === '/' || pathname.startsWith('/seleksi')
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 bg-white border border-zinc-200/80'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
