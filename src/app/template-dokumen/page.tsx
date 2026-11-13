'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileText,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DOCUMENT_TEMPLATES,
  DocumentTemplate,
} from '@/lib/documentTemplates';
import {
  buildWordDocPayload,
  markdownToDocumentHtml,
} from '@/lib/documentConverter';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Semua',
  'Pejabat Teknis',
  'Umum',
  'Pelatihan Vokasi',
  'Magang & PKL',
] as const;

export default function DocumentTemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [previewTpl, setPreviewTpl] = useState<DocumentTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'formatted' | 'markdown'>('formatted');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DOCUMENT_TEMPLATES.filter((tpl) => {
      const matchCat =
        selectedCategory === 'Semua' || tpl.category === selectedCategory;
      const matchSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.targetFieldHint.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  const handleDownloadWord = (tpl: DocumentTemplate) => {
    const payload = '\ufeff' + buildWordDocPayload(tpl.title, tpl.markdown);
    const blob = new Blob([payload], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.fileBaseName}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Mengunduh "${tpl.fileBaseName}.doc" (siap dibuka di Word).`);
  };

  const handleDownloadMarkdown = (tpl: DocumentTemplate) => {
    const blob = new Blob([tpl.markdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.fileBaseName}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Mengunduh "${tpl.fileBaseName}.md".`);
  };

  const handleCopyMarkdown = async (tpl: DocumentTemplate) => {
    try {
      await navigator.clipboard.writeText(tpl.markdown);
      setCopiedSlug(tpl.slug);
      toast.success('Teks template Markdown disalin ke clipboard.');
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      toast.error('Gagal menyalin template.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program Seleksi</span>
        </Link>
      </div>

      {/* Editorial Header */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              <span>Bank Template Dokumen Resmi</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
              Unduh Format Dokumen &amp; Surat Persyaratan
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
              Gunakan template di bawah ini untuk menyusun surat lamaran, pakta
              integritas, daftar riwayat hidup (CV), surat pengalaman kerja, maupun
              makalah gagasan. Tersedia dalam format{' '}
              <strong className="text-zinc-900">Word (.doc)</strong> yang siap diedit
              langsung di Microsoft Word / Google Docs, serta format sumber{' '}
              <strong className="text-zinc-900">Markdown (.md)</strong>.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-950">
          <strong className="font-semibold block mb-1">
            Petunjuk Penggunaan untuk Pelamar:
          </strong>
          <p>
            Klik <strong>Unduh Word (.doc)</strong>, lengkapi bagian bertanda{' '}
            <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded">[...]</code>,
            bubuhkan tanda tangan / materai bila diminta, lalu simpan menjadi{' '}
            <strong>PDF</strong> sebelum diunggah ke formulir pendaftaran.
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border',
                selectedCategory === cat
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama template..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
          Tidak ada template dokumen yang cocok dengan pencarian Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTemplates.map((tpl) => (
            <article
              key={tpl.slug}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-5 hover:border-zinc-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
                    {tpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    .DOC &amp; .MD
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-zinc-900 leading-snug">
                    {tpl.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <p className="text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-1.5">
                  {tpl.targetFieldHint}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleDownloadWord(tpl)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Word (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMarkdown(tpl)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Unduh .md</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewMode('formatted');
                    setPreviewTpl(tpl);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer ml-auto"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTpl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTpl(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">
                  {previewTpl.title}
                </p>
                <p className="text-xs text-zinc-500">{previewTpl.targetFieldHint}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('formatted')}
                    className={cn(
                      'px-2.5 py-1 rounded-md cursor-pointer transition-colors',
                      previewMode === 'formatted'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    )}
                  >
                    Tampilan Word
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('markdown')}
                    className={cn(
                      'px-2.5 py-1 rounded-md cursor-pointer transition-colors',
                      previewMode === 'markdown'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    )}
                  >
                    Sumber .md
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyMarkdown(previewTpl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  {copiedSlug === previewTpl.slug ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadWord(previewTpl)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMarkdown(previewTpl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>.md</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTpl(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-100 overflow-auto p-4 sm:p-6">
              {previewMode === 'formatted' ? (
                <div
                  className="bg-white border border-zinc-200 rounded-xl shadow-sm max-w-3xl mx-auto p-6 sm:p-10 text-zinc-900 font-serif text-sm"
                  dangerouslySetInnerHTML={{
                    __html: markdownToDocumentHtml(previewTpl.markdown),
                  }}
                />
              ) : (
                <pre className="bg-zinc-900 text-zinc-100 rounded-xl max-w-3xl mx-auto p-5 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {previewTpl.markdown}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

