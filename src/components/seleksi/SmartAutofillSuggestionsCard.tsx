'use client';

import { useEffect, useState } from 'react';
import { Check, FileSearch, Loader2, X } from 'lucide-react';
import { AutofillSuggestion } from '@/types/selection';
import { cn } from '@/lib/utils';

export interface AutofillResultState {
  sourceFieldId: string;
  sourceFieldLabel: string;
  suggestions: AutofillSuggestion[];
}

interface SmartAutofillSuggestionsCardProps {
  busyFieldLabel?: string | null;
  result: AutofillResultState | null;
  isTargetFilled: (fieldId: string) => boolean;
  onApply: (items: Array<{ fieldId: string; value: string | string[] }>) => void;
  onDismiss: () => void;
}

export default function SmartAutofillSuggestionsCard({
  busyFieldLabel,
  result,
  isTargetFilled,
  onApply,
  onDismiss,
}: SmartAutofillSuggestionsCardProps) {
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [draftValues, setDraftValues] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    if (!result) return;
    const initSelected: Record<string, boolean> = {};
    const initValues: Record<string, string | string[]> = {};
    for (const s of result.suggestions) {
      // Pre-select empty fields automatically; let participant explicitly opt-in to overwrite filled fields
      initSelected[s.fieldId] = !isTargetFilled(s.fieldId);
      initValues[s.fieldId] = s.value;
    }
    setSelectedMap(initSelected);
    setDraftValues(initValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (busyFieldLabel) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-700 shrink-0" />
        <div>
          <p className="text-xs sm:text-sm font-bold text-zinc-900">
            Sedang membaca isi dokumen &ldquo;{busyFieldLabel}&rdquo;...
          </p>
          <p className="text-xs text-zinc-500">
            Mencocokkan data tertulis pada dokumen dengan kolom formulir seleksi.
          </p>
        </div>
      </div>
    );
  }

  if (!result || result.suggestions.length === 0) return null;

  const selectedItems = result.suggestions
    .filter((s) => selectedMap[s.fieldId])
    .map((s) => ({
      fieldId: s.fieldId,
      value: draftValues[s.fieldId] ?? s.value,
    }));

  return (
    <div className="rounded-xl border-2 border-emerald-600/40 bg-white shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <FileSearch className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-zinc-900">
              Saran Isian Terdeteksi dari &ldquo;{result.sourceFieldLabel}&rdquo;
            </p>
            <p className="text-[11px] text-zinc-500">
              Periksa hasil pembacaan sebelum diterapkan. Kolom yang sudah Anda isi tidak akan tertimpa kecuali dicentang.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
          title="Tutup saran"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {result.suggestions.map((item) => {
          const checked = Boolean(selectedMap[item.fieldId]);
          const alreadyFilled = isTargetFilled(item.fieldId);
          const currentVal = draftValues[item.fieldId] ?? item.value;
          const isArrayVal = Array.isArray(currentVal);

          return (
            <div
              key={item.fieldId}
              className={cn(
                'rounded-xl border p-3 space-y-2 transition-colors',
                checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50/50'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedMap((prev) => ({
                        ...prev,
                        [item.fieldId]: e.target.checked,
                      }))
                    }
                    className="rounded accent-emerald-700 cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>

                <div className="flex items-center gap-1.5">
                  {alreadyFilled ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Sudah ada isian
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Mengisi kolom kosong
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">{item.reason}</span>
                </div>
              </div>

              {isArrayVal ? (
                <p className="text-xs font-semibold text-zinc-800 pl-6">
                  {(currentVal as string[]).join(', ')}
                </p>
              ) : String(currentVal).length > 90 ? (
                <textarea
                  rows={3}
                  value={String(currentVal)}
                  onChange={(e) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [item.fieldId]: e.target.value,
                    }))
                  }
                  className="ui-input text-xs py-2"
                />
              ) : (
                <input
                  type="text"
                  value={String(currentVal)}
                  onChange={(e) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [item.fieldId]: e.target.value,
                    }))
                  }
                  className="ui-input text-xs py-1.5"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
        <button
          type="button"
          onClick={onDismiss}
          className="ui-btn-secondary text-xs"
        >
          Abaikan
        </button>

        <button
          type="button"
          disabled={selectedItems.length === 0}
          onClick={() => onApply(selectedItems)}
          className="ui-btn-accent text-xs"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Terapkan {selectedItems.length} Isian Terpilih</span>
        </button>
      </div>
    </div>
  );
}

