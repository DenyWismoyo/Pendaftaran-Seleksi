'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Power,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateID } from '@/lib/utils';
import { PanelAccessPublicView, SelectionForm } from '@/types/selection';

interface PanelAccessCardProps {
  item: PanelAccessPublicView;
  forms: SelectionForm[];
  busyId: string | null;
  onToggleActive: (item: PanelAccessPublicView) => void;
  onRegenerate: (item: PanelAccessPublicView) => void;
  onDelete: (item: PanelAccessPublicView) => void;
}

export default function PanelAccessCard({
  item,
  forms,
  busyId,
  onToggleActive,
  onRegenerate,
  onDelete,
}: PanelAccessCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const formTitles = item.isAllForms
    ? ['Semua Program Seleksi']
    : item.formIds.map(
        (id) => forms.find((f) => f.id === id)?.title || id
      );

  const copyValue = async (value: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedType(type);
      toast.success(
        type === 'code'
          ? `Kode akses ${item.name} disalin.`
          : `Tautan masuk Portal Penilai ${item.name} disalin.`
      );
      setTimeout(() => setCopiedType(null), 1600);
    } catch {
      toast.error('Gagal menyalin ke clipboard.');
    }
  };

  const portalLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/penilaian?code=${encodeURIComponent(item.accessCode)}`
      : `/penilaian?code=${encodeURIComponent(item.accessCode)}`;

  const isBusy = busyId === item.id;

  return (
    <div className="ui-card p-4 sm:p-5 flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                {item.name}
              </h3>
              <span
                className={
                  item.isActive
                    ? 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800'
                    : 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-600'
                }
              >
                {item.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {item.roleTitle}
              {item.email ? ` • ${item.email}` : ''}
            </p>
          </div>
        </div>

        {/* Access Code Bar */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Kode Akses Rahasia Panitia
            </p>
            <p className="text-sm font-mono font-bold text-zinc-900 mt-0.5 tracking-wider">
              {showCode ? item.accessCode : item.accessCodeMasked}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowCode((p) => !p)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              title={showCode ? 'Sembunyikan kode' : 'Tampilkan kode'}
            >
              {showCode ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => copyValue(item.accessCode, 'code')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              {copiedType === 'code' ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Salin Kode</span>
            </button>
            <button
              type="button"
              onClick={() => copyValue(portalLink, 'link')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              {copiedType === 'link' ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              <span>Salin Tautan</span>
            </button>
          </div>
        </div>

        {/* Scope & Permissions */}
        <div className="space-y-1.5 text-xs">
          <p className="text-zinc-600">
            <span className="font-semibold text-zinc-800">Program:</span>{' '}
            {formTitles.join(', ')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.permissions?.canScore && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-medium">
                Bisa Menilai
              </span>
            )}
            {item.permissions?.canViewFiles !== false && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-medium">
                Lihat Berkas
              </span>
            )}
            {item.permissions?.canAdvanceStage && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-medium">
                Pindah Tahap
              </span>
            )}
            {item.allowedStageIds.length > 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-medium">
                Khusus {item.allowedStageIds.length} Tahap
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-medium">
                Semua Tahapan
              </span>
            )}
          </div>
          {item.lastUsedAt && (
            <p className="text-[11px] text-zinc-400">
              Terakhir login: {formatDateID(item.lastUsedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onToggleActive(item)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
        >
          <Power className="w-3.5 h-3.5" />
          <span>{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRegenerate(item)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Buat Kode Baru</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
            title="Hapus akses panitia"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

