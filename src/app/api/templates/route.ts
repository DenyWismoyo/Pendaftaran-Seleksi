import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { filterTemplatesForForm } from '@/lib/templateScope';
import { loadAllDocumentTemplates } from '@/lib/templateStore';
import { SelectionForm } from '@/types/selection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formSlug = searchParams.get('seleksi')?.trim() || '';
    const formId = searchParams.get('formId')?.trim() || '';

    const { templates } = await loadAllDocumentTemplates();

    if (formSlug || formId) {
      const db = getAdminDb();
      let form: SelectionForm | null = null;

      if (formId) {
        const snap = await db.collection(COLLECTIONS.FORMS).doc(formId).get();
        if (snap.exists) {
          form = { id: snap.id, ...snap.data() } as SelectionForm;
        }
      } else if (formSlug) {
        const snap = await db
          .collection(COLLECTIONS.FORMS)
          .where('slug', '==', formSlug)
          .limit(1)
          .get();
        if (!snap.empty) {
          form = { id: snap.docs[0].id, ...snap.docs[0].data() } as SelectionForm;
        }
      }

      if (!form) {
        return NextResponse.json({
          success: true,
          data: templates,
          scopedForm: null,
        });
      }

      return NextResponse.json({
        success: true,
        data: filterTemplatesForForm(templates, form),
        scopedForm: {
          id: form.id,
          slug: form.slug,
          title: form.title,
          category: form.category,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: templates,
      scopedForm: null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memuat daftar template.',
      },
      { status: 500 }
    );
  }
}
