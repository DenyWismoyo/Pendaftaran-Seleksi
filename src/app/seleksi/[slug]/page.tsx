'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import FilePreviewModal from '@/components/FilePreviewModal';
import CompletenessChecklistPanel from '@/components/seleksi/CompletenessChecklistPanel';
import { RestoreDraftModal, SaveDraftModal } from '@/components/seleksi/DraftModals';
import DraftSyncToolbar from '@/components/seleksi/DraftSyncToolbar';
import SelectionCoverView from '@/components/seleksi/SelectionCoverView';
import SelectionHeaderCard from '@/components/seleksi/SelectionHeaderCard';
import SubmissionSuccessView from '@/components/seleksi/SubmissionSuccessView';
import WizardStepCard from '@/components/seleksi/WizardStepCard';
import WizardStepperNav from '@/components/seleksi/WizardStepperNav';
import { useSelectionWizard } from '@/hooks/useSelectionWizard';

function SelectionFormContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const queryDraftToken =
    searchParams.get('draft')?.trim().toUpperCase() || '';

  const w = useSelectionWizard(slug, queryDraftToken);

  if (w.loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        <p className="text-sm">Memuat formulir seleksi...</p>
      </div>
    );
  }

  if (w.errorMsg || !w.form) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-900">
          {w.errorMsg || 'Formulir tidak tersedia'}
        </h1>
        <Link href="/" className="ui-btn-primary text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program</span>
        </Link>
      </div>
    );
  }

  if (w.receipt) {
    return (
      <SubmissionSuccessView receipt={w.receipt} fileCount={w.files.length} />
    );
  }

  const isClosed =
    w.form.status !== 'OPEN' ||
    (w.form.quota > 0 && (w.form.submissionCount || 0) >= w.form.quota);
  const anyUploading = Object.values(w.uploadingFields).some(Boolean);
  const hasAnyProgress =
    Boolean(w.applicantName || w.applicantEmail || w.applicantPhone) ||
    Object.keys(w.answers).length > 0 ||
    w.files.length > 0 ||
    w.draftRestored;
  const resumeUrl =
    typeof window !== 'undefined' && w.draftToken
      ? `${window.location.origin}/seleksi/${slug}?draft=${encodeURIComponent(
          w.draftToken
        )}`
      : '';

  return (
    <div className="ui-shell-narrow space-y-4 sm:space-y-6">
      {w.showCoverScreen ? (
        <SelectionCoverView
          form={w.form}
          isClosed={isClosed}
          hasDraftProgress={hasAnyProgress}
          onStartForm={w.startFromCover}
          onOpenRestore={() => {
            w.setRestoreError('');
            w.setRestoreModalOpen(true);
          }}
          onPreviewAttachment={w.setPreviewFile}
        />
      ) : (
        <>
          <DraftSyncToolbar
            isClosed={isClosed}
            syncState={w.syncState}
            draftToken={w.draftToken}
            lastSyncedAt={w.lastSyncedAt}
            hasAnyProgress={hasAnyProgress}
            onOpenRestore={() => {
              w.setRestoreError('');
              w.setRestoreModalOpen(true);
            }}
            onSaveLater={w.handleSaveAndContinueLater}
            onReset={w.handleResetDraft}
          />
          <SelectionHeaderCard
            form={w.form}
            isClosed={isClosed}
            hasCover={w.hasCover}
            onShowCover={w.openCoverScreen}
          />
          {isClosed ? (
            <div className="ui-callout-rose rounded-none border-x-0 sm:rounded-2xl sm:border-x p-6 text-center text-sm font-semibold">
              Penerimaan pendaftaran untuk program seleksi ini saat ini sedang
              ditutup atau kuota telah terpenuhi.
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <CompletenessChecklistPanel
                completedCount={w.checklist.completedCount}
                totalCount={w.checklist.totalCount}
                percent={w.checklist.percent}
                missingItems={w.missingItems}
                stepSummaries={w.stepSummaries}
                nextIncompleteStepIndex={w.nextIncompleteStepIndex}
                showMissingDetails={w.showMissingDetails}
                onToggleDetails={() => w.setShowMissingDetails((prev) => !prev)}
                onJumpToStep={w.jumpToStep}
              />
              <WizardStepperNav
                steps={w.wizardSteps}
                stepSummaries={w.stepSummaries}
                currentStep={w.currentStep}
                onStepSelect={w.jumpToStep}
                onSkipStep={w.skipToNextStep}
              />
              <WizardStepCard
                currentStep={w.currentStep}
                wizardSteps={w.wizardSteps}
                stepSummary={w.stepSummaries[w.currentStep]}
                nextIncompleteStepIndex={w.nextIncompleteStepIndex}
                fields={w.form.fields}
                applicantName={w.applicantName}
                applicantEmail={w.applicantEmail}
                applicantPhone={w.applicantPhone}
                answers={w.answers}
                files={w.files}
                uploadingFields={w.uploadingFields}
                dragActiveField={w.dragActiveField}
                fieldErrors={w.fieldErrors}
                checkedFileIds={w.checkedFileIds}
                missingItems={w.missingItems}
                duplicateInfo={w.duplicateInfo}
                selfCheckReadability={w.selfCheckReadability}
                selfCheckTruthfulness={w.selfCheckTruthfulness}
                submitting={w.submitting}
                anyUploading={anyUploading}
                onNameChange={w.setApplicantName}
                onEmailChange={w.setApplicantEmail}
                onPhoneChange={w.setApplicantPhone}
                onClearDuplicate={() => w.setDuplicateInfo(null)}
                onAnswerChange={w.handleAnswerChange}
                onCheckboxToggle={w.handleCheckboxToggle}
                onFileUpload={w.handleFileUpload}
                onRemoveFile={w.removeUploadedFile}
                onOpenPreview={w.handleOpenPreview}
                onDragActiveChange={w.setDragActiveField}
                onJumpToStep={w.jumpToStep}
                onReadabilityChange={w.setSelfCheckReadability}
                onTruthfulnessChange={w.setSelfCheckTruthfulness}
                onPrevStep={w.goToPrevStep}
                onNextStep={w.goToNextStep}
                onSkipStep={w.skipToNextStep}
                onSubmit={w.handleSubmit}
                autofill={w.autofill}
              />
            </div>
          )}
        </>
      )}

      <SaveDraftModal open={w.saveModalOpen} draftToken={w.draftToken} resumeUrl={resumeUrl} onClose={() => w.setSaveModalOpen(false)} />
      <RestoreDraftModal open={w.restoreModalOpen} restoreInputCode={w.restoreInputCode} restoreError={w.restoreError} restoringFromServer={w.restoringFromServer} onInputChange={w.setRestoreInputCode} onSubmit={w.handleRestoreByCode} onClose={() => w.setRestoreModalOpen(false)} />
      <FilePreviewModal file={w.previewFile} onClose={() => w.setPreviewFile(null)} />
    </div>
  );
}

export default function SelectionFormPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-900" /></div>}>
      <SelectionFormContent />
    </Suspense>
  );
}
