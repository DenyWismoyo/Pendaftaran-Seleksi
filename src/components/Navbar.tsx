'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, Search, ShieldCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Program Seleksi', icon: FileText },
    { href: '/cek-status', label: 'Cek Status', icon: Search },
    { href: '/admin', label: 'Panel Admin', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight block leading-none">
              Pendaftaran &amp; Seleksi
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Portal Registrasi &amp; Berkas
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
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
