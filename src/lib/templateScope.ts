import { DOCUMENT_TEMPLATES, DocumentTemplate } from '@/lib/documentTemplates';
import { DocumentTemplateRecord, SelectionForm } from '@/types/selection';

export function normalizeStaticTemplates(): DocumentTemplateRecord[] {
  const now = '2026-01-01T00:00:00.000Z';
  return DOCUMENT_TEMPLATES.map((tpl: DocumentTemplate) => ({
    id: `builtin-${tpl.slug}`,
    slug: tpl.slug,
    title: tpl.title,
    category: tpl.category,
    targetFieldHint: tpl.targetFieldHint,
    description: tpl.description,
    fileBaseName: tpl.fileBaseName,
    markdown: tpl.markdown,
    formIds: [],
    isGlobal: tpl.category === 'Umum',
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  }));
}

export function filterTemplatesForForm(
  templates: DocumentTemplateRecord[],
  form: Pick<
    SelectionForm,
    'id' | 'slug' | 'title' | 'category' | 'documentTemplateIds'
  >
): DocumentTemplateRecord[] {
  // 1. Strict isolation when the form explicitly defines documentTemplateIds
  if (Array.isArray(form.documentTemplateIds) && form.documentTemplateIds.length > 0) {
    const allowed = new Set(form.documentTemplateIds);
    const matched = templates.filter(
      (t) => allowed.has(t.id) || allowed.has(t.slug)
    );
    if (matched.length > 0) return matched;
  }

  // 2. Templates explicitly assigned to this formId / slug (+ global templates)
  const formBound = templates.filter(
    (t) =>
      Array.isArray(t.formIds) &&
      (t.formIds.includes(form.id) || t.formIds.includes(form.slug))
  );
  if (formBound.length > 0) {
    const globals = templates.filter(
      (t) =>
        t.isGlobal &&
        !formBound.some((b) => b.id === t.id || b.slug === t.slug)
    );
    return [...formBound, ...globals];
  }

  // 3. Fallback heuristic for legacy forms that have not configured bindings yet
  const text = `${form.title} ${form.slug} ${form.category}`.toLowerCase();
  const inferred = templates.filter((t) => {
    if (t.isGlobal) return true;
    const cat = t.category.toLowerCase();
    if (/pejabat|teknis|rekrutmen|karier/.test(text) && cat.includes('pejabat')) {
      return true;
    }
    if (/vokasi|pelatihan|sertifikasi/.test(text) && cat.includes('vokasi')) {
      return true;
    }
    if (/magang|pkl/.test(text) && cat.includes('magang')) {
      return true;
    }
    return false;
  });

  return inferred.length > 0 ? inferred : templates;
}

