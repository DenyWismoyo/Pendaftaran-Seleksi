'use client';

import { cn } from '@/lib/utils';

interface StatusCounts {
  ALL: number;
  SUBMITTED: number;
  REVIEWING: number;
  ACCEPTED: number;
  REJECTED: number;
}

interface SubmissionPipelineTabsProps {
  statusFilter: string;
  counts: StatusCounts;
  onSelect: (key: string) => void;
}

export default function SubmissionPipelineTabs({
  statusFilter,
  counts,
  onSelect,
}: SubmissionPipelineTabsProps) {
  const tabs = [
    { key: 'ALL', label: 'Semua Pelamar', count: counts.ALL },
    { key: 'SUBMITTED', label: 'Menunggu', count: counts.SUBMITTED },
    { key: 'REVIEWING', label: 'Ditinjau', count: counts.REVIEWING },
    { key: 'ACCEPTED', label: 'Lolos', count: counts.ACCEPTED },
    { key: 'REJECTED', label: 'Tidak Lolos', count: counts.REJECTED },
  ];

  return (
    <div className="ui-mobile-pad grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cn(
            'rounded-xl border p-3 text-left transition-colors cursor-pointer',
            statusFilter === tab.key
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
          )}
        >
          <p className="text-[11px] font-semibold opacity-80">{tab.label}</p>
          <p className="text-xl font-bold font-mono mt-0.5">{tab.count}</p>
        </button>
      ))}
    </div>
  );
}

