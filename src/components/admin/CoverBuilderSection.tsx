'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import { compressImageIfNeeded } from '@/lib/imageHelper';
import { formatBytes } from '@/lib/utils';
import { CoverAttachment, CoverMedia } from '@/types/selection';

export interface CoverFormState {
  showCover: boolean;
  coverTitle: string;
  coverSummary: string;
  coverHighlightsText: string;
  coverImage: CoverMedia | null;
  coverAttachments: CoverAttachment[];
  coverCtaLabel: string;
}

interface CoverBuilderSectionProps {
  formKey: string;
  value: CoverFormState;
  onChange: (patch: Partial<CoverFormState>) => void;
}

export default function CoverBuilderSection({
  formKey,
  value,
  onChange,
}: CoverBuilderSectionProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const deleteRemoteAsset = async (storagePath?: string) => {
    if (!storagePath || !storagePath.startsWith('selection_cover_assets/')) return;
    try {
      await adminFetch('/api/admin/upload', {
        method: 'DELETE',
        body: JSON.stringify({ storagePath }),
      });
    } catch {
      // ignore storage cleanup errors
    }
  };

  const handleCoverImageUpload = async (rawFile: File) => {
    setUploadingImage(true);
    try {
      const { file: readyFile, compressed } = await compressImageIfNeeded(rawFile, 3);
      if (compressed) {
        toast.info(
          `Gambar cover dikompresi (${formatBytes(rawFile.size)} → ${formatBytes(
            readyFile.size
          )}).`
        );
      }

      const fd = new FormData();
      fd.append('file', readyFile);
      fd.append('kind', 'cover-image');
      fd.append('formKey', formKey || 'draft');

      const res = await adminFetch<CoverMedia>('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal mengunggah gambar cover.');
      }

      const oldPath = value.coverImage?.storagePath;
      onChange({ coverImage: res.data, showCover: true });
      if (oldPath && oldPath !== res.data.storagePath) {
        void deleteRemoteAsset(oldPath);
      }
      toast.success('Gambar cover berhasil diunggah.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah gambar cover.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveCoverImage = () => {
    const oldPath = value.coverImage?.storagePath;
    onChange({ coverImage: null });
    if (oldPath) void deleteRemoteAsset(oldPath);
    toast.success('Gambar cover dihapus.');
  };

  const handleAttachmentUpload = async (fileList: FileList) => {
    const picked = Array.from(fileList);
    if (picked.length === 0) return;

    setUploadingFiles(true);
    const added: CoverAttachment[] = [];
    try {
      for (const file of picked) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('kind', 'cover-attachment');
        fd.append('formKey', formKey || 'draft');

        const res = await adminFetch<CoverMedia>('/api/admin/upload', {
          method: 'POST',
          body: fd,
        });
        if (!res.success || !res.data) {
          toast.error(`${file.name}: ${res.error || 'Gagal mengunggah.'}`);
          continue;
        }

        const defaultTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        added.push({
          ...res.data,
          id: `cov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          title: defaultTitle || file.name,
        });
      }

      if (added.length > 0) {
        onChange({
          coverAttachments: [...value.coverAttachments, ...added],
          showCover: true,
        });
        toast.success(`${added.length} dokumen pengumuman berhasil ditambahkan ke cover.`);
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const updateAttachmentTitle = (id: string, title: string) => {
    onChange({
      coverAttachments: value.coverAttachments.map((item) =>
        item.id === id ? { ...item, title } : item
      ),
    });
  };

  const moveAttachment = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.coverAttachments.length) return;
    const copy = [...value.coverAttachments];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    onChange({ coverAttachments: copy });
  };

  const removeAttachment = (item: CoverAttachment) => {
    onChange({
      coverAttachments: value.coverAttachments.filter((att) => att.id !== item.id),
    });
    void deleteRemoteAsset(item.storagePath);
    toast.success(`"${item.title}" dihapus dari cover.`);
  };

  return (
    <section className="ui-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900">
            Halaman Cover &amp; Dokumen Pengumuman
          </h2>
          <p className="text-xs text-zinc-500">
            Ditampilkan di halaman <span className="font-mono">/seleksi/slug</span>{' '}
            sebelum pelamar mulai mengisi formulir langkah demi langkah.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={value.showCover}
            onChange={(e) => onChange({ showCover: e.target.checked })}
            className="rounded accent-emerald-700"
          />
          <span>Tampilkan Cover Pembuka</span>
        </label>
      </div>

      {value.showCover ? (
        <div className="space-y-4">
          {/* Upload Cover Image */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 block">
              Gambar Banner / Poster Cover Seleksi (Opsional)
            </label>

            {value.coverImage?.url ? (
              <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value.coverImage.url}
                  alt={value.coverImage.fileName}
                  className="w-full max-h-52 object-cover bg-white"
                />
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-white">
                  <div className="text-xs text-zinc-600 truncate">
                    <span className="font-semibold text-zinc-900">
                      {value.coverImage.fileName}
                    </span>{' '}
                    • {formatBytes(value.coverImage.size)}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer">
                      {uploadingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5" />
                      )}
                      <span>Ganti Gambar</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        disabled={uploadingImage}
                        className="hidden"
                        onChange={(e) => {
                          const picked = e.target.files?.[0];
                          if (picked) void handleCoverImageUpload(picked);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100/70 transition-colors cursor-pointer text-center">
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
                    <span className="text-xs font-semibold text-zinc-700">
                      Mengunggah gambar cover...
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-900">
                      Klik untuk unggah gambar cover (rasio lanskap disarankan 16:7)
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      JPG, PNG, atau WEBP • Otomatis dikompresi
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) void handleCoverImageUpload(picked);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {/* Cover Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Judul Cover (Opsional)
              </label>
              <input
                type="text"
                value={value.coverTitle}
                onChange={(e) => onChange({ coverTitle: e.target.value })}
                placeholder="Kosongkan untuk mengikuti Judul Program"
                className="ui-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Teks Tombol Mulai
              </label>
              <input
                type="text"
                value={value.coverCtaLabel}
                onChange={(e) => onChange({ coverCtaLabel: e.target.value })}
                placeholder="Mulai Pengisian Formulir"
                className="ui-input"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Deskripsi Singkat / Pengantar Seleksi pada Cover
              </label>
              <textarea
                rows={3}
                value={value.coverSummary}
                onChange={(e) => onChange({ coverSummary: e.target.value })}
                placeholder="Tuliskan ringkasan seleksi, latar belakang posisi, atau instruksi sebelum peserta menekan tombol Mulai..."
                className="ui-input"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Poin Informasi Penting / Jadwal (1 baris = 1 poin, opsional)
              </label>
              <textarea
                rows={3}
                value={value.coverHighlightsText}
                onChange={(e) => onChange({ coverHighlightsText: e.target.value })}
                placeholder={
                  'Pendaftaran dibuka hingga 30 November 2026\nSiapkan scan KTP, Ijazah, CV, dan Makalah Gagasan dalam PDF\nPelamar dapat menyimpan draf dan melanjutkan pengisian kapan saja'
                }
                className="ui-input"
              />
            </div>
          </div>

          {/* Upload PDF Pengumuman & Lampiran */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-zinc-800">
                  Dokumen Pengumuman Resmi &amp; Lampiran Cover ({value.coverAttachments.length})
                </p>
                <p className="text-[11px] text-zinc-500">
                  Unggah PDF Pengumuman, SK Persyaratan, Panduan, atau Format (.pdf, .doc/.docx, gambar) maks. 15 MB.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer">
                {uploadingFiles ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileUp className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploadingFiles ? 'Mengunggah...' : '+ Unggah PDF / Lampiran'}
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  disabled={uploadingFiles}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) void handleAttachmentUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {value.coverAttachments.length > 0 && (
              <div className="space-y-2">
                {value.coverAttachments.map((att, idx) => (
                  <div
                    key={att.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-emerald-700 shrink-0 hidden sm:block" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={att.title}
                        onChange={(e) => updateAttachmentTitle(att.id, e.target.value)}
                        placeholder="Judul dokumen yang dilihat peserta"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-900"
                      />
                      <p className="text-[11px] text-zinc-500 truncate px-0.5">
                        {att.fileName} • {formatBytes(att.size)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-zinc-200 text-zinc-600"
                        title="Buka dokumen"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => moveAttachment(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-white text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title="Pindah ke atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAttachment(idx, 1)}
                        disabled={idx === value.coverAttachments.length - 1}
                        className="p-1.5 rounded-lg hover:bg-white text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title="Pindah ke bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title="Hapus dokumen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Cover pembuka dinonaktifkan — pelamar akan langsung masuk ke Langkah 1 formulir saat membuka tautan seleksi.
        </p>
      )}
    </section>
  );
}

