'use client';

import { SUBMISSION_STATUS_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { SelectionSubmission } from '@/types/selection';

interface SubmissionListCardProps {
  submission: SelectionSubmission;
  isActive: boolean;
  isChecked: boolean;
  onToggleCheck: (id: string) => void;
  onSelect: (submission: SelectionSubmission) => void;
}

export default function SubmissionListCard({
  submission,
  isActive,
  isChecked,
  onToggleCheck,
  onSelect,
}: SubmissionListCardProps) {
  const meta =
    SUBMISSION_STATUS_META[submission.status] || SUBMISSION_STATUS_META.SUBMITTED;

  return (
    <div
      className={cn(
        'ui-card-compact p-4 transition-all flex items-start gap-3',
        isActive
          ? 'sm:border-zinc-900 bg-zinc-50/70 sm:bg-white sm:ring-1 sm:ring-zinc-900'
          : 'sm:hover:border-zinc-300'
      )}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggleCheck(submission.id)}
        className="mt-1 rounded accent-zinc-900 cursor-pointer"
      />

      <button
        type="button"
        onClick={() => onSelect(submission)}
        className="flex-1 text-left space-y-1.5 cursor-pointer min-w-0"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-zinc-500">
            {submission.registrationCode}
          </span>
          <span
            className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
              meta.badgeClass
            )}
          >
            {meta.label}
          </span>
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-sm truncate">
            {submission.applicantName}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {submission.applicantEmail} • {submission.formTitle}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>{submission.files.length} berkas terlampir</span>
          {submission.aiEvaluation && (
            <span className="font-mono font-semibold text-emerald-700">
              Skor: {submission.aiEvaluation.score}/100
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

