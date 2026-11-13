import { z } from 'zod';

export const FieldTypeEnum = z.enum([
  'text',
  'textarea',
  'email',
  'tel',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'file',
]);
export type FieldType = z.infer<typeof FieldTypeEnum>;

export const SelectionFormStatusEnum = z.enum(['DRAFT', 'OPEN', 'CLOSED']);
export type SelectionFormStatus = z.infer<typeof SelectionFormStatusEnum>;

export const SubmissionStatusEnum = z.enum([
  'SUBMITTED',
  'NEEDS_REVISION',
  'REVIEWING',
  'INTERVIEW',
  'ACCEPTED',
  'REJECTED',
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

export const SelectionFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: FieldTypeEnum,
  required: z.boolean().default(false),
  placeholder: z.string().optional().default(''),
  description: z.string().optional().default(''),
  section: z.string().optional().default('Informasi & Persyaratan'),
  options: z.array(z.string()).optional().default([]),
  accept: z.string().optional().default('.pdf,.jpg,.jpeg,.png'),
  maxSizeMB: z.number().min(1).max(25).optional().default(5),
  width: z.enum(['full', 'half']).optional().default('full'),
  autofillMode: z.enum(['auto', 'custom', 'off']).optional(),
  autofillTargets: z.array(z.string()).optional(),
});
export type SelectionField = z.infer<typeof SelectionFieldSchema>;

export const CoverMediaSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  storagePath: z.string(),
});
export type CoverMedia = z.infer<typeof CoverMediaSchema>;

export const CoverAttachmentSchema = CoverMediaSchema.extend({
  id: z.string().min(1),
  title: z.string().min(1),
});
export type CoverAttachment = z.infer<typeof CoverAttachmentSchema>;

export const SelectionFormSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3, 'Judul formulir minimal 3 karakter'),
  slug: z.string().min(3, 'Slug URL minimal 3 karakter'),
  category: z.string().min(2).default('Umum'),
  description: z.string().default(''),
  requirementsNote: z.string().optional().default(''),
  showCover: z.boolean().optional(),
  coverTitle: z.string().optional(),
  coverSummary: z.string().optional(),
  coverHighlights: z.array(z.string()).optional(),
  coverImage: CoverMediaSchema.nullable().optional(),
  coverAttachments: z.array(CoverAttachmentSchema).optional(),
  coverCtaLabel: z.string().optional(),
  status: SelectionFormStatusEnum.default('OPEN'),
  quota: z.number().int().min(0).default(0),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  requireAiPreScreening: z.boolean().default(false),
  enableAiAutofill: z.boolean().optional(),
  aiCriteria: z.string().optional().default(''),
  fields: z.array(SelectionFieldSchema).min(1, 'Minimal harus ada 1 field formulir'),
  submissionCount: z.number().int().min(0).optional().default(0),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SelectionForm = z.infer<typeof SelectionFormSchema>;

export const SelectionFormInputSchema = SelectionFormSchema.omit({
  id: true,
  submissionCount: true,
  createdAt: true,
  updatedAt: true,
});
export type SelectionFormInput = z.infer<typeof SelectionFormInputSchema>;

export const UploadedFileMetaSchema = z.object({
  fieldId: z.string(),
  fieldLabel: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  storagePath: z.string(),
});
export type UploadedFileMeta = z.infer<typeof UploadedFileMetaSchema>;

export const AiEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendation: z.enum(['DIREKOMENDASIKAN', 'PERLU_TINJAUAN', 'KURANG_SESUAI']),
  evaluatedAt: z.string(),
});
export type AiEvaluation = z.infer<typeof AiEvaluationSchema>;

export const PanelScoreSchema = z.object({
  evaluatorEmail: z.string(),
  evaluatorName: z.string().default(''),
  adminScore: z.number().min(0).max(100),
  trackRecordScore: z.number().min(0).max(100),
  conceptScore: z.number().min(0).max(100),
  interviewScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
  note: z.string().optional().default(''),
  scoredAt: z.string(),
});
export type PanelScore = z.infer<typeof PanelScoreSchema>;

export const PanelScoreInputSchema = z.object({
  adminScore: z.number().min(0).max(100),
  trackRecordScore: z.number().min(0).max(100),
  conceptScore: z.number().min(0).max(100),
  interviewScore: z.number().min(0).max(100),
  note: z.string().optional().default(''),
});
export type PanelScoreInput = z.infer<typeof PanelScoreInputSchema>;

export const SelectionSubmissionSchema = z.object({
  id: z.string(),
  registrationCode: z.string(),
  formId: z.string(),
  formTitle: z.string(),
  formSlug: z.string(),
  applicantName: z.string().min(2),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().min(6),
  applicantNik: z.string().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  files: z.array(UploadedFileMetaSchema).default([]),
  status: SubmissionStatusEnum.default('SUBMITTED'),
  reviewerNote: z.string().optional().default(''),
  revisionFields: z.array(z.string()).optional().default([]),
  interviewSchedule: z.string().optional().default(''),
  reviewedBy: z.string().optional().default(''),
  reviewedAt: z.string().optional().default(''),
  aiEvaluation: AiEvaluationSchema.optional(),
  panelScores: z.array(PanelScoreSchema).optional().default([]),
  averagePanelScore: z.number().min(0).max(100).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SelectionSubmission = z.infer<typeof SelectionSubmissionSchema>;

export const CreateSubmissionPayloadSchema = z.object({
  formId: z.string().min(1),
  draftToken: z.string().optional(),
  applicantName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  applicantEmail: z.string().email('Format email tidak valid'),
  applicantPhone: z.string().min(8, 'Nomor WhatsApp/HP minimal 8 digit'),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
  files: z.array(UploadedFileMetaSchema).default([]),
});
export type CreateSubmissionPayload = z.infer<typeof CreateSubmissionPayloadSchema>;

export const ReviseSubmissionPayloadSchema = z.object({
  registrationCode: z.string().min(4),
  applicantEmail: z.string().email(),
  files: z.array(UploadedFileMetaSchema).min(1, 'Unggah minimal satu berkas perbaikan.'),
});
export type ReviseSubmissionPayload = z.infer<typeof ReviseSubmissionPayloadSchema>;

export const SelectionDraftPayloadSchema = z.object({
  draftToken: z.string().optional(),
  formId: z.string().min(1),
  formSlug: z.string().optional().default(''),
  applicantName: z.string().optional().default(''),
  applicantEmail: z.string().optional().default(''),
  applicantPhone: z.string().optional().default(''),
  answers: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
    .default({}),
  files: z.array(UploadedFileMetaSchema).default([]),
  currentStep: z.number().int().min(0).optional().default(0),
});
export type SelectionDraftPayload = z.infer<typeof SelectionDraftPayloadSchema>;

export interface SelectionDraft extends SelectionDraftPayload {
  draftToken: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutofillTargetInfo {
  id: string;
  label: string;
  type: FieldType;
  section: string;
  options?: string[];
}

export interface AutofillSuggestion {
  fieldId: string;
  label: string;
  value: string | string[];
  confidence: 'high' | 'medium';
  reason: string;
}

