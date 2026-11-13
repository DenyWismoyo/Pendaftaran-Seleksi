'use client';

import {
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  Printer,
} from 'lucide-react';
import PanelRubricCard from '@/components/admin/PanelRubricCard';
import { printApplicantDossier } from '@/lib/submissionExport';
import { formatBytes, formatDateID } from '@/lib/utils';
import {
  PanelScoreInput,
  SelectionForm,
  SelectionSubmission,
  SubmissionStatus,
  UploadedFileMeta,
} from '@/types/selection';

interface SubmissionDetailPanelProps {
  submission: SelectionSubmission;
  formDef?: SelectionForm;
  evaluatingAi: boolean;
  reviewStatus: SubmissionStatus;
  reviewerNote: string;
  revisionFields: string[];
  interviewSchedule: string;
  savingReview: boolean;
  savingScore: boolean;
  onEvaluateAi: () => void;
  onPreviewFile: (file: UploadedFileMeta) => void;
  onReviewStatusChange: (status: SubmissionStatus) => void;
  onReviewerNoteChange: (note: string) => void;
  onToggleRevisionField: (fieldId: string) => void;
  onInterviewScheduleChange: (val: string) => void;
  onSaveReview: () => void;
  onSavePanelScore: (input: PanelScoreInput) => Promise<void>;
}

export default function SubmissionDetailPanel({
  submission,
  formDef,
  evaluatingAi,
  reviewStatus,
  reviewerNote,
  revisionFields,
  interviewSchedule,
  savingReview,
  savingScore,
  onEvaluateAi,
  onPreviewFile,
  onReviewStatusChange,
  onReviewerNoteChange,
  onToggleRevisionField,
  onInterviewScheduleChange,
  onSaveReview,
  onSavePanelScore,
}: SubmissionDetailPanelProps) {
  return (
    <div className="lg:col-span-7 ui-card p-5 sm:p-6 space-y-6">
      <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-emerald-700 font-bold">
            {submission.registrationCode}
          </span>
          <h2 className="text-xl font-bold text-zinc-900">
            {submission.applicantName}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {submission.applicantEmail} • {submission.applicantPhone} • Daftar{' '}
            {formatDateID(submission.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printApplicantDossier(submission, formDef)}
            className="ui-btn-secondary px-3 py-2 text-xs"
            title="Cetak dossier lengkap pelamar untuk rapat panitia"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dossier</span>
          </button>

          <button
            type="button"
            onClick={onEvaluateAi}
            disabled={evaluatingAi}
            className="ui-btn-secondary bg-zinc-50 px-3.5 py-2 text-xs hover:bg-zinc-100"
          >
            {evaluatingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span>
              {submission.aiEvaluation
                ? 'Perbarui Ringkasan Skor'
                : 'Ringkas & Skor Profil'}
            </span>
          </button>
        </div>
      </div>

      {submission.aiEvaluation && (
        <div className="ui-inset p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800">
              Ringkasan Evaluasi ({submission.aiEvaluation.recommendation})
            </span>
            <span className="text-sm font-mono font-bold text-emerald-700">
              {submission.aiEvaluation.score}/100
            </span>
          </div>
          <p className="text-xs text-zinc-700 leading-relaxed">
            {submission.aiEvaluation.summary}
          </p>
          {submission.aiEvaluation.strengths.length > 0 && (
            <div className="text-xs text-emerald-800">
              <strong>Kelebihan:</strong>{' '}
              {submission.aiEvaluation.strengths.join('; ')}
            </div>
          )}
          {submission.aiEvaluation.gaps.length > 0 && (
            <div className="text-xs text-amber-800">
              <strong>Perlu Konfirmasi:</strong>{' '}
              {submission.aiEvaluation.gaps.join('; ')}
            </div>
          )}
        </div>
      )}

      <PanelRubricCard
        panelScores={submission.panelScores || []}
        averagePanelScore={submission.averagePanelScore}
        savingScore={savingScore}
        onSaveScore={onSavePanelScore}
      />

      {/* Jawaban Formulir */}
      <div className="space-y-3">
        <h3 className="ui-eyebrow">Jawaban Formulir</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(submission.answers).map(([key, val]) => {
            const fieldLabel =
              formDef?.fields.find((f) => f.id === key)?.label || key;
            const display = Array.isArray(val) ? val.join(', ') : String(val || '-');

            return (
              <div key={key} className="ui-inset p-3 space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 block">
                  {fieldLabel}
                </span>
                <p className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap">
                  {display}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Berkas Diunggah */}
      <div className="space-y-2.5">
        <h3 className="ui-eyebrow">
          Berkas Persyaratan ({submission.files.length})
        </h3>

        {submission.files.length === 0 ? (
          <p className="text-xs text-zinc-400">Tidak ada berkas diunggah.</p>
        ) : (
          <div className="space-y-2">
            {submission.files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      {file.fieldLabel} — {file.fileName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {formatBytes(file.size)} • {file.mimeType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPreviewFile(file)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau</span>
                  </button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                    title="Buka tab baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keputusan Verifikasi Panitia */}
      <div className="border-t border-zinc-100 pt-4 space-y-3">
        <h3 className="ui-eyebrow">Keputusan &amp; Catatan Panitia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={reviewStatus}
            onChange={(e) =>
              onReviewStatusChange(e.target.value as SubmissionStatus)
            }
            className="ui-input bg-white"
          >
            <option value="SUBMITTED">Menunggu Verifikasi</option>
            <option value="NEEDS_REVISION">Perlu Perbaikan Berkas</option>
            <option value="REVIEWING">Dalam Peninjauan</option>
            <option value="INTERVIEW">Tahap Wawancara / Uji Gagasan</option>
            <option value="ACCEPTED">Lolos Seleksi</option>
            <option value="REJECTED">Tidak Lolos</option>
          </select>

          <button
            type="button"
            onClick={onSaveReview}
            disabled={savingReview}
            className="ui-btn-primary"
          >
            {savingReview && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Simpan Keputusan</span>
          </button>
        </div>

        {reviewStatus === 'NEEDS_REVISION' && submission.files.length > 0 && (
          <div className="ui-callout-amber space-y-2">
            <p className="text-xs font-bold">
              Pilih berkas yang perlu diunggah ulang pelamar:
            </p>
            <div className="flex flex-wrap gap-2">
              {submission.files.map((file) => {
                const checked = revisionFields.includes(file.fieldId);
                return (
                  <label
                    key={file.fieldId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-medium cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleRevisionField(file.fieldId)}
                      className="rounded accent-zinc-900"
                    />
                    <span>{file.fieldLabel}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {reviewStatus === 'INTERVIEW' && (
          <input
            type="text"
            value={interviewSchedule}
            onChange={(e) => onInterviewScheduleChange(e.target.value)}
            placeholder="Jadwal & lokasi/tautan wawancara (mis. Senin 24 Nov 2026, 09.00 WIB, Ruang Rapat STP)"
            className="ui-input text-xs sm:text-sm"
          />
        )}

        <textarea
          rows={2}
          value={reviewerNote}
          onChange={(e) => onReviewerNoteChange(e.target.value)}
          placeholder="Catatan resmi untuk pelamar (tampil di halaman Lacak Pendaftaran)..."
          className="ui-input"
        />
      </div>
    </div>
  );
}
