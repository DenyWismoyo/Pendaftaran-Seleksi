'use client';

import { Sparkles, Wand2 } from 'lucide-react';
import {
  getAllAutofillableTargets,
  suggestAutofillTargetsForFileField,
} from '@/lib/autofillMapper';
import { cn } from '@/lib/utils';
import { SelectionField } from '@/types/selection';

interface FileAutofillConfigCardProps {
  fileField: SelectionField;
  allFields: SelectionField[];
  onChange: (patch: Partial<SelectionField>) => void;
}

export default function FileAutofillConfigCard({
  fileField,
  allFields,
  onChange,
}: FileAutofillConfigCardProps) {
  const mode = fileField.autofillMode || 'auto';
  const allTargets = getAllAutofillableTargets(allFields);
  const autoSuggestedIds = suggestAutofillTargetsForFileField(fileField, allFields);

  const selectedIds =
    mode === 'custom'
      ? fileField.autofillTargets || []
      : mode === 'auto'
        ? autoSuggestedIds
        : [];

  const toggleTarget = (targetId: string) => {
    const base = mode === 'custom' ? fileField.autofillTargets || [] : autoSuggestedIds;
    const next = base.includes(targetId)
      ? base.filter((id) => id !== targetId)
      : [...base, targetId];
    onChange({ autofillMode: 'custom', autofillTargets: next });
  };

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-950">
            Pengisian Kolom Otomatis dari Berkas Ini
          </span>
        </div>

        <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 text-[11px] font-semibold">
          {(
            [
              { key: 'auto', label: 'Otomatis Cerdas' },
              { key: 'custom', label: 'Pilih Kolom' },
              { key: 'off', label: 'Nonaktif' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key === 'custom' && (!fileField.autofillTargets || fileField.autofillTargets.length === 0)) {
                  onChange({ autofillMode: 'custom', autofillTargets: autoSuggestedIds });
                } else {
                  onChange({ autofillMode: opt.key });
                }
              }}
              className={cn(
                'px-2 py-1 rounded-md transition-colors cursor-pointer',
                mode === opt.key
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'off' ? (
        <p className="text-[11px] text-zinc-500">
          Berkas ini hanya disimpan sebagai lampiran dan tidak menawarkan saran isi kolom.
        </p>
      ) : mode === 'auto' ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-emerald-900">
              {autoSuggestedIds.length > 0 ? (
                <>
                  Sistem otomatis mendeteksi <strong>{autoSuggestedIds.length} kolom target</strong>{' '}
                  yang relevan dengan nama dokumen ini:
                </>
              ) : (
                <span className="text-zinc-600">
                  Belum ada kecocokan otomatis dari label dokumen. Gunakan{' '}
                  <strong>Pilih Kolom</strong> jika ingin memetakan manual.
                </span>
              )}
            </p>
          </div>
          {autoSuggestedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTargets
                .filter((t) => autoSuggestedIds.includes(t.id))
                .map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[11px] font-medium text-emerald-900"
                  >
                    {t.label}
                  </span>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-600">
              Pilih kolom yang dapat diisi otomatis setelah pelamar mengunggah dokumen ini:
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({ autofillMode: 'custom', autofillTargets: autoSuggestedIds })
              }
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Isi Saran Otomatis ({autoSuggestedIds.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {allTargets.map((target) => {
              const active = selectedIds.includes(target.id);
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => toggleTarget(target.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  )}
                >
                  {target.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

