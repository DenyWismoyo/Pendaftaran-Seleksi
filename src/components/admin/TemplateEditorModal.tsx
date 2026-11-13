'use client';

import { useEffect, useState } from 'react';
import { Eye, FileCode2, Globe, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import { markdownToDocumentHtml } from '@/lib/documentConverter';
import { cn, slugify } from '@/lib/utils';
import { DocumentTemplateRecord, SelectionForm } from '@/types/selection';

interface TemplateEditorModalProps {
  open: boolean;
  initialTemplate?: DocumentTemplateRecord | null;
  forms: SelectionForm[];
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_MARKDOWN_BOILERPLATE = `# JUDUL DOKUMEN TEMPLATE

---

Kepada Yth.  
**Ketua Panitia Seleksi BLUD Kawasan Sains dan Teknologi Solo Technopark**  
di Surakarta

Dengan hormat,

Saya yang bertanda tangan di bawah ini:

| Keterangan | Data Diri |
| :--- | :--- |
| Nama Lengkap | [Isi Nama Lengkap] |
| NIK | [16 Digit NIK] |

Demikian dokumen ini saya buat dengan sebenar-benarnya.

Surakarta, [Tanggal]  
Hormat saya,

*(Tanda tangan di atas meterai Rp10.000 jika dipersyaratkan)*

**[Nama Lengkap]**
`;

const CATEGORY_PRESETS = [
  'Seleksi Pejabat Teknis BLUD',
  'Pelatihan Vokasi',
  'Magang & PKL',
  'Umum / Lintas Seleksi',
];

export default function TemplateEditorModal({
  open,
  initialTemplate,
  forms,
  onClose,
  onSaved,
}: TemplateEditorModalProps) {
  const isEditing = Boolean(initialTemplate);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [targetFieldHint, setTargetFieldHint] = useState('');
  const [fileBaseName, setFileBaseName] = useState('');
  const [description, setDescription] = useState('');
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN_BOILERPLATE);
  const [formIds, setFormIds] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialTemplate) {
      setTitle(initialTemplate.title);
      setSlug(initialTemplate.slug);
      setSlugEditedManually(true);
      setCategory(initialTemplate.category || CATEGORY_PRESETS[0]);
      setTargetFieldHint(initialTemplate.targetFieldHint || '');
      setFileBaseName(initialTemplate.fileBaseName || '');
      setDescription(initialTemplate.description || '');
      setMarkdown(initialTemplate.markdown || '');
      setFormIds(Array.isArray(initialTemplate.formIds) ? initialTemplate.formIds : []);
      setIsGlobal(Boolean(initialTemplate.isGlobal));
    } else {
      setTitle('');
      setSlug('');
      setSlugEditedManually(false);
      setCategory(CATEGORY_PRESETS[0]);
      setTargetFieldHint('');
      setFileBaseName('');
      setDescription('');
      setMarkdown(DEFAULT_MARKDOWN_BOILERPLATE);
      setFormIds([]);
      setIsGlobal(false);
    }
    setEditorTab('write');
  }, [open, initialTemplate]);

  if (!open) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slugEditedManually) {
      const s = slugify(val);
      setSlug(s);
      setFileBaseName(s ? `${s}-solo-technopark` : '');
    }
  };

  const toggleFormId = (fid: string) => {
    setFormIds((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !markdown.trim()) {
      toast.error('Judul template dan isi dokumen Markdown wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slugify(slug || title),
        category: category.trim() || 'Umum',
        targetFieldHint: targetFieldHint.trim(),
        fileBaseName: slugify(fileBaseName || slug || title),
        description: description.trim(),
        markdown,
        formIds,
        isGlobal,
      };

      const res = isEditing && initialTemplate
        ? await adminFetch<DocumentTemplateRecord>(
            `/api/admin/templates/${initialTemplate.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify(payload),
            }
          )
        : await adminFetch<DocumentTemplateRecord>('/api/admin/templates', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan template.');
      }

      toast.success(
        isEditing
          ? 'Template dokumen berhasil diperbarui.'
          : 'Template dokumen baru berhasil ditambahkan.'
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className="ui-modal-panel max-w-5xl max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {isEditing ? 'Edit Template Dokumen' : 'Buat Template Dokumen Baru'}
            </h2>
            <p className="text-xs text-zinc-500">
              Atur isi format Word (.doc/.md) sekaligus tentukan seleksi mana saja yang
              berhak mengaksesnya.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ui-label">Judul Template *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Contoh: Surat Lamaran Pejabat Teknis BLUD"
                className="ui-input"
              />
            </div>

            <div>
              <label className="ui-label">Kategori Seleksi *</label>
              <input
                type="text"
                required
                list="template-category-presets"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ui-input"
              />
              <datalist id="template-category-presets">
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="ui-label">Slug URL Unik</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugEditedManually(true);
                  setSlug(e.target.value);
                }}
                placeholder="surat-lamaran-pejabat-teknis"
                className="ui-input font-mono text-xs"
              />
            </div>

            <div>
              <label className="ui-label">Nama Dasar File Unduhan (.doc / .md)</label>
              <input
                type="text"
                value={fileBaseName}
                onChange={(e) => setFileBaseName(e.target.value)}
                placeholder="surat-lamaran-pejabat-teknis-solo-technopark"
                className="ui-input font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="ui-label">Petunjuk Kolom Upload Formulir</label>
              <input
                type="text"
                value={targetFieldHint}
                onChange={(e) => setTargetFieldHint(e.target.value)}
                placeholder="Contoh: Untuk kolom: Upload Surat Lamaran & Pakta Integritas (PDF)"
                className="ui-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="ui-label">Deskripsi Singkat Kegunaan</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kegunaan dokumen ini bagi pelamar..."
                className="ui-input"
              />
            </div>
          </div>

          {/* Isolasi per Seleksi */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Isolasi Akses Seleksi
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Centang program seleksi yang membutuhkan template ini agar tidak
                  tercampur dengan program seleksi lain.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <Globe className="w-3.5 h-3.5" />
                Template Global (Semua Seleksi Umum)
              </label>
            </div>

            {forms.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Belum ada formulir seleksi aktif di sistem.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {forms.map((f) => {
                  const checked = formIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors',
                        checked
                          ? 'bg-emerald-50 border-emerald-500 text-zinc-900'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormId(f.id)}
                        className="mt-0.5 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="min-w-0">
                        <span className="font-semibold block line-clamp-1">{f.title}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          /{f.slug}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Markdown Content + Preview */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="ui-label mb-0">
                Isi Template (Format Markdown → Otomatis Konversi ke Microsoft Word .doc) *
              </label>
              <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer',
                    editorTab === 'write'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  Edit Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer',
                    editorTab === 'preview'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau Word
                </button>
              </div>
            </div>

            {editorTab === 'write' ? (
              <textarea
                required
                rows={13}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="ui-input font-mono text-xs leading-relaxed"
                placeholder="Tulis isi dokumen surat menggunakan format Markdown (# Judul, **Tebal**, | Tabel |)..."
              />
            ) : (
              <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 max-h-96 overflow-y-auto">
                <div
                  className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 shadow-xs max-w-2xl mx-auto text-zinc-900 text-sm"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  dangerouslySetInnerHTML={{
                    __html: markdownToDocumentHtml(markdown),
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button type="button" onClick={onClose} className="ui-btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={saving} className="ui-btn-primary">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Simpan Perubahan' : 'Buat Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
