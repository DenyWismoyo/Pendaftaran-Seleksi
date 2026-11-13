'use client';

import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

interface HomeHeroSectionProps {
  openCount: number;
  quickCode: string;
  quickEmail: string;
  onQuickCodeChange: (value: string) => void;
  onQuickEmailChange: (value: string) => void;
  onQuickLookup: (e: React.FormEvent) => void;
}

const SELECTION_STEPS = [
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
];

export default function HomeHeroSection({
  openCount,
  quickCode,
  quickEmail,
  onQuickCodeChange,
  onQuickEmailChange,
  onQuickLookup,
}: HomeHeroSectionProps) {
  return (
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
          onSubmit={onQuickLookup}
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
              onChange={(e) => onQuickCodeChange(e.target.value.toUpperCase())}
              placeholder="Kode (SEL-2026-XXXXXX)"
              className="sm:col-span-5 ui-input bg-zinc-50 font-mono uppercase text-xs sm:text-sm"
            />
            <input
              type="email"
              required
              value={quickEmail}
              onChange={(e) => onQuickEmailChange(e.target.value)}
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
          {SELECTION_STEPS.map((item) => (
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
  );
}

