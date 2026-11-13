'use client';

import { CalendarClock, FileCheck2 } from 'lucide-react';
import RevisionUploadPanel from '@/components/status/RevisionUploadPanel';
import StatusMilestoneTimeline from '@/components/status/StatusMilestoneTimeline';
import { SelectionStage, SubmissionStatus } from '@/types/selection';
import { formatBytes } from '@/lib/utils';

interface StatusProgressCardProps {
  formId?: string;
  registrationCode: string;
  applicantEmail: string;
  status: SubmissionStatus;
  currentStageId?: string;
  formStages?: SelectionStage[];
  reviewerNote?: string;
  revisionFields?: string[];
  interviewSchedule?: string;
  files: { fieldId?: string; fieldLabel: string; fileName: string; size: number }[];
  onRevisionSubmitted: () => void;
}

export default function StatusProgressCard({
  formId,
  registrationCode,
  applicantEmail,
  status,
  currentStageId,
  formStages,
  reviewerNote,
  revisionFields = [],
  interviewSchedule,
  files,
  onRevisionSubmitted,
}: StatusProgressCardProps) {
  return (
    <section className="no-print ui-card p-5 sm:p-6 space-y-5">
      <h2 className="ui-eyebrow">Progres Tahapan Seleksi</h2>

      <StatusMilestoneTimeline
        status={status}
        formStages={formStages}
        currentStageId={currentStageId}
      />

      {status === 'INTERVIEW' && interviewSchedule && (
        <div className="ui-callout-emerald flex items-start gap-2.5">
          <CalendarClock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">
              Jadwal Wawancara / Uji Gagasan:
            </span>
            <p className="text-xs sm:text-sm">{interviewSchedule}</p>
          </div>
        </div>
      )}

      {reviewerNote && (
        <div className="ui-inset space-y-1">
          <span className="text-xs font-bold text-zinc-600 block">
            Catatan Resmi Panitia:
          </span>
          <p className="text-sm text-zinc-900">{reviewerNote}</p>
        </div>
      )}

      {status === 'NEEDS_REVISION' && formId && (
        <RevisionUploadPanel
          formId={formId}
          registrationCode={registrationCode}
          applicantEmail={applicantEmail}
          revisionFields={revisionFields}
          existingFiles={files}
          onRevisionSubmitted={onRevisionSubmitted}
        />
      )}

      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-zinc-600 block">
            Dokumen yang Sudah Diterima ({files.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 text-xs bg-zinc-50 px-3 py-2.5 rounded-xl border border-zinc-200"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-800 truncate">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {f.fieldLabel}: {f.fileName}
                </span>
                <span className="text-zinc-400 shrink-0">
                  {formatBytes(f.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
