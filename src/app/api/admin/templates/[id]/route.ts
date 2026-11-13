import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { assertAllowedAppOrigin } from '@/lib/security';
import { slugify } from '@/lib/utils';
import {
  DocumentTemplateInputSchema,
  DocumentTemplateRecord,
  SelectionForm,
} from '@/types/selection';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.TEMPLATES).doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Template tidak ditemukan.' },
        { status: 404 }
      );
    }

    const existing = { id: existingSnap.id, ...existingSnap.data() } as DocumentTemplateRecord;
    const body = await req.json();
    const parsed = DocumentTemplateInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Perubahan template tidak valid.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: now,
    };
    if (parsed.data.slug) updates.slug = slugify(parsed.data.slug);
    if (parsed.data.fileBaseName) {
      updates.fileBaseName = slugify(parsed.data.fileBaseName);
    }

    const batch = db.batch();
    batch.update(docRef, updates);

    // Sync documentTemplateIds on forms that already maintain explicit bindings
    if (Array.isArray(parsed.data.formIds)) {
      const prevFormIds = new Set(existing.formIds || []);
      const nextFormIds = new Set(parsed.data.formIds);
      const affected = new Set([...prevFormIds, ...nextFormIds]);

      for (const fId of affected) {
        const fRef = db.collection(COLLECTIONS.FORMS).doc(fId);
        const fSnap = await fRef.get();
        if (!fSnap.exists) continue;
        const fData = fSnap.data() as SelectionForm;
        if (!Array.isArray(fData.documentTemplateIds)) continue;

        if (nextFormIds.has(fId)) {
          const nextIds = Array.from(new Set([...fData.documentTemplateIds, id]));
          batch.update(fRef, { documentTemplateIds: nextIds, updatedAt: now });
        } else {
          const nextIds = fData.documentTemplateIds.filter(
            (tid) => tid !== id && tid !== existing.slug
          );
          batch.update(fRef, { documentTemplateIds: nextIds, updatedAt: now });
        }
      }
    }

    await batch.commit();
    const updated = await docRef.get();
    return NextResponse.json({
      success: true,
      data: { id: updated.id, ...updated.data() },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memperbarui template.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.TEMPLATES).doc(id);
    const snap = await docRef.get();
    const existing = snap.exists ? (snap.data() as DocumentTemplateRecord) : null;

    const batch = db.batch();
    batch.delete(docRef);

    if (existing) {
      const formsSnap = await db.collection(COLLECTIONS.FORMS).get();
      const now = new Date().toISOString();
      for (const fDoc of formsSnap.docs) {
        const fData = fDoc.data() as SelectionForm;
        if (
          Array.isArray(fData.documentTemplateIds) &&
          (fData.documentTemplateIds.includes(id) ||
            fData.documentTemplateIds.includes(existing.slug))
        ) {
          batch.update(fDoc.ref, {
            documentTemplateIds: fData.documentTemplateIds.filter(
              (tid) => tid !== id && tid !== existing.slug
            ),
            updatedAt: now,
          });
        }
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menghapus template.',
      },
      { status: 500 }
    );
  }
}
