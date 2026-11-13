'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderUp,
  Users,
} from 'lucide-react';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, getDeadlineBadge } from '@/lib/utils';
import { SelectionForm } from '@/types/selection';

export default function ProgramCard({ form }: { form: SelectionForm }) {
  const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
  const fileCount = form.fields.filter((f) => f.type === 'file').length;
  const count = form.submissionCount || 0;
  const isFull = form.quota > 0 && count >= form.quota;
  const quotaPct =
    form.quota > 0 ? Math.min(100, Math.round((count / form.quota) * 100)) : 0;
  const deadline = getDeadlineBadge(form.endDate);
  const canApply = form.status === 'OPEN' && !isFull && !deadline?.expired;

  return (
    <article className="ui-card overflow-hidden flex flex-col justify-between sm:hover:border-zinc-400 transition-all">
      <div>
        {form.coverImage?.url && (
          <div className="border-b border-zinc-200 bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.coverImage.url}
              alt={form.coverTitle || form.title}
              className="w-full h-40 object-cover"
            />
          </div>
        )}
        <div className="p-5 sm:p-6 pb-0 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md">
              {form.category}
            </span>
            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-md border',
                isFull || deadline?.expired
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : statusMeta.badgeClass
              )}
            >
              {isFull
                ? 'Kuota Penuh'
                : deadline?.expired
                  ? 'Ditutup'
                  : statusMeta.label}
            </span>
          </div>

          <h3 className="text-lg font-bold text-zinc-900 leading-snug">
            {form.title}
          </h3>

          <p className="text-sm text-zinc-600 line-clamp-3 leading-relaxed">
            {form.coverSummary ||
              form.description ||
              'Lengkapi biodata dan unggah berkas persyaratan seleksi.'}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6 pt-5 mt-5 border-t border-zinc-100 space-y-4">
        {form.quota > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Kuota Terisi
              </span>
              <span className="font-mono font-semibold text-zinc-800">
                {count} / {form.quota}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  quotaPct >= 90 ? 'bg-amber-500' : 'bg-emerald-600'
                )}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Total pendaftar
            </span>
            <span className="font-mono font-semibold text-zinc-800">
              {count} peserta
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <FolderUp className="w-3.5 h-3.5 text-zinc-400" />
            {fileCount} berkas unggah
          </span>

          {deadline && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                deadline.urgent ? 'text-amber-700' : 'text-zinc-500'
              )}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {deadline.label}
            </span>
          )}
        </div>

        <Link
          href={`/seleksi/${form.slug}`}
          className={cn(
            'w-full',
            canApply
              ? 'ui-btn-primary'
              : 'ui-btn-secondary bg-zinc-100 border-transparent text-zinc-600 hover:bg-zinc-200'
          )}
        >
          {canApply ? (
            <>
              <span>Mulai Pendaftaran</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Lihat Informasi Program</span>
            </>
          )}
        </Link>
      </div>
    </article>
  );
}

