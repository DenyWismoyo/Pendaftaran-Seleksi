import { describe, expect, it } from 'vitest';
import {
  PanelScoreInputSchema,
  ReviseSubmissionPayloadSchema,
  SelectionDraftPayloadSchema,
  SubmissionStatusEnum,
} from '@/types/selection';

describe('Zod Schema Contracts', () => {
  it('supports extended 6-stage selection statuses', () => {
    expect(SubmissionStatusEnum.options).toEqual([
      'SUBMITTED',
      'NEEDS_REVISION',
      'REVIEWING',
      'INTERVIEW',
      'ACCEPTED',
      'REJECTED',
    ]);
  });

  it('validates revision upload payloads cleanly', () => {
    const ok = ReviseSubmissionPayloadSchema.safeParse({
      registrationCode: 'SEL-261113-ABCD',
      applicantEmail: 'pelamar@example.com',
      files: [
        {
          fieldId: 'ktp',
          fieldLabel: 'Scan KTP',
          fileName: 'ktp-baru.pdf',
          mimeType: 'application/pdf',
          size: 50000,
          url: 'https://storage.googleapis.com/example/ktp-baru.pdf',
          storagePath: 'selection_uploads/form1/rev/SEL-261113-ABCD/ktp/ktp-baru.pdf',
        },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects out-of-range panel scores and allows draft payloads without formSlug', () => {
    const badScore = PanelScoreInputSchema.safeParse({
      adminScore: 105,
      trackRecordScore: 80,
      conceptScore: 80,
      interviewScore: 80,
    });
    expect(badScore.success).toBe(false);

    const draftOk = SelectionDraftPayloadSchema.safeParse({
      formId: 'form-pejabat-teknis',
      applicantName: 'Budi Santoso',
    });
    expect(draftOk.success).toBe(true);
  });
});

