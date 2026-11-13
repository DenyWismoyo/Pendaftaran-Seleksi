'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  ShieldAlert,
  UserCog,
  Users,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { adminFetch } from '@/lib/adminClient';
import { cn } from '@/lib/utils';

interface AdminSession {
  uid: string;
  email?: string;
  role: string;
}

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [deniedMsg, setDeniedMsg] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdmin(null);
        setChecking(false);
        router.replace('/admin/login');
        return;
      }

      const res = await adminFetch<AdminSession>('/api/admin/me');
      if (res.success && res.data) {
        setAdmin(res.data);
        setDeniedMsg('');
      } else {
        setAdmin(null);
        setDeniedMsg(
          res.error || 'Akun ini tidak memiliki izin akses tim seleksi / rekrutmen.'
        );
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        <p className="text-sm">Memverifikasi sesi admin...</p>
      </div>
    );
  }

  if (deniedMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-900">Akses Dibatasi</h1>
        <p className="text-sm text-zinc-600">{deniedMsg}</p>
        <button
          onClick={async () => {
            await signOut(auth);
            router.replace('/admin/login');
          }}
          className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold cursor-pointer"
        >
          Keluar &amp; Ganti Akun
        </button>
      </div>
    );
  }

  if (!admin) return null;

  const tabs = [
    { href: '/admin', label: 'Daftar Formulir', icon: LayoutDashboard },
    { href: '/admin/forms/new', label: 'Buat Formulir', icon: PlusCircle },
    { href: '/admin/templates', label: 'Bank Template', icon: FileText },
    { href: '/admin/submissions', label: 'Verifikasi Pelamar', icon: Users },
    { href: '/admin/users', label: 'Kelola Tim', icon: UserCog },
  ];

  return (
    <div className="ui-shell-admin space-y-5 sm:space-y-6">
      <div className="ui-card-compact px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active =
              t.href === '/admin'
                ? pathname === '/admin' ||
                  (pathname.startsWith('/admin/forms/') &&
                    pathname !== '/admin/forms/new')
                : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 border-t border-zinc-100 sm:pt-0 sm:border-t-0">
          <div className="sm:text-right">
            <p className="text-xs font-semibold text-zinc-800 truncate max-w-[200px]">
              {admin.email}
            </p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              {admin.role}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace('/admin/login');
            }}
            className="ui-btn-secondary px-3 py-2 text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
