'use client';

import Link from 'next/link';
import { Copy, Edit3, ExternalLink, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, formatDateID } from '@/lib/utils';
import { SelectionForm, SelectionFormStatus } from '@/types/selection';

interface AdminFormListItemProps {
  form: SelectionForm;
  onStatusChange: (id: string, nextStatus: SelectionFormStatus) => void;
  onDelete: (form: SelectionForm) => void;
}

export default function AdminFormListItem({
  form,
  onStatusChange,
  onDelete,
}: AdminFormListItemProps) {
  const meta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
  const publicPath = `/seleksi/${form.slug}`;

  return (
    <div className="ui-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-md">
            {form.category}
          </span>
          <span
            className={cn(
              'text-[11px] font-semibold px-2.5 py-0.5 rounded-md border',
              meta.badgeClass
            )}
          >
            {meta.label}
          </span>
          <span className="text-xs text-zinc-400">
            Dibuat {formatDateID(form.createdAt)}
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
          {form.title}
        </h2>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="font-mono text-zinc-600">{publicPath}</span>
          <span>
            <strong>{form.fields.length}</strong> field (
            {form.fields.filter((f) => f.type === 'file').length} berkas)
          </span>
          <span>
            <strong>{form.submissionCount || 0}</strong> pendaftar
            {form.quota > 0 ? ` / ${form.quota}` : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <select
          value={form.status}
          onChange={(e) =>
            onStatusChange(form.id, e.target.value as SelectionFormStatus)
          }
          className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white"
        >
          <option value="OPEN">Dibuka</option>
          <option value="DRAFT">Draf</option>
          <option value="CLOSED">Ditutup</option>
        </select>

        <button
          type="button"
          onClick={() => {
            const fullUrl = `${window.location.origin}${publicPath}`;
            navigator.clipboard.writeText(fullUrl);
            toast.success('Tautan publik disalin.');
          }}
          className="ui-btn-secondary px-3 py-2 text-xs"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Salin Link</span>
        </button>

        <Link
          href={publicPath}
          target="_blank"
          className="ui-btn-secondary px-3 py-2 text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Buka</span>
        </Link>

        <Link
          href={`/admin/submissions?formId=${form.id}`}
          className="ui-btn-primary px-3 py-2 text-xs"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pendaftar</span>
        </Link>

        <Link
          href={`/admin/forms/${form.id}`}
          className="p-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          title="Edit Formulir"
        >
          <Edit3 className="w-4 h-4" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(form)}
          className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
          title="Hapus Formulir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

