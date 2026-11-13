'use client';

import { Check, Clock, XCircle } from 'lucide-react';
import { SubmissionStatus } from '@/types/selection';
import { cn } from '@/lib/utils';

export default function StatusMilestoneTimeline({
  status,
}: {
  status: SubmissionStatus;
}) {
  const isRejected = status === 'REJECTED';
  const stageIndex =
    status === 'SUBMITTED' ? 1 : status === 'REVIEWING' ? 2 : 3;

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

