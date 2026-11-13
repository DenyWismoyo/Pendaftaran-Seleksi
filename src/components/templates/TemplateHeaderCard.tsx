'use client';

import { FileText } from 'lucide-react';

export default function TemplateHeaderCard() {
  return (
    <section className="ui-card p-5 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Bank Template Dokumen Resmi</span>
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

