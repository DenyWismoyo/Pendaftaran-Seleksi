import { SUBMISSION_STATUS_META } from '@/lib/constants';
import { formatBytes, formatDateID } from '@/lib/utils';
import { SelectionForm, SelectionSubmission } from '@/types/selection';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadSubmissionsCsv(
  rowsData: SelectionSubmission[],
  formDef?: SelectionForm
): void {
  const answerFields =
    formDef?.fields.filter((f) => f.type !== 'file') || [];

  const headers = [
    'Kode Pendaftaran',
    'Program Seleksi',
    'Nama Pelamar',
    'Email',
    'No HP/WA',
    'NIK',
    'Status',
    'Skor Rata-Rata Tim',
    'Skor Awal Gemini',
    'Jumlah Berkas',
    'Tanggal Daftar',
    'Catatan Panitia',
    ...answerFields.map((f) => f.label),
  ];

  const rows = rowsData.map((s) => {
    const dynamicCols = answerFields.map((f) => {
      const val = s.answers[f.id];
      return Array.isArray(val) ? val.join('; ') : String(val ?? '');
    });

    return [
      s.registrationCode,
      s.formTitle,
      s.applicantName,
      s.applicantEmail,
      s.applicantPhone,
      s.applicantNik || '',
      SUBMISSION_STATUS_META[s.status]?.label || s.status,
      s.averagePanelScore ?? '',
      s.aiEvaluation?.score ?? '',
      s.files.length,
      s.createdAt,
      s.reviewerNote || '',
      ...dynamicCols,
    ];
  });

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

export function printApplicantDossier(
  submission: SelectionSubmission,
  formDef?: SelectionForm
): void {
  const win = window.open('', '_blank', 'width=900,height=960');
  if (!win) return;

  const statusLabel =
    SUBMISSION_STATUS_META[submission.status]?.label || submission.status;

  const answersHtml = Object.entries(submission.answers)
    .map(([key, val]) => {
      const label = formDef?.fields.find((f) => f.id === key)?.label || key;
      const value = Array.isArray(val) ? val.join(', ') : String(val || '-');
      return `<tr>
        <td style="width:36%;font-weight:600;color:#3f3f46;vertical-align:top">${escapeHtml(label)}</td>
        <td>${escapeHtml(value).replace(/\n/g, '<br/>')}</td>
      </tr>`;
    })
    .join('');

  const filesHtml = submission.files
    .map(
      (f) => `<li><strong>${escapeHtml(f.fieldLabel)}</strong>: ${escapeHtml(f.fileName)} (${escapeHtml(formatBytes(f.size))}) — <a href="${escapeHtml(f.url)}" target="_blank">Buka Berkas</a></li>`
    )
    .join('');

  const panelScoresHtml =
    submission.panelScores && submission.panelScores.length > 0
      ? `<h3>Penilaian Tim Seleksi (Rata-rata: ${submission.averagePanelScore ?? '-'} / 100)</h3>
         <table>
           <thead><tr><th>Penilai</th><th>Adm</th><th>Rekam Jejak</th><th>Gagasan</th><th>Wawancara</th><th>Total</th><th>Catatan</th></tr></thead>
           <tbody>
             ${submission.panelScores
               .map(
                 (ps) => `<tr>
                   <td>${escapeHtml(ps.evaluatorName || ps.evaluatorEmail)}</td>
                   <td>${ps.adminScore}</td>
                   <td>${ps.trackRecordScore}</td>
                   <td>${ps.conceptScore}</td>
                   <td>${ps.interviewScore}</td>
                   <td><strong>${ps.totalScore}</strong></td>
                   <td>${escapeHtml(ps.note || '-')}</td>
                 </tr>`
               )
               .join('')}
           </tbody>
         </table>`
      : '';

  win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Dossier ${escapeHtml(submission.registrationCode)} — ${escapeHtml(submission.applicantName)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #18181b; margin: 28px; font-size: 12px; line-height: 1.5; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #52525b; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
    h3 { font-size: 13px; margin: 16px 0 6px; }
    .meta { background: #f4f4f5; padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    td, th { border: 1px solid #e4e4e7; padding: 6px 8px; text-align: left; }
    th { background: #fafafa; font-size: 11px; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="meta">
    <div style="font-family:monospace;color:#047857;font-weight:700">${escapeHtml(submission.registrationCode)}</div>
    <h1>${escapeHtml(submission.applicantName)}</h1>
    <div>Program: <strong>${escapeHtml(submission.formTitle)}</strong></div>
    <div>Email: ${escapeHtml(submission.applicantEmail)} | WA: ${escapeHtml(submission.applicantPhone)} | Status: <strong>${escapeHtml(statusLabel)}</strong></div>
    <div>Tanggal Daftar: ${escapeHtml(formatDateID(submission.createdAt))}</div>
  </div>
  ${
    submission.aiEvaluation
      ? `<h2>Ringkasan Evaluasi Awal (${submission.aiEvaluation.score}/100 — ${escapeHtml(submission.aiEvaluation.recommendation)})</h2>
         <p>${escapeHtml(submission.aiEvaluation.summary)}</p>`
      : ''
  }
  ${panelScoresHtml}
  <h2>Jawaban Formulir</h2>
  <table><tbody>${answersHtml}</tbody></table>
  <h2>Daftar Berkas Unggahan (${submission.files.length})</h2>
  <ul>${filesHtml || '<li>Tidak ada berkas</li>'}</ul>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}
