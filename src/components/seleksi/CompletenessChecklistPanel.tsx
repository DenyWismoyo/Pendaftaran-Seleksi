'use client';

import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import { ChecklistItem, StepCompletionSummary } from '@/components/seleksi/types';
import { cn } from '@/lib/utils';

interface CompletenessChecklistPanelProps {
  completedCount: number;
  totalCount: number;
  percent: number;
  missingItems: ChecklistItem[];
  stepSummaries: StepCompletionSummary[];
  nextIncompleteStepIndex: number | null;
  showMissingDetails: boolean;
  onToggleDetails: () => void;
  onJumpToStep: (stepIndex: number) => void;
}

export default function CompletenessChecklistPanel({
  completedCount,
  totalCount,
  percent,
  missingItems,
  stepSummaries,
  nextIncompleteStepIndex,
  showMissingDetails,
  onToggleDetails,
  onJumpToStep,
}: CompletenessChecklistPanelProps) {
  const groupedMissing = missingItems.reduce<
    Array<{ stepIndex: number; title: string; items: ChecklistItem[] }>
  >((acc, item) => {
    const existing = acc.find((g) => g.stepIndex === item.stepIndex);
    if (existing) {
      existing.items.push(item);
    } else {
      const summary = stepSummaries.find((s) => s.stepIndex === item.stepIndex);
      acc.push({
        stepIndex: item.stepIndex,
        title: summary?.title || `Tahap ${item.stepIndex + 1}`,
        items: [item],
      });
    }
    return acc;
  }, []);

  return (
    <section className="ui-card-compact p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="ui-eyebrow">Kelengkapan Persyaratan Wajib</p>
          <p className="text-sm font-semibold text-zinc-900">
            {missingItems.length === 0 ? (
              <span className="text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Semua {totalCount} item wajib telah terisi — siap diperiksa &amp; dikirim
              </span>
            ) : (
              <span>
                {completedCount} dari {totalCount} item wajib terisi{' '}
                <span className="text-zinc-500 font-normal">
                  ({missingItems.length} lagi belum lengkap)
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-zinc-900">{percent}%</span>

          {missingItems.length > 0 && nextIncompleteStepIndex !== null && (
            <button
              type="button"
              onClick={() => onJumpToStep(nextIncompleteStepIndex)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Lengkapi Berikutnya</span>
            </button>
          )}

          {missingItems.length > 0 && (
            <button
              type="button"
              onClick={onToggleDetails}
              className="text-xs font-semibold text-zinc-700 hover:text-emerald-700 underline cursor-pointer"
            >
              {showMissingDetails ? 'Tutup rincian' : 'Lihat yang kurang'}
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            percent === 100 ? 'bg-emerald-600' : 'bg-zinc-900'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showMissingDetails && groupedMissing.length > 0 && (
        <div className="pt-2 border-t border-zinc-100 space-y-2.5">
          {groupedMissing.map((group) => (
            <div
              key={group.stepIndex}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-800">
                  {group.stepIndex + 1}. {group.title}{' '}
                  <span className="font-normal text-zinc-500">
                    ({group.items.length} belum lengkap)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(group.stepIndex)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  <span>Buka Bagian</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onJumpToStep(item.stepIndex)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium hover:bg-amber-100 cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
