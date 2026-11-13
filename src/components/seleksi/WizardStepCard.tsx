'use client';

import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import {
  ChecklistItem,
  DuplicateInfo,
  WizardStep,
} from '@/components/seleksi/types';
import WizardDynamicFields from '@/components/seleksi/WizardDynamicFields';
import WizardIdentityFields from '@/components/seleksi/WizardIdentityFields';
import WizardReviewStep from '@/components/seleksi/WizardReviewStep';
import { SelectionField, UploadedFileMeta } from '@/types/selection';

interface WizardStepCardProps {
  currentStep: number;
  wizardSteps: WizardStep[];
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
  onSubmit: () => void;
}

export default function WizardStepCard({
  currentStep,
  wizardSteps,
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
  onSubmit,
}: WizardStepCardProps) {
  const activeStepObj = wizardSteps[currentStep];

  return (
    <section className="ui-card p-5 sm:p-8 space-y-6">
      <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Langkah {currentStep + 1} dari {wizardSteps.length}
          </p>
          <h2 className="ui-section-title">{activeStepObj?.title}</h2>
        </div>
        <p className="text-xs text-zinc-500">
          Isian &amp; berkas aman tersimpan otomatis
        </p>
      </div>

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
          fields={activeStepObj.fields}
          answers={answers}
          files={files}
          uploadingFields={uploadingFields}
          dragActiveField={dragActiveField}
          fieldErrors={fieldErrors}
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
          <button
            type="button"
            onClick={onNextStep}
            disabled={anyUploading}
            className="ui-btn-primary px-5 text-sm"
          >
            <span>Lanjutkan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
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
        )}
      </div>
    </section>
  );
}

