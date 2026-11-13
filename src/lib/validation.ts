import { PanelScore, SelectionField, SelectionForm, UploadedFileMeta } from '@/types/selection';

export interface DynamicValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateDynamicSubmission(
  fields: SelectionField[],
  answers: Record<string, unknown>,
  files: UploadedFileMeta[]
): DynamicValidationResult {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.required) continue;

    if (field.type === 'file') {
      const uploaded = files.find((f) => f.fieldId === field.id);
      if (!uploaded || !uploaded.url) {
        errors[field.id] = `Berkas "${field.label}" wajib diunggah.`;
      }
      continue;
    }

    const val = answers[field.id];
    if (field.type === 'checkbox') {
      if (!Array.isArray(val) || val.length === 0) {
        errors[field.id] = `Pilih minimal satu opsi untuk "${field.label}".`;
      }
      continue;
    }

    if (
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim() === '')
    ) {
      errors[field.id] = `Kolom "${field.label}" wajib diisi.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function extractNormalizedNik(
  fields: SelectionField[],
  answers: Record<string, unknown>
): string | null {
  const nikField = fields.find((f) =>
    /nik|nomor induk kependudukan/i.test(`${f.id} ${f.label}`)
  );
  if (!nikField) return null;

  const raw = answers[nikField.id];
  if (raw === undefined || raw === null) return null;

  const digits = String(raw).replace(/\D/g, '');
  return digits.length === 16 ? digits : null;
}

export function getJakartaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function isFormScheduleActive(
  form: Pick<SelectionForm, 'status' | 'startDate' | 'endDate'>,
  referenceDate: Date = new Date()
): { active: boolean; reason?: string } {
  if (form.status !== 'OPEN') {
    return {
      active: false,
      reason: 'Pendaftaran untuk program seleksi ini sedang ditutup.',
    };
  }

  const todayWib = getJakartaDateString(referenceDate);
  const startDate = form.startDate?.trim().slice(0, 10) || '';
  const endDate = form.endDate?.trim().slice(0, 10) || '';

  if (startDate && todayWib < startDate) {
    return {
      active: false,
      reason: `Pendaftaran baru dibuka mulai tanggal ${startDate}.`,
    };
  }

  if (endDate && todayWib > endDate) {
    return {
      active: false,
      reason: `Batas akhir pendaftaran telah berakhir pada ${endDate}.`,
    };
  }

  return { active: true };
}

export function computePanelTotalScore(scores: {
  adminScore: number;
  trackRecordScore: number;
  conceptScore: number;
  interviewScore: number;
}): number {
  const avg =
    (scores.adminScore +
      scores.trackRecordScore +
      scores.conceptScore +
      scores.interviewScore) /
    4;
  return Math.round(avg * 100) / 100;
}

export function computeAveragePanelScore(panelScores: PanelScore[]): number | undefined {
  if (!panelScores || panelScores.length === 0) return undefined;
  const total = panelScores.reduce((sum, item) => sum + item.totalScore, 0);
  return Math.round((total / panelScores.length) * 100) / 100;
}
