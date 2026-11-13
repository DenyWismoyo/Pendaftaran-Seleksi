import { BRAND, SUBMISSION_STATUS_META } from '@/lib/constants';
import { buildWordDocPayload } from '@/lib/documentConverter';
import { formatBytes, formatDateID } from '@/lib/utils';
import {
  SelectionField,
  SelectionForm,
  SelectionSubmission,
} from '@/types/selection';

/**
 * Membersihkan nama folder/file agar aman pada Google Drive dan OS desktop (Windows/macOS).
 */
export function sanitizeDriveName(raw: string, maxLen = 80): string {
  const cleaned = raw
    .replace(/[\\/:*?"<>|#%{}~`^[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Tanpa Nama';
  return cleaned.slice(0, maxLen).trim();
}

/**
 * Format nama folder peserta di Google Drive: `{Nama Peserta} - {Kode Registrasi}`
 * supaya terurut alfabet berdasarkan nama namun tetap unik & anti-bentrok.
 */
export function buildCandidateFolderName(
  submission: Pick<SelectionSubmission, 'applicantName' | 'registrationCode'>
): string {
  const namePart = sanitizeDriveName(submission.applicantName || 'Kandidat', 64);
  const codePart = sanitizeDriveName(submission.registrationCode || 'REG', 32);
  return `${namePart} - ${codePart}`;
}

function escapeMdCell(raw: unknown): string {
  const text = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '-');
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br />').trim() || '-';
}

function formatFieldValue(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '-';
  if (typeof raw === 'boolean') return raw ? 'Ya' : 'Tidak';
  if (Array.isArray(raw)) return raw.length > 0 ? raw.join(', ') : '-';
  return String(raw).trim() || '-';
}

/**
 * Menyusun dossier lengkap seorang kandidat dalam format Markdown yang terstruktur
 * (identitas, seluruh jawaban formulir per bagian, hasil AI, penilaian tim, & daftar berkas).
 */
export function buildCandidateDossierMarkdown(
  submission: SelectionSubmission,
  formDef?: SelectionForm
): string {
  const statusLabel =
    SUBMISSION_STATUS_META[submission.status]?.label || submission.status;
  const exportedAt = formatDateID(new Date().toISOString());

  const lines: string[] = [
    `# PROFIL & BERKAS KANDIDAT — ${submission.applicantName.toUpperCase()}`,
    '',
    `> Diekspor otomatis melalui **${BRAND.name}** (${BRAND.tagline}) pada ${exportedAt}`,
    '',
    '---',
    '',
    '## 1. Ringkasan Identitas & Status Seleksi',
    '',
    '| Atribut | Keterangan |',
    '| :--- | :--- |',
    `| Nama Lengkap | **${escapeMdCell(submission.applicantName)}** |`,
    `| Kode Registrasi | \`${escapeMdCell(submission.registrationCode)}\` |`,
    `| Program / Lowongan | ${escapeMdCell(submission.formTitle)} |`,
    `| Email | ${escapeMdCell(submission.applicantEmail)} |`,
    `| No. HP / WhatsApp | ${escapeMdCell(submission.applicantPhone)} |`,
    `| NIK | ${escapeMdCell(submission.applicantNik || '-')} |`,
    `| Status Seleksi | **${escapeMdCell(statusLabel)}** |`,
    `| Tanggal Pendaftaran | ${escapeMdCell(formatDateID(submission.createdAt))} |`,
    `| Pembaruan Terakhir | ${escapeMdCell(formatDateID(submission.updatedAt))} |`,
  ];

  if (submission.interviewSchedule) {
    lines.push(
      `| Jadwal Wawancara / Tahap Lanjut | ${escapeMdCell(submission.interviewSchedule)} |`
    );
  }
  if (submission.reviewerNote) {
    lines.push(
      `| Catatan Tim Penilai | ${escapeMdCell(submission.reviewerNote)} |`
    );
  }
  if (typeof submission.averagePanelScore === 'number') {
    lines.push(
      `| Skor Rata-Rata Tim Penilai | **${submission.averagePanelScore} / 100** |`
    );
  }

  lines.push('', '---', '', '## 2. Isian Formulir Pendaftaran Lengkap', '');

  const answers = submission.answers || {};
  const consumedIds = new Set<string>();
  const fieldsBySection = new Map<string, SelectionField[]>();

  if (formDef && Array.isArray(formDef.fields)) {
    for (const field of formDef.fields) {
      if (field.type === 'file') {
        consumedIds.add(field.id);
        continue;
      }
      const sec = field.section?.trim() || 'Data & Jawaban Formulir';
      const list = fieldsBySection.get(sec) || [];
      list.push(field);
      fieldsBySection.set(sec, list);
      consumedIds.add(field.id);
    }
  }

  if (fieldsBySection.size > 0) {
    fieldsBySection.forEach((fields, sectionName) => {
      lines.push(`### ${sectionName}`, '');
      for (const field of fields) {
        const val = formatFieldValue(answers[field.id]);
        if (field.type === 'textarea' || val.includes('\n') || val.length > 120) {
          lines.push(`**${field.label}**`, '', val, '');
        } else {
          lines.push(`- **${field.label}:** ${val}`);
        }
      }
      lines.push('');
    });
  }

  const extraEntries = Object.entries(answers).filter(
    ([key]) => !consumedIds.has(key)
  );
  if (extraEntries.length > 0) {
    lines.push('### Isian Tambahan', '');
    for (const [key, val] of extraEntries) {
      lines.push(`- **${key}:** ${formatFieldValue(val)}`);
    }
    lines.push('');
  }

  if (fieldsBySection.size === 0 && extraEntries.length === 0) {
    lines.push('_Tidak ada data jawaban tambahan selain biodata utama._', '');
  }

  if (submission.aiEvaluation) {
    const ai = submission.aiEvaluation;
    lines.push(
      '---',
      '',
      '## 3. Hasil Pra-Penilaian & Analisis Dokumen (AI)',
      '',
      `- **Skor Awal:** ${ai.score} / 100`,
      `- **Rekomendasi:** ${ai.recommendation}`,
      `- **Ringkasan Analisis:** ${ai.summary}`,
      ''
    );

    if (ai.strengths?.length > 0) {
      lines.push('**Poin Kekuatan:**');
      ai.strengths.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }
    if (ai.gaps?.length > 0) {
      lines.push('**Catatan / Verifikasi Lanjutan:**');
      ai.gaps.forEach((g) => lines.push(`- ${g}`));
      lines.push('');
    }
  }

  if (submission.panelScores && submission.panelScores.length > 0) {
    lines.push(
      '---',
      '',
      '## 4. Rekap Penilaian Tim Seleksi / Interviewer',
      '',
      '| Penilai | Administrasi | Rekam Jejak | Konsep/Teknis | Wawancara | Total | Catatan |',
      '| :--- | :---: | :---: | :---: | :---: | :---: | :--- |'
    );
    for (const ps of submission.panelScores) {
      lines.push(
        `| ${escapeMdCell(ps.evaluatorName || ps.evaluatorEmail)} | ${ps.adminScore} | ${ps.trackRecordScore} | ${ps.conceptScore} | ${ps.interviewScore} | **${ps.totalScore}** | ${escapeMdCell(ps.note || '-')} |`
      );
    }
    lines.push('');
  }

  lines.push('---', '', '## 5. Kelengkapan Berkas Terunggah', '');
  if (!submission.files || submission.files.length === 0) {
    lines.push('_Peserta belum mengunggah berkas lampiran._', '');
  } else {
    lines.push(
      '| No | Kolom Persyaratan | Nama File | Ukuran | Keterangan |',
      '| :---: | :--- | :--- | :--- | :--- |'
    );
    submission.files.forEach((f, idx) => {
      lines.push(
        `| ${idx + 1} | ${escapeMdCell(f.fieldLabel)} | \`${escapeMdCell(f.fileName)}\` | ${formatBytes(f.size)} | Tersimpan di folder peserta |`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Menyusun dokumen rekapitulasi seluruh kandidat dalam satu batch ekspor.
 */
export function buildBatchSummaryMarkdown(
  submissions: SelectionSubmission[],
  batchLabel: string
): string {
  const nowStr = formatDateID(new Date().toISOString());
  const lines: string[] = [
    `# REKAPITULASI BATCH KANDIDAT — ${batchLabel.toUpperCase()}`,
    '',
    `> Diekspor melalui **${BRAND.name}** pada ${nowStr} • Total Kandidat: **${submissions.length}**`,
    '',
    '| No | Nama Kandidat | Kode | Program Seleksi | Email & No. HP | Status | Skor Tim | Skor AI | Berkas |',
    '| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |',
  ];

  submissions.forEach((s, idx) => {
    const statusLabel = SUBMISSION_STATUS_META[s.status]?.label || s.status;
    lines.push(
      `| ${idx + 1} | **${escapeMdCell(s.applicantName)}** | \`${escapeMdCell(s.registrationCode)}\` | ${escapeMdCell(s.formTitle)} | ${escapeMdCell(s.applicantEmail)} / ${escapeMdCell(s.applicantPhone)} | ${escapeMdCell(statusLabel)} | ${s.averagePanelScore ?? '-'} | ${s.aiEvaluation?.score ?? '-'} | ${s.files?.length || 0} file |`
    );
  });

  lines.push('', '---', '', 'Setiap folder peserta di direktori ini memuat dokumen profil lengkap (`.md` / `.doc`) beserta seluruh berkas lampiran resmi yang diunggah peserta.');
  return lines.join('\n');
}

export function buildCandidateWordDocBuffer(
  title: string,
  markdown: string
): Buffer {
  return Buffer.from('\ufeff' + buildWordDocPayload(title, markdown), 'utf-8');
}
