import { describe, expect, it } from 'vitest';
import {
  buildBatchSummaryMarkdown,
  buildCandidateDossierMarkdown,
  buildCandidateFolderName,
  buildCandidateWordDocBuffer,
  sanitizeDriveName,
} from '@/lib/candidateDossier';
import { extractDriveFolderId } from '@/lib/googleDrive';
import {
  DriveExportCandidateRequestSchema,
  DrivePrepareRequestSchema,
  SelectionForm,
  SelectionSubmission,
} from '@/types/selection';

const sampleForm: SelectionForm = {
  id: 'form-1',
  slug: 'rekrutmen-engineer',
  title: 'Rekrutmen Senior Engineer',
  category: 'Rekrutmen & Karier',
  description: 'Rekrutmen',
  requirementsNote: '',
  status: 'OPEN',
  quota: 10,
  startDate: '',
  endDate: '',
  requireAiPreScreening: true,
  enableAiAutofill: true,
  aiCriteria: '',
  submissionCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  fields: [
    {
      id: 'domisili',
      label: 'Kota Domisili',
      type: 'text',
      required: true,
      placeholder: '',
      description: '',
      accept: '.pdf',
      maxSizeMB: 5,
      section: 'Biodata',
      options: [],
      autofillTargets: [],
      width: 'half',
    },
    {
      id: 'ringkasan',
      label: 'Ringkasan Pengalaman',
      type: 'textarea',
      required: true,
      placeholder: '',
      description: '',
      accept: '.pdf',
      maxSizeMB: 5,
      section: 'Pengalaman',
      options: [],
      autofillTargets: [],
      width: 'full',
    },
  ],
};

const sampleSubmission: SelectionSubmission = {
  id: 'sub-1',
  formId: 'form-1',
  formSlug: 'rekrutmen-engineer',
  formTitle: 'Rekrutmen Senior Engineer',
  registrationCode: 'SEL-2026-AB12CD',
  applicantName: 'Budi / Santoso*:',
  applicantEmail: 'budi@example.com',
  applicantPhone: '081234567890',
  applicantNik: '3372010101900001',
  answers: {
    domisili: 'Surakarta',
    ringkasan: 'Berpengalaman 7 tahun membangun platform web.',
    extraField: 'Nilai Tambahan',
  },
  files: [
    {
      fieldId: 'ktp',
      fieldLabel: 'Scan e-KTP',
      fileName: 'ktp-budi.pdf',
      url: 'https://storage.googleapis.com/example/ktp-budi.pdf',
      storagePath: 'selection_uploads/form-1/ktp-budi.pdf',
      mimeType: 'application/pdf',
      size: 204800,
    },
  ],
  status: 'INTERVIEW',
  reviewerNote: 'Memenuhi syarat administrasi.',
  reviewedBy: 'admin@kandidat.id',
  reviewedAt: '2026-01-03T00:00:00.000Z',
  revisionFields: [],
  interviewSchedule: '2026-11-20 09:00 WIB',
  aiEvaluation: {
    score: 88,
    recommendation: 'DIREKOMENDASIKAN',
    summary: 'Pengalaman dan berkas sesuai kualifikasi.',
    strengths: ['Pengalaman 7 tahun'],
    gaps: [],
    evaluatedAt: '2026-01-02T00:00:00.000Z',
  },
  panelScores: [
    {
      evaluatorEmail: 'hr@example.com',
      evaluatorName: 'Tim HR',
      adminScore: 90,
      trackRecordScore: 88,
      conceptScore: 85,
      interviewScore: 87,
      totalScore: 87.5,
      note: 'Siap lanjut tahap akhir',
      scoredAt: '2026-01-03T00:00:00.000Z',
    },
  ],
  averagePanelScore: 87.5,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
};

describe('Google Drive Helpers & Dossier Builder', () => {
  it('mengekstrak Folder ID dari berbagai format URL Google Drive maupun ID mentah', () => {
    expect(
      extractDriveFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUv');
    expect(
      extractDriveFolderId(
        'https://drive.google.com/drive/u/1/folders/1AbCdEfGhIjKlMnOpQrStUv?usp=sharing'
      )
    ).toBe('1AbCdEfGhIjKlMnOpQrStUv');
    expect(
      extractDriveFolderId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUv')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUv');
    expect(extractDriveFolderId('root')).toBe('root');
  });

  it('membersihkan karakter terlarang dan membentuk nama folder kandidat unik', () => {
    expect(sanitizeDriveName('Budi / Santoso*: <Test>')).toBe('Budi Santoso Test');
    expect(buildCandidateFolderName(sampleSubmission)).toBe(
      'Budi Santoso - SEL-2026-AB12CD'
    );
  });

  it('menyusun dossier Markdown dan file Word .doc lengkap untuk peserta dan batch', () => {
    const md = buildCandidateDossierMarkdown(sampleSubmission, sampleForm);
    expect(md).toContain('PROFIL & BERKAS KANDIDAT');
    expect(md).toContain('SEL-2026-AB12CD');
    expect(md).toContain('Kota Domisili:** Surakarta');
    expect(md).toContain('Berpengalaman 7 tahun membangun platform web.');
    expect(md).toContain('Hasil Pra-Penilaian & Analisis Dokumen (AI)');
    expect(md).toContain('Tim HR');
    expect(md).toContain('ktp-budi.pdf');

    const docBuf = buildCandidateWordDocBuffer('Profil Budi', md);
    const docText = docBuf.toString('utf-8');
    expect(docText.charCodeAt(0)).toBe(0xfeff);
    expect(docText).toContain('urn:schemas-microsoft-com:office:word');

    const batchMd = buildBatchSummaryMarkdown([sampleSubmission], 'Rekrutmen Q4');
    expect(batchMd).toContain('REKAPITULASI BATCH KANDIDAT — REKRUTMEN Q4');
    expect(batchMd).toContain('SEL-2026-AB12CD');
  });

  it('memvalidasi skema payload API prepare dan export kandidat', () => {
    expect(
      DrivePrepareRequestSchema.safeParse({
        folderInput: '1AbCdEfGhIjKlMnOp',
        authMode: 'oauth',
        driveAccessToken: 'tok-123',
        createBatchSubfolder: true,
        batchFolderName: 'Batch A',
        format: 'both',
        submissionIds: ['sub-1'],
      }).success
    ).toBe(true);

    expect(
      DriveExportCandidateRequestSchema.safeParse({
        submissionId: 'sub-1',
        parentFolderId: 'folder-1',
        authMode: 'service_account',
        format: 'doc',
        includeFiles: true,
      }).success
    ).toBe(true);

    expect(
      DrivePrepareRequestSchema.safeParse({
        submissionIds: [],
      }).success
    ).toBe(false);
  });
});
