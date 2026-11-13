import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionForm, SelectionFormInputSchema } from '@/types/selection';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await getAdminDb().collection(COLLECTIONS.FORMS).get();
    const forms = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SelectionForm)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({ success: true, data: forms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat formulir.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = SelectionFormInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Struktur formulir tidak valid.',
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const db = getAdminDb();
    const cleanSlug = slugify(input.slug || input.title);

    // Pastikan slug unik
    const existingSlug = await db
      .collection(COLLECTIONS.FORMS)
      .where('slug', '==', cleanSlug)
      .limit(1)
      .get();

    const finalSlug = existingSlug.empty
      ? cleanSlug
      : `${cleanSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const now = new Date().toISOString();
    const id = `form-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const formDoc: SelectionForm = {
      ...input,
      id,
      slug: finalSlug,
      submissionCount: 0,
      createdBy: admin.email || admin.uid,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTIONS.FORMS).doc(id).set(formDoc);
    return NextResponse.json({ success: true, data: formDoc }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuat formulir.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

