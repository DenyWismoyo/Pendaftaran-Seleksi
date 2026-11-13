'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import RegistrationCard from '@/components/RegistrationCard';
import { SubmissionReceipt } from '@/components/seleksi/types';

interface SubmissionSuccessViewProps {
  receipt: SubmissionReceipt;
  fileCount: number;
}

export default function SubmissionSuccessView({
  receipt,
  fileCount,
}: SubmissionSuccessViewProps) {
  return (
    <div className="ui-shell-narrow max-w-3xl space-y-5 sm:space-y-6">
      <div className="no-print ui-callout-emerald sm:rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <h1 className="text-base sm:text-lg font-bold text-emerald-950">
            Pendaftaran Seleksi Berhasil Diterima
          </h1>
          <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
            Cetak atau simpan Kartu Bukti Pendaftaran di bawah ini. Anda dapat
            memantau progres seleksi kapan saja di halaman Lacak Pendaftaran.
          </p>
        </div>
      </div>

      <RegistrationCard
        registrationCode={receipt.registrationCode}
        formTitle={receipt.formTitle}
        applicantName={receipt.applicantName}
        applicantEmail={receipt.applicantEmail}
        status="SUBMITTED"
        createdAt={receipt.createdAt}
        fileCount={fileCount}
      />

      <div className="no-print ui-mobile-pad flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program</span>
        </Link>

        <Link
          href={`/cek-status?code=${encodeURIComponent(
            receipt.registrationCode
          )}&email=${encodeURIComponent(receipt.applicantEmail)}`}
          className="ui-btn-primary"
        >
          <span>Lacak Status Pendaftaran</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

