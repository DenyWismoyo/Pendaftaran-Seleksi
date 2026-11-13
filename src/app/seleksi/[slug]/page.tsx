'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileUp,
  Loader2,
  Paperclip,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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

export default function SelectionFormPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  const [form, setForm] = useState<SelectionForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [answers, setAnswers] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);

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

  const sections = useMemo(() => {
    if (!form) return [];
    const map = new Map<string, SelectionField[]>();
    for (const field of form.fields) {
      const sec = field.section?.trim() || 'Informasi & Persyaratan';
      const arr = map.get(sec) || [];
      arr.push(field);
      map.set(sec, arr);
    }
    return Array.from(map.entries());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (applicantName.trim().length < 2) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }
    if (!applicantEmail.includes('@')) {
      toast.error('Format email tidak valid.');
      return;
    }
    if (applicantPhone.trim().length < 8) {
      toast.error('Nomor WhatsApp / HP minimal 8 digit.');
      return;
    }

    const validation = validateDynamicSubmission(form.fields, answers, files);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      const firstErr = Object.values(validation.errors)[0];
      toast.error(firstErr);
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
        if (json.fieldErrors) {
          setFieldErrors(json.fieldErrors);
        }
        throw new Error(json.error || 'Gagal mengirim formulir.');
      }

      setReceipt(json.data as SubmissionReceipt);
      toast.success('Pendaftaran seleksi berhasil dikirim!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm">Memuat formulir seleksi...</p>
      </div>
    );
  }

  if (errorMsg || !form) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">
          {errorMsg || 'Formulir tidak tersedia'}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Pendaftaran Berhasil Dikirim!
            </h1>
            <p className="text-sm text-slate-600">
              Simpan kode pendaftaran di bawah ini untuk memantau status verifikasi dan
              hasil seleksi Anda.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kode Pendaftaran Anda
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-indigo-700 tracking-wider">
                {receipt.registrationCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(receipt.registrationCode);
                  toast.success('Kode pendaftaran disalin.');
                }}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Salin kode"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Program: <strong className="text-slate-700">{receipt.formTitle}</strong> •{' '}
              {receipt.applicantName} ({receipt.applicantEmail})
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={`/cek-status?code=${encodeURIComponent(
                receipt.registrationCode
              )}&email=${encodeURIComponent(receipt.applicantEmail)}`}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Pantau Status Seleksi
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Daftar Program Lain
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isClosed =
    form.status !== 'OPEN' ||
    (form.quota > 0 && (form.submissionCount || 0) >= form.quota);
  const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Seleksi</span>
      </Link>

      {/* Form Header Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
            {form.category}
          </span>
          <span
            className={cn(
              'text-xs font-semibold px-3 py-1 rounded-lg border',
              statusMeta.badgeClass
            )}
          >
            {isClosed ? 'Pendaftaran Ditutup / Kuota Penuh' : statusMeta.label}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{form.title}</h1>
        {form.description && (
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {form.description}
          </p>
        )}

        {form.requirementsNote && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-900">
            <strong className="font-semibold block mb-1">
              Catatan Persyaratan Berkas:
            </strong>
            <p>{form.requirementsNote}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
          <span>
            Pendaftar masuk: <strong>{form.submissionCount || 0}</strong>
            {form.quota > 0 ? ` / ${form.quota}` : ''}
          </span>
          {form.endDate && (
            <span>
              Batas akhir: <strong>{formatDateID(form.endDate)}</strong>
            </span>
          )}
        </div>
      </section>

      {isClosed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 text-sm font-medium">
          Mohon maaf, penerimaan formulir untuk program seleksi ini saat ini sedang
          ditutup atau kuota telah terpenuhi.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Identity Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Identitas Utama Pelamar
              </h2>
              <p className="text-xs text-slate-500">
                Digunakan untuk pengiriman informasi dan pengecekan status kelulusan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-slate-800 block">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Sesuai KTP / Ijazah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800 block">
                  Email Aktif <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800 block">
                  Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Dynamic Sections */}
          {sections.map(([sectionTitle, sectionFields]) => (
            <section
              key={sectionTitle}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">{sectionTitle}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {sectionFields.map((field) => {
                  const err = fieldErrors[field.id];
                  const uploadedFile = files.find((f) => f.fieldId === field.id);
                  const isUploading = Boolean(uploadingFields[field.id]);
                  const colSpan =
                    field.width === 'half' ? 'sm:col-span-1' : 'sm:col-span-2';

                  return (
                    <div key={field.id} className={cn('space-y-1.5', colSpan)}>
                      <label className="text-sm font-semibold text-slate-800 block">
                        {field.label}{' '}
                        {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-slate-500">{field.description}</p>
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          rows={4}
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-sm"
                            >
                              <input
                                type="radio"
                                name={field.id}
                                checked={answers[field.id] === opt}
                                onChange={() => handleAnswerChange(field.id, opt)}
                                className="text-indigo-600 focus:ring-indigo-500"
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
                                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => handleCheckboxToggle(field.id, opt)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
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
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <a
                                    href={uploadedFile.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-semibold text-emerald-900 hover:underline truncate block"
                                  >
                                    {uploadedFile.fileName}
                                  </a>
                                  <span className="text-xs text-emerald-700">
                                    {formatBytes(uploadedFile.size)} • Berhasil diunggah
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedFile(field.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                                title="Hapus berkas"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors cursor-pointer text-center">
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                  <span className="text-xs font-medium text-indigo-700">
                                    Mengunggah berkas ke Firebase Storage...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <FileUp className="w-6 h-6 text-slate-400" />
                                  <div>
                                    <span className="text-sm font-semibold text-indigo-600">
                                      Pilih berkas untuk diunggah
                                    </span>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Format: {field.accept || '.pdf,.jpg,.png'} (Maks.{' '}
                                      {field.maxSizeMB || 5} MB)
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
                                  if (picked) {
                                    handleFileUpload(field, picked);
                                  }
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
            </section>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={
                submitting || Object.values(uploadingFields).some(Boolean)
              }
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pendaftaran...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Pendaftaran Seleksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
