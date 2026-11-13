import { describe, expect, it } from 'vitest';
import {
  computeAveragePanelScore,
  computePanelTotalScore,
  extractNormalizedNik,
  isFormScheduleActive,
  validateDynamicSubmission,
} from '@/lib/validation';
import { PanelScore, SelectionField } from '@/types/selection';

const sampleFields: SelectionField[] = [
  {
    id: 'nik',
    label: 'NIK KTP',
    type: 'text',
    required: true,
    placeholder: '',
    description: '',
    section: 'Data Diri',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
  {
    id: 'minat',
    label: 'Bidang Keahlian',
    type: 'checkbox',
    required: true,
    placeholder: '',
    description: '',
    section: 'Keahlian',
    options: ['IoT', 'Manufaktur'],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
  {
    id: 'cvFile',
    label: 'Curriculum Vitae',
    type: 'file',
    required: true,
    placeholder: '',
    description: '',
    section: 'Dokumen',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
];

describe('Dynamic Validation, Schedule & Panel Rubric Scoring', () => {
  it('validates required text, checkbox, and file fields', () => {
    const invalid = validateDynamicSubmission(sampleFields, { nik: '3372' }, []);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.minat).toBeDefined();
    expect(invalid.errors.cvFile).toBeDefined();

    const valid = validateDynamicSubmission(
      sampleFields,
      { nik: '3372010101900001', minat: ['IoT'] },
      [
        {
          fieldId: 'cvFile',
          fieldLabel: 'Curriculum Vitae',
          fileName: 'cv.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: 'https://storage.googleapis.com/example/cv.pdf',
          storagePath: 'selection_uploads/form/tmp/abc/cv.pdf',
        },
      ]
    );
    expect(valid.valid).toBe(true);
  });

  it('extracts normalized 16-digit NIK when valid', () => {
    expect(
      extractNormalizedNik(sampleFields, { nik: '3372-0101-0190-0001' })
    ).toBe('3372010101900001');
    expect(extractNormalizedNik(sampleFields, { nik: '12345' })).toBeNull();
  });

  it('enforces startDate and endDate boundaries in WIB', () => {
    const ref = new Date('2026-11-13T06:00:00Z'); // 13 Nov 2026 13:00 WIB
    expect(
      isFormScheduleActive(
        { status: 'OPEN', startDate: '2026-11-01', endDate: '2026-11-30' },
        ref
      ).active
    ).toBe(true);
    expect(
      isFormScheduleActive(
        { status: 'OPEN', startDate: '2026-11-15', endDate: '2026-11-30' },
        ref
      ).active
    ).toBe(false);
    expect(
      isFormScheduleActive(
        { status: 'OPEN', startDate: '2026-11-01', endDate: '2026-11-12' },
        ref
      ).active
    ).toBe(false);
  });

  it('computes panel rubric totals and multi-reviewer average accurately', () => {
    const total = computePanelTotalScore({
      adminScore: 80,
      trackRecordScore: 90,
      conceptScore: 85,
      interviewScore: 85,
    });
    expect(total).toBe(85);

    const panels: PanelScore[] = [
      {
        evaluatorEmail: 'a@solotechnopark.id',
        evaluatorName: 'Penilai A',
        adminScore: 80,
        trackRecordScore: 80,
        conceptScore: 80,
        interviewScore: 80,
        totalScore: 80,
        note: '',
        scoredAt: '2026-11-13T00:00:00Z',
      },
      {
        evaluatorEmail: 'b@solotechnopark.id',
        evaluatorName: 'Penilai B',
        adminScore: 90,
        trackRecordScore: 90,
        conceptScore: 90,
        interviewScore: 90,
        totalScore: 90,
        note: '',
        scoredAt: '2026-11-13T00:00:00Z',
      },
    ];
    expect(computeAveragePanelScore(panels)).toBe(85);
  });
});

