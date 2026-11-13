import {
  SelectionForm,
  SelectionStage,
  SelectionSubmission,
  StageCriterion,
  SubmissionStatus,
} from '@/types/selection';

export const DEFAULT_SCORING_CRITERIA: StageCriterion[] = [
  { id: 'administrasi', label: 'Kelengkapan Administrasi', weight: 25, maxScore: 100 },
  { id: 'rekam_jejak', label: 'Rekam Jejak & Pengalaman', weight: 25, maxScore: 100 },
  { id: 'kompetensi', label: 'Kompetensi / Uji Gagasan', weight: 25, maxScore: 100 },
  { id: 'wawancara', label: 'Wawancara & Sikap Kerja', weight: 25, maxScore: 100 },
];

export const STAGE_PRESETS: Record<
  'rekrutmen' | 'jabatan' | 'vokasi',
  { label: string; description: string; stages: SelectionStage[] }
> = {
  rekrutmen: {
    label: 'Rekrutmen Perusahaan (5 Tahap)',
    description: 'Alur standar HR: Lamaran → Screening → Tes Teknis → Wawancara → Offering',
    stages: [
      {
        id: 'lamaran_masuk',
        order: 1,
        name: 'Lamaran Masuk',
        description: 'Berkas pendaftaran & CV diterima sistem.',
        requiresScoring: false,
        isFinalStage: false,
      },
      {
        id: 'screening_administrasi',
        order: 2,
        name: 'Screening CV & Administrasi',
        description: 'Verifikasi kesesuaian kualifikasi dasar dan dokumen.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'tes_teknis',
        order: 3,
        name: 'Tes Teknis / Studi Kasus',
        description: 'Uji kompetensi fungsional dan portofolio kerja.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'wawancara_hr_user',
        order: 4,
        name: 'Wawancara HR & User',
        description: 'Klarifikasi pengalaman, budaya kerja, dan kesepakatan.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'keputusan_akhir',
        order: 5,
        name: 'Keputusan & Offering',
        description: 'Penetapan kandidat lolos atau belum lolos.',
        requiresScoring: false,
        isFinalStage: true,
      },
    ],
  },
  jabatan: {
    label: 'Seleksi Terbuka / Jabatan (5 Tahap)',
    description: 'Alur seleksi pejabat/instansi: Pendaftaran → Administrasi → Uji Gagasan → Wawancara → Penetapan',
    stages: [
      {
        id: 'pendaftaran',
        order: 1,
        name: 'Pendaftaran Masuk',
        description: 'Formulir & dokumen resmi tercatat di sistem.',
        requiresScoring: false,
        isFinalStage: false,
      },
      {
        id: 'verifikasi_berkas',
        order: 2,
        name: 'Verifikasi Administrasi',
        description: 'Pemeriksaan keabsahan dokumen persyaratan wajib.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'uji_gagasan',
        order: 3,
        name: 'Penilaian Makalah & Rekam Jejak',
        description: 'Evaluasi substansi makalah dan pengalaman manajerial.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'wawancara_panel',
        order: 4,
        name: 'Wawancara Panel Seleksi',
        description: 'Paparan gagasan dan pendalaman oleh tim penilai.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'penetapan_akhir',
        order: 5,
        name: 'Penetapan Akhir',
        description: 'Keputusan resmi hasil seleksi.',
        requiresScoring: false,
        isFinalStage: true,
      },
    ],
  },
  vokasi: {
    label: 'Pelatihan / Magang (3 Tahap)',
    description: 'Alur ringkas: Pendaftaran → Seleksi Berkas & Minat → Pengumuman',
    stages: [
      {
        id: 'pendaftaran',
        order: 1,
        name: 'Pendaftaran Masuk',
        description: 'Data peserta dan berkas pengantar diterima.',
        requiresScoring: false,
        isFinalStage: false,
      },
      {
        id: 'seleksi_peserta',
        order: 2,
        name: 'Seleksi Berkas & Minat',
        description: 'Penilaian motivasi dan kesesuaian bidang program.',
        requiresScoring: true,
        isFinalStage: false,
      },
      {
        id: 'pengumuman',
        order: 3,
        name: 'Pengumuman Peserta',
        description: 'Penetapan status penerimaan program.',
        requiresScoring: false,
        isFinalStage: true,
      },
    ],
  },
};

export function resolveFormStages(
  form?: Pick<SelectionForm, 'selectionStages'> | null
): SelectionStage[] {
  if (form?.selectionStages && form.selectionStages.length > 0) {
    return [...form.selectionStages].sort((a, b) => a.order - b.order);
  }
  return STAGE_PRESETS.jabatan.stages;
}

export function resolveStageCriteria(
  form?: Pick<SelectionForm, 'selectionStages' | 'scoringCriteria'> | null,
  stageId?: string
): StageCriterion[] {
  if (stageId && form?.selectionStages?.length) {
    const stage = form.selectionStages.find((s) => s.id === stageId);
    if (stage?.criteria && stage.criteria.length > 0) {
      return stage.criteria;
    }
  }
  if (form?.scoringCriteria && form.scoringCriteria.length > 0) {
    return form.scoringCriteria;
  }
  return DEFAULT_SCORING_CRITERIA;
}

/**
 * Menghitung skor total skala 0..100 secara berbobot dari criteriaScores.
 */
export function computeWeightedStageScore(
  criteria: StageCriterion[],
  criteriaScores: Record<string, number>
): number {
  if (criteria.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const c of criteria) {
    const raw = Number(criteriaScores[c.id] ?? 0);
    const clamped = Math.max(0, Math.min(c.maxScore || 100, raw));
    const pct = ((clamped / (c.maxScore || 100)) * 100);
    const w = c.weight > 0 ? c.weight : 1;
    weightedSum += pct * w;
    totalWeight += w;
  }

  if (totalWeight <= 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Memetakan status sistem ke stage ID yang paling mendekati jika submission
 * belum memiliki `currentStageId` eksplisit.
 */
export function inferStageIndexFromStatus(
  status: SubmissionStatus,
  stages: SelectionStage[]
): number {
  const len = stages.length;
  if (len <= 1) return 0;
  switch (status) {
    case 'SUBMITTED':
      return 0;
    case 'NEEDS_REVISION':
      return Math.min(1, len - 1);
    case 'REVIEWING':
      return Math.min(len >= 4 ? 2 : 1, len - 1);
    case 'INTERVIEW':
      return Math.max(0, len - 2);
    case 'ACCEPTED':
    case 'REJECTED':
      return len - 1;
    default:
      return 0;
  }
}

export function resolveCurrentStageIndex(
  submission: Pick<SelectionSubmission, 'status' | 'currentStageId'>,
  stages: SelectionStage[]
): number {
  if (submission.currentStageId) {
    const found = stages.findIndex((s) => s.id === submission.currentStageId);
    if (found >= 0) return found;
  }
  return inferStageIndexFromStatus(submission.status, stages);
}

