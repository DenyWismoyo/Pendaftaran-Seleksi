'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Layers } from 'lucide-react';

export interface ScopedFormSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
}

interface TemplateHeaderCardProps {
  scopedForm?: ScopedFormSummary | null;
  onShowAll?: () => void;
}

export default function TemplateHeaderCard({
  scopedForm,
  onShowAll,
}: TemplateHeaderCardProps) {
  return (
    <section className="ui-card p-5 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>
              {scopedForm
                ? `Template Khusus Seleksi: ${scopedForm.category}`
                : 'Bank Template Dokumen Resmi'}
            </span>
          </span>
          <h1 className="ui-page-title">
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

      {scopedForm && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-emerald-950">
            <Layers className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">
                Menampilkan khusus template untuk: {scopedForm.title}
              </span>
              <span className="text-emerald-800">
                Daftar dokumen telah disaring agar Anda hanya mengunduh berkas yang
                dibutuhkan pada seleksi ini.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/seleksi/${scopedForm.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Seleksi
            </Link>
            {onShowAll && (
              <button
                type="button"
                onClick={onShowAll}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 font-medium hover:bg-zinc-50 cursor-pointer"
              >
                Lihat Semua Program
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ui-callout-amber text-xs sm:text-sm">
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
  );
}
