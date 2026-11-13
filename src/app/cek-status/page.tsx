'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Clock,
  FileCheck2,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import RegistrationCard from '@/components/RegistrationCard';
import { SubmissionStatus } from '@/types/selection';
import { cn, formatBytes } from '@/lib/utils';

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

function StatusMilestoneTimeline({ status }: { status: SubmissionStatus }) {
  const isRejected = status === 'REJECTED';
  const stageIndex =
    status === 'SUBMITTED'
      ? 1
      : status === 'REVIEWING'
        ? 2
        : 3;

  const steps = [
    { label: 'Pendaftaran Masuk', desc: 'Formulir & berkas diterima sistem' },
    { label: 'Verifikasi Berkas', desc: 'Pemeriksaan kelengkapan administrasi' },
    { label: 'Penilaian Panitia', desc: 'Peninjauan kriteria oleh tim seleksi' },
    {
      label: isRejected ? 'Tidak Lolos Seleksi' : 'Dinyatakan Lolos',
      desc: isRejected
        ? 'Belum memenuhi kriteria periode ini'
        : 'Selamat, Anda lolos tahap seleksi ini',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      {steps.map((step, idx) => {
        const completed = idx < stageIndex || (idx === 3 && status === 'ACCEPTED');
        const current = idx === stageIndex && idx < 3;
        const rejectedFinal = idx === 3 && isRejected;

        return (
          <div
            key={step.label}
            className={cn(
              'rounded-xl border p-3.5 space-y-1.5',
              rejectedFinal
                ? 'border-rose-200 bg-rose-50'
                : completed
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : current
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 bg-white opacity-60'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold',
                  rejectedFinal
                    ? 'bg-rose-600 text-white'
                    : completed
                      ? 'bg-emerald-600 text-white'
                      : current
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {rejectedFinal ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : completed ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
              </span>
              <span className="text-xs font-bold text-zinc-900">{step.label}</span>
            </div>
            <p className="text-[11px] text-zinc-600 leading-snug">{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="no-print max-w-xl mx-auto text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
          Lacak Status &amp; Kartu Seleksi
        </h1>
        <p className="text-sm text-zinc-600">
          Masukkan kode pendaftaran dan email Anda untuk melihat perkembangan
          verifikasi berkas serta mencetak kartu peserta.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="no-print max-w-2xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 block">
            Kode Pendaftaran
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SEL-2026-XXXXXX"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 block">
            Email Pelamar
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>Cek</span>
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Printable QR Registration Card */}
          <RegistrationCard
            registrationCode={result.registrationCode}
            formTitle={result.formTitle}
            applicantName={result.applicantName}
            applicantEmail={result.applicantEmail}
            status={result.status}
            createdAt={result.createdAt}
            fileCount={result.files.length}
          />

          {/* Visual Timeline & Notes (hidden in print) */}
          <section className="no-print rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Progres Tahapan Seleksi
            </h2>

            <StatusMilestoneTimeline status={result.status} />

            {result.reviewerNote && (
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-1">
                <span className="text-xs font-bold text-zinc-600 block">
                  Catatan Resmi Panitia:
                </span>
                <p className="text-sm text-zinc-900">{result.reviewerNote}</p>
              </div>
            )}

            {result.files.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-zinc-600 block">
                  Dokumen yang Sudah Diterima ({result.files.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.files.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-xs bg-zinc-50 px-3 py-2.5 rounded-xl border border-zinc-200"
                    >
                      <span className="flex items-center gap-2 font-medium text-zinc-800 truncate">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        {f.fieldLabel}: {f.fileName}
                      </span>
                      <span className="text-zinc-400 shrink-0">
                        {formatBytes(f.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function CekStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      }
    >
      <CekStatusContent />
    </Suspense>
  );
}
