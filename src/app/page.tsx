'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  FileCheck2,
  Loader2,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { SelectionForm } from '@/types/selection';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, formatDateID } from '@/lib/utils';

export default function HomePage() {
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    let active = true;
    fetch('/api/forms')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success) {
          setForms(json.data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(forms.map((f) => f.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [forms]);

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      const matchCategory =
        selectedCategory === 'ALL' || form.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        form.title.toLowerCase().includes(q) ||
        form.description.toLowerCase().includes(q) ||
        form.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [forms, selectedCategory, search]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white p-6 sm:p-10 shadow-lg">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pendaftaran &amp; Seleksi Berkas Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Portal Formulir Seleksi &amp; Unggah Berkas Persyaratan
          </h1>
          <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
            Pilih program seleksi yang sedang dibuka, lengkapi formulir biodata, unggah
            dokumen persyaratan secara langsung, dan pantau hasil seleksi dengan kode
            pendaftaran Anda.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/cek-status"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Cek Status Pendaftaran</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              <span>Kelola Formulir (Admin)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari program seleksi..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer',
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat === 'ALL' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Forms Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-sm">Memuat daftar program seleksi...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-800">
            Belum ada program seleksi yang tersedia
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Admin dapat membuat formulir seleksi baru atau mengimpor template bawaan dari
            halaman Panel Admin.
          </p>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              <span>Buka Panel Admin</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => {
            const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
            const fileCount = form.fields.filter((f) => f.type === 'file').length;
            const isFull = form.quota > 0 && (form.submissionCount || 0) >= form.quota;
            const canApply = form.status === 'OPEN' && !isFull;

            return (
              <article
                key={form.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {form.category}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-lg border',
                        statusMeta.badgeClass
                      )}
                    >
                      {isFull ? 'Kuota Penuh' : statusMeta.label}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {form.title}
                  </h2>

                  <p className="text-sm text-slate-600 line-clamp-3">
                    {form.description || 'Pendaftaran seleksi peserta dan unggah berkas.'}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {form.submissionCount || 0}
                        {form.quota > 0 ? ` / ${form.quota} kuota` : ' pendaftar'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{fileCount} berkas unggah</span>
                    </div>
                    {form.endDate && (
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Batas daftar: {formatDateID(form.endDate)}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/seleksi/${form.slug}`}
                    className={cn(
                      'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      canApply
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    <span>{canApply ? 'Isi Formulir Seleksi' : 'Lihat Detail Program'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
