---
name: seleksi-form-workflow
description: >-
  Panduan pengembangan alur Formulir Seleksi, Form Builder Live Preview, Upload
  Berkas ke Firebase Storage, dan Meja Verifikasi Panitia (Bulk Action, Lightbox
  Pratinjau PDF/Gambar, Export CSV). Aktifkan saat menyempurnakan alur pengisian
  atau review pelamar.
---

# Panduan Workflow Formulir, Upload Berkas & Verifikasi Panitia

## 1. Alur Pengisian & Upload Pelamar
- **Validasi Bertahap:** Validasi per langkah di client (`validateDynamicSubmission`)
  sebelum berpindah step, lalu validasi ulang seluruh field di server (`POST /api/submissions`).
- **Pengalaman Upload Berkas:**
  - Mendukung *click-to-upload* maupun *drag-and-drop*.
  - File gambar (`image/*`) menampilkan pratinjau thumbnail langsung setelah terunggah.
  - File non-gambar (`PDF`, `DOC/DOCX`) menampilkan kartu nama berkas + ukuran terformat (`formatBytes`).
  - Batas ukuran dan ekstensi (`accept`, `maxSizeMB`) dikonfigurasi per field di Form Builder dan diverifikasi ulang di `POST /api/upload`.

## 2. Studio Form Builder (`src/components/FormBuilder.tsx`)
- Pertahankan layout **Split-Screen**: editor di kiri dan **Live Preview** di kanan
  agar panitia melihat hasil akhir formulir secara langsung.
- Sediakan **Quick Presets** untuk field yang sering dipakai (*NIK 16 Digit*,
  *Pendidikan Terakhir*, *Upload KTP*, *Upload CV*) agar pembuatan form cepat tanpa mengetik ulang.

## 3. Meja Verifikasi Panitia (`src/app/admin/submissions/page.tsx`)
- **Pipeline Counter:** Filter cepat berdasarkan status (`ALL`, `SUBMITTED`, `REVIEWING`, `ACCEPTED`, `REJECTED`).
- **Bulk Actions:** Checkbox multi-pilih terhubung ke `PATCH /api/admin/submissions`
  dengan payload `{ ids: string[], status }` menggunakan `db.batch()`.
- **In-App Preview Modal:** Gambar ditampilkan via `<img>` dan dokumen PDF via `<iframe>`
  di dalam modal agar panitia dapat memeriksa berkas tanpa membuka puluhan tab baru.
- **Export CSV:** Sertakan UTF-8 BOM (`\uFEFF`) agar file CSV langsung terbaca rapi di Microsoft Excel.

