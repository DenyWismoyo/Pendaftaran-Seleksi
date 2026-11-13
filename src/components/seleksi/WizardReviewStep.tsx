'use client';

import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { ChecklistItem, DuplicateInfo, WizardStep } from '@/components/seleksi/types';
import { cn, formatBytes } from '@/lib/utils';
import { SelectionField, UploadedFileMeta } from '@/types/selection';

interface WizardReviewStepProps {
  fields: SelectionField[];
  wizardSteps: WizardStep[];
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  uploadingFields: Record<string, boolean>;
  checkedFileIds: Record<string, boolean>;
  missingItems: ChecklistItem[];
  duplicateInfo: DuplicateInfo | null;
  selfCheckReadability: boolean;
  selfCheckTruthfulness: boolean;
  onJumpToStep: (stepIndex: number) => void;
  onOpenPreview: (file: UploadedFileMeta) => void;
  onFileUpload: (field: SelectionField, file: File) => void;
  onReadabilityChange: (checked: boolean) => void;
  onTruthfulnessChange: (checked: boolean) => void;
}

export default function WizardReviewStep({
  fields,
  wizardSteps,
  applicantName,
  applicantEmail,
  applicantPhone,
  answers,
  files,
  uploadingFields,
  checkedFileIds,
  missingItems,
  duplicateInfo,
  selfCheckReadability,
  selfCheckTruthfulness,
  onJumpToStep,
  onOpenPreview,
  onFileUpload,
  onReadabilityChange,
  onTruthfulnessChange,
}: WizardReviewStepProps) {
  const uploadedFormFiles = fields
    .filter((f) => f.type === 'file')
    .map((f) => ({
      field: f,
      uploaded: files.find((item) => item.fieldId === f.id),
    }));

  return (
    <div className="space-y-6">
      {missingItems.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2.5">
          <div className="flex items-start gap-2 text-rose-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">
                Masih ada {missingItems.length} item wajib yang belum lengkap
              </p>
              <p className="text-xs text-rose-800">
                Klik salah satu item di bawah untuk langsung menuju bagian yang
                perlu dilengkapi.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-7">
            {missingItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onJumpToStep(item.stepIndex)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {duplicateInfo && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <div className="flex items-start gap-2.5 text-amber-950">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <div className="space-y-1.5">
              <p className="text-sm font-bold">{duplicateInfo.message}</p>
              {duplicateInfo.registrationCode && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-mono bg-white border border-amber-200 px-2.5 py-1 rounded-md font-semibold">
                    Kode Terdaftar: {duplicateInfo.registrationCode}
                  </span>
                  <Link
                    href={`/cek-status?code=${encodeURIComponent(
                      duplicateInfo.registrationCode
                    )}&email=${encodeURIComponent(applicantEmail.trim())}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    <span>Cek Status Pendaftaran</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Identity Summary */}
      <div className="ui-inset p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="ui-eyebrow">Identitas Pelamar</h3>
          <button
            type="button"
            onClick={() => onJumpToStep(0)}
            className="text-xs font-semibold text-zinc-700 hover:text-emerald-700 underline cursor-pointer"
          >
            Ubah Identitas
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-zinc-500 block">Nama Lengkap</span>
            <span className="font-semibold text-zinc-900">
              {applicantName || '-'}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Email</span>
            <span className="font-semibold text-zinc-900">
              {applicantEmail || '-'}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">WhatsApp / HP</span>
            <span className="font-semibold text-zinc-900">
              {applicantPhone || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Non-file Answers Summary */}
      <div className="space-y-3">
        <h3 className="ui-eyebrow">Ringkasan Isian Formulir</h3>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {fields
            .filter((f) => f.type !== 'file')
            .map((f) => {
              const raw = answers[f.id];
              const display = Array.isArray(raw)
                ? raw.join(', ')
                : String(raw || '-');
              const secTitle = f.section?.trim() || 'Data & Persyaratan';
              const secIdx = wizardSteps.findIndex(
                (s) => s.type === 'section' && s.title === secTitle
              );

              return (
                <div
                  key={f.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                >
                  <span className="text-zinc-500">{f.label}</span>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="font-semibold text-zinc-900 sm:text-right break-words max-w-md">
                      {display}
                    </span>
                    {secIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => onJumpToStep(secIdx)}
                        className="text-[11px] font-semibold text-zinc-500 hover:text-emerald-700 underline shrink-0 cursor-pointer"
                      >
                        Ubah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Self Verification of Uploaded Documents */}
      {uploadedFormFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="ui-eyebrow">Verifikasi Mandiri Berkas Unggahan</h3>
            <span className="text-[11px] text-zinc-500">
              Gunakan &ldquo;Periksa Berkas&rdquo; untuk memastikan isi dokumen terbaca jelas
            </span>
          </div>

          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {uploadedFormFiles.map(({ field, uploaded }) => {
              const isUploading = Boolean(uploadingFields[field.id]);
              const wasChecked = Boolean(checkedFileIds[field.id]);

              return (
                <div
                  key={field.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-800">
                        {field.label}
                        {field.required && (
                          <span className="text-rose-500 ml-0.5">*</span>
                        )}
                      </span>
                      {uploaded ? (
                        wasChecked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3" />
                            Sudah diperiksa
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Belum diperiksa
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          Belum diunggah
                        </span>
                      )}
                    </div>
                    {uploaded && (
                      <p className="text-xs text-zinc-500 truncate">
                        {uploaded.fileName} • {formatBytes(uploaded.size)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {uploaded && (
                      <button
                        type="button"
                        onClick={() => onOpenPreview(uploaded)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Periksa Berkas</span>
                      </button>
                    )}

                    <label
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer',
                        isUploading && 'opacity-60 pointer-events-none'
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{uploaded ? 'Ganti Berkas' : 'Unggah'}</span>
                      <input
                        type="file"
                        accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                        disabled={isUploading}
                        className="hidden"
                        onChange={(e) => {
                          const picked = e.target.files?.[0];
                          if (picked) onFileUpload(field, picked);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Self-Verification Declaration */}
      <div className="ui-callout-emerald p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <h3 className="text-sm font-bold">
            Pernyataan Verifikasi Mandiri Sebelum Kirim
          </h3>
        </div>

        <label className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 cursor-pointer">
          <input
            type="checkbox"
            checked={selfCheckReadability}
            onChange={(e) => onReadabilityChange(e.target.checked)}
            className="mt-1 rounded accent-emerald-700 cursor-pointer"
          />
          <span>
            Saya telah memeriksa pratinjau seluruh dokumen yang diunggah dan
            memastikan berkas terbaca jelas, tidak terpotong, serta sesuai ketentuan
            persyaratan.
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 cursor-pointer">
          <input
            type="checkbox"
            checked={selfCheckTruthfulness}
            onChange={(e) => onTruthfulnessChange(e.target.checked)}
            className="mt-1 rounded accent-emerald-700 cursor-pointer"
          />
          <span>
            Saya menyatakan seluruh data dan berkas yang diisi adalah benar dan
            dapat dipertanggungjawabkan; pendaftaran bersifat final dan tidak dapat
            diubah setelah dikirim.
          </span>
        </label>
      </div>
    </div>
  );
}

