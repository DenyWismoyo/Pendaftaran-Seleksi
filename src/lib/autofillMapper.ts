import { AutofillTargetInfo, SelectionField, SelectionForm } from '@/types/selection';

export const IDENTITY_TARGET_FIELDS: AutofillTargetInfo[] = [
  {
    id: '__identity_name',
    label: 'Nama Lengkap Pelamar',
    type: 'text',
    section: 'Identitas Pelamar',
  },
  {
    id: '__identity_email',
    label: 'Email Aktif',
    type: 'email',
    section: 'Identitas Pelamar',
  },
  {
    id: '__identity_phone',
    label: 'Nomor WhatsApp / HP',
    type: 'tel',
    section: 'Identitas Pelamar',
  },
];

export function getAllAutofillableTargets(fields: SelectionField[]): AutofillTargetInfo[] {
  const dynamicTargets: AutofillTargetInfo[] = fields
    .filter((f) => f.type !== 'file')
    .map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      section: f.section?.trim() || 'Data & Persyaratan',
      options: f.options,
    }));

  return [...IDENTITY_TARGET_FIELDS, ...dynamicTargets];
}

interface DocRule {
  docPattern: RegExp;
  includeIdentityIds: string[];
  targetFieldPattern: RegExp;
  includeTextareas?: boolean;
}

const SMART_DOC_RULES: DocRule[] = [
  {
    docPattern: /\bktp\b|kartu tanda penduduk|e-ktp|identitas diri/i,
    includeIdentityIds: ['__identity_name'],
    targetFieldPattern:
      /nik|nomor induk|tempat.*lahir|tanggal.*lahir|tgl.*lahir|kelamin|gender|alamat|domisili|kota|kabupaten|provinsi|agama|pekerjaan/i,
  },
  {
    docPattern: /\bijazah\b|\bskl\b|transkrip|akademik|kelulusan|gelar/i,
    includeIdentityIds: ['__identity_name'],
    targetFieldPattern:
      /pendidikan|jenjang|gelar|jurusan|prodi|program studi|universitas|kampus|perguruan|institut|sekolah|ipk|tahun lulus|akreditasi/i,
  },
  {
    docPattern: /\bcv\b|curriculum vitae|riwayat hidup|\bdrh\b|portofolio|resume|daftar riwayat/i,
    includeIdentityIds: ['__identity_name', '__identity_email', '__identity_phone'],
    targetFieldPattern:
      /nik|tanggal.*lahir|tempat.*lahir|alamat|domisili|pendidikan|jenjang|gelar|jurusan|prodi|universitas|kampus|pengalaman|jabatan|instansi|perusahaan|organisasi|lama|tahun|keahlian|kompetensi|sertifikasi|ringkasan|motivasi|portofolio|linkedin|prestasi/i,
    includeTextareas: true,
  },
  {
    docPattern: /lamaran|permohonan|pengantar|pakta integritas|pernyataan/i,
    includeIdentityIds: ['__identity_name', '__identity_email', '__identity_phone'],
    targetFieldPattern: /nik|alamat|domisili|jabatan|posisi|motivasi|instansi/i,
  },
  {
    docPattern:
      /makalah|gagasan|esai|essay|proposal|konsep|naskah|visi|misi|strategi|inovasi|program kerja/i,
    includeIdentityIds: [],
    targetFieldPattern:
      /gagasan|makalah|visi|misi|strategi|rencana|inovasi|program|masalah|solusi|ringkasan|motivasi|tujuan|target/i,
    includeTextareas: true,
  },
  {
    docPattern: /sertifikat|pelatihan|kompetensi|bnsp|piagam|penghargaan|referensi/i,
    includeIdentityIds: [],
    targetFieldPattern: /sertifikasi|sertifikat|pelatihan|keahlian|kompetensi|pengalaman|instansi|prestasi/i,
  },
];

export function suggestAutofillTargetsForFileField(
  fileField: Pick<SelectionField, 'id' | 'label' | 'description'>,
  allFields: SelectionField[]
): string[] {
  const docText = `${fileField.id} ${fileField.label} ${fileField.description || ''}`;
  const nonFileFields = allFields.filter((f) => f.type !== 'file');
  const matchedIds = new Set<string>();

  for (const rule of SMART_DOC_RULES) {
    if (!rule.docPattern.test(docText)) continue;

    for (const idId of rule.includeIdentityIds) {
      matchedIds.add(idId);
    }

    for (const f of nonFileFields) {
      const targetText = `${f.id} ${f.label} ${f.description || ''} ${f.section || ''}`;
      if (
        rule.targetFieldPattern.test(targetText) ||
        (rule.includeTextareas && f.type === 'textarea')
      ) {
        matchedIds.add(f.id);
      }
    }
  }

  return Array.from(matchedIds);
}

export function getEffectiveFileAutofillTargets(
  fileField: SelectionField,
  form: Pick<SelectionForm, 'enableAiAutofill' | 'fields'>
): AutofillTargetInfo[] {
  if (form.enableAiAutofill === false) return [];
  if (fileField.autofillMode === 'off') return [];

  const allTargets = getAllAutofillableTargets(form.fields);
  const targetMap = new Map(allTargets.map((t) => [t.id, t]));

  const resolvedIds =
    fileField.autofillMode === 'custom' &&
    Array.isArray(fileField.autofillTargets) &&
    fileField.autofillTargets.length > 0
      ? fileField.autofillTargets
      : suggestAutofillTargetsForFileField(fileField, form.fields);

  return resolvedIds
    .map((id) => targetMap.get(id))
    .filter((item): item is AutofillTargetInfo => Boolean(item));
}

export function getRecommendedSourceFilesForForm(
  form: Pick<SelectionForm, 'enableAiAutofill' | 'fields'>
): Array<{ field: SelectionField; targets: AutofillTargetInfo[] }> {
  if (form.enableAiAutofill === false) return [];
  return form.fields
    .filter((f) => f.type === 'file')
    .map((field) => ({
      field,
      targets: getEffectiveFileAutofillTargets(field, form),
    }))
    .filter((entry) => entry.targets.length > 0)
    .sort((a, b) => b.targets.length - a.targets.length);
}

