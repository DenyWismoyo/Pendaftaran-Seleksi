'use client';

import { useState } from 'react';
import { Award, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PanelLoginCardProps {
  initialCode?: string;
  onSuccess: () => void;
}

export default function PanelLoginCard({
  initialCode = '',
  onSuccess,
}: PanelLoginCardProps) {
  const [accessCode, setAccessCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error('Masukkan kode akses panitia seleksi Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/panel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Kode akses tidak valid.');
      }
      toast.success(`Selamat bertugas, ${json.data?.name || 'Panitia Seleksi'}.`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal login panitia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14">
      <div className="ui-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 mx-auto flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900">
            Portal Penilaian Panitia
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Masukkan kode akses unik yang diberikan oleh Administrator untuk meninjau berkas dan memberikan nilai tahapan seleksi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 block">
              Kode Akses Panitia
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="KND-XXXX-XXXX"
                autoComplete="off"
                className="ui-input pl-10 font-mono text-sm tracking-wider uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="ui-btn-accent w-full py-2.5 text-sm"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Masuk ke Ruang Penilaian</span>
          </button>
        </form>

        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 flex items-start gap-2.5 text-xs text-zinc-600">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>
            Sesi penilaian dilindungi enkripsi dan tercatat otomatis atas nama serta peran penilai Anda.
          </span>
        </div>
      </div>
    </div>
  );
}

