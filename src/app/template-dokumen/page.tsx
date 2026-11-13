'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateHeaderCard from '@/components/templates/TemplateHeaderCard';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import { buildWordDocPayload } from '@/lib/documentConverter';
import { DOCUMENT_TEMPLATES, DocumentTemplate } from '@/lib/documentTemplates';
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

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = (tpl: DocumentTemplate) => {
    triggerDownload(
      '\ufeff' + buildWordDocPayload(tpl.title, tpl.markdown),
      `${tpl.fileBaseName}.doc`,
      'application/msword;charset=utf-8'
    );
    toast.success(`Mengunduh "${tpl.fileBaseName}.doc" (siap dibuka di Word).`);
  };

  const handleDownloadMarkdown = (tpl: DocumentTemplate) => {
    triggerDownload(
      tpl.markdown,
      `${tpl.fileBaseName}.md`,
      'text/markdown;charset=utf-8'
    );
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
    <div className="ui-shell space-y-5 sm:space-y-6">
      <div className="ui-mobile-pad">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program Seleksi</span>
        </Link>
      </div>

      <TemplateHeaderCard />

      <div className="ui-mobile-pad flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'shrink-0 whitespace-nowrap',
                selectedCategory === cat ? 'ui-chip-active' : 'ui-chip'
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
            className="ui-input pl-9 bg-white"
          />
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center text-sm text-zinc-500">
          Tidak ada template dokumen yang cocok dengan pencarian Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          {filteredTemplates.map((tpl) => (
            <TemplateCard
              key={tpl.slug}
              template={tpl}
              onDownloadWord={handleDownloadWord}
              onDownloadMarkdown={handleDownloadMarkdown}
              onPreview={(picked) => {
                setPreviewMode('formatted');
                setPreviewTpl(picked);
              }}
            />
          ))}
        </div>
      )}

      <TemplatePreviewModal
        template={previewTpl}
        previewMode={previewMode}
        copiedSlug={copiedSlug}
        onModeChange={setPreviewMode}
        onCopyMarkdown={handleCopyMarkdown}
        onDownloadWord={handleDownloadWord}
        onDownloadMarkdown={handleDownloadMarkdown}
        onClose={() => setPreviewTpl(null)}
      />
    </div>
  );
}
