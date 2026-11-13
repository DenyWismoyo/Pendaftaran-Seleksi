export interface DocumentTemplate {
  slug: string;
  title: string;
  category: 'Pejabat Teknis' | 'Pelatihan Vokasi' | 'Magang & PKL' | 'Umum';
  targetFieldHint: string;
  description: string;
  fileBaseName: string;
  markdown: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    slug: 'surat-lamaran-pejabat-teknis',
    title: 'Surat Lamaran Pejabat Teknis BLUD Solo Technopark',
    category: 'Pejabat Teknis',
    targetFieldHint: 'Kolom: Upload Surat Lamaran & Pakta Integritas (PDF)',
    description:
      'Format resmi surat permohonan mengikuti seleksi terbuka calon Pejabat Teknis BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark).',
    fileBaseName: 'Template-Surat-Lamaran-Pejabat-Teknis-Solo-Technopark',
    markdown: `# SURAT LAMARAN SELEKSI TERBUKA PEJABAT TEKNIS
# BLUD UPTD KAWASAN SAINS DAN TEKNOLOGI (SOLO TECHNOPARK)

Surakarta, [Tanggal] [Bulan] [Tahun]

**Hal:** Lamaran Seleksi Calon Pejabat Teknis BLUD Solo Technopark
**Lampiran:** 1 (satu) berkas

Kepada Yth.
**Ketua Panitia Seleksi Pejabat Teknis**
**BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark)**
Jl. Ki Hajar Dewantara No. 19, Jebres
Kota Surakarta, Jawa Tengah 57126

Dengan hormat,

Sehubungan dengan pengumuman seleksi terbuka pengisian jabatan Pejabat Teknis pada BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark), saya yang bertanda tangan di bawah ini:

| Keterangan | Data Pelamar |
|---|---|
| Nama Lengkap | [Nama Lengkap Beserta Gelar] |
| Nomor Induk Kependudukan (NIK) | [16 Digit NIK sesuai e-KTP] |
| Tempat, Tanggal Lahir | [Kota Lahir, DD Bulan YYYY] |
| Pendidikan Terakhir | [Jenjang - Program Studi - Perguruan Tinggi] |
| Status Kepegawaian / Profesi | [Profesional Non-ASN / ASN / Akademisi] |
| Jabatan / Pengalaman Terakhir | [Jabatan Terakhir - Nama Instansi/Perusahaan] |
| Alamat Domisili | [Alamat Lengkap sesuai Domisili] |
| Nomor WhatsApp / Telepon | [08xxxxxxxxxx] |
| Alamat Email Aktif | [email@domain.com] |

Dengan ini mengajukan permohonan untuk mengikuti seluruh tahapan seleksi **Calon Pejabat Teknis BLUD Solo Technopark** pada peminatan bidang:

> **[Pilih salah satu: Bidang Inkubasi Bisnis, Riset & Inovasi Teknologi / Bidang Pelatihan Vokasi, Sertifikasi & Pengembangan SDM / Bidang Operasional Kawasan, Sarana Prasarana & Kemitraan Industri]**

Sebagai bahan pertimbangan, bersama surat ini saya lampirkan dokumen persyaratan administrasi sebagai berikut:

1. Scan Kartu Tanda Penduduk (e-KTP) yang masih berlaku;
2. Scan Ijazah dan Transkrip Nilai pendidikan terakhir;
3. Daftar Riwayat Hidup (CV) terbaru beserta rekam jejak pengalaman kerja/manajerial;
4. Surat Keterangan Pengalaman Kerja / SK Jabatan relevan;
5. Makalah / Proposal Gagasan Pengembangan Teknis Solo Technopark (Program 100 Hari Kerja);
6. Pakta Integritas & Surat Pernyataan Kesiapan Pelamar bermaterai;
7. Dokumen/sertifikat pendukung kompetensi lainnya.

Demikian surat lamaran ini saya sampaikan dengan sebenar-benarnya. Besar harapan saya untuk dapat diberikan kesempatan mengikuti tahapan seleksi selanjutnya. Atas perhatian Bapak/Ibu Ketua Panitia, saya ucapkan terima kasih.

Hormat saya,

*(Materai Rp 10.000 & tanda tangan)*

**[Nama Lengkap Pelamar]**
`,
  },
  {
    slug: 'pakta-integritas-pejabat-teknis',
    title: 'Pakta Integritas & Surat Pernyataan Kesiapan Pelamar',
    category: 'Pejabat Teknis',
    targetFieldHint: 'Digabungkan ke file Surat Lamaran & Pakta Integritas (PDF)',
    description:
      'Surat pernyataan bermaterai terkait keaslian dokumen, integritas, netralitas politik, serta kesediaan bekerja penuh waktu di Solo Technopark.',
    fileBaseName: 'Template-Pakta-Integritas-Pejabat-Teknis-Solo-Technopark',
    markdown: `# PAKTA INTEGRITAS & SURAT PERNYATAAN PELAMAR
# SELEKSI PEJABAT TEKNIS BLUD SOLO TECHNOPARK

Saya yang bertanda tangan di bawah ini:

| Identitas | Keterangan |
|---|---|
| Nama Lengkap | [Nama Lengkap] |
| Nomor Induk Kependudukan (NIK) | [16 Digit NIK] |
| Tempat, Tanggal Lahir | [Tempat, Tanggal Lahir] |
| Alamat Domisili | [Alamat Lengkap] |
| Nomor HP / Email | [08xxxxxxxxxx / email@domain.com] |

Dalam rangka mengikuti proses **Seleksi Terbuka Calon Pejabat Teknis BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark)**, dengan ini menyatakan secara sadar, tanpa paksaan, dan penuh tanggung jawab bahwa saya:

1. **Keaslian Data & Dokumen:** Seluruh data pribadi, riwayat pekerjaan, sertifikasi, dan dokumen lampiran yang saya unggah adalah benar, sah, dan sesuai dengan dokumen aslinya. Apabila di kemudian hari ditemukan pemalsuan data atau dokumen, saya bersedia dinyatakan gugur dan menerima sanksi sesuai ketentuan hukum yang berlaku.
2. **Kesediaan Bekerja Penuh Waktu:** Apabila dinyatakan lulus dan diangkat menjadi Pejabat Teknis, saya bersedia bekerja penuh waktu (*full-time*) serta berdomisili/berkantor di kawasan Solo Technopark Kota Surakarta sesuai ketentuan tata kelola BLUD.
3. **Bebas Masalah Hukum & Disiplin:** Saya tidak sedang menjalani hukuman disiplin tingkat berat, tidak pernah diberhentikan tidak dengan hormat dari instansi manapun, dan tidak berstatus sebagai tersangka atau terpidana tindak pidana.
4. **Netralitas & Konflik Kepentingan:** Saya bukan pengurus aktif partai politik manapun serta berkomitmen menjaga tata kelola BLUD yang bersih, transparan, akuntabel, bebas dari praktik Korupsi, Kolusi, dan Nepotisme (KKN).
5. **Kepatuhan Keputusan Panitia:** Saya bersedia mengikuti seluruh rangkaian tahapan seleksi dan menerima seluruh keputusan Panitia Seleksi yang bersifat final dan tidak dapat diganggu gugat.

Demikian Pakta Integritas dan Surat Pernyataan ini saya buat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.

Surakarta, [Tanggal] [Bulan] [Tahun]

Yang Menyatakan,

*(Materai Rp 10.000 & tanda tangan)*

**[Nama Lengkap Pelamar]**
`,
  },
  {
    slug: 'daftar-riwayat-hidup-cv',
    title: 'Format Daftar Riwayat Hidup (CV) Terstruktur',
    category: 'Umum',
    targetFieldHint: 'Kolom: Upload Daftar Riwayat Hidup (CV) Lengkap (PDF)',
    description:
      'Template CV berbasis tabel standar seleksi panitia untuk menonjolkan pendidikan, jabatan manajerial, proyek teknis, dan referensi profesional.',
    fileBaseName: 'Template-Daftar-Riwayat-Hidup-CV-Solo-Technopark',
    markdown: `# DAFTAR RIWAYAT HIDUP (CURRICULUM VITAE)

## A. IDENTITAS DIRI

| Bidang | Keterangan |
|---|---|
| Nama Lengkap | [Nama Lengkap Beserta Gelar] |
| Tempat, Tanggal Lahir | [Kota, DD Bulan YYYY] |
| Jenis Kelamin | [Laki-laki / Perempuan] |
| Nomor Induk Kependudukan | [16 Digit NIK] |
| Alamat Domisili | [Alamat Lengkap] |
| Nomor WhatsApp / HP | [08xxxxxxxxxx] |
| Email | [email@domain.com] |
| Tautan LinkedIn / Portofolio | [https://... (jika ada)] |

## B. RINGKASAN PROFIL PROFESIONAL

> Tuliskan 3–5 kalimat ringkas mengenai latar belakang keahlian utama Anda, lama pengalaman manajerial/teknis, cakupan tim/proyek yang pernah dipimpin, serta kontribusi relevan bagi Solo Technopark.

## C. RIWAYAT PENDIDIKAN FORMAL

| Jenjang | Nama Perguruan Tinggi | Program Studi / Jurusan | Tahun Masuk - Lulus | IPK |
|---|---|---|---|---|
| [S2 / S1] | [Nama Universitas] | [Nama Jurusan] | [YYYY - YYYY] | [x.xx] |
| [S1 / D4] | [Nama Universitas] | [Nama Jurusan] | [YYYY - YYYY] | [x.xx] |

## D. RIWAYAT PEKERJAAN & PENGALAMAN MANAJERIAL

| Periode | Jabatan / Posisi | Nama Instansi / Perusahaan | Ringkasan Tanggung Jawab & Pencapaian Terukur |
|---|---|---|---|
| [YYYY - Sekarang] | [Jabatan Terakhir] | [Nama Perusahaan/Instansi] | [Memimpin X staf, mengelola proyek/anggaran Y, capaian Z] |
| [YYYY - YYYY] | [Jabatan Sebelumnya] | [Nama Perusahaan/Instansi] | [Tanggung jawab utama dan hasil terukur] |

## E. PROYEK STRATEGIS & KEMITRAAN YANG PERNAH DIPIMPIN

1. **[Nama Proyek / Inisiatif] ([Tahun]):** Jelaskan peran Anda, skala proyek, mitra yang terlibat (industri/kampus/pemerintah), dan dampak konkretnya.
2. **[Nama Proyek / Inisiatif] ([Tahun]):** Jelaskan target yang dicapai (efisiensi, pendapatan, jumlah tenant/lulusan, atau inovasi teknologi).

## F. SERTIFIKASI KOMPETENSI & PELATIHAN RELEVAN

| Nama Sertifikasi / Pelatihan | Lembaga Penerbit | Tahun | Masa Berlaku |
|---|---|---|---|
| [Contoh: Project Management / Asesor BNSP] | [Nama Lembaga] | [YYYY] | [Aktif / Tahun] |

## G. REFERENSI PROFESIONAL

| Nama Pejabat / Atasan | Jabatan & Instansi | Hubungan Kerja | Nomor Telepon / Email |
|---|---|---|---|
| [Nama Lengkap] | [Jabatan - Perusahaan] | [Atasan Langsung / Mitra] | [08xxxx / email] |

---

Demikian Daftar Riwayat Hidup ini saya buat dengan data yang sebenarnya dan dapat dipertanggungjawabkan.

Surakarta, [Tanggal] [Bulan] [Tahun]

Hormat saya,

**[Nama Lengkap Pelamar]**
`,
  },
  {
    slug: 'surat-keterangan-pengalaman-kerja',
    title: 'Format Surat Keterangan Pengalaman Kerja / Referensi Jabatan',
    category: 'Pejabat Teknis',
    targetFieldHint: 'Kolom: Upload Surat Keterangan Pengalaman Kerja / SK Jabatan',
    description:
      'Contoh surat keterangan resmi dari pimpinan instansi/perusahaan sebelumnya bagi pelamar non-ASN yang belum memiliki SK Jabatan negeri.',
    fileBaseName: 'Template-Surat-Keterangan-Pengalaman-Kerja',
    markdown: `# [KOP SURAT INSTANSI / PERUSAHAAN PEMBERI KERJA]

---

# SURAT KETERANGAN PENGALAMAN KERJA
**Nomor:** [Nomor Surat Instansi/Perusahaan]

Yang bertanda tangan di bawah ini:

| Data Penanda Tangan | Keterangan |
|---|---|
| Nama Lengkap | [Nama Pimpinan / HRD / Direktur] |
| Jabatan | [Jabatan Pimpinan] |
| Nama Instansi / Perusahaan | [Nama Perusahaan / Lembaga] |
| Alamat Kantor | [Alamat Lengkap Kantor] |

Dengan ini menerangkan dengan sebenarnya bahwa:

| Data Karyawan / Pelamar | Keterangan |
|---|---|
| Nama Lengkap | [Nama Pelamar] |
| NIK | [16 Digit NIK] |
| Jabatan / Posisi Terakhir | [Jabatan Manajerial / Teknis] |
| Unit Kerja / Divisi | [Divisi / Departemen] |
| Masa Kerja | [Tanggal Mulai] s.d. [Tanggal Selesai / Sekarang] |

Selama bertugas pada instansi/perusahaan kami, yang bersangkutan telah melaksanakan tugas kepemimpinan dan pengelolaan teknis di bidang **[Sebutkan bidang: operasional / riset & inovasi / pelatihan / kemitraan]** dengan dedikasi, integritas, serta kinerja yang baik, termasuk memimpin tim dan mengelola program kerja terkait.

Surat keterangan ini diterbitkan untuk memenuhi persyaratan administrasi pendaftaran **Seleksi Pejabat Teknis BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark)** dan agar dapat dipergunakan sebagaimana mestinya.

[Kota], [Tanggal] [Bulan] [Tahun]

**[Jabatan Pimpinan / Pejabat Berwenang]**

*(Tanda tangan & stempel instansi/perusahaan)*

**[Nama Terang Pimpinan]**
`,
  },
  {
    slug: 'kerangka-makalah-gagasan-teknis',
    title: 'Template Makalah Gagasan Pengembangan Teknis & Program 100 Hari Kerja',
    category: 'Pejabat Teknis',
    targetFieldHint: 'Kolom: Upload Makalah / Proposal Gagasan Pengembangan Teknis (PDF)',
    description:
      'Kerangka penulisan makalah 3–10 halaman berisi analisis kondisi Solo Technopark, strategi inovasi layanan BLUD, dan rencana aksi 100 hari kerja.',
    fileBaseName: 'Template-Makalah-Gagasan-Teknis-Solo-Technopark',
    markdown: `# [JUDUL GAGASAN STRATEGIS PENGEMBANGAN SOLO TECHNOPARK]
**Diajukan untuk Memenuhi Persyaratan Seleksi Terbuka Calon Pejabat Teknis**
**BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark)**

Disusun oleh: **[Nama Lengkap Pelamar]**
Bidang Peminatan: **[Nama Bidang Teknis yang Dilamar]**
Tanggal: **[Tanggal] [Bulan] [Tahun]**

---

## BAB I — PENDAHULUAN & ANALISIS KONDISI SAAT INI

### 1.1 Latar Belakang & Konteks Peran Pejabat Teknis BLUD
Uraikan pemahaman Anda terhadap mandat BLUD Solo Technopark sebagai kawasan sains, teknologi, vokasi, inkubasi startup, dan kemitraan industri, serta peran krusial Pejabat Teknis dalam menjembatani tata kelola pemerintahan dan kelincahan layanan bisnis/industri.

### 1.2 Analisis Tantangan & Peluang (SWOT Singkat)

| Aspek | Temuan / Analisis Kunci | Implikasi Strategis |
|---|---|---|
| Kekuatan (*Strengths*) | [Contoh: Fasilitas kawasan, reputasi vokasi, ekosistem mitra] | [Cara memaksimalkan aset] |
| Kelemahan (*Weaknesses*) | [Contoh: Utilisasi fasilitas / komersialisasi riset] | [Perbaikan tata kelola/SOP] |
| Peluang (*Opportunities*) | [Contoh: Kebutuhan talenta industri, hilirisasi UMKM/startup] | [Model layanan/pendapatan BLUD baru] |
| Tantangan (*Threats*) | [Contoh: Kecepatan perubahan teknologi & kompetisi layanan] | [Strategi adaptasi] |

---

## BAB II — STRATEGI PENGEMBANGAN TEKNIS & KEMANDIRIAN BLUD

### 2.1 Terobosan Layanan Teknis pada Bidang yang Dilamar
Jelaskan 2–3 program unggulan di bidang peminatan Anda (Inkubasi & Riset / Vokasi & Sertifikasi / Operasional & Kemitraan Industri) beserta target segmen industri atau masyarakatnya.

### 2.2 Model Kemitraan Pentahelix & Optimalisasi Pendapatan BLUD
Uraikan mekanisme kerja sama konkret dengan industri, perguruan tinggi, komunitas startup, dan pemerintah untuk meningkatkan nilai tambah serta kemandirian finansial BLUD secara akuntabel.

---

## BAB III — RENCANA AKSI 100 HARI KERJA & INDIKATOR KINERJA (KPI)

| Fase | Fokus Utama | Deliverables / Output Konkret | Target KPI Terukur |
|---|---|---|---|
| **Hari 1 – 30** (Konsolidasi) | Audit SOP, pemetaan aset teknis, penyelarasan tim & mitra aktif | Peta masalah operasional & daftar prioritas layanan | 100% pemetaan SOP & SLA layanan selesai |
| **Hari 31 – 60** (Eksekusi Awal) | Perbaikan standar layanan, aktivasi pilot kemitraan / program | Min. 2 MoU/proyek bersama mitra atau peluncuran perbaikan sistem | Peningkatan efisiensi waktu layanan / utilisasi |
| **Hari 61 – 100** (Skalasi & Evaluasi) | Implementasi penuh model layanan baru & evaluasi capaian kuartalan | Laporan kinerja awal, pipeline mitra baru, proyeksi pendapatan | [Target kuantitatif peserta/tenant/mitra/revenue] |

---

## BAB IV — PENUTUP

Ringkaskan komitmen pribadi, prinsip kepemimpinan kolaboratif, serta kesiapan Anda berkolaborasi dengan Pemimpin BLUD dan Pejabat Keuangan demi menjadikan Solo Technopark pusat inovasi dan vokasi berdaya saing tinggi.

---

> **Catatan Format Pengumpulan:** Disarankan panjang makalah **3 hingga 10 halaman**, menggunakan huruf **Times New Roman / Arial 11–12 pt**, spasi **1.5**, lalu disimpan dalam format **PDF (maksimal 10 MB)**.
`,
  },
  {
    slug: 'surat-pernyataan-pelatihan-vokasi',
    title: 'Surat Pernyataan Kesediaan Peserta Pelatihan Vokasi',
    category: 'Pelatihan Vokasi',
    targetFieldHint: 'Pendukung seleksi program Pelatihan Vokasi & Sertifikasi',
    description:
      'Template surat pernyataan kesanggupan mengikuti pelatihan penuh hingga uji kompetensi sertifikasi dan mematuhi tata tertib.',
    fileBaseName: 'Template-Surat-Pernyataan-Peserta-Pelatihan-Vokasi',
    markdown: `# SURAT PERNYATAAN KESEDIAAN PESERTA
# PROGRAM PELATIHAN VOKASI & SERTIFIKASI SOLO TECHNOPARK

Saya yang bertanda tangan di bawah ini:

| Identitas Peserta | Keterangan |
|---|---|
| Nama Lengkap | [Nama Lengkap sesuai KTP] |
| NIK | [16 Digit NIK] |
| Tempat, Tanggal Lahir | [Tempat, Tanggal Lahir] |
| Program Pelatihan Pilihan | [Nama Kejuruan / Program Pelatihan] |
| Alamat Domisili | [Alamat Lengkap] |
| Nomor WhatsApp Aktif | [08xxxxxxxxxx] |

Dengan ini menyatakan bersungguh-sungguh bahwa apabila saya dinyatakan diterima sebagai peserta pelatihan di Solo Technopark, saya bersedia:

1. Mengikuti seluruh rangkaian kegiatan pembelajaran teori, praktik bengkel/laboratorium, hingga uji sertifikasi kompetensi secara penuh hingga selesai;
2. Mematuhi seluruh peraturan tata tertib, standar Keselamatan dan Kesehatan Kerja (K3), serta menjaga kebersihan dan peralatan praktik di kawasan Solo Technopark;
3. Tidak mengundurkan diri di tengah program tanpa alasan darurat yang sah dan disetujui penyelenggara;
4. Melaporkan perkembangan penempatan kerja atau wirausaha setelah lulus pelatihan untuk keperluan pendataan alumni.

Demikian surat pernyataan ini saya buat dengan penuh kesadaran dan tanggung jawab.

Surakarta, [Tanggal] [Bulan] [Tahun]

Yang Menyatakan,

*(Tanda tangan)*

**[Nama Lengkap Peserta]**
`,
  },
  {
    slug: 'surat-permohonan-magang-pkl',
    title: 'Format Surat Permohonan / Pengantar Magang & PKL',
    category: 'Magang & PKL',
    targetFieldHint: 'Kolom: Upload Surat Pengantar Resmi Instansi (Magang & PKL)',
    description:
      'Contoh format surat permohonan resmi dari Sekolah (SMK) atau Program Studi Kampus bagi calon peserta Praktik Kerja Lapangan / Magang.',
    fileBaseName: 'Template-Surat-Permohonan-Magang-PKL-Solo-Technopark',
    markdown: `# [KOP SURAT SEKOLAH / FAKULTAS / PROGRAM STUDI]

---

**Nomor:** [Nomor Surat Resmi]
**Hal:** Permohonan Penempatan Praktik Kerja Lapangan (PKL) / Magang Industri

Kepada Yth.
**Pemimpin BLUD UPTD Kawasan Sains dan Teknologi (Solo Technopark)**
Jl. Ki Hajar Dewantara No. 19, Jebres
Kota Surakarta

Dengan hormat,

Dalam rangka meningkatkan kompetensi praktis siswa/mahasiswa sesuai kebutuhan dunia usaha dan dunia industri, bersama ini kami mengajukan permohonan agar peserta didik kami dapat melaksanakan kegiatan **Magang Industri / Praktik Kerja Lapangan (PKL)** di Solo Technopark pada:

| Rincian Permohonan | Keterangan |
|---|---|
| Nama Instansi Pendidikan | [Nama SMK / Universitas / Fakultas] |
| Program Studi / Kompetensi Keahlian | [Nama Jurusan] |
| Periode & Durasi Magang | [Tanggal Mulai] s.d. [Tanggal Selesai] ([X Bulan]) |
| Divisi / Bidang Peminatan | [IT / Desain & Manufaktur / Multimedia / Administrasi] |

Adapun data peserta didik yang kami ajukan adalah sebagai berikut:

| No | Nama Lengkap | NIS / NIM | Nomor HP / Email |
|---|---|---|---|
| 1 | [Nama Siswa / Mahasiswa] | [Nomor Induk] | [08xxxx / email] |

Besar harapan kami permohonan ini dapat disetujui. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.

[Kota], [Tanggal] [Bulan] [Tahun]

**[Kepala Sekolah / Dekan / Ketua Program Studi]**

*(Tanda tangan & stempel institusi)*

**[Nama Lengkap & NIP/NIDN]**
`,
  },
];

export function getDocumentTemplateBySlug(slug: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((tpl) => tpl.slug === slug);
}

