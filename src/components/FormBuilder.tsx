'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FieldType,
  SelectionField,
  SelectionForm,
  SelectionFormInput,
  SelectionFormStatus,
} from '@/types/selection';
import { SELECTION_CATEGORIES } from '@/lib/constants';
import {
  getEffectiveFileAutofillTargets,
  suggestAutofillTargetsForFileField,
} from '@/lib/autofillMapper';
import { hasFormCoverContent } from '@/lib/formCover';
import { adminFetch } from '@/lib/adminClient';
import { cn, slugify } from '@/lib/utils';
import CoverBuilderSection, {
  CoverFormState,
} from '@/components/admin/CoverBuilderSection';
import FileAutofillConfigCard from '@/components/admin/FileAutofillConfigCard';
import SelectionCoverView from '@/components/seleksi/SelectionCoverView';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Teks Singkat' },
  { value: 'textarea', label: 'Paragraf / Esai' },
  { value: 'number', label: 'Angka' },
  { value: 'date', label: 'Tanggal' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Telepon / WA' },
  { value: 'select', label: 'Dropdown (Pilih 1)' },
  { value: 'radio', label: 'Radio Button (Pilih 1)' },
  { value: 'checkbox', label: 'Checkbox (Pilih Banyak)' },
  { value: 'file', label: 'Upload Berkas (PDF/Foto/Doc)' },
];

const QUICK_PRESETS: { label: string; field: Omit<SelectionField, 'id'> }[] = [
  {
    label: '+ NIK 16 Digit',
    field: {
      label: 'Nomor Induk Kependudukan (NIK)',
      type: 'text',
      required: true,
      placeholder: '16 digit angka sesuai KTP',
      description: '',
      section: 'Data Kependudukan',
      options: [],
      accept: '.pdf,.jpg,.jpeg,.png',
      maxSizeMB: 5,
      width: 'half',
    },
  },
  {
    label: '+ Pendidikan Terakhir',
    field: {
      label: 'Pendidikan Terakhir',
      type: 'select',
      required: true,
      placeholder: '',
      description: '',
      section: 'Latar Belakang',
      options: ['SMA / SMK', 'D1 / D2 / D3', 'D4 / S1', 'S2 / S3'],
      accept: '.pdf,.jpg,.jpeg,.png',
      maxSizeMB: 5,
      width: 'half',
    },
  },
  {
    label: '+ Upload Scan KTP',
    field: {
      label: 'Upload Scan / Foto KTP',
      type: 'file',
      required: true,
      placeholder: '',
      description: 'Format PDF/JPG/PNG maksimal 5 MB.',
      section: 'Unggah Berkas',
      options: [],
      accept: '.pdf,.jpg,.jpeg,.png',
      maxSizeMB: 5,
      width: 'half',
    },
  },
  {
    label: '+ Upload CV / Portofolio',
    field: {
      label: 'Upload CV / Portofolio (PDF)',
      type: 'file',
      required: true,
      placeholder: '',
      description: 'Dokumen PDF maksimal 10 MB.',
      section: 'Unggah Berkas',
      options: [],
      accept: '.pdf,.doc,.docx',
      maxSizeMB: 10,
      width: 'half',
    },
  },
];

interface FormBuilderProps {
  initialData?: SelectionForm;
}

