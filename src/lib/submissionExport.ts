import { SelectionSubmission } from '@/types/selection';

export function downloadSubmissionsCsv(rowsData: SelectionSubmission[]): void {
  const headers = [
    'Kode Pendaftaran',
    'Program Seleksi',
    'Nama Pelamar',
    'Email',
    'No HP/WA',
    'Status',
    'Skor Awal',
    'Jumlah Berkas',
    'Tanggal Daftar',
    'Catatan Panitia',
  ];
  const rows = rowsData.map((s) => [
    s.registrationCode,
    s.formTitle,
    s.applicantName,
    s.applicantEmail,
    s.applicantPhone,
    s.status,
    s.aiEvaluation?.score ?? '',
    s.files.length,
    s.createdAt,
    s.reviewerNote || '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rekap-seleksi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

