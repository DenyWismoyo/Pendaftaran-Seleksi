'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import FilePreviewModal from '@/components/FilePreviewModal';
import RegistrationCard from '@/components/RegistrationCard';
import { FORM_STATUS_META } from '@/lib/constants';
import { compressImageIfNeeded } from '@/lib/imageHelper';
import {
  cn,
  formatBytes,
  formatDateID,
  generateDraftToken,
} from '@/lib/utils';
import { validateDynamicSubmission } from '@/lib/validation';
import {
  SelectionDraft,
  SelectionField,
  SelectionForm,
  UploadedFileMeta,
} from '@/types/selection';

interface SubmissionReceipt {
  id: string;
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
}

interface WizardDraft {
  draftToken?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  currentStep?: number;
  savedAt: string;
}

type SyncState = 'idle' | 'saving' | 'saved' | 'local' | 'error';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  stepIndex: number;
}

function SelectionFormContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const queryDraftToken =
    searchParams.get('draft')?.trim().toUpperCase() || '';
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

  // Self-verification & UX helper states
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);
  const [checkedFileIds, setCheckedFileIds] = useState<Record<string, boolean>>({});
  const [selfCheckReadability, setSelfCheckReadability] = useState(false);
  const [selfCheckTruthfulness, setSelfCheckTruthfulness] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  // Modals: Simpan & Lanjutkan Nanti / Muat Kode Draf
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreInputCode, setRestoreInputCode] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoringFromServer, setRestoringFromServer] = useState(false);

  // Duplicate submission banner
  const [duplicateInfo, setDuplicateInfo] = useState<{
    message: string;
    registrationCode?: string;
  } | null>(null);

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
        if (json.success && json.data) {
          setForm(json.data);
        } else {
          setErrorMsg(json.error || 'Formulir seleksi tidak ditemukan.');
        }
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

  // Helper to persist snapshot to localStorage
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

  // Helper to sync draft to server
  const syncDraftToServer = useCallback(
    async (override?: {
      token?: string;
      name?: string;
      email?: string;
      phone?: string;
      ans?: Record<string, string | number | boolean | string[]>;
      uploaded?: UploadedFileMeta[];
      step?: number;
      silent?: boolean;
    }): Promise<string | null> => {
      if (!form || receipt) return null;
      const token = (override?.token || draftToken || generateDraftToken())
        .trim()
        .toUpperCase();
      if (!draftToken) setDraftToken(token);

      const payload = {
        formId: form.id,
        draftToken: token,
        applicantName: override?.name ?? applicantName,
        applicantEmail: override?.email ?? applicantEmail,
        applicantPhone: override?.phone ?? applicantPhone,
        answers: override?.ans ?? answers,
        files: override?.uploaded ?? files,
        currentStep: override?.step ?? currentStep,
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

  // Restore saved draft on initial load (?draft=... takes priority, else localStorage)
  useEffect(() => {
    if (!draftKey || !form || receipt || draftInitialized) return;
    let cancelled = false;

    async function initDraft() {
      let localDraft: WizardDraft | null = null;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          localDraft = JSON.parse(raw) as WizardDraft;
        }
      } catch {
        localDraft = null;
      }

      const targetToken = queryDraftToken || localDraft?.draftToken || '';

      // Apply local draft immediately for responsiveness
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

      // Fetch from server if token exists (either via ?draft= or localStorage)
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
          if (!cancelled && !targetToken) {
            setDraftToken(generateDraftToken());
          }
        }
      } else if (!cancelled) {
        setDraftToken(generateDraftToken());
      }

      if (!cancelled) {
        setDraftInitialized(true);
      }
    }

    initDraft();
    return () => {
      cancelled = true;
    };
  }, [draftKey, form, receipt, draftInitialized, queryDraftToken, writeLocalDraft]);

  // Debounced auto-save to localStorage + server
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

  // Build steps: Step 0 (Identitas) + Dynamic Sections + Final Step (Tinjau & Kirim)
  const wizardSteps = useMemo(() => {
    if (!form) return [];
    const sectionMap = new Map<string, SelectionField[]>();
    for (const field of form.fields) {
      const sec = field.section?.trim() || 'Data & Persyaratan';
      const arr = sectionMap.get(sec) || [];
      arr.push(field);
      sectionMap.set(sec, arr);
    }

    const dynamicSteps = Array.from(sectionMap.entries()).map(([title, secFields]) => ({
      key: `sec-${title}`,
      title,
      type: 'section' as const,
      fields: secFields,
    }));

    return [
      { key: 'identity', title: 'Identitas Pelamar', type: 'identity' as const, fields: [] },
      ...dynamicSteps,
      { key: 'review', title: 'Verifikasi & Kirim', type: 'review' as const, fields: [] },
    ];
  }, [form]);

  // Real-time completeness checklist
  const checklist = useMemo(() => {
    if (!form) {
      return { items: [] as ChecklistItem[], completedCount: 0, totalCount: 0, percent: 0 };
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
        completed: applicantPhone.trim().length >= 8,
        stepIndex: 0,
      },
    ];

    const sectionStepIndexMap = new Map<string, number>();
    wizardSteps.forEach((step, idx) => {
      if (step.type === 'section') {
        sectionStepIndexMap.set(step.title, idx);
      }
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

      items.push({
        id: field.id,
        label: field.label,
        completed,
        stepIndex,
      });
    }

    const completedCount = items.filter((item) => item.completed).length;
    const totalCount = items.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    return { items, completedCount, totalCount, percent };
  }, [form, applicantName, applicantEmail, applicantPhone, answers, files, wizardSteps]);

  const missingItems = useMemo(
    () => checklist.items.filter((item) => !item.completed),
    [checklist.items]
  );

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

      const maxBytes = maxSizeMB * 1024 * 1024;
      if (readyFile.size > maxBytes) {
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

  const validateCurrentStep = (): boolean => {
    const step = wizardSteps[currentStep];
    if (!step) return true;

    if (step.type === 'identity') {
      if (applicantName.trim().length < 2) {
        toast.error('Nama lengkap wajib diisi minimal 2 karakter.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail.trim())) {
        toast.error('Masukkan alamat email yang valid.');
        return false;
      }
      if (applicantPhone.trim().length < 8) {
        toast.error('Nomor WhatsApp / HP minimal 8 digit.');
        return false;
      }
      return true;
    }

    if (step.type === 'section') {
      const check = validateDynamicSubmission(step.fields, answers, files);
      if (!check.valid) {
        setFieldErrors((prev) => ({ ...prev, ...check.errors }));
        toast.error(Object.values(check.errors)[0]);
        return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(wizardSteps.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (stepIndex: number) => {
    setCurrentStep(Math.max(0, Math.min(wizardSteps.length - 1, stepIndex)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAndContinueLater = async () => {
    const token = await syncDraftToServer({ silent: false });
    if (token) {
      setSaveModalOpen(true);
    }
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
    const ok = window.confirm(
      'Bersihkan seluruh isian dan berkas sementara pada draf ini?'
    );
    if (!ok) return;

    if (draftToken && files.length > 0) {
      for (const f of files) {
        if (f.storagePath) {
          deleteTempFileOnServer(f.storagePath, draftToken);
        }
      }
    }

    if (draftKey) localStorage.removeItem(draftKey);
    const freshToken = generateDraftToken();
    setDraftToken(freshToken);
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

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} berhasil disalin.`);
    } catch {
      toast.error(`Gagal menyalin ${label.toLowerCase()}.`);
    }
  };

  const handleSubmit = async () => {
    if (!form) return;

    if (missingItems.length > 0) {
      toast.error(
        `Masih ada ${missingItems.length} item wajib yang belum dilengkapi.`
      );
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
          message:
            json.error ||
            'Email ini sudah terdaftar pada program seleksi ini.',
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        <p className="text-sm">Memuat formulir seleksi...</p>
      </div>
    );
  }

  if (errorMsg || !form) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-zinc-900">
          {errorMsg || 'Formulir tidak tersedia'}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program</span>
        </Link>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-emerald-950">
              Pendaftaran Seleksi Berhasil Diterima
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
              Cetak atau simpan Kartu Bukti Pendaftaran di bawah ini. Anda dapat memantau
              progres seleksi kapan saja di halaman Lacak Pendaftaran.
            </p>
          </div>
        </div>

        <RegistrationCard
          registrationCode={receipt.registrationCode}
          formTitle={receipt.formTitle}
          applicantName={receipt.applicantName}
          applicantEmail={receipt.applicantEmail}
          status="SUBMITTED"
          createdAt={receipt.createdAt}
          fileCount={files.length}
        />

        <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Program</span>
          </Link>

          <Link
            href={`/cek-status?code=${encodeURIComponent(
              receipt.registrationCode
            )}&email=${encodeURIComponent(receipt.applicantEmail)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <span>Lacak Status Pendaftaran</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isClosed =
    form.status !== 'OPEN' ||
    (form.quota > 0 && (form.submissionCount || 0) >= form.quota);
  const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
  const activeStepObj = wizardSteps[currentStep];
  const anyUploading = Object.values(uploadingFields).some(Boolean);
  const hasAnyProgress =
    Boolean(applicantName || applicantEmail || applicantPhone) ||
    Object.keys(answers).length > 0 ||
    files.length > 0 ||
    draftRestored;

  const resumeUrl =
    typeof window !== 'undefined' && draftToken
      ? `${window.location.origin}/seleksi/${slug}?draft=${encodeURIComponent(
          draftToken
        )}`
      : '';

  const uploadedFormFiles = form.fields
    .filter((f) => f.type === 'file')
    .map((f) => ({
      field: f,
      uploaded: files.find((item) => item.fieldId === f.id),
    }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Bar: Navigation + Draft Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Daftar Seleksi</span>
        </Link>

        {!isClosed && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Sync Status Pill */}
            <div
              className="inline-flex items-center gap-2 text-xs bg-white border border-zinc-200 px-3 py-1.5 rounded-xl text-zinc-600"
              title={
                lastSyncedAt
                  ? `Terakhir sinkron: ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}`
                  : 'Draf otomatis disimpan'
              }
            >
              {syncState === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-700" />
                  <span>Menyimpan...</span>
                </>
              ) : syncState === 'saved' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-800 font-medium">
                    Tersimpan •{' '}
                    <span className="font-mono">{draftToken}</span>
                  </span>
                </>
              ) : syncState === 'local' ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-800">
                    Draf lokal •{' '}
                    <span className="font-mono">{draftToken}</span>
                  </span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Kode Draf: <span className="font-mono font-semibold">{draftToken || '...'}</span>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setRestoreError('');
                setRestoreModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Punya Kode Draf?</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndContinueLater}
              disabled={syncState === 'saving'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Simpan &amp; Lanjutkan Nanti</span>
            </button>

            {hasAnyProgress && (
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Bersihkan seluruh isian draf"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-md">
            {form.category}
          </span>
          <span
            className={cn(
              'text-xs font-semibold px-3 py-1 rounded-md border',
              statusMeta.badgeClass
            )}
          >
            {isClosed ? 'Pendaftaran Ditutup / Kuota Penuh' : statusMeta.label}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            {form.description}
          </p>
        )}

        {form.requirementsNote && (
          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950 space-y-2">
            <div>
              <strong className="font-semibold block mb-1">
                Persyaratan Dokumen:
              </strong>
              <p>{form.requirementsNote}</p>
            </div>
            <div>
              <Link
                href="/template-dokumen"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Unduh Format Surat &amp; Template Dokumen (.doc / .md)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-zinc-500 pt-1">
          <span>
            Terdaftar: <strong className="text-zinc-800">{form.submissionCount || 0}</strong>
            {form.quota > 0 ? ` / ${form.quota}` : ''}
          </span>
          {form.endDate && (
            <span>
              Batas akhir: <strong className="text-zinc-800">{formatDateID(form.endDate)}</strong>
            </span>
          )}
        </div>
      </section>

      {isClosed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 text-sm font-semibold">
          Penerimaan pendaftaran untuk program seleksi ini saat ini sedang ditutup atau
          kuota telah terpenuhi.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Real-Time Completeness Checklist Panel */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Kelengkapan Persyaratan Wajib
                </p>
                <p className="text-sm font-semibold text-zinc-900">
                  {missingItems.length === 0 ? (
                    <span className="text-emerald-700 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Semua {checklist.totalCount} item wajib telah terisi — siap diperiksa &amp; dikirim
                    </span>
                  ) : (
                    <span>
                      {checklist.completedCount} dari {checklist.totalCount} item wajib terisi{' '}
                      <span className="text-zinc-500 font-normal">
                        ({missingItems.length} lagi belum lengkap)
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-zinc-900">
                  {checklist.percent}%
                </span>
                {missingItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMissingDetails((prev) => !prev)}
                    className="text-xs font-semibold text-zinc-700 hover:text-emerald-700 underline cursor-pointer"
                  >
                    {showMissingDetails ? 'Sembunyikan' : 'Lihat yang kurang'}
                  </button>
                )}
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  checklist.percent === 100 ? 'bg-emerald-600' : 'bg-zinc-900'
                )}
                style={{ width: `${checklist.percent}%` }}
              />
            </div>

            {showMissingDetails && missingItems.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {missingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToStep(item.stepIndex)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium hover:bg-amber-100 cursor-pointer"
                  >
                    <span>• {item.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Stepper Bar */}
          <nav
            aria-label="Tahapan formulir"
            className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm overflow-x-auto"
          >
            <ol className="flex items-center gap-2 min-w-max">
              {wizardSteps.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <li key={step.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx <= currentStep) setCurrentStep(idx);
                      }}
                      disabled={idx > currentStep}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                        isActive
                          ? 'bg-zinc-900 text-white'
                          : isDone
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer hover:bg-emerald-100'
                            : 'bg-zinc-50 text-zinc-400 cursor-not-allowed'
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px]',
                          isActive
                            ? 'bg-white text-zinc-900'
                            : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-200 text-zinc-500'
                        )}
                      >
                        {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                      </span>
                      <span>{step.title}</span>
                    </button>
                    {idx < wizardSteps.length - 1 && (
                      <div className="w-4 h-px bg-zinc-200" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Active Step Card */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Langkah {currentStep + 1} dari {wizardSteps.length}
                </p>
                <h2 className="text-xl font-bold text-zinc-900">
                  {activeStepObj?.title}
                </h2>
              </div>
              <p className="text-xs text-zinc-500">
                Isian &amp; berkas aman tersimpan otomatis
              </p>
            </div>

            {/* Step: Identity */}
            {activeStepObj?.type === 'identity' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-sm font-semibold text-zinc-800 block">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Sesuai KTP / Dokumen Identitas Resmi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-zinc-800 block">
                    Email Aktif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => {
                      setApplicantEmail(e.target.value);
                      if (duplicateInfo) setDuplicateInfo(null);
                    }}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Digunakan sebagai verifikasi saat cek status kelulusan.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-zinc-800 block">
                    Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Pastikan aktif untuk pemberitahuan jadwal seleksi.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Dynamic Section Fields */}
            {activeStepObj?.type === 'section' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {activeStepObj.fields.map((field) => {
                  const err = fieldErrors[field.id];
                  const uploadedFile = files.find((f) => f.fieldId === field.id);
                  const isUploading = Boolean(uploadingFields[field.id]);
                  const isDragging = dragActiveField === field.id;
                  const isImage = uploadedFile?.mimeType.startsWith('image/');
                  const colSpan =
                    field.width === 'half' ? 'sm:col-span-1' : 'sm:col-span-2';
                  const strVal = String(answers[field.id] ?? '');
                  const isNikField = /nik|nomor induk kependudukan/i.test(
                    field.label
                  );
                  const digitLen = strVal.replace(/\D/g, '').length;
                  const wordCount = strVal.trim()
                    ? strVal.trim().split(/\s+/).length
                    : 0;

                  return (
                    <div key={field.id} className={cn('space-y-1.5', colSpan)}>
                      <label className="text-sm font-semibold text-zinc-800 block">
                        {field.label}{' '}
                        {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-zinc-500">{field.description}</p>
                      )}

                      {field.type === 'textarea' && (
                        <div className="space-y-1">
                          <textarea
                            rows={4}
                            value={strVal}
                            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                            <span>{wordCount} kata</span>
                            <span>{strVal.length} karakter</span>
                          </div>
                        </div>
                      )}

                      {['text', 'email', 'tel', 'number', 'date'].includes(
                        field.type
                      ) && (
                        <div className="space-y-1">
                          <input
                            type={field.type}
                            value={strVal}
                            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                          {isNikField && (
                            <p
                              className={cn(
                                'text-[11px] font-mono',
                                digitLen === 16
                                  ? 'text-emerald-700 font-semibold'
                                  : digitLen > 0
                                    ? 'text-amber-700'
                                    : 'text-zinc-400'
                              )}
                            >
                              {digitLen === 16
                                ? '16/16 digit NIK valid'
                                : `${digitLen}/16 digit NIK`}
                            </p>
                          )}
                        </div>
                      )}

                      {field.type === 'select' && (
                        <select
                          value={strVal}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        >
                          <option value="">-- Pilih Opsi --</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'radio' && (
                        <div className="space-y-2 pt-1">
                          {field.options.map((opt) => (
                            <label
                              key={opt}
                              className={cn(
                                'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors',
                                answers[field.id] === opt
                                  ? 'border-zinc-900 bg-zinc-50 font-semibold'
                                  : 'border-zinc-200 hover:bg-zinc-50'
                              )}
                            >
                              <input
                                type="radio"
                                name={field.id}
                                checked={answers[field.id] === opt}
                                onChange={() => handleAnswerChange(field.id, opt)}
                                className="accent-zinc-900"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'checkbox' && (
                        <div className="space-y-2 pt-1">
                          {field.options.map((opt) => {
                            const selected = Array.isArray(answers[field.id])
                              ? (answers[field.id] as string[]).includes(opt)
                              : false;
                            return (
                              <label
                                key={opt}
                                className={cn(
                                  'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors',
                                  selected
                                    ? 'border-zinc-900 bg-zinc-50 font-semibold'
                                    : 'border-zinc-200 hover:bg-zinc-50'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => handleCheckboxToggle(field.id, opt)}
                                  className="rounded accent-zinc-900"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {field.type === 'file' && (
                        <div className="pt-1 space-y-2">
                          {uploadedFile ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                              <div className="flex items-center gap-3 min-w-0">
                                {isImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={uploadedFile.url}
                                    alt={uploadedFile.fileName}
                                    className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white cursor-pointer"
                                    onClick={() => handleOpenPreview(uploadedFile)}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-emerald-700" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(uploadedFile)}
                                    className="text-sm font-semibold text-emerald-950 hover:underline truncate block text-left max-w-full cursor-pointer"
                                  >
                                    {uploadedFile.fileName}
                                  </button>
                                  <span className="text-xs text-emerald-700">
                                    {formatBytes(uploadedFile.size)} • Tersimpan sementara (aman diganti sebelum kirim)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(uploadedFile)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Pratinjau</span>
                                </button>

                                <label
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer',
                                    isUploading && 'opacity-60 pointer-events-none'
                                  )}
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  <span>Ganti</span>
                                  <input
                                    type="file"
                                    accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                                    disabled={isUploading}
                                    className="hidden"
                                    onChange={(e) => {
                                      const picked = e.target.files?.[0];
                                      if (picked) handleFileUpload(field, picked);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => removeUploadedFile(field.id)}
                                  disabled={isUploading}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                                  title="Hapus berkas sementara"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragActiveField(field.id);
                              }}
                              onDragLeave={() => setDragActiveField(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragActiveField(null);
                                const dropped = e.dataTransfer.files?.[0];
                                if (dropped && !isUploading) {
                                  handleFileUpload(field, dropped);
                                }
                              }}
                              className={cn(
                                'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer text-center',
                                isDragging
                                  ? 'border-emerald-600 bg-emerald-50/50'
                                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100/70'
                              )}
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
                                  <span className="text-xs font-semibold text-zinc-700">
                                    Mengunggah berkas sementara...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <FileUp className="w-6 h-6 text-zinc-400" />
                                  <div>
                                    <span className="text-sm font-semibold text-zinc-900">
                                      Klik atau seret berkas ke area ini
                                    </span>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      Format: {field.accept || '.pdf,.jpg,.png'} • Maks.{' '}
                                      {field.maxSizeMB || 5} MB (foto besar otomatis dikompresi)
                                    </p>
                                  </div>
                                </>
                              )}
                              <input
                                type="file"
                                accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                                disabled={isUploading}
                                className="hidden"
                                onChange={(e) => {
                                  const picked = e.target.files?.[0];
                                  if (picked) handleFileUpload(field, picked);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {err && (
                        <p className="text-xs font-medium text-rose-600">{err}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step: Final Review & Self Verification */}
            {activeStepObj?.type === 'review' && (
              <div className="space-y-6">
                {missingItems.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2.5">
                    <div className="flex items-start gap-2 text-rose-900">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">
                          Masih ada {missingItems.length} item wajib yang belum lengkap
                        </p>
                        <p className="text-xs text-rose-800">
                          Klik salah satu item di bawah untuk langsung menuju bagian yang perlu dilengkapi.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {missingItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => jumpToStep(item.stepIndex)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {duplicateInfo && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-start gap-2.5 text-amber-950">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold">{duplicateInfo.message}</p>
                        {duplicateInfo.registrationCode && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-mono bg-white border border-amber-200 px-2.5 py-1 rounded-md font-semibold">
                              Kode Terdaftar: {duplicateInfo.registrationCode}
                            </span>
                            <Link
                              href={`/cek-status?code=${encodeURIComponent(
                                duplicateInfo.registrationCode
                              )}&email=${encodeURIComponent(applicantEmail.trim())}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                            >
                              <span>Cek Status Pendaftaran</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Identity Summary */}
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Identitas Pelamar
                    </h3>
                    <button
                      type="button"
                      onClick={() => jumpToStep(0)}
                      className="text-xs font-semibold text-zinc-700 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Ubah Identitas
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-zinc-500 block">Nama Lengkap</span>
                      <span className="font-semibold text-zinc-900">
                        {applicantName || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 block">Email</span>
                      <span className="font-semibold text-zinc-900">
                        {applicantEmail || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 block">WhatsApp / HP</span>
                      <span className="font-semibold text-zinc-900">
                        {applicantPhone || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Non-file Answers Summary */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Ringkasan Isian Formulir
                  </h3>
                  <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                    {form.fields
                      .filter((f) => f.type !== 'file')
                      .map((f) => {
                        const raw = answers[f.id];
                        const display = Array.isArray(raw)
                          ? raw.join(', ')
                          : String(raw || '-');
                        const secTitle = f.section?.trim() || 'Data & Persyaratan';
                        const secIdx = wizardSteps.findIndex(
                          (s) => s.type === 'section' && s.title === secTitle
                        );

                        return (
                          <div
                            key={f.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                          >
                            <span className="text-zinc-500">{f.label}</span>
                            <div className="flex items-center gap-3 sm:justify-end">
                              <span className="font-semibold text-zinc-900 sm:text-right break-words max-w-md">
                                {display}
                              </span>
                              {secIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => jumpToStep(secIdx)}
                                  className="text-[11px] font-semibold text-zinc-500 hover:text-emerald-700 underline shrink-0 cursor-pointer"
                                >
                                  Ubah
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Self Verification of Uploaded Documents */}
                {uploadedFormFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Verifikasi Mandiri Berkas Unggahan
                      </h3>
                      <span className="text-[11px] text-zinc-500">
                        Gunakan &ldquo;Periksa Berkas&rdquo; untuk memastikan isi dokumen terbaca jelas
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                      {uploadedFormFiles.map(({ field, uploaded }) => {
                        const isUploading = Boolean(uploadingFields[field.id]);
                        const wasChecked = Boolean(checkedFileIds[field.id]);

                        return (
                          <div
                            key={field.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-800">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-rose-500 ml-0.5">*</span>
                                  )}
                                </span>
                                {uploaded ? (
                                  wasChecked ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      <Check className="w-3 h-3" />
                                      Sudah diperiksa
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                      Belum diperiksa
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                    Belum diunggah
                                  </span>
                                )}
                              </div>
                              {uploaded && (
                                <p className="text-xs text-zinc-500 truncate">
                                  {uploaded.fileName} • {formatBytes(uploaded.size)}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {uploaded && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(uploaded)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Periksa Berkas</span>
                                </button>
                              )}

                              <label
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer',
                                  isUploading && 'opacity-60 pointer-events-none'
                                )}
                              >
                                {isUploading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>{uploaded ? 'Ganti Berkas' : 'Unggah'}</span>
                                <input
                                  type="file"
                                  accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                                  disabled={isUploading}
                                  className="hidden"
                                  onChange={(e) => {
                                    const picked = e.target.files?.[0];
                                    if (picked) handleFileUpload(field, picked);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Self-Verification Declaration Checkboxes */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-950">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <h3 className="text-sm font-bold">
                      Pernyataan Verifikasi Mandiri Sebelum Kirim
                    </h3>
                  </div>

                  <label className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selfCheckReadability}
                      onChange={(e) => setSelfCheckReadability(e.target.checked)}
                      className="mt-1 rounded accent-emerald-700 cursor-pointer"
                    />
                    <span>
                      Saya telah memeriksa pratinjau seluruh dokumen yang diunggah dan
                      memastikan berkas terbaca jelas, tidak terpotong, serta sesuai
                      ketentuan persyaratan.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selfCheckTruthfulness}
                      onChange={(e) => setSelfCheckTruthfulness(e.target.checked)}
                      className="mt-1 rounded accent-emerald-700 cursor-pointer"
                    />
                    <span>
                      Saya menyatakan seluruh data dan berkas yang diisi adalah benar dan
                      dapat dipertanggungjawabkan; pendaftaran bersifat final dan tidak
                      dapat diubah setelah dikirim.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step Navigation Footer */}
            <div className="border-t border-zinc-100 pt-5 flex flex-wrap items-center justify-between gap-3">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 cursor-pointer"
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
                  onClick={goToNextStep}
                  disabled={anyUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer transition-colors"
                >
                  <span>Lanjutkan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    anyUploading ||
                    missingItems.length > 0 ||
                    !selfCheckReadability ||
                    !selfCheckTruthfulness
                  }
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
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
        </div>
      )}

      {/* Modal: Simpan & Lanjutkan Nanti */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSaveModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Draf Tersimpan di Server
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Anda dapat menutup halaman ini atau melanjutkan dari perangkat lain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
                Kode Draf Anda
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xl font-bold text-emerald-950">
                  {draftToken}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(draftToken, 'Kode draf')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </button>
              </div>
            </div>

            {resumeUrl && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Tautan Lanjutkan Langsung
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resumeUrl}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono text-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(resumeUrl, 'Tautan draf')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-500 leading-relaxed">
              Seluruh jawaban yang diketik dan berkas yang sudah diunggah sementara tetap
              aman tersimpan. Simpan kode atau tautan di atas sebelum menutup tab.
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
              >
                Mengerti, Lanjutkan Mengisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Punya Kode Draf */}
      {restoreModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRestoreModalOpen(false)}
        >
          <form
            onSubmit={handleRestoreByCode}
            className="bg-white rounded-2xl border border-zinc-200 max-w-md w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Pulihkan Draf Tersimpan
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Masukkan kode draf untuk melanjutkan isian dan berkas Anda sebelumnya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Kode Draf
              </label>
              <input
                type="text"
                value={restoreInputCode}
                onChange={(e) => setRestoreInputCode(e.target.value.toUpperCase())}
                placeholder="Contoh: DRF-A1B2C3D4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {restoreError && (
                <p className="text-xs font-medium text-rose-600">{restoreError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={restoringFromServer}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                {restoringFromServer && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Muat Draf</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* In-App File Preview Modal */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

export default function SelectionFormPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
          <p className="text-sm">Memuat formulir seleksi...</p>
        </div>
      }
    >
      <SelectionFormContent />
    </Suspense>
  );
}
