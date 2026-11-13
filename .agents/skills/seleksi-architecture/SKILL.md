---
name: seleksi-architecture
description: >-
  Arsitektur teknis proyek Pendaftaran-Seleksi (Next.js App Router, Zod,
  Firebase Admin SDK, Cloud Storage, dan isolasi koleksi Firestore). Aktifkan
  skill ini sebelum menambah endpoint API, mengubah skema database, atau
  mengintegrasikan layanan eksternal baru.
---

# Arsitektur Teknis Pendaftaran-Seleksi

## 1. Pola Aliran Data
Aplikasi memisahkan akses publik dan akses panitia melalui Next.js Route Handlers
berbasis `firebase-admin` agar pendaftar publik dapat mengirim formulir dan mengunggah
berkas tanpa perlu membuat akun login terlebih dahulu.

```text
Publik (Browser)
  ├── GET  /api/forms                  → Baca daftar/detail form OPEN & CLOSED
  ├── POST /api/upload                 → Validasi MIME/size → Upload ke selection_uploads/
  ├── POST /api/submissions            → Validasi Zod + Dynamic fields → Simpan & increment counter
  └── GET  /api/submissions?code&email → Lacak status dengan verifikasi kode + email

Panitia (Firebase Auth Bearer Token)
  ├── GET  /api/admin/me               → Verifikasi role di ADMIN_ROLES
  ├── CRUD /api/admin/forms(/[id])     → Kelola definisi formulir
  ├── GET/PATCH /api/admin/submissions → Tinjau pelamar & bulk update via WriteBatch
  └── POST /api/admin/ai               → Asisten opsional (generate-form, evaluate-submission)
```

## 2. Isolasi Resource Firebase
- Firestore root collections:
  - `selection_forms`
  - `selection_submissions`
- Cloud Storage prefix:
  - `selection_uploads/{formId}/{fieldId}/{timestamp}-{safeFileName}`
- Inisialisasi Admin SDK di `src/lib/firebaseAdmin.ts` mendukung 4 sumber kredensial
  berurutan: `service-account-katalog.json` (lokal), `FIREBASE_SERVICE_ACCOUNT_KEY`
  (JSON env), kombinasi `FIREBASE_ADMIN_*`, dan ADC fallback.

## 3. Checklist Menambah Fitur Backend Baru
1. Tambahkan atau perbarui schema Zod di `src/types/selection.ts`.
2. Jika menambah tipe field form baru, perbarui `FieldTypeEnum` dan tambahkan logika
   validasinya di `src/lib/validation.ts` (`validateDynamicSubmission`).
3. Untuk endpoint panitia, selalu panggil `verifyAdminRequest(req)` di baris pertama.
4. Jalankan verifikasi wajib:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
