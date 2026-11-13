import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { normalizeStaticTemplates } from '@/lib/templateScope';
import { DocumentTemplateRecord } from '@/types/selection';

export async function loadAllDocumentTemplates(): Promise<{
  templates: DocumentTemplateRecord[];
  fromDatabase: boolean;
}> {
  try {
    const snap = await getAdminDb().collection(COLLECTIONS.TEMPLATES).get();
    if (snap.empty) {
      return { templates: normalizeStaticTemplates(), fromDatabase: false };
    }
    const records = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as DocumentTemplateRecord)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return { templates: records, fromDatabase: true };
  } catch {
    return { templates: normalizeStaticTemplates(), fromDatabase: false };
  }
}

export async function findDocumentTemplateBySlug(
  slug: string
): Promise<DocumentTemplateRecord | undefined> {
  const { templates } = await loadAllDocumentTemplates();
  return templates.find((t) => t.slug === slug || t.id === slug);
}

/**
 * Menjaga konsistensi dua arah antara field `documentTemplateIds` pada dokumen formulir
 * dan field `formIds` pada dokumen koleksi `document_templates`.
 */
export async function syncFormTemplateIdsToTemplates(
  formId: string,
  documentTemplateIds: string[]
): Promise<void> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.TEMPLATES).get();
  if (snap.empty) return;

  const targetSet = new Set(documentTemplateIds);
  const now = new Date().toISOString();
  const batch = db.batch();
  let hasChanges = false;

  snap.docs.forEach((doc) => {
    const data = doc.data() as Partial<DocumentTemplateRecord>;
    const currentFormIds = Array.isArray(data.formIds) ? data.formIds : [];
    const hasForm = currentFormIds.includes(formId);
    const shouldHave =
      targetSet.has(doc.id) || (typeof data.slug === 'string' && targetSet.has(data.slug));

    if (hasForm === shouldHave) return;

    const nextFormIds = shouldHave
      ? Array.from(new Set([...currentFormIds, formId]))
      : currentFormIds.filter((fid) => fid !== formId);

    batch.update(doc.ref, { formIds: nextFormIds, updatedAt: now });
    hasChanges = true;
  });

  if (hasChanges) {
    await batch.commit();
  }
}
