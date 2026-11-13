# AGENTS.md — Panduan Kerja Proyek Pendaftaran-Seleksi

> Baca panduan ini sebelum melakukan perubahan kode, UI, atau skema data pada
> proyek **Portal Pendaftaran & Seleksi Online**.

## 🎯 Ringkasan Sistem

**Pendaftaran-Seleksi** adalah portal pendaftaran seleksi dinamis dengan unggah
berkas persyaratan, pelacakan status berbasis kode registrasi + QR, serta meja
verifikasi panitia.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 +
Zod + Firebase (Auth, Firestore, Storage via `firebase-admin` & client SDK) +
Clario AI (opsional untuk asisten panitia).

---

## 🗂️ Peta Direktori Penting

| Kebutuhan | Lokasi File |
|-----------|-------------|
| Skema data & validasi Zod | `src/types/selection.ts`, `src/lib/validation.ts` |
| Konstanta koleksi & status | `src/lib/constants.ts` |
| Firebase Client & Admin SDK | `src/lib/firebase.ts`, `src/lib/firebaseAdmin.ts` |
| API Publik (form, upload, submit, cek status) | `src/app/api/forms/`, `src/app/api/upload/`, `src/app/api/submissions/` |
| API Panitia (CRUD form, bulk review, AI assist) | `src/app/api/admin/` |
| Halaman Publik | `src/app/page.tsx`, `src/app/seleksi/[slug]/page.tsx`, `src/app/cek-status/page.tsx` |
| Halaman Panitia | `src/app/admin/` + `src/components/FormBuilder.tsx` |
| Kartu Bukti QR & Cetak | `src/components/RegistrationCard.tsx` |

---

## 🔒 Aturan Wajib Sebelum Mengedit

1. **Isolasi Database & Storage**: Sistem ini menggunakan database Firestore terpisah
   (`pendaftaran-seleksi` via `NEXT_PUBLIC_SELEKSI_DATABASE_ID`) dan bucket
   Cloud Storage terpisah (`seleksi-solo-technopark` via
   `NEXT_PUBLIC_SELEKSI_STORAGE_BUCKET`). Akun admin panitia diverifikasi dari koleksi
   `users` di dalam database `pendaftaran-seleksi` itu sendiri.
2. **Jangan Pernah Commit Rahasia**: Pastikan `.env.local` dan `*service-account*.json`
   selalu tercantum di `.gitignore` dan tidak pernah di-stage ke Git.
3. **Otorisasi Panitia**: Semua route `/api/admin/*` WAJIB memanggil
   `verifyAdminRequest(req)` sebelum membaca atau mengubah data.
4. **Estetika UI Non-AI**: Ikuti skill `seleksi-editorial-ui` — jaga tampilan tetap
   bersih, editorial, fungsional, dan bebas dari gaya visual generik AI.

---

## 🔗 Daftar Skill & Aturan Workspace

- `.agents/rules/SELEKSI_RULES.md` — Aturan teknis & guardrail wajib
- `.agents/skills/seleksi-architecture/SKILL.md` — Arsitektur & alur backend/Firebase
- `.agents/skills/seleksi-editorial-ui/SKILL.md` — Standar UI editorial & anti-AI-slop
- `.agents/skills/seleksi-form-workflow/SKILL.md` — Panduan form builder, upload & verifikasi
- `.agents/skills/seleksi-organic-roadmap/SKILL.md` — Roadmap pengembangan organik bertahap

