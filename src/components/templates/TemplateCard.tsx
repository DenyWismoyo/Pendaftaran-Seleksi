'use client';

import { Download, Eye, FileCode2 } from 'lucide-react';
import { DocumentTemplate } from '@/lib/documentTemplates';

export type DocumentTemplateView = Omit<DocumentTemplate, 'category'> & {
  category: string;
};

interface TemplateCardProps<T extends DocumentTemplateView = DocumentTemplateView> {
  template: T;
  onDownloadWord: (tpl: T) => void;
  onDownloadMarkdown: (tpl: T) => void;
  onPreview: (tpl: T) => void;
}

export default function TemplateCard<T extends DocumentTemplateView = DocumentTemplateView>({
  template,
  onDownloadWord,
  onDownloadMarkdown,
  onPreview,
}: TemplateCardProps<T>) {
  return (
    <article className="ui-card p-5 sm:p-6 flex flex-col justify-between gap-5 sm:hover:border-zinc-300 transition-colors">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
            {template.category}
          </span>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            .DOC &amp; .MD
          </span>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-zinc-900 leading-snug">
            {template.title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            {template.description}
          </p>
        </div>

        <p className="text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5">
          {template.targetFieldHint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
        <button
          type="button"
          onClick={() => onDownloadWord(template)}
          className="ui-btn-primary px-3.5 py-2 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Word (.doc)</span>
        </button>

        <button
          type="button"
          onClick={() => onDownloadMarkdown(template)}
          className="ui-btn-secondary px-3 py-2 text-xs"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Unduh .md</span>
        </button>

        <button
          type="button"
          onClick={() => onPreview(template)}
          className="ui-btn-secondary px-3 py-2 text-xs ml-auto"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Pratinjau</span>
        </button>
      </div>
    </article>
  );
}

