'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { compressImageIfNeeded } from '@/lib/imageHelper';
import { formatBytes, generateDraftToken } from '@/lib/utils';
import { validateDynamicSubmission } from '@/lib/validation';
import {
  ChecklistItem,
  DuplicateInfo,
  StepCompletionSummary,
  SubmissionReceipt,
  SyncState,
  WizardDraft,
  WizardStep,
} from '@/components/seleksi/types';
import {
  SelectionDraft,
  SelectionField,
  SelectionForm,
  UploadedFileMeta,
} from '@/types/selection';

export function useSelectionWizard(slug: string, queryDraftToken: string) {
  const draftKey = slug ? `seleksi_draft_${slug}` : '';

  const [form, setForm] = useState<SelectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [draftToken, setDraftToken] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [draftInitialized, setDraftInitialized] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [answers, setAnswers] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [dragActiveField, setDragActiveField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);
  const [checkedFileIds, setCheckedFileIds] = useState<Record<string, boolean>>({});
  const [selfCheckReadability, setSelfCheckReadability] = useState(false);
  const [selfCheckTruthfulness, setSelfCheckTruthfulness] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreInputCode, setRestoreInputCode] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoringFromServer, setRestoringFromServer] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load form definition
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    fetch(`/api/forms?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && json.data) setForm(json.data);
        else setErrorMsg(json.error || 'Formulir seleksi tidak ditemukan.');
      })
      .catch(() => {
        if (active) setErrorMsg('Gagal terhubung ke server.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const writeLocalDraft = useCallback(
    (payload: WizardDraft) => {
      if (!draftKey) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload));
      } catch {
        // ignore storage quota errors
      }
    },
    [draftKey]
  );

  const syncDraftToServer = useCallback(
    async (override?: {
      token?: string;
      uploaded?: UploadedFileMeta[];
      silent?: boolean;
    }): Promise<string | null> => {
      if (!form || receipt) return null;
      const token = (override?.token || draftToken || generateDraftToken())
        .trim()
        .toUpperCase();
      if (!draftToken) setDraftToken(token);

      const payload = {
        formId: form.id,
        formSlug: form.slug,
        draftToken: token,
        applicantName,
        applicantEmail,
        applicantPhone,
        answers,
        files: override?.uploaded ?? files,
        currentStep,
      };

      writeLocalDraft({
        draftToken: token,
        applicantName: payload.applicantName,
        applicantEmail: payload.applicantEmail,
        applicantPhone: payload.applicantPhone,
        answers: payload.answers,
        files: payload.files,
        currentStep: payload.currentStep,
        savedAt: new Date().toISOString(),
      });

      setSyncState('saving');
      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal menyimpan draf ke server.');
        }
        const confirmedToken = json.data?.draftToken || token;
        setDraftToken(confirmedToken);
        setSyncState('saved');
        setLastSyncedAt(json.data?.updatedAt || new Date().toISOString());
        return confirmedToken;
      } catch {
        setSyncState('local');
        if (!override?.silent) {
          toast.error('Draf tersimpan di browser, namun sinkronisasi server gagal.');
        }
        return token;
      }
    },
    [
      form,
      receipt,
      draftToken,
      applicantName,
      applicantEmail,
      applicantPhone,
      answers,
      files,
      currentStep,
      writeLocalDraft,
    ]
  );

  // Restore saved draft on initial load
  useEffect(() => {
    if (!draftKey || !form || receipt || draftInitialized) return;
    let cancelled = false;

    async function initDraft() {
      let localDraft: WizardDraft | null = null;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) localDraft = JSON.parse(raw) as WizardDraft;
      } catch {
        localDraft = null;
      }

      const targetToken = queryDraftToken || localDraft?.draftToken || '';

      if (!queryDraftToken && localDraft) {
        if (localDraft.draftToken) setDraftToken(localDraft.draftToken);
        if (localDraft.applicantName) setApplicantName(localDraft.applicantName);
        if (localDraft.applicantEmail) setApplicantEmail(localDraft.applicantEmail);
        if (localDraft.applicantPhone) setApplicantPhone(localDraft.applicantPhone);
        if (localDraft.answers) setAnswers(localDraft.answers);
        if (Array.isArray(localDraft.files)) setFiles(localDraft.files);
        if (typeof localDraft.currentStep === 'number') {
          setCurrentStep(localDraft.currentStep);
        }
        setDraftRestored(true);
        setSyncState('local');
      }

      if (targetToken) {
        try {
          const res = await fetch(
            `/api/drafts?token=${encodeURIComponent(
              targetToken
            )}&formId=${encodeURIComponent(form!.id)}`
          );
          const json = await res.json();
          if (!cancelled && res.ok && json.success && json.data) {
            const serverDraft = json.data as SelectionDraft;
            const serverTime = new Date(serverDraft.updatedAt || 0).getTime();
            const localTime = new Date(localDraft?.savedAt || 0).getTime();

            if (queryDraftToken || !localDraft || serverTime >= localTime) {
              setDraftToken(serverDraft.draftToken);
              setApplicantName(serverDraft.applicantName || '');
              setApplicantEmail(serverDraft.applicantEmail || '');
              setApplicantPhone(serverDraft.applicantPhone || '');
              setAnswers(serverDraft.answers || {});
              setFiles(Array.isArray(serverDraft.files) ? serverDraft.files : []);
              if (typeof serverDraft.currentStep === 'number') {
                setCurrentStep(serverDraft.currentStep);
              }
              setDraftRestored(true);
              setSyncState('saved');
              setLastSyncedAt(serverDraft.updatedAt);
              writeLocalDraft({
                draftToken: serverDraft.draftToken,
                applicantName: serverDraft.applicantName,
                applicantEmail: serverDraft.applicantEmail,
                applicantPhone: serverDraft.applicantPhone,
                answers: serverDraft.answers || {},
                files: serverDraft.files || [],
                currentStep: serverDraft.currentStep || 0,
                savedAt: serverDraft.updatedAt || new Date().toISOString(),
              });
              if (queryDraftToken) {
                toast.success(`Draf ${serverDraft.draftToken} berhasil dimuat.`);
              }
            }
          } else if (!cancelled && queryDraftToken && !res.ok) {
            toast.error(json.error || 'Kode draf dari tautan tidak valid.');
            setDraftToken(generateDraftToken());
          }
        } catch {
          if (!cancelled && !targetToken) setDraftToken(generateDraftToken());
        }
      } else if (!cancelled) {
        setDraftToken(generateDraftToken());
      }

      if (!cancelled) setDraftInitialized(true);
    }

    initDraft();
    return () => {
      cancelled = true;
    };
  }, [draftKey, form, receipt, draftInitialized, queryDraftToken, writeLocalDraft]);

  // Debounced auto-save
  useEffect(() => {
    if (!draftKey || !form || receipt || !draftInitialized) return;
    const hasContent =
      applicantName.trim().length > 0 ||
      applicantEmail.trim().length > 0 ||
      applicantPhone.trim().length > 0 ||
      Object.keys(answers).length > 0 ||
      files.length > 0;
    if (!hasContent) return;

    writeLocalDraft({
      draftToken,
      applicantName,
      applicantEmail,
      applicantPhone,
      answers,
      files,
      currentStep,
      savedAt: new Date().toISOString(),
    });

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncDraftToServer({ silent: true });
    }, 1200);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [
    draftKey,
    form,
    receipt,
    draftInitialized,
    draftToken,
    applicantName,
    applicantEmail,
    applicantPhone,
    answers,
    files,
    currentStep,
    writeLocalDraft,
    syncDraftToServer,
  ]);

  const wizardSteps: WizardStep[] = useMemo(() => {
    if (!form) return [];
    const sectionMap = new Map<string, SelectionField[]>();
    for (const field of form.fields) {
      const sec = field.section?.trim() || 'Data & Persyaratan';
      const arr = sectionMap.get(sec) || [];
      arr.push(field);
      sectionMap.set(sec, arr);
    }

    const dynamicSteps: WizardStep[] = Array.from(sectionMap.entries()).map(
      ([title, secFields]) => ({
        key: `sec-${title}`,
        title,
        type: 'section',
        fields: secFields,
      })
    );

    return [
      { key: 'identity', title: 'Identitas Pelamar', type: 'identity', fields: [] },
      ...dynamicSteps,
      { key: 'review', title: 'Verifikasi & Kirim', type: 'review', fields: [] },
    ];
  }, [form]);

  const checklist = useMemo(() => {
    if (!form) {
      return {
        items: [] as ChecklistItem[],
        completedCount: 0,
        totalCount: 0,
        percent: 0,
      };
    }

    const items: ChecklistItem[] = [
      {
        id: '__identity_name',
        label: 'Nama Lengkap',
        completed: applicantName.trim().length >= 2,
        stepIndex: 0,
      },
      {
        id: '__identity_email',
        label: 'Email Aktif',
        completed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail.trim()),
        stepIndex: 0,
      },
      {
        id: '__identity_phone',
        label: 'Nomor WhatsApp / HP',
        completed: applicantPhone.replace(/\D/g, '').length >= 8,
        stepIndex: 0,
      },
    ];

    const sectionStepIndexMap = new Map<string, number>();
    wizardSteps.forEach((step, idx) => {
      if (step.type === 'section') sectionStepIndexMap.set(step.title, idx);
    });

    for (const field of form.fields) {
      if (!field.required) continue;
      const secTitle = field.section?.trim() || 'Data & Persyaratan';
      const stepIndex = sectionStepIndexMap.get(secTitle) ?? 1;

      let completed = false;
      if (field.type === 'file') {
        completed = files.some((f) => f.fieldId === field.id);
      } else if (field.type === 'checkbox') {
        const val = answers[field.id];
        completed = Array.isArray(val) && val.length > 0;
      } else {
        completed = String(answers[field.id] ?? '').trim().length > 0;
      }

      items.push({ id: field.id, label: field.label, completed, stepIndex });
    }

    const completedCount = items.filter((item) => item.completed).length;
    const totalCount = items.length;
    const percent =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    return { items, completedCount, totalCount, percent };
  }, [form, applicantName, applicantEmail, applicantPhone, answers, files, wizardSteps]);

  const missingItems = useMemo(
    () => checklist.items.filter((item) => !item.completed),
    [checklist.items]
  );

  const stepSummaries: StepCompletionSummary[] = useMemo(() => {
    return wizardSteps.map((step, idx) => {
      if (step.type === 'review') {
        const checkDone =
          (selfCheckReadability ? 1 : 0) + (selfCheckTruthfulness ? 1 : 0);
        return {
          stepIndex: idx,
          key: step.key,
          title: step.title,
          type: step.type,
          totalFields: 2,
          requiredCount: 2,
          completedRequiredCount: checkDone,
          isComplete: missingItems.length === 0 && checkDone === 2,
        };
      }

      const stepItems = checklist.items.filter((item) => item.stepIndex === idx);
      const completedRequiredCount = stepItems.filter((item) => item.completed).length;
      const requiredCount = stepItems.length;
      const totalFields = step.type === 'identity' ? 3 : step.fields.length;

      return {
        stepIndex: idx,
        key: step.key,
        title: step.title,
        type: step.type,
        totalFields,
        requiredCount,
        completedRequiredCount,
        isComplete: requiredCount === 0 || completedRequiredCount >= requiredCount,
      };
    });
  }, [
    wizardSteps,
    checklist.items,
    missingItems.length,
    selfCheckReadability,
    selfCheckTruthfulness,
  ]);

  const nextIncompleteStepIndex = useMemo(() => {
    const incompleteSteps = stepSummaries.filter(
      (s) => s.type !== 'review' && !s.isComplete
    );
    if (incompleteSteps.length === 0) return null;
    const afterCurrent = incompleteSteps.find((s) => s.stepIndex > currentStep);
    if (afterCurrent) return afterCurrent.stepIndex;
    const other = incompleteSteps.find((s) => s.stepIndex !== currentStep);
    return (other ?? incompleteSteps[0]).stepIndex;
  }, [stepSummaries, currentStep]);

  const handleAnswerChange = (
    fieldId: string,
    value: string | number | boolean | string[]
  ) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleCheckboxToggle = (fieldId: string, option: string) => {
    const current = Array.isArray(answers[fieldId])
      ? (answers[fieldId] as string[])
      : [];
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    handleAnswerChange(fieldId, updated);
  };

  const deleteTempFileOnServer = async (storagePath: string, activeToken: string) => {
    if (!form || !storagePath || !activeToken) return;
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          formId: form.id,
          draftToken: activeToken,
        }),
      });
    } catch {
      // ignore cleanup failures
    }
  };

  const handleFileUpload = async (field: SelectionField, rawFile: File) => {
    if (!form) return;
    const activeToken = draftToken || generateDraftToken();
    if (!draftToken) setDraftToken(activeToken);

    const maxSizeMB = field.maxSizeMB || 5;
    setUploadingFields((prev) => ({ ...prev, [field.id]: true }));

    try {
      const { file: readyFile, compressed } = await compressImageIfNeeded(
        rawFile,
        maxSizeMB
      );
      if (compressed) {
        toast.info(
          `Foto "${rawFile.name}" dikompresi otomatis (${formatBytes(
            rawFile.size
          )} → ${formatBytes(readyFile.size)}).`
        );
      }

      if (readyFile.size > maxSizeMB * 1024 * 1024) {
        toast.error(
          `Ukuran "${readyFile.name}" (${formatBytes(
            readyFile.size
          )}) melebihi batas ${maxSizeMB} MB.`
        );
        return;
      }

      const previousFile = files.find((item) => item.fieldId === field.id);
      const fd = new FormData();
      fd.append('file', readyFile);
      fd.append('formId', form.id);
      fd.append('fieldId', field.id);
      fd.append('draftToken', activeToken);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengunggah berkas.');
      }

      const uploadedMeta = json.data as UploadedFileMeta;
      const nextFiles = [
        ...files.filter((item) => item.fieldId !== field.id),
        uploadedMeta,
      ];
      setFiles(nextFiles);
      setCheckedFileIds((prev) => {
        const copy = { ...prev };
        delete copy[field.id];
        return copy;
      });
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field.id];
        return copy;
      });

      if (previousFile?.storagePath) {
        deleteTempFileOnServer(previousFile.storagePath, activeToken);
      }

      await syncDraftToServer({
        token: activeToken,
        uploaded: nextFiles,
        silent: true,
      });

      toast.success(
        previousFile
          ? `Berkas "${readyFile.name}" berhasil diganti.`
          : `Berkas "${readyFile.name}" tersimpan di draf sementara.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setUploadingFields((prev) => ({ ...prev, [field.id]: false }));
    }
  };

  const removeUploadedFile = async (fieldId: string) => {
    const existing = files.find((item) => item.fieldId === fieldId);
    const nextFiles = files.filter((item) => item.fieldId !== fieldId);
    setFiles(nextFiles);
    setCheckedFileIds((prev) => {
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });

    if (existing?.storagePath && draftToken) {
      await deleteTempFileOnServer(existing.storagePath, draftToken);
    }
    await syncDraftToServer({ uploaded: nextFiles, silent: true });
    toast.success('Berkas sementara dihapus.');
  };

  const handleOpenPreview = (file: UploadedFileMeta) => {
    setPreviewFile(file);
    setCheckedFileIds((prev) => ({ ...prev, [file.fieldId]: true }));
  };

  const jumpToStep = (stepIndex: number) => {
    setCurrentStep(Math.max(0, Math.min(wizardSteps.length - 1, stepIndex)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextStep = () => {
    // Allow non-blocking progression so applicants can fill sections in any order.
    const step = wizardSteps[currentStep];
    if (step?.type === 'section') {
      const check = validateDynamicSubmission(step.fields, answers, files);
      const filledInvalidErrors: Record<string, string> = {};
      for (const [fId, msg] of Object.entries(check.errors)) {
        const val = answers[fId];
        const hasValue = Array.isArray(val)
          ? val.length > 0
          : String(val ?? '').trim().length > 0;
        if (hasValue) filledInvalidErrors[fId] = msg;
      }
      if (Object.keys(filledInvalidErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...filledInvalidErrors }));
      }
    }
    setCurrentStep((prev) => Math.min(wizardSteps.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const skipToNextStep = () => {
    setCurrentStep((prev) => Math.min(wizardSteps.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndContinueLater = async () => {
    const token = await syncDraftToServer({ silent: false });
    if (token) setSaveModalOpen(true);
  };

  const handleRestoreByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const cleaned = restoreInputCode.trim().toUpperCase();
    if (!cleaned) {
      setRestoreError('Masukkan kode draf (contoh: DRF-A1B2C3D4).');
      return;
    }

    setRestoringFromServer(true);
    setRestoreError('');
    try {
      const res = await fetch(
        `/api/drafts?token=${encodeURIComponent(
          cleaned
        )}&formId=${encodeURIComponent(form.id)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setRestoreError(json.error || 'Draf tidak ditemukan.');
        return;
      }

      const loaded = json.data as SelectionDraft;
      setDraftToken(loaded.draftToken);
      setApplicantName(loaded.applicantName || '');
      setApplicantEmail(loaded.applicantEmail || '');
      setApplicantPhone(loaded.applicantPhone || '');
      setAnswers(loaded.answers || {});
      setFiles(Array.isArray(loaded.files) ? loaded.files : []);
      if (typeof loaded.currentStep === 'number') {
        setCurrentStep(
          Math.min(Math.max(0, loaded.currentStep), Math.max(0, wizardSteps.length - 1))
        );
      }
      setDraftRestored(true);
      setSyncState('saved');
      setLastSyncedAt(loaded.updatedAt);
      setFieldErrors({});
      setDuplicateInfo(null);

      writeLocalDraft({
        draftToken: loaded.draftToken,
        applicantName: loaded.applicantName,
        applicantEmail: loaded.applicantEmail,
        applicantPhone: loaded.applicantPhone,
        answers: loaded.answers || {},
        files: loaded.files || [],
        currentStep: loaded.currentStep || 0,
        savedAt: loaded.updatedAt || new Date().toISOString(),
      });

      setRestoreModalOpen(false);
      setRestoreInputCode('');
      toast.success(`Draf ${loaded.draftToken} berhasil dipulihkan.`);
    } catch {
      setRestoreError('Gagal menghubungi server untuk memuat draf.');
    } finally {
      setRestoringFromServer(false);
    }
  };

  const handleResetDraft = () => {
    if (!window.confirm('Bersihkan seluruh isian dan berkas sementara pada draf ini?')) {
      return;
    }

    if (draftToken && files.length > 0) {
      for (const f of files) {
        if (f.storagePath) deleteTempFileOnServer(f.storagePath, draftToken);
      }
    }

    if (draftKey) localStorage.removeItem(draftKey);
    setDraftToken(generateDraftToken());
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setAnswers({});
    setFiles([]);
    setCheckedFileIds({});
    setSelfCheckReadability(false);
    setSelfCheckTruthfulness(false);
    setFieldErrors({});
    setDuplicateInfo(null);
    setDraftRestored(false);
    setSyncState('idle');
    setLastSyncedAt(null);
    setCurrentStep(0);
    toast.success('Draf formulir dibersihkan.');
  };

  const handleSubmit = async () => {
    if (!form) return;

    if (missingItems.length > 0) {
      toast.error(`Masih ada ${missingItems.length} item wajib yang belum dilengkapi.`);
      jumpToStep(missingItems[0].stepIndex);
      return;
    }

    if (!selfCheckReadability || !selfCheckTruthfulness) {
      toast.error('Centang seluruh pernyataan verifikasi mandiri sebelum mengirim.');
      return;
    }

    const validation = validateDynamicSubmission(form.fields, answers, files);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    setSubmitting(true);
    setDuplicateInfo(null);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          draftToken: draftToken || undefined,
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          applicantPhone: applicantPhone.trim(),
          answers,
          files,
        }),
      });

      const json = await res.json();
      if (res.status === 409) {
        setDuplicateInfo({
          message: json.error || 'Email ini sudah terdaftar pada program seleksi ini.',
          registrationCode: json.existingRegistrationCode,
        });
        toast.error(json.error || 'Pendaftaran duplikat terdeteksi.');
        return;
      }

      if (!res.ok || !json.success) {
        if (json.fieldErrors) setFieldErrors(json.fieldErrors);
        throw new Error(json.error || 'Gagal mengirim formulir.');
      }

      if (draftKey) localStorage.removeItem(draftKey);
      setReceipt(json.data as SubmissionReceipt);
      toast.success('Pendaftaran seleksi berhasil dikirim!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    loading,
    errorMsg,
    draftToken,
    syncState,
    lastSyncedAt,
    currentStep,
    setCurrentStep,
    applicantName,
    setApplicantName,
    applicantEmail,
    setApplicantEmail,
    applicantPhone,
    setApplicantPhone,
    answers,
    files,
    uploadingFields,
    dragActiveField,
    setDragActiveField,
    fieldErrors,
    submitting,
    receipt,
    draftRestored,
    previewFile,
    setPreviewFile,
    checkedFileIds,
    selfCheckReadability,
    setSelfCheckReadability,
    selfCheckTruthfulness,
    setSelfCheckTruthfulness,
    showMissingDetails,
    setShowMissingDetails,
    saveModalOpen,
    setSaveModalOpen,
    restoreModalOpen,
    setRestoreModalOpen,
    restoreInputCode,
    setRestoreInputCode,
    restoreError,
    setRestoreError,
    restoringFromServer,
    duplicateInfo,
    setDuplicateInfo,
    wizardSteps,
    stepSummaries,
    nextIncompleteStepIndex,
    checklist,
    missingItems,
    handleAnswerChange,
    handleCheckboxToggle,
    handleFileUpload,
    removeUploadedFile,
    handleOpenPreview,
    jumpToStep,
    goToNextStep,
    skipToNextStep,
    goToPrevStep,
    handleSaveAndContinueLater,
    handleRestoreByCode,
    handleResetDraft,
    handleSubmit,
  };
}

