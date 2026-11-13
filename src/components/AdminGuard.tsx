'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusCircle,
  ShieldAlert,
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
          res.error || 'Akun ini tidak memiliki izin akses administrator.'
        );
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm">Memverifikasi sesi administrator...</p>
      </div>
    );
  }

  if (deniedMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Akses Dibatasi</h1>
        <p className="text-sm text-slate-600">{deniedMsg}</p>
        <button
          onClick={async () => {
            await signOut(auth);
            router.replace('/admin/login');
          }}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
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
    { href: '/admin/submissions', label: 'Data Pendaftar', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
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
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{admin.email}</p>
            <p className="text-[11px] uppercase tracking-wider text-indigo-600 font-semibold">
              {admin.role}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace('/admin/login');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer"
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
