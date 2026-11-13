import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionForm } from '@/types/selection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const db = getAdminDb();

    if (id) {
      const snap = await db.collection(COLLECTIONS.FORMS).doc(id).get();
      if (!snap.exists) {
        return NextResponse.json(
          { success: false, error: 'Formulir seleksi tidak ditemukan.' },
          { status: 404 }
        );
      }
      const data = { id: snap.id, ...snap.data() } as SelectionForm;
      if (data.status === 'DRAFT') {
        return NextResponse.json(
          { success: false, error: 'Formulir ini belum dipublikasikan.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, data });
    }

    if (slug) {
      const qSnap = await db
        .collection(COLLECTIONS.FORMS)
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (qSnap.empty) {
        return NextResponse.json(
          { success: false, error: 'Formulir seleksi tidak ditemukan.' },
          { status: 404 }
        );
      }
      const doc = qSnap.docs[0];
      const data = { id: doc.id, ...doc.data() } as SelectionForm;
      if (data.status === 'DRAFT') {
        return NextResponse.json(
          { success: false, error: 'Formulir ini masih berstatus draf.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, data });
    }

    const snap = await db
      .collection(COLLECTIONS.FORMS)
      .where('status', 'in', ['OPEN', 'CLOSED'])
      .get();

    const forms = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SelectionForm)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({ success: true, data: forms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat daftar seleksi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
