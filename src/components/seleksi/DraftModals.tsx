'use client';

import { Copy, Link2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface SaveDraftModalProps {
  open: boolean;
  draftToken: string;
  resumeUrl: string;
  onClose: () => void;
}

export function SaveDraftModal({
  open,
  draftToken,
  resumeUrl,
  onClose,
}: SaveDraftModalProps) {
  if (!open) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} berhasil disalin.`);
    } catch {
      toast.error(`Gagal menyalin ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className="ui-modal-panel max-w-md p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Draf Tersimpan di Server
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Anda dapat menutup halaman ini atau melanjutkan dari perangkat lain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="ui-callout-emerald space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
            Kode Draf Anda
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-bold text-emerald-950">
              {draftToken}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(draftToken, 'Kode draf')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Kode</span>
            </button>
          </div>
        </div>

        {resumeUrl && (
          <div className="space-y-1.5">
            <label className="ui-label">Tautan Lanjutkan Langsung</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={resumeUrl}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono text-zinc-700"
              />
              <button
                type="button"
                onClick={() => handleCopy(resumeUrl, 'Tautan draf')}
                className="ui-btn-primary px-3 py-2 text-xs shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Salin</span>
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500 leading-relaxed">
          Seluruh jawaban yang diketik dan berkas yang sudah diunggah sementara
          tetap aman tersimpan. Simpan kode atau tautan di atas sebelum menutup tab.
        </p>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-primary px-4 py-2 text-xs"
          >
            Mengerti, Lanjutkan Mengisi
          </button>
        </div>
      </div>
    </div>
  );
}

interface RestoreDraftModalProps {
  open: boolean;
  restoreInputCode: string;
  restoreError: string;
  restoringFromServer: boolean;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RestoreDraftModal({
  open,
  restoreInputCode,
  restoreError,
  restoringFromServer,
  onInputChange,
  onSubmit,
  onClose,
}: RestoreDraftModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        className="ui-modal-panel max-w-md p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Pulihkan Draf Tersimpan
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Masukkan kode draf untuk melanjutkan isian dan berkas Anda sebelumnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="ui-label">Kode Draf</label>
          <input
            type="text"
            value={restoreInputCode}
            onChange={(e) => onInputChange(e.target.value.toUpperCase())}
            placeholder="Contoh: DRF-A1B2C3D4"
            className="ui-input font-mono uppercase"
          />
          {restoreError && (
            <p className="text-xs font-medium text-rose-600">{restoreError}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary px-4 py-2 text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={restoringFromServer}
            className="ui-btn-primary px-4 py-2 text-xs"
          >
            {restoringFromServer && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Muat Draf</span>
          </button>
        </div>
      </form>
    </div>
  );
}

