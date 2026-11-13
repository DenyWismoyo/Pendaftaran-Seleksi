'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
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
import { adminFetch } from '@/lib/adminClient';
import { slugify } from '@/lib/utils';

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
    initialData?.requireAiPreScreening ?? true
  );
  const [aiCriteria, setAiCriteria] = useState(initialData?.aiCriteria || '');

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
        throw new Error(res.error || 'Gagal menghasilkan form dengan AI.');
      }

      const d = res.data;
      if (d.title) setTitle(d.title);
      if (d.slug && !isEditing) setSlug(d.slug);
      if (d.description) setDescription(d.description);
      if (d.requirementsNote) setRequirementsNote(d.requirementsNote);
      if (d.aiCriteria) setAiCriteria(d.aiCriteria);
      if (Array.isArray(d.fields) && d.fields.length > 0) {
        setFields(d.fields);
      }
      toast.success('Struktur formulir berhasil dirancang oleh Clario AI!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memanggil AI.');
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

    const payload: SelectionFormInput = {
      title: title.trim(),
      slug: slugify(slug || title),
      category,
      description: description.trim(),
      requirementsNote: requirementsNote.trim(),
      status,
      quota: Number(quota) || 0,
      startDate: '',
      endDate,
      requireAiPreScreening,
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
        isEditing ? 'Formulir berhasil diperbarui!' : 'Formulir seleksi berhasil dibuat!'
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
      {/* AI Quick Generator */}
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-slate-50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Asisten Pembuat Formulir (Clario AI)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Contoh: Seleksi Peserta Pelatihan CNC & Pengelasan Industri Angkatan 4"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleGenerateWithAi}
            disabled={generatingAi}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 cursor-pointer shrink-0"
          >
            {generatingAi ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate Struktur Form</span>
          </button>
        </div>
      </section>

      {/* Metadata Formulir */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Pengaturan Program Seleksi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Judul Program Seleksi *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Seleksi Calon Peserta Pelatihan Web Development"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Slug URL (/seleksi/slug)
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="seleksi-web-development"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SELECTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Status Penerimaan
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SelectionFormStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="OPEN">Dibuka (Publik bisa mendaftar)</option>
              <option value="DRAFT">Draf (Disembunyikan)</option>
              <option value="CLOSED">Ditutup</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800 block">
                Kuota (0 = Tanpa Batas)
              </label>
              <input
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800 block">
                Batas Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Deskripsi Program
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tujuan program dan sasaran peserta..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-semibold text-slate-800 block">
              Catatan Persyaratan Berkas
            </label>
            <input
              type="text"
              value={requirementsNote}
              onChange={(e) => setRequirementsNote(e.target.value)}
              placeholder="Contoh: Siapkan KTP, Ijazah, dan CV dalam format PDF/JPG"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAiPreScreening}
                onChange={(e) => setRequireAiPreScreening(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Aktifkan Penilaian Awal Otomatis oleh Clario AI saat Pelamar Mendaftar</span>
            </label>
            {requireAiPreScreening && (
              <input
                type="text"
                value={aiCriteria}
                onChange={(e) => setAiCriteria(e.target.value)}
                placeholder="Kriteria penilaian AI (misal: nilai motivasi, kesesuaian jurusan, dan kelengkapan berkas)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        </div>
      </section>

      {/* Builder Fields */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Susunan Field Formulir ({fields.length})
            </h2>
            <p className="text-xs text-slate-500">
              Nama lengkap, email, dan nomor WhatsApp otomatis tersedia di bagian atas
              formulir publik.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addField('text')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pertanyaan</span>
            </button>
            <button
              type="button"
              onClick={() => addField('file')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Upload Berkas</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => {
            const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
            const isFile = field.type === 'file';

            return (
              <div
                key={field.id + index}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    #{index + 1} • {isFile ? 'Unggah Berkas' : field.type.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                      title="Naikkan"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"
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
                    <label className="text-xs font-semibold text-slate-700 block">
                      Label Pertanyaan / Nama Berkas
                    </label>
                    <input
                      type="text"
                      required
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Tipe Input
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value as FieldType })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Grup / Section
                    </label>
                    <input
                      type="text"
                      value={field.section || ''}
                      onChange={(e) =>
                        updateField(index, { section: e.target.value })
                      }
                      placeholder="Informasi Pelamar"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Keterangan / Petunjuk
                    </label>
                    <input
                      type="text"
                      value={field.description || ''}
                      onChange={(e) =>
                        updateField(index, { description: e.target.value })
                      }
                      placeholder="Opsional"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="flex items-end gap-4 pb-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(index, { required: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Wajib diisi</span>
                    </label>

                    <select
                      value={field.width || 'full'}
                      onChange={(e) =>
                        updateField(index, {
                          width: e.target.value as 'full' | 'half',
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="full">Lebar Penuh</option>
                      <option value="half">Setengah (2 Kolom)</option>
                    </select>
                  </div>
                </div>

                {hasOptions && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Daftar Opsi (pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      value={field.options.join(', ')}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      placeholder="Opsi A, Opsi B, Opsi C"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                )}

                {isFile && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Format File Diterima
                      </label>
                      <input
                        type="text"
                        value={field.accept || '.pdf,.jpg,.jpeg,.png'}
                        onChange={(e) =>
                          updateField(index, { accept: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Maksimum Ukuran (MB)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={field.maxSizeMB || 5}
                        onChange={(e) =>
                          updateField(index, {
                            maxSizeMB: Math.min(25, Math.max(1, Number(e.target.value) || 5)),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 cursor-pointer shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isEditing ? 'Simpan Perubahan' : 'Publikasikan Formulir'}</span>
        </button>
      </div>
    </form>
  );
}
