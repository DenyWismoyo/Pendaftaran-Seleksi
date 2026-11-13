'use client';

import { CheckSquare, Download, Search } from 'lucide-react';
import { SelectionForm, SubmissionStatus } from '@/types/selection';

interface SubmissionToolbarProps {
  search: string;
  selectedFormId: string;
  forms: SelectionForm[];
  selectedCount: number;
  bulkStatus: SubmissionStatus;
  bulkUpdating: boolean;
  onSearchChange: (val: string) => void;
  onFormChange: (formId: string) => void;
  onBulkStatusChange: (status: SubmissionStatus) => void;
  onBulkUpdate: () => void;
  onExportCsv: () => void;
}

export default function SubmissionToolbar({
  search,
  selectedFormId,
  forms,
  selectedCount,
  bulkStatus,
  bulkUpdating,
  onSearchChange,
  onFormChange,
  onBulkStatusChange,
  onBulkUpdate,
  onExportCsv,
}: SubmissionToolbarProps) {
  return (
    <div className="ui-card-compact p-4 flex flex-wrap items-center gap-3 justify-between">
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, email, atau kode..."
            className="ui-input pl-9 py-2 text-xs sm:text-sm"
          />
        </div>

        <select
          value={selectedFormId}
          onChange={(e) => onFormChange(e.target.value)}
          className="ui-input w-auto py-2 px-3 bg-white text-xs sm:text-sm"
        >
          <option value="">Semua Program Seleksi</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
            <CheckSquare className="w-3.5 h-3.5 text-zinc-700" />
            <span className="text-xs font-semibold text-zinc-800">
              {selectedCount} dipilih
            </span>
            <select
              value={bulkStatus}
              onChange={(e) =>
                onBulkStatusChange(e.target.value as SubmissionStatus)
              }
              className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-xs"
            >
              <option value="REVIEWING">Dalam Peninjauan</option>
              <option value="NEEDS_REVISION">Perlu Perbaikan Berkas</option>
              <option value="INTERVIEW">Tahap Wawancara</option>
              <option value="ACCEPTED">Lolos Seleksi</option>
              <option value="REJECTED">Tidak Lolos</option>
            </select>
            <button
              type="button"
              onClick={onBulkUpdate}
              disabled={bulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
            >
              {bulkUpdating ? '...' : 'Terapkan'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onExportCsv}
          className="ui-btn-secondary px-3.5 py-2 text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}

