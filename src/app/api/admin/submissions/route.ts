import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionSubmission, SubmissionStatusEnum } from '@/types/selection';
import { dispatchApplicantNotification } from '@/lib/notifications';
import { assertAllowedAppOrigin } from '@/lib/security';
import { z } from 'zod';

const UpdateSubmissionSchema = z.object({
  id: z.string().min(1).optional(),
  ids: z.array(z.string().min(1)).optional(),
  status: SubmissionStatusEnum,
  reviewerNote: z.string().optional().default(''),
  revisionFields: z.array(z.string()).optional(),
  interviewSchedule: z.string().optional(),
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
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

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

    const { id, ids, status, reviewerNote, revisionFields, interviewSchedule } = parsed.data;
    const targetIds = ids && ids.length > 0 ? ids : id ? [id] : [];

    if (targetIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pilih minimal satu pendaftar untuk diperbarui.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status,
      reviewedBy: admin.email || admin.uid,
      reviewedAt: now,
      updatedAt: now,
    };

    if (!ids || reviewerNote.trim() !== '') {
      updatePayload.reviewerNote = reviewerNote;
    }
    if (revisionFields !== undefined) {
      updatePayload.revisionFields = status === 'NEEDS_REVISION' ? revisionFields : [];
    }
    if (interviewSchedule !== undefined) {
      updatePayload.interviewSchedule = interviewSchedule;
    }

    if (targetIds.length === 1) {
      const docRef = db.collection(COLLECTIONS.SUBMISSIONS).doc(targetIds[0]);
      const snap = await docRef.get();
      if (!snap.exists) {
        return NextResponse.json(
          { success: false, error: 'Data pendaftar tidak ditemukan.' },
          { status: 404 }
        );
      }
      await docRef.update(updatePayload);
      const updated = await docRef.get();
      const updatedSub = { id: updated.id, ...updated.data() } as SelectionSubmission;

      await dispatchApplicantNotification({
        event: 'STATUS_UPDATED',
        registrationCode: updatedSub.registrationCode,
        formTitle: updatedSub.formTitle,
        applicantName: updatedSub.applicantName,
        applicantEmail: updatedSub.applicantEmail,
        applicantPhone: updatedSub.applicantPhone,
        status: updatedSub.status,
        reviewerNote: updatedSub.reviewerNote,
      });

      return NextResponse.json({ success: true, data: updatedSub });
    }

    const batch = db.batch();
    for (const targetId of targetIds) {
      batch.update(
        db.collection(COLLECTIONS.SUBMISSIONS).doc(targetId),
        updatePayload
      );
    }
    await batch.commit();

    return NextResponse.json({
      success: true,
      data: { updatedCount: targetIds.length, status },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui status seleksi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
