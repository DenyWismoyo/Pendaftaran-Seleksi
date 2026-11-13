import { SelectionField, UploadedFileMeta } from '@/types/selection';

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

