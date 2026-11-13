'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { SUBMISSION_STATUS_META } from '@/lib/constants';
import { SubmissionStatus } from '@/types/selection';
import { cn, formatDateID } from '@/lib/utils';

interface RegistrationCardProps {
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  status?: SubmissionStatus;
  createdAt: string;
  fileCount?: number;
}

export default function RegistrationCard({
  registrationCode,
  formTitle,
  applicantName,
  applicantEmail,
  status = 'SUBMITTED',
  createdAt,
  fileCount = 0,
}: RegistrationCardProps) {
  const statusMeta = SUBMISSION_STATUS_META[status] || SUBMISSION_STATUS_META.SUBMITTED;
  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/cek-status?code=${encodeURIComponent(
          registrationCode
        )}&email=${encodeURIComponent(applicantEmail)}`
      : `/cek-status?code=${registrationCode}`;

  return (
    <div className="space-y-4">
      <div className="print-only-card ui-card sm:border-zinc-300 overflow-hidden">
        {/* Card Header Strip */}
        <div className="bg-zinc-900 text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              Kandidat · Kartu Bukti Pendaftaran
            </p>
            <h3 className="text-base sm:text-lg font-bold tracking-tight">
              {formTitle}
            </h3>
          </div>
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-md border bg-white',
              statusMeta.badgeClass
            )}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-4 flex-1 min-w-0">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                Nomor Registrasi
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-mono font-bold text-zinc-900 tracking-wider">
                  {registrationCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationCode);
                    toast.success('Nomor registrasi disalin.');
                  }}
                  className="no-print p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                  title="Salin kode"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-zinc-100 pt-3">
              <div>
                <span className="text-[11px] text-zinc-400 block">Nama Peserta</span>
                <span className="font-semibold text-zinc-900">{applicantName}</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Email Terdaftar</span>
                <span className="font-medium text-zinc-700 break-all">
                  {applicantEmail}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Tanggal Daftar</span>
                <span className="font-medium text-zinc-700">
                  {formatDateID(createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Lampiran Berkas</span>
                <span className="font-medium text-zinc-700">
                  {fileCount} dokumen terunggah
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50 self-center sm:self-auto">
            <QRCodeSVG value={verifyUrl} size={108} level="M" />
            <span className="text-[10px] font-mono text-zinc-500">
              Pindai Verifikasi
            </span>
          </div>
        </div>
      </div>

      <div className="no-print ui-mobile-pad flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="ui-btn-secondary border-zinc-300 text-xs sm:text-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak / Simpan PDF Kartu</span>
        </button>
      </div>
    </div>
  );
}

