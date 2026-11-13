import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import {
  CreateSubmissionPayloadSchema,
  SelectionForm,
  SelectionSubmission,
} from '@/types/selection';
import {
  extractNormalizedNik,
  isFormScheduleActive,
  validateDynamicSubmission,
} from '@/lib/validation';
import { generateRegistrationCode } from '@/lib/utils';
import { evaluateSubmissionWithAi } from '@/lib/aiEvaluator';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import { dispatchApplicantNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`sub-track:${ip}`, 30, 60_000);
    if (!rate.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak permintaan pengecekan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!code || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Masukkan Kode Pendaftaran dan Email yang digunakan saat mendaftar.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const snap = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .where('registrationCode', '==', code)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftaran dengan kode tersebut tidak ditemukan.' },
        { status: 404 }
      );
    }

    const submission = { id: snap.docs[0].id, ...snap.docs[0].data() } as SelectionSubmission;
    if (submission.applicantEmail.toLowerCase() !== email) {
      return NextResponse.json(
        { success: false, error: 'Email tidak cocok dengan kode pendaftaran tersebut.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        formId: submission.formId,
        registrationCode: submission.registrationCode,
        formTitle: submission.formTitle,
        applicantName: submission.applicantName,
        applicantEmail: submission.applicantEmail,
        status: submission.status,
        reviewerNote: submission.reviewerNote || '',
        revisionFields: submission.revisionFields || [],
        interviewSchedule: submission.interviewSchedule || '',
        averagePanelScore: submission.averagePanelScore,
        files: submission.files.map((f) => ({
          fieldId: f.fieldId,
          fieldLabel: f.fieldLabel,
          fileName: f.fileName,
          size: f.size,
        })),
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal memeriksa status pendaftaran.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`sub-create:${ip}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak percobaan pengiriman. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateSubmissionPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data pendaftaran tidak valid.',
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const normalizedEmail = payload.applicantEmail.trim().toLowerCase();
    const db = getAdminDb();
    const formRef = db.collection(COLLECTIONS.FORMS).doc(payload.formId);
    const formSnap = await formRef.get();

    if (!formSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Formulir seleksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const form = { id: formSnap.id, ...formSnap.data() } as SelectionForm;
    const schedule = isFormScheduleActive(form);
    if (!schedule.active) {
      return NextResponse.json(
        {
          success: false,
          error: schedule.reason || 'Pendaftaran untuk program seleksi ini sedang ditutup.',
        },
        { status: 403 }
      );
    }

    // 1. Cegah duplikasi email
    const duplicateEmailSnap = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .where('formId', '==', form.id)
      .where('applicantEmail', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!duplicateEmailSnap.empty) {
      const existingSub = duplicateEmailSnap.docs[0].data() as SelectionSubmission;
      return NextResponse.json(
        {
          success: false,
          error: `Email ${normalizedEmail} sudah terdaftar pada program ini dengan kode ${existingSub.registrationCode}.`,
          existingRegistrationCode: existingSub.registrationCode,
        },
        { status: 409 }
      );
    }

    // 2. Cegah duplikasi NIK (jika formulir memiliki field NIK)
    const normalizedNik = extractNormalizedNik(form.fields, payload.answers);
    if (normalizedNik) {
      const duplicateNikSnap = await db
        .collection(COLLECTIONS.SUBMISSIONS)
        .where('formId', '==', form.id)
        .where('applicantNik', '==', normalizedNik)
        .limit(1)
        .get();

      if (!duplicateNikSnap.empty) {
        const existingSub = duplicateNikSnap.docs[0].data() as SelectionSubmission;
        return NextResponse.json(
          {
            success: false,
            error: `NIK tersebut sudah terdaftar pada program seleksi ini dengan kode ${existingSub.registrationCode}.`,
            existingRegistrationCode: existingSub.registrationCode,
          },
          { status: 409 }
        );
      }
    }

    // 3. Validasi seluruh field wajib
    const dynamicValidation = validateDynamicSubmission(
      form.fields,
      payload.answers,
      payload.files
    );
    if (!dynamicValidation.valid) {
      const firstErr = Object.values(dynamicValidation.errors)[0];
      return NextResponse.json(
        { success: false, error: firstErr, fieldErrors: dynamicValidation.errors },
        { status: 400 }
      );
    }

    // 4. Evaluasi awal opsional via Gemini Flash Lite 3.5
    let aiEvaluation = undefined;
    if (form.requireAiPreScreening && process.env.GOOGLE_AI_STUDIO_API_KEY) {
      try {
        aiEvaluation = await evaluateSubmissionWithAi(form, {
          applicantName: payload.applicantName,
          applicantEmail: normalizedEmail,
          answers: payload.answers,
          files: payload.files,
        });
      } catch {
        aiEvaluation = undefined;
      }
    }

    const now = new Date().toISOString();
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const registrationCode = generateRegistrationCode();

    const submissionData: SelectionSubmission = {
      id: submissionId,
      registrationCode,
      formId: form.id,
      formTitle: form.title,
      formSlug: form.slug,
      applicantName: payload.applicantName.trim(),
      applicantEmail: normalizedEmail,
      applicantPhone: payload.applicantPhone.trim(),
      ...(normalizedNik ? { applicantNik: normalizedNik } : {}),
      answers: payload.answers,
      files: payload.files,
      status: 'SUBMITTED',
      reviewerNote: '',
      revisionFields: [],
      interviewSchedule: '',
      reviewedBy: '',
      reviewedAt: '',
      panelScores: [],
      ...(aiEvaluation ? { aiEvaluation } : {}),
      createdAt: now,
      updatedAt: now,
    };

    // 5. Transaksi atomik: verifikasi ulang kuota & status agar zero race-condition
    await db.runTransaction(async (tx) => {
      const latestFormSnap = await tx.get(formRef);
      if (!latestFormSnap.exists) {
        throw new Error('FORM_NOT_FOUND');
      }
      const latestForm = latestFormSnap.data() as SelectionForm;
      if (latestForm.status !== 'OPEN') {
        throw new Error('FORM_CLOSED');
      }
      if (
        latestForm.quota > 0 &&
        (latestForm.submissionCount || 0) >= latestForm.quota
      ) {
        throw new Error('QUOTA_FULL');
      }

      tx.set(db.collection(COLLECTIONS.SUBMISSIONS).doc(submissionId), submissionData);
      tx.update(formRef, {
        submissionCount: FieldValue.increment(1),
        updatedAt: now,
      });

      if (payload.draftToken) {
        const draftRef = db
          .collection(COLLECTIONS.DRAFTS)
          .doc(payload.draftToken.trim().toUpperCase());
        tx.set(
          draftRef,
          {
            status: 'SUBMITTED',
            submittedRegistrationCode: registrationCode,
            updatedAt: now,
          },
          { merge: true }
        );
      }
    });

    // 6. Kirim notifikasi non-blokir jika gateway notifikasi terkonfigurasi
    await dispatchApplicantNotification({
      event: 'SUBMISSION_CREATED',
      registrationCode,
      formTitle: form.title,
      applicantName: submissionData.applicantName,
      applicantEmail: normalizedEmail,
      applicantPhone: submissionData.applicantPhone,
      status: 'SUBMITTED',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: submissionId,
        registrationCode,
        formTitle: form.title,
        applicantName: submissionData.applicantName,
        applicantEmail: submissionData.applicantEmail,
        createdAt: now,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'FORM_NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: 'Formulir seleksi tidak ditemukan.' },
          { status: 404 }
        );
      }
      if (err.message === 'FORM_CLOSED') {
        return NextResponse.json(
          { success: false, error: 'Pendaftaran untuk program seleksi ini sedang ditutup.' },
          { status: 403 }
        );
      }
      if (err.message === 'QUOTA_FULL') {
        return NextResponse.json(
          { success: false, error: 'Kuota pendaftar untuk program seleksi ini telah penuh.' },
          { status: 409 }
        );
      }
    }

    const message = err instanceof Error ? err.message : 'Gagal mengirim pendaftaran.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
