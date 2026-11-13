---
name: seleksi-organic-roadmap
description: >-
  Roadmap pengembangan organik bertahap untuk proyek Pendaftaran-Seleksi. Gunakan
  skill ini sebelum merencanakan fitur baru, sprint pengembangan, atau prioritas
  penyempurnaan sistem.
---

# Roadmap Pengembangan Organik — Pendaftaran-Seleksi

Prinsip pengembangan: bangun fitur yang benar-benar memecahkan masalah operasional
panitia dan pelamar secara bertahap, tanpa menambah kompleksitas yang belum dibutuhkan.

## Phase 1 — Fondasi Portal & Pengalaman Inti (✅ Selesai)
- [x] Portal direktori program dengan progress kuota, batas waktu, & widget lacak cepat.
- [x] Multi-step wizard form dinamis dengan auto-save draf (`localStorage`).
- [x] Drag & drop upload berkas ke Firebase Storage (`selection_uploads/`) + pratinjau gambar.
- [x] Kartu Bukti Pendaftaran QR Code siap cetak (`@media print`) & timeline status 4 tahap.
- [x] Form Builder dengan Live Preview, preset cepat, & asisten struktur otomatis.
- [x] Meja panitia dengan filter pipeline, bulk status update, pratinjau PDF/gambar in-app, & export CSV.

## Phase 2 — Penyempurnaan Alur Seleksi & Kualitas Form (Prioritas Berikutnya)
- [ ] **Pencegahan Duplikasi Pendaftar:** Cegah 1 email (atau NIK jika ada) mendaftar dua kali pada `formId` yang sama di `POST /api/submissions`.
- [ ] **Conditional Logic (`showIf`) Antar Field:** Tampilkan field lanjutan hanya jika pelamar memilih jawaban tertentu (misal: unggah surat keterangan kerja hanya jika status = *Sudah Bekerja*).
- [ ] **Export CSV Dinamis Lengkap:** Sertakan kolom jawaban dinamis dari `answers` per formulir terpilih (bukan hanya kolom metadata umum) serta unduh arsip berkas per pelamar.
- [ ] **Notifikasi Status Pelamar:** Kirim ringkasan kode registrasi & pembaruan keputusan panitia via Email / WhatsApp Gateway webhook saat status berubah ke `ACCEPTED` / `REJECTED`.

## Phase 3 — Kolaborasi Multi-Panitia & Analitik
- [ ] **Multi-Reviewer & Rubrik Penilaian:** Izinkan beberapa pewawancara/kurator memberi nilai numerik per kriteria, lalu hitung skor rata-rata otomatis.
- [ ] **Manajemen Jadwal Wawancara / Tes:** Panitia dapat menempelkan jadwal & tautan/ruangan tes langsung pada status `REVIEWING` agar muncul di Kartu & Lacak Status pelamar.
- [ ] **Dashboard Analitik Pendaftaran:** Grafik tren pendaftar harian per program, rasio kelengkapan berkas, dan arsip batch periode sebelumnya.

## Phase 4 — Reliabilitas, Pengujian & Hardening
- [ ] **Automated Tests (Vitest):** Unit test untuk `validateDynamicSubmission`, `getDeadlineBadge`, dan validasi payload Zod.
- [ ] **Rate Limiting Publik:** Proteksi `POST /api/upload` dan `POST /api/submissions` per IP untuk mencegah spam upload/registrasi.
- [ ] **Cleanup Storage Otomatis:** Hapus berkas sementara di Firebase Storage jika pelamar membatalkan/menghapus berkas sebelum submit, atau saat panitia menghapus data uji coba.
