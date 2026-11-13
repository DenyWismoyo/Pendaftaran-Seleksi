'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  FastForward,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import {
  ChecklistItem,
  DuplicateInfo,
  StepCompletionSummary,
  WizardStep,
} from '@/components/seleksi/types';
import SmartAutofillBanner from '@/components/seleksi/SmartAutofillBanner';
import SmartAutofillSuggestionsCard, {
  AutofillResultState,
} from '@/components/seleksi/SmartAutofillSuggestionsCard';
import WizardDynamicFields from '@/components/seleksi/WizardDynamicFields';
import WizardIdentityFields from '@/components/seleksi/WizardIdentityFields';
import WizardReviewStep from '@/components/seleksi/WizardReviewStep';
import { cn } from '@/lib/utils';
import { AutofillTargetInfo, SelectionField, UploadedFileMeta } from '@/types/selection';

interface WizardStepCardProps {
  formSlug?: string;
  currentStep: number;
  wizardSteps: WizardStep[];
  stepSummary?: StepCompletionSummary;
  nextIncompleteStepIndex: number | null;
  fields: SelectionField[];
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  uploadingFields: Record<string, boolean>;
  dragActiveField: string | null;
  fieldErrors: Record<string, string>;
  checkedFileIds: Record<string, boolean>;
  missingItems: ChecklistItem[];
  duplicateInfo: DuplicateInfo | null;
  selfCheckReadability: boolean;
  selfCheckTruthfulness: boolean;
  submitting: boolean;
  anyUploading: boolean;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onClearDuplicate: () => void;
  onAnswerChange: (
    fieldId: string,
    value: string | number | boolean | string[]
  ) => void;
  onCheckboxToggle: (fieldId: string, option: string) => void;
  onFileUpload: (field: SelectionField, file: File) => void;
  onRemoveFile: (fieldId: string) => void;
  onOpenPreview: (file: UploadedFileMeta) => void;
  onDragActiveChange: (fieldId: string | null) => void;
  onJumpToStep: (stepIndex: number) => void;
  onReadabilityChange: (checked: boolean) => void;
  onTruthfulnessChange: (checked: boolean) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSkipStep: () => void;
  onSubmit: () => void;
  autofill?: {
    recommendedSources: Array<{
      field: SelectionField;
      targets: AutofillTargetInfo[];
    }>;
    targetsByField: Record<string, AutofillTargetInfo[]>;
    busyField: string | null;
    result: AutofillResultState | null;
    onExtract: (field: SelectionField, file: UploadedFileMeta) => void;
    onApply: (items: Array<{ fieldId: string; value: string | string[] }>) => void;
    onDismiss: () => void;
    isTargetFilled: (fieldId: string) => boolean;
  };
}

