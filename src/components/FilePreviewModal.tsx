'use client';

import { ExternalLink, FileText, X } from 'lucide-react';
import { UploadedFileMeta } from '@/types/selection';
import { formatBytes } from '@/lib/utils';

interface FilePreviewModalProps {
  file: UploadedFileMeta | null;
  onClose: () => void;
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file) return null;

  return (
    <div
      className="ui-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="ui-modal-panel max-w-4xl max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate">
              {file.fieldLabel} — {file.fileName}
            </p>
            <p className="text-xs text-zinc-500">
              {formatBytes(file.size)} • {file.mimeType}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="ui-btn-secondary px-3 py-1.5 rounded-lg text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka Tab Baru</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-zinc-100 overflow-auto p-4 flex items-center justify-center min-h-[60vh]">
          {file.mimeType.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.url}
              alt={file.fileName}
              className="max-w-full max-h-[75vh] rounded-lg shadow-sm bg-white object-contain"
            />
          ) : file.mimeType === 'application/pdf' ? (
            <iframe
              src={file.url}
              title={file.fileName}
              className="w-full h-[75vh] rounded-lg border border-zinc-200 bg-white"
            />
          ) : (
            <div className="text-center space-y-3 bg-white p-8 rounded-xl border border-zinc-200">
              <FileText className="w-10 h-10 text-zinc-400 mx-auto" />
              <p className="text-sm font-semibold text-zinc-800">
                Pratinjau langsung tidak tersedia untuk format dokumen ini.
              </p>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unduh untuk Memeriksa</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

