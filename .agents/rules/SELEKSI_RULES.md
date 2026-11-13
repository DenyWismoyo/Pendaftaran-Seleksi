# Aturan Teknis & Standar Kualitas — Pendaftaran-Seleksi

## 1. Integritas Data & Skema
- **SR-001 (Zod Single Source of Truth):** Semua struktur data utama (`SelectionForm`, `SelectionField`, `SelectionSubmission`, `UploadedFileMeta`) wajib didefinisikan di `src/types/selection.ts` menggunakan Zod schema dan type inferensi `z.infer`.
- **SR-002 (Isolasi Koleksi):** Nama koleksi Firestore wajib diambil dari `COLLECTIONS` di `src/lib/constants.ts` (`selection_forms`, `selection_submissions`). Dilarang hardcode string nama koleksi di API route atau komponen.
- **SR-003 (Atomic Batch):** Operasi yang mengubah lebih dari satu dokumen (misal: membuat submission + menaikkan `submissionCount`, atau bulk update status pelamar) wajib menggunakan `db.batch()`.

## 2. Keamanan & Privasi
- **SR-004 (Verifikasi Token Admin):** Seluruh endpoint `/api/admin/*` wajib memverifikasi Firebase ID Token melalui `verifyAdminRequest(req)` dan memastikan role termasuk dalam `ADMIN_ROLES`.
- **SR-005 (Validasi Upload Berkas):** Endpoint `/api/upload` wajib memvalidasi status formulir (`OPEN`), kecocokan `fieldId`, MIME type yang diizinkan, dan batas ukuran file (`maxSizeMB`) di sisi server sebelum menyimpan ke Firebase Storage.
- **SR-006 (Proteksi Data Pelamar Publik):** Endpoint publik `GET /api/submissions` hanya boleh mengembalikan ringkasan status apabila `registrationCode` dan `applicantEmail` cocok. Jangan pernah mengekspos seluruh daftar pelamar atau `answers` lengkap ke publik tanpa autentikasi panitia.
- **SR-007 (Zero Secret Commit):** `.env.local` dan `service-account-*.json` dilarang masuk Git. Gunakan `.env.example` untuk dokumentasi variabel environment.

## 3. UI & Pengalaman Pengguna (Anti-AI-Slop)
- **SR-008 (Palet Warna Editorial):** Gunakan palet kertas hangat (`#f6f5f2`), kartu putih (`#ffffff`), batas garis halus (`border-zinc-200`), teks utama `zinc-900`, dan aksen utama `emerald-700`. Hindari gradien ungu/neon generik.
- **SR-009 (Bahasa Natural & Profesional):** Gunakan Bahasa Indonesia yang lugas dan manusiawi seperti sistem penerimaan resmi. Jangan membebani tampilan pelamar dengan label "AI" atau ikon bintang/sparkles yang berlebihan.
- **SR-010 (Print-Friendly Pass):** Komponen bukti registrasi wajib mempertahankan kelas `.no-print` dan `.print-only-card` agar kartu QR tetap tercetak rapi lewat `window.print()`.

## 4. Verifikasi Sebelum Commit / Push
- **SR-011:** Setiap perubahan wajib lolos `npx tsc --noEmit` dan `npm run build` tanpa error.
