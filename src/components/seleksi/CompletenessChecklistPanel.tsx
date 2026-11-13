'use client';

import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ChecklistItem } from '@/components/seleksi/types';
import { cn } from '@/lib/utils';

interface CompletenessChecklistPanelProps {
  completedCount: number;
  totalCount: number;
  percent: number;
  missingItems: ChecklistItem[];
  showMissingDetails: boolean;
  onToggleDetails: () => void;
  onJumpToStep: (stepIndex: number) => void;
}

export default function CompletenessChecklistPanel({
  completedCount,
  totalCount,
  percent,
  missingItems,
  showMissingDetails,
  onToggleDetails,
  onJumpToStep,
}: CompletenessChecklistPanelProps) {
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

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-zinc-900">{percent}%</span>
          {missingItems.length > 0 && (
            <button
              type="button"
              onClick={onToggleDetails}
              className="text-xs font-semibold text-zinc-700 hover:text-emerald-700 underline cursor-pointer"
            >
              {showMissingDetails ? 'Sembunyikan' : 'Lihat yang kurang'}
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

      {showMissingDetails && missingItems.length > 0 && (
        <div className="pt-1 flex flex-wrap gap-1.5">
          {missingItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onJumpToStep(item.stepIndex)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium hover:bg-amber-100 cursor-pointer"
            >
              <span>• {item.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

