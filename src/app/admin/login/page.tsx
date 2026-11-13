'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, LockKeyhole, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { adminFetch } from '@/lib/adminClient';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const res = await adminFetch('/api/admin/me');
        if (res.success) {
          router.replace('/admin');
        }
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Masukkan email dan kata sandi admin.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const check = await adminFetch('/api/admin/me');
      if (!check.success) {
        throw new Error(
          check.error || 'Akun tidak memiliki hak akses admin seleksi.'
        );
      }
      toast.success('Berhasil masuk ke Panel Admin.');
      router.replace('/admin');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Email atau kata sandi salah.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Login Panitia &amp; Admin Seleksi
          </h1>
          <p className="text-xs text-slate-500">
            Gunakan akun administrator Firebase yang terdaftar di proyek ini.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Email Administrator
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@domain.id"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>Masuk ke Panel Admin</span>
          </button>
        </form>
      </div>
    </div>
  );
}
