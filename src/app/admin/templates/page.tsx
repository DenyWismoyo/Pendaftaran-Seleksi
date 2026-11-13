'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilePlus2, FileText, Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import AdminTemplateCard from '@/components/admin/AdminTemplateCard';
import TemplateEditorModal from '@/components/admin/TemplateEditorModal';
import { DocumentTemplateView } from '@/components/templates/TemplateCard';
import TemplatePreviewModal from '@/components/templates/TemplatePreviewModal';
import { adminFetch } from '@/lib/adminClient';
import {
  downloadTemplateAsMarkdown,
  downloadTemplateAsWord,
} from '@/lib/documentConverter';
import { DocumentTemplateRecord, SelectionForm } from '@/types/selection';

function AdminTemplatesContent() {
  const [templates, setTemplates] = useState<DocumentTemplateRecord[]>([]);
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<DocumentTemplateRecord | null>(null);
  const [previewTpl, setPreviewTpl] = useState<DocumentTemplateView | null>(null);
  const [previewMode, setPreviewMode] = useState<'formatted' | 'markdown'>('formatted');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tplRes, formsRes] = await Promise.all([
      adminFetch<DocumentTemplateRecord[]>('/api/admin/templates'),
      adminFetch<SelectionForm[]>('/api/admin/forms'),
    ]);
    if (tplRes.success && tplRes.data) setTemplates(tplRes.data);
    else if (tplRes.error) toast.error(tplRes.error);

    if (formsRes.success && formsRes.data) setForms(formsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formsMap = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (scopeFilter === 'GLOBAL' && !tpl.isGlobal) return false;
      if (scopeFilter === 'UNBOUND' && (tpl.isGlobal || tpl.formIds?.length > 0)) return false;
      if (!['ALL', 'GLOBAL', 'UNBOUND'].includes(scopeFilter)) {
        const form = formsMap.get(scopeFilter);
        const inFormList = form?.documentTemplateIds?.includes(tpl.id) || form?.documentTemplateIds?.includes(tpl.slug);
        if (!inFormList && !tpl.formIds?.includes(scopeFilter)) return false;
      }
      if (!q) return true;
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q)
      );
    });
  }, [templates, scopeFilter, search, formsMap]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    const res = await adminFetch<{ added: number }>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify({ action: 'seed-defaults' }),
    });
    if (res.success) {
      toast.success(`Sinkronisasi selesai (${res.data?.added || 0} template bawaan ditambahkan).`);
      await loadData();
    } else {
      toast.error(res.error || 'Gagal memuat template bawaan.');
    }
    setSeeding(false);
  };

  const handleDelete = async (tpl: DocumentTemplateRecord) => {
    if (!window.confirm(`Hapus permanen template "${tpl.title}"?`)) return;
    const res = await adminFetch(`/api/admin/templates/${tpl.id}`, { method: 'DELETE' });
    if (res.success) {
      toast.success('Template berhasil dihapus.');
      await loadData();
    } else {
      toast.error(res.error || 'Gagal menghapus template.');
    }
  };

  const handleCopyMd = async (tpl: DocumentTemplateView) => {
    await navigator.clipboard.writeText(tpl.markdown);
    setCopiedSlug(tpl.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            Bank & Isolasi Template Dokumen
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Kelola format surat/CV (.doc &amp; .md) dan isolasikan agar setiap seleksi hanya memunculkan dokumen yang dibutuhkan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleSeedDefaults} disabled={seeding} className="ui-btn-secondary">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Muat Template Bawaan
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTpl(null);
              setEditorOpen(true);
            }}
            className="ui-btn-primary"
          >
            <FilePlus2 className="w-4 h-4" />
            Tambah Template
          </button>
        </div>
      </div>

      <div className="ui-card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, kategori, atau deskripsi template..."
            className="ui-input pl-9"
          />
        </div>
        <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="ui-input">
          <option value="ALL">Semua Cakupan ({templates.length})</option>
          <option value="GLOBAL">Hanya Template Global</option>
          <option value="UNBOUND">Belum Terikat Seleksi</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>Seleksi: {f.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="ui-card p-10 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
          Memuat bank template dokumen...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="ui-card p-10 text-center text-sm text-zinc-500">
          Tidak ada template yang cocok dengan filter saat ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <AdminTemplateCard
              key={tpl.id}
              template={tpl}
              formsMap={formsMap}
              onPreview={setPreviewTpl}
              onEdit={(t) => {
                setEditingTpl(t);
                setEditorOpen(true);
              }}
              onDelete={handleDelete}
              onDownloadWord={downloadTemplateAsWord}
            />
          ))}
        </div>
      )}

      <TemplateEditorModal
        open={editorOpen}
        initialTemplate={editingTpl}
        forms={forms}
        onClose={() => setEditorOpen(false)}
        onSaved={loadData}
      />

      <TemplatePreviewModal
        template={previewTpl}
        previewMode={previewMode}
        copiedSlug={copiedSlug}
        onModeChange={setPreviewMode}
        onCopyMarkdown={handleCopyMd}
        onDownloadWord={downloadTemplateAsWord}
        onDownloadMarkdown={downloadTemplateAsMarkdown}
        onClose={() => setPreviewTpl(null)}
      />
    </div>
  );
}

export default function AdminTemplatesPage() {
  return (
    <AdminGuard>
      <AdminTemplatesContent />
    </AdminGuard>
  );
}
