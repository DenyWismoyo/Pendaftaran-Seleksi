'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileCheck2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SUBMISSION_STATUS_META } from '@/lib/constants';
import { SubmissionStatus } from '@/types/selection';
import { cn, formatBytes, formatDateID } from '@/lib/utils';

interface TrackingResult {
  id: string;
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  status: SubmissionStatus;
  reviewerNote: string;
  files: { fieldLabel: string; fileName: string; size: number }[];
  createdAt: string;
  updatedAt: string;
}

function CekStatusContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const checkStatus = async (targetCode: string, targetEmail: string) => {
    if (!targetCode.trim() || !targetEmail.trim()) {
      toast.error('Masukkan kode pendaftaran dan email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/submissions?code=${encodeURIComponent(
          targetCode.trim()
        )}&email=${encodeURIComponent(targetEmail.trim())}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setResult(null);
        throw new Error(json.error || 'Data tidak ditemukan.');
      }
      setResult(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memeriksa status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qCode = searchParams.get('code');
    const qEmail = searchParams.get('email');
    if (qCode && qEmail) {
      checkStatus(qCode, qEmail);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkStatus(code, email);
  };

  const statusMeta = result
    ? SUBMISSION_STATUS_META[result.status] || SUBMISSION_STATUS_META.SUBMITTED
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Cek Status Pendaftaran Seleksi
        </h1>
        <p className="text-sm text-slate-600">
          Masukkan Kode Pendaftaran dan Email yang Anda gunakan saat mengisi formulir.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-800 block">
            Kode Pendaftaran
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Contoh: SEL-2026-AB12CD"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-800 block">
            Email Pelamar
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
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
            <Search className="w-4 h-4" />
          )}
          <span>Periksa Status</span>
        </button>
      </form>

      {result && statusMeta && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-mono text-slate-500">
                {result.registrationCode}
              </p>
              <h2 className="text-lg font-bold text-slate-900">{result.formTitle}</h2>
            </div>
            <span
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold border',
                statusMeta.badgeClass
              )}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Nama Pelamar</span>
              <span className="font-semibold text-slate-800">{result.applicantName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Tanggal Mendaftar</span>
              <span className="font-semibold text-slate-800">
                {formatDateID(result.createdAt)}
              </span>
            </div>
          </div>

          {result.reviewerNote && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1">
              <span className="text-xs font-semibold text-slate-600 block">
                Catatan Tim Seleksi:
              </span>
              <p className="text-sm text-slate-800">{result.reviewerNote}</p>
            </div>
          )}

          {result.files.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-600 block">
                Berkas Terunggah:
              </span>
              <div className="space-y-1.5">
                {result.files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-700 truncate">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {f.fieldLabel}: {f.fileName}
                    </span>
                    <span className="text-slate-400 shrink-0">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function CekStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CekStatusContent />
    </Suspense>
  );
}
