'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, formatDateID } from '@/lib/utils';
import { SelectionForm } from '@/types/selection';

interface SelectionHeaderCardProps {
  form: SelectionForm;
  isClosed: boolean;
  hasCover?: boolean;
  onShowCover?: () => void;
}

export default function SelectionHeaderCard({
  form,
  isClosed,
  hasCover = false,
  onShowCover,
}: SelectionHeaderCardProps) {
  const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;

  return (
    <section className="ui-card p-5 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-md">
            {form.category}
          </span>
          {hasCover && onShowCover && (
            <button
              type="button"
              onClick={onShowCover}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Cover &amp; Pengumuman</span>
            </button>
          )}
        </div>
        <span
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-md border',
            statusMeta.badgeClass
          )}
        >
          {isClosed ? 'Pendaftaran Ditutup / Kuota Penuh' : statusMeta.label}
        </span>
      </div>

      <h1 className="ui-page-title">{form.title}</h1>
      {form.description && (
        <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
          {form.description}
        </p>
      )}

      {form.requirementsNote && (
        <div className="ui-callout-amber text-xs sm:text-sm space-y-2">
          <div>
            <strong className="font-semibold block mb-1">
              Persyaratan Dokumen:
            </strong>
            <p>{form.requirementsNote}</p>
          </div>
          <div>
            <Link
              href="/template-dokumen"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Unduh Format Surat &amp; Template Dokumen (.doc / .md)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-zinc-500 pt-1">
        <span>
          Terdaftar:{' '}
          <strong className="text-zinc-800">{form.submissionCount || 0}</strong>
          {form.quota > 0 ? ` / ${form.quota}` : ''}
        </span>
        {form.endDate && (
          <span>
            Batas akhir:{' '}
            <strong className="text-zinc-800">{formatDateID(form.endDate)}</strong>
          </span>
        )}
      </div>
    </section>
  );
}

