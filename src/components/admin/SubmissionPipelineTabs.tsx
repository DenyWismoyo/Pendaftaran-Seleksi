'use client';

import { cn } from '@/lib/utils';

interface StatusCounts {
  ALL: number;
  SUBMITTED: number;
  NEEDS_REVISION: number;
  REVIEWING: number;
  INTERVIEW: number;
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
    { key: 'ALL', label: 'Semua', count: counts.ALL },
    { key: 'SUBMITTED', label: 'Menunggu', count: counts.SUBMITTED },
    { key: 'NEEDS_REVISION', label: 'Perbaikan', count: counts.NEEDS_REVISION },
    { key: 'REVIEWING', label: 'Ditinjau', count: counts.REVIEWING },
    { key: 'INTERVIEW', label: 'Wawancara', count: counts.INTERVIEW },
    { key: 'ACCEPTED', label: 'Lolos', count: counts.ACCEPTED },
    { key: 'REJECTED', label: 'Tidak Lolos', count: counts.REJECTED },
  ];

  return (
    <div className="ui-mobile-pad grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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
          <p className="text-[11px] font-semibold opacity-80 truncate">{tab.label}</p>
          <p className="text-xl font-bold font-mono mt-0.5">{tab.count}</p>
        </button>
      ))}
    </div>
  );
}
