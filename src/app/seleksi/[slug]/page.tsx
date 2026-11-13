'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import RegistrationCard from '@/components/RegistrationCard';
import { SelectionField, SelectionForm, UploadedFileMeta } from '@/types/selection';
import { FORM_STATUS_META } from '@/lib/constants';
import { validateDynamicSubmission } from '@/lib/validation';
import { cn, formatBytes, formatDateID } from '@/lib/utils';

interface SubmissionReceipt {
  id: string;
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
}

interface WizardDraft {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  savedAt: string;
}

export default function SelectionFormPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const draftKey = slug ? `seleksi_draft_${slug}` : '';

  const [form, setForm] = useState<SelectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

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

  // Restore saved draft from localStorage
  useEffect(() => {
    if (!draftKey || !form || receipt) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as WizardDraft;
      if (draft.applicantName) setApplicantName(draft.applicantName);
      if (draft.applicantEmail) setApplicantEmail(draft.applicantEmail);
      if (draft.applicantPhone) setApplicantPhone(draft.applicantPhone);
      if (draft.answers) setAnswers(draft.answers);
      if (Array.isArray(draft.files)) setFiles(draft.files);
      setDraftRestored(true);
    } catch {
      // ignore corrupted draft
    }
  }, [draftKey, form, receipt]);

  // Auto-save draft
  useEffect(() => {
    if (!draftKey || !form || receipt) return;
    const hasContent =
      applicantName ||
      applicantEmail ||
      applicantPhone ||
      Object.keys(answers).length > 0 ||
      files.length > 0;
    if (!hasContent) return;

    const timer = setTimeout(() => {
      const draft: WizardDraft = {
        applicantName,
        applicantEmail,
        applicantPhone,
        answers,
        files,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // ignore storage quota errors
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [draftKey, form, receipt, applicantName, applicantEmail, applicantPhone, answers, files]);

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
      { key: 'review', title: 'Tinjau & Kirim', type: 'review' as const, fields: [] },
    ];
  }, [form]);

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

  const handleFileUpload = async (field: SelectionField, file: File) => {
    if (!form) return;
    const maxBytes = (field.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Ukuran "${file.name}" melebihi batas ${field.maxSizeMB || 5} MB.`);
      return;
    }

    setUploadingFields((prev) => ({ ...prev, [field.id]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('formId', form.id);
      fd.append('fieldId', field.id);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengunggah berkas.');
      }

      const uploadedMeta = json.data as UploadedFileMeta;
      setFiles((prev) => [
        ...prev.filter((item) => item.fieldId !== field.id),
        uploadedMeta,
      ]);
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field.id];
        return copy;
      });
      toast.success(`Berkas "${file.name}" berhasil diunggah.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setUploadingFields((prev) => ({ ...prev, [field.id]: false }));
    }
  };

  const removeUploadedFile = (fieldId: string) => {
    setFiles((prev) => prev.filter((item) => item.fieldId !== fieldId));
  };

  const validateCurrentStep = (): boolean => {
    const step = wizardSteps[currentStep];
    if (!step) return true;

    if (step.type === 'identity') {
      if (applicantName.trim().length < 2) {
        toast.error('Nama lengkap wajib diisi minimal 2 karakter.');
        return false;
      }
      if (!applicantEmail.includes('@')) {
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

  const handleResetDraft = () => {
    if (draftKey) localStorage.removeItem(draftKey);
    setApplicantName('');
    setApplicantEmail('');
    setApplicantPhone('');
    setAnswers({});
    setFiles([]);
    setFieldErrors({});
    setDraftRestored(false);
    setCurrentStep(0);
    toast.success('Draf formulir dibersihkan.');
  };

  const handleSubmit = async () => {
    if (!form) return;

    const validation = validateDynamicSubmission(form.fields, answers, files);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.error(Object.values(validation.errors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          applicantPhone: applicantPhone.trim(),
          answers,
          files,
        }),
      });

      const json = await res.json();
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Daftar Seleksi</span>
        </Link>

        {draftRestored && !isClosed && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg">
            <span>Draf tersimpan otomatis</span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="inline-flex items-center gap-1 text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
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
          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950">
            <strong className="font-semibold block mb-1">
              Persyaratan Dokumen:
            </strong>
            <p>{form.requirementsNote}</p>
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
        <div className="space-y-6">
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
            <div className="border-b border-zinc-100 pb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Langkah {currentStep + 1} dari {wizardSteps.length}
                </p>
                <h2 className="text-xl font-bold text-zinc-900">
                  {activeStepObj?.title}
                </h2>
              </div>
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
                    onChange={(e) => setApplicantEmail(e.target.value)}
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
                        <textarea
                          rows={4}
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      )}

                      {['text', 'email', 'tel', 'number', 'date'].includes(
                        field.type
                      ) && (
                        <input
                          type={field.type}
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          value={String(answers[field.id] ?? '')}
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
                        <div className="pt-1">
                          {uploadedFile ? (
                            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                              <div className="flex items-center gap-3 min-w-0">
                                {isImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={uploadedFile.url}
                                    alt={uploadedFile.fileName}
                                    className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-emerald-700" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <a
                                    href={uploadedFile.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold text-emerald-950 hover:underline truncate block"
                                  >
                                    {uploadedFile.fileName}
                                  </a>
                                  <span className="text-xs text-emerald-700">
                                    {formatBytes(uploadedFile.size)} • Siap dikirim
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedFile(field.id)}
                                className="p-2 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                                title="Hapus & ganti berkas"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                                    Mengunggah berkas...
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
                                      {field.maxSizeMB || 5} MB
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

            {/* Step: Final Review */}
            {activeStepObj?.type === 'review' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Identitas Pelamar
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-zinc-500 block">Nama Lengkap</span>
                      <span className="font-semibold text-zinc-900">{applicantName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 block">Email</span>
                      <span className="font-semibold text-zinc-900">{applicantEmail}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 block">WhatsApp / HP</span>
                      <span className="font-semibold text-zinc-900">{applicantPhone}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Ringkasan Isian &amp; Berkas Terlampir
                  </h3>
                  <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                    {form.fields.map((f) => {
                      if (f.type === 'file') {
                        const uploaded = files.find((item) => item.fieldId === f.id);
                        return (
                          <div
                            key={f.id}
                            className="p-3.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-zinc-600">{f.label}</span>
                            {uploaded ? (
                              <span className="font-semibold text-emerald-700">
                                {uploaded.fileName} ({formatBytes(uploaded.size)})
                              </span>
                            ) : (
                              <span className="text-zinc-400">Tidak dilampirkan</span>
                            )}
                          </div>
                        );
                      }

                      const raw = answers[f.id];
                      const display = Array.isArray(raw)
                        ? raw.join(', ')
                        : String(raw || '-');
                      return (
                        <div
                          key={f.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
                        >
                          <span className="text-zinc-500">{f.label}</span>
                          <span className="font-semibold text-zinc-900 sm:text-right">
                            {display}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Footer */}
            <div className="border-t border-zinc-100 pt-5 flex items-center justify-between gap-3">
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
                  disabled={submitting || anyUploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60 cursor-pointer shadow-sm"
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
    </div>
  );
}