export default function FormBuilder({ initialData }: FormBuilderProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [category, setCategory] = useState(
    initialData?.category || SELECTION_CATEGORIES[0]
  );
  const [status, setStatus] = useState<SelectionFormStatus>(
    initialData?.status || 'OPEN'
  );
  const [quota, setQuota] = useState<number>(initialData?.quota ?? 0);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [requirementsNote, setRequirementsNote] = useState(
    initialData?.requirementsNote || ''
  );
  const [requireAiPreScreening, setRequireAiPreScreening] = useState<boolean>(
    initialData?.requireAiPreScreening ?? false
  );
  const [enableAiAutofill, setEnableAiAutofill] = useState<boolean>(
    initialData?.enableAiAutofill ?? true
  );
  const [aiCriteria, setAiCriteria] = useState(initialData?.aiCriteria || '');
  const [coverState, setCoverState] = useState<CoverFormState>({
    showCover: initialData ? hasFormCoverContent(initialData) : true,
    coverTitle: initialData?.coverTitle || '',
    coverSummary: initialData?.coverSummary || '',
    coverHighlightsText: (initialData?.coverHighlights || []).join('\n'),
    coverImage: initialData?.coverImage || null,
    coverAttachments: initialData?.coverAttachments || [],
    coverCtaLabel: initialData?.coverCtaLabel || '',
  });
  const [previewTab, setPreviewTab] = useState<'cover' | 'fields'>(
    initialData && hasFormCoverContent(initialData) ? 'cover' : 'fields'
  );

  const [fields, setFields] = useState<SelectionField[]>(
    initialData?.fields || [
      {
        id: 'motivasi',
        label: 'Motivasi Mengikuti Seleksi',
        type: 'textarea',
        required: true,
        placeholder: 'Jelaskan latar belakang dan motivasi Anda...',
        description: '',
        section: 'Data Tambahan',
        options: [],
        accept: '.pdf,.jpg,.jpeg,.png',
        maxSizeMB: 5,
        width: 'full',
      },
      {
        id: 'berkasPersyaratan',
        label: 'Upload CV / Berkas Persyaratan (PDF)',
        type: 'file',
        required: true,
        placeholder: '',
        description: 'Gabungkan berkas pendukung dalam format PDF maksimal 5 MB.',
        section: 'Unggah Berkas',
        options: [],
        accept: '.pdf,.jpg,.jpeg,.png',
        maxSizeMB: 5,
        width: 'full',
      },
    ]
  );

  const [showAutoAssist, setShowAutoAssist] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [aiTopic, setAiTopic] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const addField = (type: FieldType = 'text') => {
    const idx = fields.length + 1;
    setFields((prev) => [
      ...prev,
      {
        id: `field_${Date.now().toString(36)}_${idx}`,
        label: type === 'file' ? 'Upload Dokumen Pendukung' : `Pertanyaan ${idx}`,
        type,
        required: true,
        placeholder: '',
        description: '',
        section: type === 'file' ? 'Unggah Berkas' : 'Informasi Pelamar',
        options: ['select', 'radio', 'checkbox'].includes(type)
          ? ['Opsi 1', 'Opsi 2']
          : [],
        accept: '.pdf,.jpg,.jpeg,.png',
        maxSizeMB: 5,
        width: 'full',
      },
    ]);
  };

  const addPresetField = (preset: Omit<SelectionField, 'id'>) => {
    setFields((prev) => [
      ...prev,
      {
        ...preset,
        id: `preset_${Date.now().toString(36)}_${prev.length + 1}`,
      },
    ]);
    toast.success(`"${preset.label}" ditambahkan.`);
  };

  const updateField = (index: number, patch: Partial<SelectionField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) {
      toast.error('Formulir minimal memiliki 1 field.');
      return;
    }
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateWithAi = async () => {
    if (aiTopic.trim().length < 4) {
      toast.error('Tuliskan deskripsi singkat program seleksi terlebih dahulu.');
      return;
    }
    setGeneratingAi(true);
    try {
      const res = await adminFetch<Partial<SelectionFormInput>>('/api/admin/ai', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate-form',
          topic: aiTopic.trim(),
          category,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menyusun struktur formulir.');
      }

      const d = res.data;
      if (d.title) setTitle(d.title);
      if (d.slug && !isEditing) setSlug(d.slug);
      if (d.description) setDescription(d.description);
      if (d.requirementsNote) setRequirementsNote(d.requirementsNote);
      if (d.coverSummary || (Array.isArray(d.coverHighlights) && d.coverHighlights.length > 0)) {
        setCoverState((prev) => ({
          ...prev,
          showCover: true,
          coverSummary: d.coverSummary || prev.coverSummary,
          coverHighlightsText: Array.isArray(d.coverHighlights)
            ? d.coverHighlights.join('\n')
            : prev.coverHighlightsText,
        }));
      }
      if (typeof d.enableAiAutofill === 'boolean') {
        setEnableAiAutofill(d.enableAiAutofill);
      }
      if (d.aiCriteria) setAiCriteria(d.aiCriteria);
      if (Array.isArray(d.fields) && d.fields.length > 0) {
        setFields(d.fields);
      }
      setShowAutoAssist(false);
      toast.success('Struktur formulir dan pemetaan dokumen cerdas berhasil disusun.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyusun struktur.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error('Judul formulir minimal 3 karakter.');
      return;
    }
    if (fields.length === 0) {
      toast.error('Tambahkan minimal 1 field pertanyaan atau unggah berkas.');
      return;
    }

    const coverHighlights = coverState.coverHighlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload: SelectionFormInput = {
      title: title.trim(),
      slug: slugify(slug || title),
      category,
      description: description.trim(),
      requirementsNote: requirementsNote.trim(),
      showCover: coverState.showCover,
      coverTitle: coverState.coverTitle.trim(),
      coverSummary: coverState.coverSummary.trim(),
      coverHighlights,
      coverImage: coverState.coverImage || null,
      coverAttachments: coverState.coverAttachments,
      coverCtaLabel: coverState.coverCtaLabel.trim(),
      status,
      quota: Number(quota) || 0,
      startDate: '',
      endDate,
      requireAiPreScreening,
      enableAiAutofill,
      aiCriteria: aiCriteria.trim(),
      fields: fields.map((f) => ({
        ...f,
        label: f.label.trim() || 'Tanpa Label',
        options: ['select', 'radio', 'checkbox'].includes(f.type)
          ? f.options.filter((o) => o.trim() !== '')
          : [],
      })),
    };

    setSaving(true);
    try {
      const url = isEditing
        ? `/api/admin/forms/${initialData!.id}`
        : '/api/admin/forms';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await adminFetch<SelectionForm>(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan formulir.');
      }
      toast.success(
        isEditing ? 'Formulir diperbarui.' : 'Formulir seleksi dipublikasikan.'
      );
      router.push('/admin');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan formulir.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Studio Toolbar */}
      <div className="ui-mobile-pad flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAutoAssist((prev) => !prev)}
            className="ui-btn-secondary px-3.5 py-2 text-xs"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Susun Struktur Otomatis</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className={cn(
              'px-3.5 py-2 text-xs',
              showPreview
                ? 'ui-btn-primary'
                : 'ui-btn-secondary'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Sembunyikan Pratinjau' : 'Tampilkan Pratinjau'}</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="ui-btn-accent px-5 text-xs sm:text-sm shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isEditing ? 'Simpan Perubahan' : 'Publikasikan Formulir'}</span>
        </button>
      </div>

      {/* Collapsible Auto-Assist */}
      {showAutoAssist && (
        <section className="ui-card-compact sm:border-zinc-300 p-5 space-y-3">
          <p className="ui-eyebrow">
            Bantu Susun Draf Field dari Deskripsi Program
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Contoh: Seleksi Peserta Pelatihan CNC & Pengelasan Industri Angkatan 4"
              className="ui-input flex-1"
            />
            <button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={generatingAi}
              className="ui-btn-primary shrink-0"
            >
              {generatingAi && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Buat Draf Field</span>
            </button>
          </div>
        </section>
      )}

      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:gap-6 items-start',
          showPreview ? 'xl:grid-cols-12' : ''
        )}
      >
        {/* Left: Form Editor */}
        <div className={cn('space-y-4 sm:space-y-6', showPreview ? 'xl:col-span-7' : '')}>
          {/* Metadata */}
          <section className="ui-card p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              Informasi Program Seleksi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Judul Program Seleksi *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Contoh: Seleksi Calon Peserta Pelatihan Web Development"
                  className="ui-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Slug URL (/seleksi/slug)
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="seleksi-web-development"
                  className="ui-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="ui-input bg-white"
                >
                  {SELECTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Status Penerimaan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SelectionFormStatus)}
                  className="ui-input bg-white"
                >
                  <option value="OPEN">Dibuka (Publik bisa mendaftar)</option>
                  <option value="DRAFT">Draf (Disembunyikan)</option>
                  <option value="CLOSED">Ditutup</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Kuota (0 = Bebas)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                    className="ui-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Batas Akhir
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ui-input"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Deskripsi Program
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan tujuan program dan sasaran peserta..."
                  className="ui-input"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Catatan Persyaratan Berkas
                </label>
                <input
                  type="text"
                  value={requirementsNote}
                  onChange={(e) => setRequirementsNote(e.target.value)}
                  placeholder="Contoh: Siapkan KTP, Ijazah, dan CV dalam format PDF/JPG"
                  className="ui-input"
                />
              </div>

              <div className="sm:col-span-2 ui-inset p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAiAutofill}
                    onChange={(e) => setEnableAiAutofill(e.target.checked)}
                    className="rounded accent-emerald-700"
                  />
                  <span>
                    Aktifkan Pengisian Formulir Cerdas dari Berkas Peserta (Gemini Flash Lite)
                  </span>
                </label>
                <p className="text-[11px] text-zinc-500 pl-6">
                  Peserta mendapat saran otomatis untuk mengisi kolom isian (NIK, Identitas, Pendidikan, Pengalaman, Gagasan) langsung dari berkas KTP, Ijazah, CV, atau Makalah yang diunggah.
                </p>
              </div>

              <div className="sm:col-span-2 ui-inset p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireAiPreScreening}
                    onChange={(e) => setRequireAiPreScreening(e.target.checked)}
                    className="rounded accent-zinc-900"
                  />
                  <span>Aktifkan Skoring Awal Otomatis saat Pendaftar Mengirim Berkas</span>
                </label>
                {requireAiPreScreening && (
                  <input
                    type="text"
                    value={aiCriteria}
                    onChange={(e) => setAiCriteria(e.target.value)}
                    placeholder="Kriteria penilaian panitia (misal: relevansi jurusan & kelengkapan dokumen)"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs"
                  />
                )}
              </div>
            </div>
          </section>

          <CoverBuilderSection
            formKey={initialData?.id || slug || 'new-form'}
            value={coverState}
            onChange={(patch) =>
              setCoverState((prev) => ({ ...prev, ...patch }))
            }
          />

          {/* Fields Editor */}
          <section className="ui-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Susunan Pertanyaan &amp; Berkas ({fields.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Nama lengkap, email, dan WhatsApp otomatis tersedia di Langkah 1.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {enableAiAutofill && fields.some((f) => f.type === 'file') && (
                  <button
                    type="button"
                    onClick={() => {
                      let mappedFiles = 0;
                      let mappedTargets = 0;
                      setFields((prev) =>
                        prev.map((f) => {
                          if (f.type !== 'file') return f;
                          const suggested = suggestAutofillTargetsForFileField(f, prev);
                          if (suggested.length > 0) {
                            mappedFiles++;
                            mappedTargets += suggested.length;
                          }
                          return {
                            ...f,
                            autofillMode: suggested.length > 0 ? 'custom' : 'auto',
                            autofillTargets: suggested,
                          };
                        })
                      );
                      toast.success(
                        mappedFiles > 0
                          ? `Terdeteksi ${mappedFiles} berkas sumber untuk mengisi ${mappedTargets} target kolom.`
                          : 'Belum ada pasangan berkas-kolom otomatis; atur manual di masing-masing berkas.'
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Deteksi Pemetaan Berkas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => addField('text')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pertanyaan</span>
                </button>
                <button
                  type="button"
                  onClick={() => addField('file')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Berkas</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 mr-1">
                Tambah Cepat:
              </span>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addPresetField(preset.field)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              {fields.map((field, index) => {
                const hasOptions = ['select', 'radio', 'checkbox'].includes(
                  field.type
                );
                const isFile = field.type === 'file';

                return (
                  <div
                    key={field.id + index}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-700 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-md">
                        #{index + 1} • {isFile ? 'UPLOAD BERKAS' : field.type.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveField(index, -1)}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg text-zinc-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                          title="Naikkan"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, 1)}
                          disabled={index === fields.length - 1}
                          className="p-1.5 rounded-lg text-zinc-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                          title="Turunkan"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Hapus Field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 block">
                          Label Pertanyaan / Nama Dokumen
                        </label>
                        <input
                          type="text"
                          required
                          value={field.label}
                          onChange={(e) =>
                            updateField(index, { label: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 block">
                          Tipe Input
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, {
                              type: e.target.value as FieldType,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 block">
                          Langkah / Section
                        </label>
                        <input
                          type="text"
                          value={field.section || ''}
                          onChange={(e) =>
                            updateField(index, { section: e.target.value })
                          }
                          placeholder="Unggah Berkas"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 block">
                          Petunjuk Singkat
                        </label>
                        <input
                          type="text"
                          value={field.description || ''}
                          onChange={(e) =>
                            updateField(index, { description: e.target.value })
                          }
                          placeholder="Opsional"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>

                      <div className="flex items-end gap-3 pb-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(index, { required: e.target.checked })
                            }
                            className="rounded accent-zinc-900"
                          />
                          <span>Wajib</span>
                        </label>

                        <select
                          value={field.width || 'full'}
                          onChange={(e) =>
                            updateField(index, {
                              width: e.target.value as 'full' | 'half',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                        >
                          <option value="full">1 Kolom</option>
                          <option value="half">1/2 Kolom</option>
                        </select>
                      </div>
                    </div>

                    {hasOptions && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-600 block">
                          Opsi Pilihan (pisahkan dengan koma)
                        </label>
                        <input
                          type="text"
                          value={field.options.join(', ')}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value
                                .split(',')
                                .map((s) => s.trim()),
                            })
                          }
                          placeholder="Opsi A, Opsi B, Opsi C"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs"
                        />
                      </div>
                    )}

                    {isFile && (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-600 block">
                              Format Diterima
                            </label>
                            <input
                              type="text"
                              value={field.accept || '.pdf,.jpg,.jpeg,.png'}
                              onChange={(e) =>
                                updateField(index, { accept: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-600 block">
                              Batas Ukuran (MB)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={field.maxSizeMB || 5}
                              onChange={(e) =>
                                updateField(index, {
                                  maxSizeMB: Math.min(
                                    25,
                                    Math.max(1, Number(e.target.value) || 5)
                                  ),
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs"
                            />
                          </div>
                        </div>

                        {enableAiAutofill && (
                          <FileAutofillConfigCard
                            fileField={field}
                            allFields={fields}
                            onChange={(patch) => updateField(index, patch)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <aside className="xl:col-span-5 xl:sticky xl:top-24 ui-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-500">
                Pratinjau Pelamar
              </span>
              <div className="flex items-center gap-1.5">
                {coverState.showCover && (
                  <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('cover')}
                      className={cn(
                        'px-2 py-0.5 rounded-md cursor-pointer',
                        previewTab === 'cover'
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600'
                      )}
                    >
                      Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('fields')}
                      className={cn(
                        'px-2 py-0.5 rounded-md cursor-pointer',
                        previewTab === 'fields'
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600'
                      )}
                    >
                      Formulir
                    </button>
                  </div>
                )}
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                  Live
                </span>
              </div>
            </div>

            {coverState.showCover && previewTab === 'cover' ? (
              <SelectionCoverView
                previewOnly
                form={{
                  title,
                  category,
                  description,
                  requirementsNote,
                  status,
                  quota,
                  endDate,
                  submissionCount: initialData?.submissionCount || 0,
                  coverTitle: coverState.coverTitle,
                  coverSummary: coverState.coverSummary,
                  coverHighlights: coverState.coverHighlightsText
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  coverImage: coverState.coverImage,
                  coverAttachments: coverState.coverAttachments,
                  coverCtaLabel: coverState.coverCtaLabel,
                }}
              />
            ) : (
              <>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    {category}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900">
                    {title || 'Judul Program Seleksi'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {description || 'Deskripsi singkat program akan tampil di sini.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                  {fields.map((f, i) => (
                    <div
                      key={f.id + i}
                      className={cn(
                        'space-y-1',
                        f.width === 'half' ? 'col-span-1' : 'col-span-2'
                      )}
                    >
                      <label className="text-xs font-semibold text-zinc-800 block">
                        {f.label || 'Tanpa Label'}{' '}
                        {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      {f.type === 'file' ? (
                        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-center text-[11px] text-zinc-500 flex flex-col items-center gap-1">
                          <FileUp className="w-4 h-4 text-zinc-400" />
                          <span>
                            Upload ({f.accept || '.pdf,.jpg'}) • Maks {f.maxSizeMB || 5} MB
                          </span>
                          {enableAiAutofill &&
                            getEffectiveFileAutofillTargets(f, {
                              enableAiAutofill,
                              fields,
                            }).length > 0 && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
                                Dapat mengisi{' '}
                                {
                                  getEffectiveFileAutofillTargets(f, {
                                    enableAiAutofill,
                                    fields,
                                  }).length
                                }{' '}
                                kolom otomatis
                              </span>
                            )}
                        </div>
                      ) : f.type === 'textarea' ? (
                        <div className="h-14 rounded-lg border border-zinc-200 bg-zinc-50" />
                      ) : (
                        <div className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 flex items-center text-[11px] text-zinc-400">
                          {f.type === 'select'
                            ? '-- Pilih --'
                            : f.placeholder || `Input ${f.type}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </form>
  );
}
