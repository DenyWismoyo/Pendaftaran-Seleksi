'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import FilePreviewModal from '@/components/FilePreviewModal';
import SubmissionDetailPanel from '@/components/admin/SubmissionDetailPanel';
import SubmissionListCard from '@/components/admin/SubmissionListCard';
import SubmissionPipelineTabs from '@/components/admin/SubmissionPipelineTabs';
import SubmissionToolbar from '@/components/admin/SubmissionToolbar';
import { useAdminSubmissions } from '@/hooks/useAdminSubmissions';
import { downloadSubmissionsCsv } from '@/lib/submissionExport';

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const s = useAdminSubmissions(searchParams.get('formId') || '');

  return (
    <div className="space-y-4 sm:space-y-5">
      <SubmissionPipelineTabs
        statusFilter={s.statusFilter}
        counts={s.statusCounts}
        onSelect={s.setStatusFilter}
      />

      <SubmissionToolbar
        search={s.search}
        selectedFormId={s.selectedFormId}
        forms={s.forms}
        selectedCount={s.selectedIds.length}
        bulkStatus={s.bulkStatus}
        bulkUpdating={s.bulkUpdating}
        onSearchChange={s.setSearch}
        onFormChange={s.changeFormFilter}
        onBulkStatusChange={s.setBulkStatus}
        onBulkUpdate={s.handleBulkUpdate}
        onExportCsv={() => {
          if (s.filteredSubmissions.length === 0) {
            toast.error('Tidak ada data pendaftar untuk diekspor.');
            return;
          }
          downloadSubmissionsCsv(s.filteredSubmissions);
        }}
      />

      {s.loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      ) : s.filteredSubmissions.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center text-sm text-zinc-500">
          Belum ada data pendaftar yang sesuai filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          <div className="lg:col-span-5 space-y-2 sm:space-y-2.5 max-h-[75vh] overflow-y-auto sm:pr-1">
            {s.filteredSubmissions.map((sub) => (
              <SubmissionListCard
                key={sub.id}
                submission={sub}
                isActive={s.selectedSub?.id === sub.id}
                isChecked={s.selectedIds.includes(sub.id)}
                onToggleCheck={s.toggleSelectId}
                onSelect={s.selectSubmission}
              />
            ))}
          </div>

          {s.selectedSub && (
            <SubmissionDetailPanel
              submission={s.selectedSub}
              formDef={s.currentFormDef}
              evaluatingAi={s.evaluatingAi}
              reviewStatus={s.reviewStatus}
              reviewerNote={s.reviewerNote}
              savingReview={s.savingReview}
              onEvaluateAi={s.handleEvaluateAi}
              onPreviewFile={s.setPreviewFile}
              onReviewStatusChange={s.setReviewStatus}
              onReviewerNoteChange={s.setReviewerNote}
              onSaveReview={s.handleSaveReview}
            />
          )}
        </div>
      )}

      <FilePreviewModal
        file={s.previewFile}
        onClose={() => s.setPreviewFile(null)}
      />
    </div>
  );
}

export default function AdminSubmissionsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
          </div>
        }
      >
        <SubmissionsContent />
      </Suspense>
    </AdminGuard>
  );
}
