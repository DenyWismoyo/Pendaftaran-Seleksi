'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '@/components/BrandLogo';
import { auth } from '@/lib/firebase';
import { adminFetch } from '@/lib/adminClient';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const manualLoginRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !manualLoginRef.current) {
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
      toast.error('Masukkan email dan kata sandi admin/rekruter.');
      return;
    }

    setLoading(true);
    manualLoginRef.current = true;
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const check = await adminFetch('/api/admin/me');
      if (!check.success) {
        throw new Error(
          check.error || 'Akun tidak memiliki hak akses tim seleksi.'
        );
      }
      toast.success('Berhasil masuk ke Panel Kandidat.');
      router.replace('/admin');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Email atau kata sandi salah.'
      );
    } finally {
      manualLoginRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="ui-shell-narrow max-w-md py-6 sm:py-16">
      <div className="ui-card p-6 sm:p-7 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <BrandLogo showText={false} size="lg" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">
            Masuk Panel Kandidat
          </h1>
          <p className="text-xs text-zinc-500">
            Gunakan akun Admin atau Tim Rekrutmen resmi yang terdaftar pada platform
            Kandidat.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-800 block">
              Email Admin / Rekruter
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rekrutmen@perusahaan.co.id"
              className="ui-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-800 block">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="ui-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full ui-btn-primary"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>Masuk</span>
          </button>
        </form>
      </div>
    </div>
  );
}
