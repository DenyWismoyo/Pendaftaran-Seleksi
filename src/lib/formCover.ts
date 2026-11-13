import { SelectionForm } from '@/types/selection';

export function hasFormCoverContent(
  form: Pick<
    SelectionForm,
    | 'showCover'
    | 'coverTitle'
    | 'coverSummary'
    | 'coverHighlights'
    | 'coverImage'
    | 'coverAttachments'
  >
): boolean {
  if (form.showCover === false) return false;
  if (form.showCover === true) return true;
  return Boolean(
    form.coverImage?.url ||
      (form.coverAttachments && form.coverAttachments.length > 0) ||
      form.coverSummary?.trim() ||
      form.coverTitle?.trim() ||
      (form.coverHighlights && form.coverHighlights.length > 0)
  );
}

