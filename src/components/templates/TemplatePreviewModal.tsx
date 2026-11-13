'use client';

import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import { markdownToDocumentHtml } from '@/lib/documentConverter';
import { DocumentTemplateView } from '@/components/templates/TemplateCard';
import { cn } from '@/lib/utils';

interface TemplatePreviewModalProps<T extends DocumentTemplateView = DocumentTemplateView> {
  template: T | null;
  previewMode: 'formatted' | 'markdown';
  copiedSlug: string | null;
  onModeChange: (mode: 'formatted' | 'markdown') => void;
  onCopyMarkdown: (tpl: T) => void;
  onDownloadWord: (tpl: T) => void;
  onDownloadMarkdown: (tpl: T) => void;
  onClose: () => void;
}

export default function TemplatePreviewModal<T extends DocumentTemplateView = DocumentTemplateView>({
  template,
  previewMode,
  copiedSlug,
  onModeChange,
  onCopyMarkdown,
  onDownloadWord,
  onDownloadMarkdown,
  onClose,
}: TemplatePreviewModalProps) {
  if (!template) return null;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className="ui-modal-panel max-w-4xl max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 truncate">
              {template.title}
            </p>
            <p className="text-xs text-zinc-500">{template.targetFieldHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onModeChange('formatted')}
                className={cn(
                  'px-2.5 py-1 rounded-md cursor-pointer transition-colors',
                  previewMode === 'formatted'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                Tampilan Word
              </button>
              <button
                type="button"
                onClick={() => onModeChange('markdown')}
                className={cn(
                  'px-2.5 py-1 rounded-md cursor-pointer transition-colors',
                  previewMode === 'markdown'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                Sumber .md
              </button>
            </div>

            <button
              type="button"
              onClick={() => onCopyMarkdown(template)}
              className="ui-btn-secondary px-2.5 py-1.5 rounded-lg text-xs"
            >
              {copiedSlug === template.slug ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Salin</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadWord(template)}
              className="ui-btn-primary px-3 py-1.5 rounded-lg text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={() => onDownloadMarkdown(template)}
              className="ui-btn-secondary px-2.5 py-1.5 rounded-lg text-xs"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>.md</span>
            </button>

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

        <div className="flex-1 bg-zinc-100 overflow-auto p-4 sm:p-6">
          {previewMode === 'formatted' ? (
            <div
              className="bg-white border border-zinc-200 rounded-xl shadow-sm max-w-3xl mx-auto p-6 sm:p-10 text-zinc-900 font-serif text-sm"
              dangerouslySetInnerHTML={{
                __html: markdownToDocumentHtml(template.markdown),
              }}
            />
          ) : (
            <pre className="bg-zinc-900 text-zinc-100 rounded-xl max-w-3xl mx-auto p-5 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {template.markdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

