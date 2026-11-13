import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionSubmission, SubmissionStatusEnum } from '@/types/selection';
import { z } from 'zod';

const UpdateSubmissionSchema = z.object({
  id: z.string().min(1),
  status: SubmissionStatusEnum,
  reviewerNote: z.string().optional().default(''),
});

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId');
    const status = searchParams.get('status');
    const db = getAdminDb();

    let queryRef: FirebaseFirestore.Query = db.collection(COLLECTIONS.SUBMISSIONS);
    if (formId) {
      queryRef = queryRef.where('formId', '==', formId);
    }
    if (status && status !== 'ALL') {
      queryRef = queryRef.where('status', '==', status);
    }

    const snap = await queryRef.get();
    const submissions = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SelectionSubmission)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({ success: true, data: submissions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat data pendaftar.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parameter status pendaftar tidak valid.' },
        { status: 400 }
      );
    }

    const { id, status, reviewerNote } = parsed.data;
    const now = new Date().toISOString();
    const docRef = getAdminDb().collection(COLLECTIONS.SUBMISSIONS).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan.' },
        { status: 404 }
      );
    }

    await docRef.update({
      status,
      reviewerNote,
      reviewedBy: admin.email || admin.uid,
      reviewedAt: now,
      updatedAt: now,
    });

    const updated = await docRef.get();
    return NextResponse.json({
      success: true,
      data: { id: updated.id, ...updated.data() },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui status seleksi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
