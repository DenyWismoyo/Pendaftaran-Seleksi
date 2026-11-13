'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Square,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminClient';
import { cn } from '@/lib/utils';
import { DocumentTemplateRecord } from '@/types/selection';

interface FormTemplatesPickerProps {
  selectedIds: string[];
  formId?: string;
  onChange: (ids: string[]) => void;
}

export default function FormTemplatesPicker({
  selectedIds,
  formId,
  onChange,
}: FormTemplatesPickerProps) {
  const [templates, setTemplates] = useState<DocumentTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminFetch<DocumentTemplateRecord[]>('/api/admin/templates');
    if (res.success && Array.isArray(res.data)) {
      setTemplates(res.data);
    } else {
      setError(res.error || 'Gagal memuat daftar bank template.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const effectiveSelectedSet = useMemo(() => {
    const set = new Set(selectedIds);
    // Jika formulir lama belum memiliki `documentTemplateIds` eksplisit,
    // tandai template yang memiliki formIds/slug terhubung saat ditampilkan.
    if (selectedIds.length === 0 && formId) {
      templates.forEach((tpl) => {
        if (Array.isArray(tpl.formIds) && tpl.formIds.includes(formId)) {
          set.add(tpl.id);
        }
      });
    }
    return set;
  }, [selectedIds, formId, templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.targetFieldHint.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const toggleTemplate = (tpl: DocumentTemplateRecord) => {
    const next = new Set(effectiveSelectedSet);
    if (next.has(tpl.id) || next.has(tpl.slug)) {
      next.delete(tpl.id);
      next.delete(tpl.slug);
    } else {
      next.add(tpl.id);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="ui-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            Isolasi Template Dokumen Khusus Seleksi Ini
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Pilih template surat/makalah/CV yang relevan saja untuk seleksi ini. Peserta
            yang mengakses panduan template dari formulir ini hanya akan melihat item yang
            dicentang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTemplates}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Muat Ulang
          </button>
          <Link
            href="/admin/templates"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50"
          >
            Kelola Bank Template
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs">
        <span className="text-zinc-700 font-medium">
          Terpilih:{' '}
          <strong className="text-emerald-700">
            {effectiveSelectedSet.size} dari {templates.length} template
          </strong>
          {effectiveSelectedSet.size === 0 && (
            <span className="text-zinc-500 font-normal ml-1.5">
              (Mode otomatis berdasarkan kategori seleksi)
            </span>
          )}
        </span>
        {effectiveSelectedSet.size > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-zinc-500 hover:text-red-600 font-medium cursor-pointer"
          >
            Reset pilihan
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama template atau kategori (misal: Pejabat Teknis, Vokasi, Magang)..."
          className="ui-input pl-9 text-xs"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-zinc-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
          Memuat bank template dokumen...
        </div>
      ) : error ? (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-4">
          Tidak ada template yang cocok dengan pencarian Anda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filtered.map((tpl) => {
            const isChecked =
              effectiveSelectedSet.has(tpl.id) || effectiveSelectedSet.has(tpl.slug);
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => toggleTemplate(tpl)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer',
                  isChecked
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                )}
              >
                <span className="mt-0.5 shrink-0 text-emerald-700">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {tpl.category}
                    </span>
                    {tpl.isGlobal && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                        <Globe className="w-2.5 h-2.5" />
                        Global
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 line-clamp-1">
                    {tpl.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                    {tpl.targetFieldHint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

