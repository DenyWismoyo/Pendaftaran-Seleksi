'use client';

import { useState } from 'react';
import { Check, FileUp, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { compressImageIfNeeded } from '@/lib/imageHelper';
import { formatBytes } from '@/lib/utils';
import { UploadedFileMeta } from '@/types/selection';

interface RevisionUploadPanelProps {
  formId: string;
  registrationCode: string;
  applicantEmail: string;
  revisionFields: string[];
  existingFiles: { fieldId?: string; fieldLabel: string; fileName: string; size: number }[];
  onRevisionSubmitted: () => void;
}

export default function RevisionUploadPanel({
  formId,
  registrationCode,
  applicantEmail,
  revisionFields,
  existingFiles,
  onRevisionSubmitted,
}: RevisionUploadPanelProps) {
  const [uploadedMap, setUploadedMap] = useState<Record<string, UploadedFileMeta>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const targetFiles =
    revisionFields.length > 0
      ? existingFiles.filter((f) => f.fieldId && revisionFields.includes(f.fieldId))
      : existingFiles.filter((f) => Boolean(f.fieldId));

  const handleUpload = async (fieldId: string, rawFile: File) => {
    setUploadingField(fieldId);
    try {
      const { file: readyFile } = await compressImageIfNeeded(rawFile, 5);
      const fd = new FormData();
      fd.append('file', readyFile);
      fd.append('formId', formId);
      fd.append('fieldId', fieldId);
      fd.append('revisionCode', registrationCode);
      fd.append('revisionEmail', applicantEmail);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengunggah berkas perbaikan.');
      }

      setUploadedMap((prev) => ({ ...prev, [fieldId]: json.data as UploadedFileMeta }));
      toast.success(`Berkas "${readyFile.name}" siap dikirim sebagai perbaikan.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal upload perbaikan.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitRevision = async () => {
    const revisedFiles = Object.values(uploadedMap);
    if (revisedFiles.length === 0) {
      toast.error('Unggah minimal satu berkas pengganti terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions/revise', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationCode,
          applicantEmail,
          files: revisedFiles,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengirim perbaikan berkas.');
      }
      toast.success('Berkas perbaikan berhasil dikirim ke panitia.');
      setUploadedMap({});
      onRevisionSubmitted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim perbaikan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (targetFiles.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 space-y-3">
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-orange-950">
          Unggah Perbaikan Berkas
        </h3>
        <p className="text-xs text-orange-800 mt-0.5">
          Ganti berkas di bawah sesuai catatan panitia, lalu klik Kirim Perbaikan.
        </p>
      </div>

      <div className="space-y-2">
        {targetFiles.map((item) => {
          const fId = item.fieldId!;
          const replaced = uploadedMap[fId];
          const isBusy = uploadingField === fId;

          return (
            <div
              key={fId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-orange-200 rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900">{item.fieldLabel}</p>
                {replaced ? (
                  <p className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Pengganti: {replaced.fileName} ({formatBytes(replaced.size)})
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 truncate">
                    Saat ini: {item.fileName} ({formatBytes(item.size)})
                  </p>
                )}
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer shrink-0">
                {isBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5" />
                )}
                <span>{replaced ? 'Ganti Lagi' : 'Unggah Pengganti'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  disabled={isBusy}
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) handleUpload(fId, picked);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmitRevision}
          disabled={submitting || Object.keys(uploadedMap).length === 0}
          className="ui-btn-accent text-xs"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Kirim Berkas Perbaikan</span>
        </button>
      </div>
    </div>
  );
}

