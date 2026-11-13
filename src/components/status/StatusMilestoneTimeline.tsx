'use client';

import { AlertTriangle, Check, Clock, XCircle } from 'lucide-react';
import { SubmissionStatus } from '@/types/selection';
import { cn } from '@/lib/utils';

export default function StatusMilestoneTimeline({
  status,
}: {
  status: SubmissionStatus;
}) {
  const isRejected = status === 'REJECTED';
  const isRevision = status === 'NEEDS_REVISION';

  const stageIndex =
    status === 'SUBMITTED' || status === 'NEEDS_REVISION'
      ? 1
      : status === 'REVIEWING'
        ? 2
        : status === 'INTERVIEW'
          ? 3
          : 4;

  const steps = [
    { label: 'Pendaftaran Masuk', desc: 'Formulir & berkas diterima sistem' },
    {
      label: isRevision ? 'Perbaikan Berkas' : 'Verifikasi Berkas',
      desc: isRevision
        ? 'Unggah ulang berkas sesuai catatan panitia'
        : 'Pemeriksaan kelengkapan administrasi',
    },
    { label: 'Penilaian Panitia', desc: 'Peninjauan rekam jejak & kriteria' },
    { label: 'Wawancara / Gagasan', desc: 'Tahap uji paparan & klarifikasi' },
    {
      label: isRejected ? 'Tidak Lolos Seleksi' : 'Keputusan Akhir',
      desc: isRejected
        ? 'Belum memenuhi kriteria periode ini'
        : 'Penetapan kelulusan seleksi',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
      {steps.map((step, idx) => {
        const completed = idx < stageIndex || (idx === 4 && status === 'ACCEPTED');
        const current = idx === stageIndex && idx < 4;
        const rejectedFinal = idx === 4 && isRejected;
        const revisionStep = idx === 1 && isRevision;

        return (
          <div
            key={step.label}
            className={cn(
              'rounded-xl border p-3 space-y-1.5',
              rejectedFinal
                ? 'border-rose-200 bg-rose-50'
                : revisionStep
                  ? 'border-orange-300 bg-orange-50'
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
                  'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                  rejectedFinal
                    ? 'bg-rose-600 text-white'
                    : revisionStep
                      ? 'bg-orange-600 text-white'
                      : completed
                        ? 'bg-emerald-600 text-white'
                        : current
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {rejectedFinal ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : revisionStep ? (
                  <AlertTriangle className="w-3 h-3" />
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
