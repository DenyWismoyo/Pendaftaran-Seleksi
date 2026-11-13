import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import {
  CreateSubmissionPayloadSchema,
  SelectionForm,
  SelectionSubmission,
} from '@/types/selection';
import { validateDynamicSubmission } from '@/lib/validation';
import { generateRegistrationCode } from '@/lib/utils';
import { evaluateSubmissionWithAi } from '@/lib/aiEvaluator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!code || !email) {
      return NextResponse.json(
        { success: false, error: 'Masukkan Kode Pendaftaran dan Email yang digunakan saat mendaftar.' },
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

    // Kembalikan ringkasan status yang aman untuk publik
    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        registrationCode: submission.registrationCode,
        formTitle: submission.formTitle,
        applicantName: submission.applicantName,
        applicantEmail: submission.applicantEmail,
        status: submission.status,
        reviewerNote: submission.reviewerNote || '',
        files: submission.files.map((f) => ({
          fieldLabel: f.fieldLabel,
          fileName: f.fileName,
          size: f.size,
        })),
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memeriksa status pendaftaran.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    if (form.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran untuk program seleksi ini sedang ditutup.' },
        { status: 403 }
      );
    }

    if (form.quota > 0 && (form.submissionCount || 0) >= form.quota) {
      return NextResponse.json(
        { success: false, error: 'Kuota pendaftar untuk program seleksi ini telah penuh.' },
        { status: 409 }
      );
    }

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

    // Opsional: AI Pre-screening oleh Clario AI jika diaktifkan & CLARIO_API_KEY tersedia
    let aiEvaluation = undefined;
    if (form.requireAiPreScreening && process.env.CLARIO_API_KEY) {
      try {
        aiEvaluation = await evaluateSubmissionWithAi(form, {
          applicantName: payload.applicantName,
          applicantEmail: payload.applicantEmail,
          answers: payload.answers,
          files: payload.files,
        });
      } catch {
        // Jangan gagalkan pendaftaran user apabila AI sedang tidak tersedia
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
      applicantEmail: payload.applicantEmail.trim().toLowerCase(),
      applicantPhone: payload.applicantPhone.trim(),
      answers: payload.answers,
      files: payload.files,
      status: 'SUBMITTED',
      reviewerNote: '',
      reviewedBy: '',
      reviewedAt: '',
      ...(aiEvaluation ? { aiEvaluation } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(db.collection(COLLECTIONS.SUBMISSIONS).doc(submissionId), submissionData);
    batch.update(formRef, {
      submissionCount: FieldValue.increment(1),
      updatedAt: now,
    });
    await batch.commit();

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
    const message = err instanceof Error ? err.message : 'Gagal mengirim pendaftaran.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
