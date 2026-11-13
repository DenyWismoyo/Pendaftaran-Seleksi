import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionForm, SelectionFormInputSchema } from '@/types/selection';
import { syncFormTemplateIdsToTemplates } from '@/lib/templateStore';
import { slugify } from '@/lib/utils';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const snap = await getAdminDb().collection(COLLECTIONS.FORMS).doc(id).get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Formulir tidak ditemukan.' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { id: snap.id, ...snap.data() } as SelectionForm,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat formulir.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.FORMS).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json(
        { success: false, error: 'Formulir tidak ditemukan.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = SelectionFormInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Perubahan formulir tidak valid.',
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    if (parsed.data.coverImage === null) {
      updates.coverImage = FieldValue.delete();
    }
    if (parsed.data.slug) {
      updates.slug = slugify(parsed.data.slug);
    }

    await docRef.update(updates);
    if (Array.isArray(parsed.data.documentTemplateIds)) {
      await syncFormTemplateIdsToTemplates(id, parsed.data.documentTemplateIds);
    }
    const updatedSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      data: { id: updatedSnap.id, ...updatedSnap.data() },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui formulir.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await getAdminDb().collection(COLLECTIONS.FORMS).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus formulir.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