export default function WizardStepCard({
  formSlug,
  currentStep,
  wizardSteps,
  stepSummary,
  nextIncompleteStepIndex,
  fields,
  applicantName,
  applicantEmail,
  applicantPhone,
  answers,
  files,
  uploadingFields,
  dragActiveField,
  fieldErrors,
  checkedFileIds,
  missingItems,
  duplicateInfo,
  selfCheckReadability,
  selfCheckTruthfulness,
  submitting,
  anyUploading,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onClearDuplicate,
  onAnswerChange,
  onCheckboxToggle,
  onFileUpload,
  onRemoveFile,
  onOpenPreview,
  onDragActiveChange,
  onJumpToStep,
  onReadabilityChange,
  onTruthfulnessChange,
  onPrevStep,
  onNextStep,
  onSkipStep,
  onSubmit,
  autofill,
}: WizardStepCardProps) {
  const [onlyUnfilled, setOnlyUnfilled] = useState(false);
  const activeStepObj = wizardSteps[currentStep];

  const busyFieldLabel = autofill?.busyField
    ? fields.find((f) => f.id === autofill.busyField)?.label || 'Berkas'
    : null;

  useEffect(() => {
    setOnlyUnfilled(false);
  }, [currentStep]);

  const isFieldFilled = (field: SelectionField) => {
    if (field.type === 'file') return files.some((f) => f.fieldId === field.id);
    if (field.type === 'checkbox') {
      const val = answers[field.id];
      return Array.isArray(val) && val.length > 0;
    }
    return String(answers[field.id] ?? '').trim().length > 0;
  };

  const sectionFields = activeStepObj?.type === 'section' ? activeStepObj.fields : [];
  const unfilledSectionFields = sectionFields.filter((f) => !isFieldFilled(f));
  const displayedSectionFields =
    onlyUnfilled && unfilledSectionFields.length > 0
      ? unfilledSectionFields
      : sectionFields;
  const hasFileFields = sectionFields.some((f) => f.type === 'file');

  return (
    <section className="ui-card p-5 sm:p-8 space-y-6">
      <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Langkah {currentStep + 1} dari {wizardSteps.length}
            </p>
            {stepSummary && stepSummary.type !== 'review' && (
              <span
                className={cn(
                  'text-[11px] font-mono px-2 py-0.5 rounded-md border',
                  stepSummary.isComplete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                )}
              >
                {stepSummary.isComplete
                  ? 'Bagian ini lengkap'
                  : `${stepSummary.completedRequiredCount}/${stepSummary.requiredCount} wajib terisi`}
              </span>
            )}
          </div>
          <h2 className="ui-section-title">{activeStepObj?.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeStepObj?.type === 'section' &&
            sectionFields.length > 2 &&
            unfilledSectionFields.length > 0 &&
            unfilledSectionFields.length < sectionFields.length && (
              <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setOnlyUnfilled(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    !onlyUnfilled
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  Semua ({sectionFields.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyUnfilled(true)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    onlyUnfilled
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  Belum diisi ({unfilledSectionFields.length})
                </button>
              </div>
            )}

          <p className="text-xs text-zinc-500">
            Isian &amp; berkas aman tersimpan otomatis
          </p>
        </div>
      </div>

      {hasFileFields && (
        <div className="ui-inset flex flex-wrap items-center justify-between gap-2 py-2.5 px-3.5 text-xs">
          <span className="text-zinc-600">
            Belum punya format surat lamaran, pakta integritas, atau daftar riwayat hidup?
          </span>
          <Link
            href={
              formSlug
                ? `/template-dokumen?seleksi=${encodeURIComponent(formSlug)}`
                : '/template-dokumen'
            }
            target="_blank"
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-900 underline shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Buka Bank Template (.doc / .md)</span>
          </Link>
        </div>
      )}

      {autofill &&
        activeStepObj?.type !== 'review' &&
        autofill.recommendedSources.length > 0 && (
          <SmartAutofillBanner
            recommendedSources={autofill.recommendedSources}
            files={files}
            uploadingFields={uploadingFields}
            autofillBusyField={autofill.busyField}
            onQuickUpload={onFileUpload}
            onExtractExisting={autofill.onExtract}
          />
        )}

      {autofill && (busyFieldLabel || autofill.result) && (
        <SmartAutofillSuggestionsCard
          busyFieldLabel={busyFieldLabel}
          result={autofill.result}
          isTargetFilled={autofill.isTargetFilled}
          onApply={autofill.onApply}
          onDismiss={autofill.onDismiss}
        />
      )}

      {activeStepObj?.type === 'identity' && (
        <WizardIdentityFields
          applicantName={applicantName}
          applicantEmail={applicantEmail}
          applicantPhone={applicantPhone}
          hasDuplicate={Boolean(duplicateInfo)}
          onNameChange={onNameChange}
          onEmailChange={onEmailChange}
          onPhoneChange={onPhoneChange}
          onClearDuplicate={onClearDuplicate}
        />
      )}

      {activeStepObj?.type === 'section' && (
        <WizardDynamicFields
          fields={displayedSectionFields}
          answers={answers}
          files={files}
          uploadingFields={uploadingFields}
          dragActiveField={dragActiveField}
          fieldErrors={fieldErrors}
          autofillTargetsByField={autofill?.targetsByField}
          autofillBusyField={autofill?.busyField}
          onExtractAutofill={autofill?.onExtract}
          onAnswerChange={onAnswerChange}
          onCheckboxToggle={onCheckboxToggle}
          onFileUpload={onFileUpload}
          onRemoveFile={onRemoveFile}
          onOpenPreview={onOpenPreview}
          onDragActiveChange={onDragActiveChange}
        />
      )}

      {activeStepObj?.type === 'review' && (
        <WizardReviewStep
          fields={fields}
          wizardSteps={wizardSteps}
          applicantName={applicantName}
          applicantEmail={applicantEmail}
          applicantPhone={applicantPhone}
          answers={answers}
          files={files}
          uploadingFields={uploadingFields}
          checkedFileIds={checkedFileIds}
          missingItems={missingItems}
          duplicateInfo={duplicateInfo}
          selfCheckReadability={selfCheckReadability}
          selfCheckTruthfulness={selfCheckTruthfulness}
          onJumpToStep={onJumpToStep}
          onOpenPreview={onOpenPreview}
          onFileUpload={onFileUpload}
          onReadabilityChange={onReadabilityChange}
          onTruthfulnessChange={onTruthfulnessChange}
        />
      )}

      <div className="border-t border-zinc-100 pt-5 flex flex-wrap items-center justify-between gap-3">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={onPrevStep}
            className="ui-btn-secondary text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < wizardSteps.length - 1 ? (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {!stepSummary?.isComplete && (
              <button
                type="button"
                onClick={onSkipStep}
                disabled={anyUploading}
                className="ui-btn-secondary text-sm"
              >
                <FastForward className="w-4 h-4" />
                <span>Lewati Sementara</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNextStep}
              disabled={anyUploading}
              className="ui-btn-primary px-5 text-sm"
            >
              <span>Simpan &amp; Lanjutkan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {missingItems.length > 0 && nextIncompleteStepIndex !== null && (
              <button
                type="button"
                onClick={() => onJumpToStep(nextIncompleteStepIndex)}
                className="ui-btn-secondary text-sm"
              >
                <Compass className="w-4 h-4" />
                <span>Lengkapi {missingItems.length} Item Kurang</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={
                submitting ||
                anyUploading ||
                missingItems.length > 0 ||
                !selfCheckReadability ||
                !selfCheckTruthfulness
              }
              className="ui-btn-accent px-6 text-sm shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pendaftaran...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Pendaftaran Sekarang</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
