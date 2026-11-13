'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderUp,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { SelectionForm } from '@/types/selection';
import { FORM_STATUS_META } from '@/lib/constants';
import { cn, getDeadlineBadge } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [quickCode, setQuickCode] = useState('');
  const [quickEmail, setQuickEmail] = useState('');

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

  const openCount = forms.filter((f) => f.status === 'OPEN').length;

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCode.trim() || !quickEmail.trim()) return;
    router.push(
      `/cek-status?code=${encodeURIComponent(
        quickCode.trim().toUpperCase()
      )}&email=${encodeURIComponent(quickEmail.trim())}`
    );
  };

  return (
    <div className="ui-shell space-y-6 sm:space-y-10">
      {/* Editorial Asymmetric Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        <div className="lg:col-span-7 ui-card p-5 sm:p-9 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>{openCount} Seleksi Aktif Dibuka</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.15]">
              Portal Pendaftaran &amp; Seleksi Berkas Peserta
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl">
              Ajukan pendaftaran program pelatihan, inkubasi, magang, atau rekrutmen
              secara terstruktur. Unggah dokumen persyaratan Anda dan pantau proses
              verifikasi panitia dalam satu tempat.
            </p>
          </div>

          {/* Quick Status Lookup Bar */}
          <form
            onSubmit={handleQuickLookup}
            className="mt-6 sm:mt-7 pt-5 sm:pt-6 border-t border-zinc-100 space-y-2.5"
          >
            <p className="ui-eyebrow">
              Sudah mendaftar? Lacak status Anda secara langsung
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                required
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                placeholder="Kode (SEL-2026-XXXXXX)"
                className="sm:col-span-5 ui-input bg-zinc-50 font-mono uppercase text-xs sm:text-sm"
              />
              <input
                type="email"
                required
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="Email pendaftaran"
                className="sm:col-span-5 ui-input bg-zinc-50 text-xs sm:text-sm"
              />
              <button
                type="submit"
                className="sm:col-span-2 ui-btn-primary text-xs sm:text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Cek</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Structured Process Steps */}
        <aside className="lg:col-span-5 ui-card-dark p-5 sm:p-8 flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
              Panduan Pendaftaran
            </p>
            <h2 className="text-xl font-bold tracking-tight">
              Empat Langkah Seleksi
            </h2>
          </div>

          <ol className="space-y-4 my-6">
            {[
              {
                step: '01',
                title: 'Pilih Program Seleksi',
                desc: 'Periksa kuota, batas waktu, dan rincian berkas yang dibutuhkan.',
              },
              {
                step: '02',
                title: 'Isi Formulir Bertahap',
                desc: 'Progres pengisian tersimpan otomatis sebagai draf di peramban Anda.',
              },
              {
                step: '03',
                title: 'Unggah Dokumen Persyaratan',
                desc: 'Kirim KTP, Ijazah, CV, atau surat pengantar berformat PDF/gambar.',
              },
              {
                step: '04',
                title: 'Cetak Kartu & Pantau Hasil',
                desc: 'Dapatkan kode registrasi QR untuk melacak hasil verifikasi panitia.',
              },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3.5">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-white/10 px-2 py-1 rounded-md shrink-0 mt-0.5">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span>Butuh akses pengelolaan panitia?</span>
            <Link
              href="/admin"
              className="text-emerald-400 font-semibold hover:text-emerald-300 inline-flex items-center gap-1"
            >
              <span>Masuk Panitia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      </section>

      {/* Filter & Search Bar */}
      <section className="ui-mobile-pad flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            Daftar Program Terbuka
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Menampilkan {filteredForms.length} dari {forms.length} program seleksi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative min-w-[230px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari program atau kata kunci..."
              className="ui-input pl-9"
            />
          </div>

          <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'shrink-0 whitespace-nowrap',
                  selectedCategory === cat ? 'ui-chip-active' : 'ui-chip'
                )}
              >
                {cat === 'ALL' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Program Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-800" />
          <p className="text-sm">Memuat daftar program seleksi...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-800">
            Belum ada program seleksi yang tersedia
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Panitia dapat membuat formulir baru atau mengimpor template siap pakai di
            halaman Panel Panitia.
          </p>
          <div className="pt-2">
            <Link href="/admin" className="ui-btn-primary">
              <span>Buka Panel Panitia</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredForms.map((form) => {
            const statusMeta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
            const fileCount = form.fields.filter((f) => f.type === 'file').length;
            const count = form.submissionCount || 0;
            const isFull = form.quota > 0 && count >= form.quota;
            const quotaPct =
              form.quota > 0 ? Math.min(100, Math.round((count / form.quota) * 100)) : 0;
            const deadline = getDeadlineBadge(form.endDate);
            const canApply =
              form.status === 'OPEN' && !isFull && !deadline?.expired;

            return (
              <article
                key={form.id}
                className="ui-card p-5 sm:p-6 flex flex-col justify-between sm:hover:border-zinc-400 transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md">
                      {form.category}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-md border',
                        isFull || deadline?.expired
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : statusMeta.badgeClass
                      )}
                    >
                      {isFull
                        ? 'Kuota Penuh'
                        : deadline?.expired
                          ? 'Ditutup'
                          : statusMeta.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900 leading-snug">
                    {form.title}
                  </h3>

                  <p className="text-sm text-zinc-600 line-clamp-3 leading-relaxed">
                    {form.description ||
                      'Lengkapi biodata dan unggah berkas persyaratan seleksi.'}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-zinc-100 space-y-4">
                  {/* Quota progress if limited */}
                  {form.quota > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Kuota Terisi
                        </span>
                        <span className="font-mono font-semibold text-zinc-800">
                          {count} / {form.quota}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            quotaPct >= 90 ? 'bg-amber-500' : 'bg-emerald-600'
                          )}
                          style={{ width: `${quotaPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Total pendaftar
                      </span>
                      <span className="font-mono font-semibold text-zinc-800">
                        {count} peserta
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <FolderUp className="w-3.5 h-3.5 text-zinc-400" />
                      {fileCount} berkas unggah
                    </span>

                    {deadline && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-medium',
                          deadline.urgent ? 'text-amber-700' : 'text-zinc-500'
                        )}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        {deadline.label}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/seleksi/${form.slug}`}
                    className={cn(
                      'w-full',
                      canApply
                        ? 'ui-btn-primary'
                        : 'ui-btn-secondary bg-zinc-100 border-transparent text-zinc-600 hover:bg-zinc-200'
                    )}
                  >
                    {canApply ? (
                      <>
                        <span>Mulai Pendaftaran</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lihat Informasi Program</span>
                      </>
                    )}
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
