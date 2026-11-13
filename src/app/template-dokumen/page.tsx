'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import TemplateCard, {
  DocumentTemplateView,
} from '@/components/templates/TemplateCard';
import TemplateHeaderCard, {
  ScopedFormSummary,
} from '@/components/templates/TemplateHeaderCard';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import {
  downloadTemplateAsMarkdown,
  downloadTemplateAsWord,
} from '@/lib/documentConverter';
import { DOCUMENT_TEMPLATES } from '@/lib/documentTemplates';
import { cn } from '@/lib/utils';

function DocumentTemplatesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const seleksiSlug = searchParams.get('seleksi')?.trim() || '';

  const [templates, setTemplates] = useState<DocumentTemplateView[]>(DOCUMENT_TEMPLATES);
  const [scopedForm, setScopedForm] = useState<ScopedFormSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [previewTpl, setPreviewTpl] = useState<DocumentTemplateView | null>(null);
  const [previewMode, setPreviewMode] = useState<'formatted' | 'markdown'>('formatted');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const query = seleksiSlug ? `?seleksi=${encodeURIComponent(seleksiSlug)}` : '';
        const res = await fetch(`/api/templates${query}`);
        const json = await res.json();
        if (active && json?.success && Array.isArray(json.data)) {
          setTemplates(json.data);
          setScopedForm(json.scopedForm || null);
          setSelectedCategory('Semua');
        }
      } catch {
        // Fallback aman ke daftar default jika jaringan terganggu
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTemplates();
    return () => {
      active = false;
    };
  }, [seleksiSlug]);

  const categories = useMemo(() => {
    const uniq = Array.from(new Set(templates.map((t) => t.category).filter(Boolean)));
    return ['Semua', ...uniq];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      const matchCat = selectedCategory === 'Semua' || tpl.category === selectedCategory;
      const matchSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.targetFieldHint.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [templates, selectedCategory, search]);

  const handleDownloadWord = (tpl: DocumentTemplateView) => {
    downloadTemplateAsWord(tpl);
    toast.success(`Mengunduh "${tpl.fileBaseName}.doc" (siap dibuka di Word).`);
  };

  const handleDownloadMarkdown = (tpl: DocumentTemplateView) => {
    downloadTemplateAsMarkdown(tpl);
    toast.success(`Mengunduh "${tpl.fileBaseName}.md".`);
  };

  const handleCopyMarkdown = async (tpl: DocumentTemplateView) => {
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
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Program Seleksi</span>
        </Link>
      </div>

      <TemplateHeaderCard
        scopedForm={scopedForm}
        onShowAll={scopedForm ? () => router.push('/template-dokumen') : undefined}
      />

      <div className="ui-mobile-pad flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn('shrink-0 whitespace-nowrap', selectedCategory === cat ? 'ui-chip-active' : 'ui-chip')}
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

      {loading ? (
        <div className="ui-card p-10 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
          <span>Menyiapkan template dokumen seleksi...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center text-sm text-zinc-500">
          Tidak ada template dokumen yang cocok dengan filter atau pencarian Anda.
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

export default function DocumentTemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="ui-shell py-12 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
          <span>Memuat bank template...</span>
        </div>
      }
    >
      <DocumentTemplatesContent />
    </Suspense>
  );
}
