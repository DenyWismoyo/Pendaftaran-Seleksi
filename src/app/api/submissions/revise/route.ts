import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import {
  ReviseSubmissionPayloadSchema,
  SelectionSubmission,
} from '@/types/selection';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import { dispatchApplicantNotification } from '@/lib/notifications';

export async function PATCH(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`sub-revise:${ip}`, 15, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak permintaan perbaikan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = ReviseSubmissionPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data perbaikan berkas tidak valid.',
        },
        { status: 400 }
      );
    }

    const code = parsed.data.registrationCode.trim().toUpperCase();
    const email = parsed.data.applicantEmail.trim().toLowerCase();
    const db = getAdminDb();

    const snap = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .where('registrationCode', '==', code)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftaran tidak ditemukan.' },
        { status: 404 }
      );
    }

    const docRef = snap.docs[0].ref;
    const submission = { id: snap.docs[0].id, ...snap.docs[0].data() } as SelectionSubmission;

    if (submission.applicantEmail.toLowerCase() !== email) {
      return NextResponse.json(
        { success: false, error: 'Email tidak sesuai dengan kode pendaftaran.' },
        { status: 403 }
      );
    }

    if (submission.status !== 'NEEDS_REVISION') {
      return NextResponse.json(
        {
          success: false,
          error: 'Perbaikan berkas hanya diizinkan saat status berstatus Perlu Perbaikan Berkas.',
        },
        { status: 409 }
      );
    }

    const mergedMap = new Map(submission.files.map((f) => [f.fieldId, f]));
    for (const nextFile of parsed.data.files) {
      mergedMap.set(nextFile.fieldId, nextFile);
    }

    const updatedFiles = Array.from(mergedMap.values());
    const now = new Date().toISOString();

    await docRef.update({
      files: updatedFiles,
      status: 'REVIEWING',
      revisionFields: [],
      updatedAt: now,
    });

    await dispatchApplicantNotification({
      event: 'REVISION_SUBMITTED',
      registrationCode: submission.registrationCode,
      formTitle: submission.formTitle,
      applicantName: submission.applicantName,
      applicantEmail: submission.applicantEmail,
      applicantPhone: submission.applicantPhone,
      status: 'REVIEWING',
    });

    return NextResponse.json({
      success: true,
      data: {
        status: 'REVIEWING',
        files: updatedFiles.map((f) => ({
          fieldId: f.fieldId,
          fieldLabel: f.fieldLabel,
          fileName: f.fileName,
          size: f.size,
        })),
        updatedAt: now,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal mengirim berkas perbaikan.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

