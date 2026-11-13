'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileCheck, FileDown, Search, Settings2 } from 'lucide-react';
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
    <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono text-xs font-bold tracking-tighter group-hover:bg-emerald-700 transition-colors">
            PS
          </div>
          <div className="leading-tight">
            <span className="font-bold text-zinc-900 tracking-tight text-sm sm:text-base block">
              Pendaftaran Seleksi
            </span>
            <span className="text-[11px] text-zinc-500 font-medium hidden sm:block">
              Registrasi Peserta &amp; Verifikasi Dokumen
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
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
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors',
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

          <div className="h-5 w-px bg-zinc-200 mx-1 hidden sm:block" />

          <Link
            href="/admin"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors',
              isAdmin
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Panitia</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
