'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Users,
} from 'lucide-react';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, formatBytes, formatDateID } from '@/lib/utils';
import { CoverAttachment, SelectionForm, UploadedFileMeta } from '@/types/selection';

interface SelectionCoverViewProps {
  form: Pick<
    SelectionForm,
    | 'title'
    | 'category'
    | 'description'
    | 'requirementsNote'
    | 'status'
    | 'quota'
    | 'endDate'
    | 'submissionCount'
    | 'coverTitle'
    | 'coverSummary'
    | 'coverHighlights'
    | 'coverImage'
    | 'coverAttachments'
    | 'coverCtaLabel'
  >;
  isClosed?: boolean;
  hasDraftProgress?: boolean;
  previewOnly?: boolean;
  onStartForm?: () => void;
  onOpenRestore?: () => void;
  onPreviewAttachment?: (file: UploadedFileMeta) => void;
}

function getFileExtensionBadge(att: CoverAttachment): string {
  if (att.mimeType === 'application/pdf') return 'PDF';
  if (att.mimeType.startsWith('image/')) return 'GAMBAR';
  if (att.mimeType.includes('word') || /\.docx?$/i.test(att.fileName)) return 'DOC';
  return 'BERKAS';
}

export default function SelectionCoverView({
  form,
  isClosed = false,
  hasDraftProgress = false,
  previewOnly = false,
  onStartForm,
  onOpenRestore,
  onPreviewAttachment,
}: SelectionCoverViewProps) {
  const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
  const heading = form.coverTitle?.trim() || form.title || 'Judul Program Seleksi';
  const summary = form.coverSummary?.trim() || form.description?.trim() || '';
  const highlights = (form.coverHighlights || []).filter((h) => h.trim().length > 0);
  const attachments = form.coverAttachments || [];
  const ctaLabel = hasDraftProgress
    ? 'Lanjutkan Pengisian Formulir'
    : form.coverCtaLabel?.trim() || 'Mulai Pengisian Formulir';

  return (
    <article className="ui-card overflow-hidden">
      {form.coverImage?.url && (
        <div className="border-b border-zinc-200 bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.coverImage.url}
            alt={heading}
            className="w-full max-h-[300px] sm:max-h-[360px] object-cover"
          />
        </div>
      )}

      <div className={cn(previewOnly ? 'p-4 space-y-4' : 'p-5 sm:p-8 space-y-6')}>
        {/* Category & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-md">
            {form.category}
          </span>
          <span
            className={cn(
              'text-xs font-semibold px-3 py-1 rounded-md border',
              isClosed
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : statusMeta.badgeClass
            )}
          >
            {isClosed ? 'Pendaftaran Ditutup / Kuota Penuh' : statusMeta.label}
          </span>
        </div>

        {/* Title & Summary */}
        <div className="space-y-3">
          <h1 className={cn(previewOnly ? 'text-lg font-bold text-zinc-900' : 'ui-page-title')}>
            {heading}
          </h1>

          {summary && (
            <p className="text-sm sm:text-base text-zinc-700 leading-relaxed whitespace-pre-line">
              {summary}
            </p>
          )}
        </div>

        {/* Key Metadata Row */}
        <div className="flex flex-wrap gap-3 sm:gap-5 text-xs text-zinc-600 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            Terdaftar:{' '}
            <strong className="text-zinc-900">{form.submissionCount || 0}</strong>
            {form.quota > 0 ? ` / ${form.quota}` : ''}
          </span>
          {form.endDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
              Batas akhir:{' '}
              <strong className="text-zinc-900">{formatDateID(form.endDate)}</strong>
            </span>
          )}
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Informasi Penting Seleksi
            </p>
            <ul className="space-y-1.5">
              {highlights.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs sm:text-sm text-zinc-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements Note */}
        {form.requirementsNote && (
          <div className="ui-callout-amber text-xs sm:text-sm space-y-2">
            <div>
              <strong className="font-semibold block mb-1">
                Persyaratan Dokumen:
              </strong>
              <p>{form.requirementsNote}</p>
            </div>
            {!previewOnly && (
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
            )}
          </div>
        )}

        {/* Official Announcement Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Dokumen Pengumuman &amp; Lampiran Resmi
            </p>
            <div className="space-y-2">
              {attachments.map((att) => {
                const canInlinePreview =
                  att.mimeType === 'application/pdf' ||
                  att.mimeType.startsWith('image/');
                return (
                  <div
                    key={att.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-[10px] font-mono font-bold text-zinc-700 shrink-0">
                        {getFileExtensionBadge(att)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                          {att.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {att.fileName} • {formatBytes(att.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!previewOnly && canInlinePreview && onPreviewAttachment && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewAttachment({
                              fieldId: att.id,
                              fieldLabel: att.title,
                              fileName: att.fileName,
                              mimeType: att.mimeType,
                              size: att.size,
                              url: att.url,
                              storagePath: att.storagePath,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau</span>
                        </button>
                      )}
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        download={att.fileName}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action CTA */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          {isClosed ? (
            <div className="ui-callout-rose w-full text-center text-xs sm:text-sm font-semibold py-3">
              Penerimaan pendaftaran untuk program seleksi ini sedang ditutup atau kuota telah terpenuhi.
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={previewOnly}
                onClick={onStartForm}
                className="ui-btn-primary text-sm w-full sm:w-auto disabled:opacity-90"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!previewOnly && onOpenRestore && (
                <button
                  type="button"
                  onClick={onOpenRestore}
                  className="ui-btn-secondary text-xs w-full sm:w-auto"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Sudah Punya Kode Draf? Lanjutkan</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

