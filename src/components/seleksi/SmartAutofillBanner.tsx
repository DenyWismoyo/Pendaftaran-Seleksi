'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileUp,
  Loader2,
} from 'lucide-react';
import { AutofillTargetInfo, SelectionField, UploadedFileMeta } from '@/types/selection';

interface SmartAutofillBannerProps {
  recommendedSources: Array<{
    field: SelectionField;
    targets: AutofillTargetInfo[];
  }>;
  files: UploadedFileMeta[];
  uploadingFields: Record<string, boolean>;
  autofillBusyField: string | null;
  onQuickUpload: (field: SelectionField, file: File) => void;
  onExtractExisting: (field: SelectionField, file: UploadedFileMeta) => void;
  onJumpToFileSection?: (fieldId: string) => void;
}

export default function SmartAutofillBanner({
  recommendedSources,
  files,
  uploadingFields,
  autofillBusyField,
  onQuickUpload,
  onExtractExisting,
}: SmartAutofillBannerProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (recommendedSources.length === 0) return null;

  const topSources = recommendedSources.slice(0, 3);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 sm:p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-950">
          <FileSearch className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-bold">
              Pengisian Cepat dari Berkas Dokumen
            </p>
            <p className="text-[11px] text-emerald-800">
              Unggah KTP, CV, atau dokumen utama lebih awal agar kolom yang relevan terisi otomatis untuk Anda tinjau.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
        >
          {collapsed ? 'Tampilkan' : 'Sembunyikan'}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
          {topSources.map(({ field, targets }) => {
            const uploaded = files.find((f) => f.fieldId === field.id);
            const isUploading = Boolean(uploadingFields[field.id]);
            const isExtracting = autofillBusyField === field.id;

            return (
              <div
                key={field.id}
                className="rounded-xl border border-emerald-200/80 bg-white p-2.5 flex flex-col justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-zinc-900 line-clamp-1">
                    {field.label}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Bisa mengisi{' '}
                    <strong className="text-emerald-700">{targets.length} kolom</strong>{' '}
                    ({targets
                      .slice(0, 2)
                      .map((t) => t.label)
                      .join(', ')}
                    {targets.length > 2 ? ', ...' : ''})
                  </p>
                </div>

                {uploaded ? (
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => onExtractExisting(field, uploaded)}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
                  >
                    {isExtracting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isExtracting ? 'Membaca Berkas...' : 'Baca & Sarankan Isian'}
                    </span>
                  </button>
                ) : (
                  <label className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileUp className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? 'Mengunggah...' : 'Unggah & Isi Otomatis'}</span>
                    {!isUploading && <ArrowRight className="w-3 h-3" />}
                    <input
                      type="file"
                      accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => {
                        const picked = e.target.files?.[0];
                        if (picked) onQuickUpload(field, picked);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

