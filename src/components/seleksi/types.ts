import { SelectionField, UploadedFileMeta } from '@/types/selection';

export type SyncState = 'idle' | 'saving' | 'saved' | 'local' | 'error';

export interface SubmissionReceipt {
  id: string;
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
}

export interface WizardDraft {
  draftToken?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  currentStep?: number;
  savedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  stepIndex: number;
}

export interface WizardStep {
  key: string;
  title: string;
  type: 'identity' | 'section' | 'review';
  fields: SelectionField[];
}

export interface DuplicateInfo {
  message: string;
  registrationCode?: string;
}

