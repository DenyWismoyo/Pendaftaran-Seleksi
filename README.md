# Portal Pendaftaran & Seleksi Online

Aplikasi web pembuatan formulir seleksi dinamis, unggah berkas persyaratan, pelacakan status pendaftaran, serta verifikasi panitia berbasis **Next.js (App Router)**, **Firebase (Auth, Firestore, Storage)**, dan **Clario AI**.

## Fitur Utama

1. **Portal Program Seleksi (`/`)**: Daftar program seleksi aktif, filter kategori, pencarian, info kuota, dan batas akhir pendaftaran.
2. **Formulir Seleksi Dinamis & Unggah Berkas (`/seleksi/[slug]`)**:
   - Mendukung tipe input: `text`, `textarea`, `email`, `tel`, `number`, `date`, `select`, `radio`, `checkbox`, dan `file`.
   - Unggah dokumen persyaratan (PDF, JPG, PNG, DOC/DOCX) langsung ke Firebase Storage (`selection_uploads/`).
   - Menghasilkan kode pendaftaran unik (`SEL-YYYY-XXXXXX`) setelah pengiriman.
3. **Cek Status Pendaftaran (`/cek-status`)**: Pelamar dapat memantau status verifikasi (`Menunggu Verifikasi`, `Dalam Peninjauan`, `Lolos Seleksi`, `Tidak Lolos`) dan catatan panitia menggunakan kode pendaftaran + email.
4. **Panel Admin (`/admin`)**:
   - Terproteksi Firebase Auth & verifikasi role admin (`users/{uid}.role` atau Custom Claims).
   - **Form Builder Dinamis (`/admin/forms/new`)**: Tambah/edit/urutkan field, atur batas ukuran & format berkas, serta fitur **Import Template Bawaan**.
   - **Clario AI Assistant**: Generate struktur formulir otomatis dari deskripsi program serta pre-screening/evaluasi pelamar.
   - **Verifikasi Pendaftar (`/admin/submissions`)**: Tinjau jawaban, buka berkas terunggah, ubah status seleksi, tulis catatan, dan **Export CSV**.

## Setup Lokal

1. Salin `.env.example` menjadi `.env.local` dan lengkapi konfigurasi Firebase & Clario AI.
2. Untuk menjalankan Route Handler (`firebase-admin`) secara lokal, sediakan salah satu:
   - File `service-account-katalog.json` di root project (sudah di-ignore oleh `.gitignore`), **atau**
   - Isi `FIREBASE_SERVICE_ACCOUNT_KEY` / `FIREBASE_ADMIN_PRIVATE_KEY` di `.env.local`.
3. Install dependencies dan jalankan server development:

```bash
npm install
npm run dev
```

## Database & Storage Terpisah

Aplikasi ini berjalan di database dan bucket terpisah (tidak mencampuri database `(default)`):
- Firestore Database: `pendaftaran-seleksi` (`asia-southeast2`, Standard Edition)
  - Koleksi: `selection_forms`, `selection_submissions`, `users`
- Cloud Storage Bucket: `seleksi-solo-technopark` (`asia-southeast2`)
  - Path berkas: `selection_uploads/{formId}/{fieldId}/...`

### Mendaftarkan Akun Panitia Pertama (`super_admin`)
Karena koleksi `users` dipisahkan ke database `pendaftaran-seleksi`, daftarkan akun panitia pertama lewat CLI:

```bash
node scripts/manage-admin.mjs add email@domain.id super_admin PasswordAwal123 "Nama Panitia"
```

Setelah masuk ke `/admin`, Anda dapat menambah atau mengelola panitia lain langsung melalui menu **Kelola Panitia** (`/admin/users`).

