---
name: seleksi-editorial-ui
description: >-
  Panduan sistem desain editorial dan prinsip UI anti-AI-slop untuk
  Pendaftaran-Seleksi. Gunakan skill ini setiap kali merancang halaman baru,
  merefaktor komponen, memperbaiki responsivitas, atau meningkatkan tampilan
  agar terasa autentik, rapi, dan manusiawi.
---

# Sistem Desain Editorial & Prinsip UI Anti-AI-Slop

Tujuan utama desain UI proyek ini adalah menghadirkan kesan **portal seleksi resmi
yang tepercaya, tenang, dan fungsional** — bukan tampilan demo AI yang seragam.

## 1. Aturan Anti-AI-Slop (Yang Harus Dihindari)
- **Hindari Gradien Generik:** Jangan gunakan banner hero `bg-gradient-to-br from-indigo-600 via-purple-600...` yang terasa seperti template AI bawaan.
- **Hindari Spam Ikon `Sparkles`:** Jangan tempelkan ikon bintang/sparkles di tombol atau judul publik. Gunakan istilah fungsional yang jelas (misal: *"Susun Struktur Otomatis"*, *"Ringkas & Skor Profil"*).
- **Hindari Padding & Card Kosong Tanpa Informasi:** Setiap card program atau pelamar wajib menampilkan sinyal operasional nyata (progres kuota, jumlah berkas, batas waktu, status verifikasi).
- **Jangan Membebani Pelamar dengan Istilah Teknis:** Pelamar tidak perlu tahu soal Firebase, Clario AI, atau Zod. Gunakan bahasa Indonesia yang natural dan menenangkan.

## 2. Token Visual Utama
- **Canvas Background:** `#f6f5f2` (kertas hangat, nyaman dibaca lama).
- **Surface / Card:** `#ffffff` dengan border tipis `border-zinc-200` dan `rounded-2xl`.
- **Primary Ink:** `zinc-900` (`#18181b`) untuk tombol utama, header kartu bukti, dan fokus input.
- **Semantic Accents:**
  - *Sukses / Lolos / Dibuka*: `emerald-700` / `emerald-50`
  - *Peringatan / Batas Waktu / Menunggu*: `amber-700` / `amber-50`
  - *Ditutup / Ditolak*: `rose-700` / `rose-50`
- **Tipografi:** `Plus Jakarta Sans` (`--font-sans`) untuk teks & heading; `JetBrains Mono` (`--font-mono`) khusus untuk kode registrasi (`SEL-2026-XXXXXX`), kuota numerik, dan badge teknis.

## 3. Pola Komponen Wajib
1. **Asymmetric Split Hero (`src/app/page.tsx`):**
   Sisi kiri fokus pada ajakan daftar + widget lacak cepat; sisi kanan memuat panel gelap kontras (`bg-zinc-900`) berisi 4 langkah proses pendaftaran.
2. **Multi-Step Wizard (`src/app/seleksi/[slug]/page.tsx`):**
   Bagi formulir panjang menjadi tahapan logis (*Identitas* → *Section* → *Tinjau & Kirim*) dengan stepper horizontal dan *auto-save draft* ke `localStorage`.
3. **Kartu Bukti QR (`src/components/RegistrationCard.tsx`):**
   Selalu dukung cetak bersih dengan kelas `.no-print` untuk menyembunyikan navigasi dan `.print-only-card` untuk menjaga bingkai kartu saat `window.print()`.



## Standarisasi Global CSS (`src/app/globals.css`)

Seluruh halaman dan komponen wajib menggunakan utility classes `@layer components` di `src/app/globals.css` agar tampilan editorial konsisten di desktop (`>= 640px`) dan **borderless penuh layar di ponsel (`< 640px`)**:

### Container & Padding
- `.ui-shell`: Container halaman publik standar (`max-w-6xl`, `px-0 sm:px-6`, `py-5 sm:py-10`).
- `.ui-shell-narrow`: Container sempit untuk alur baca / form wizard (`max-w-4xl`, `px-0 sm:px-6`).
- `.ui-shell-admin`: Container dashboard panitia (`max-w-7xl`, `px-0 sm:px-6`, `py-4 sm:py-6`).
- `.ui-mobile-pad`: Wajib dipakai pada heading, breadcrumb, atau filter bar di luar card agar memiliki `px-4 sm:px-0` di ponsel.

### Surface & Borderless Mobile Cards
- `.ui-card`: Card utama (`rounded-none border-y shadow-none` di ponsel -> `sm:rounded-2xl sm:border sm:shadow-sm` di desktop).
- `.ui-card-compact`: Card ringkas / toolbar (`p-4`, borderless mobile).
- `.ui-card-dark`: Panel gelap kontras tinggi (step panduan, header kartu).
- `.ui-card-dashed`: Empty state card.
- `.ui-inset`: Sub-kotak isian di dalam card (`bg-zinc-50 border border-zinc-200 rounded-xl`).

### Callouts, Typography, Form & Actions
- `.ui-callout-amber` / `.ui-callout-emerald` / `.ui-callout-rose`: Box catatan/peringatan standar.
- `.ui-eyebrow` / `.ui-page-title` / `.ui-section-title` / `.ui-label`: Hierarki tipografi.
- `.ui-input`: Standar input, textarea, dan select.
- `.ui-btn-primary` / `.ui-btn-accent` / `.ui-btn-secondary` / `.ui-btn-danger`: Standar tombol aksi.
- `.ui-chip` / `.ui-chip-active`: Filter chip kategori.
- `.ui-badge`: Pill badge standar.

### Modals & Utilitas
- `.ui-modal-backdrop` + `.ui-modal-panel`: Bottom-sheet borderless di ponsel (`items-end rounded-t-2xl`), dialog terpusat di desktop (`sm:items-center sm:rounded-2xl`).
- `.no-scrollbar`: Menghilangkan scrollbar horizontal pada navigasi/chip strip yang bisa digeser.
- `.no-print` & `.print-only-card`: Pengaturan cetak Kartu Bukti Pendaftaran (wajib dipertahankan).
