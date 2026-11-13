import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { assertAllowedAppOrigin } from '@/lib/security';
import {
  computeAveragePanelScore,
  computePanelTotalScore,
} from '@/lib/validation';
import {
  PanelScore,
  PanelScoreInputSchema,
  SelectionSubmission,
} from '@/types/selection';
import { z } from 'zod';

const SubmitPanelScoreSchema = PanelScoreInputSchema.extend({
  submissionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
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
    const parsed = SubmitPanelScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Skor penilaian tidak valid (0-100).',
        },
        { status: 400 }
      );
    }

    const { submissionId, adminScore, trackRecordScore, conceptScore, interviewScore, note } =
      parsed.data;

    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.SUBMISSIONS).doc(submissionId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data pendaftar tidak ditemukan.' },
        { status: 404 }
      );
    }

    const submission = snap.data() as SelectionSubmission;
    const evaluatorKey = (admin.email || admin.uid).toLowerCase();
    const now = new Date().toISOString();

    const nextEntry: PanelScore = {
      evaluatorEmail: evaluatorKey,
      evaluatorName: admin.name || admin.email || admin.uid,
      adminScore,
      trackRecordScore,
      conceptScore,
      interviewScore,
      totalScore: computePanelTotalScore({
        adminScore,
        trackRecordScore,
        conceptScore,
        interviewScore,
      }),
      note: note.trim(),
      scoredAt: now,
    };

    const existingScores = Array.isArray(submission.panelScores)
      ? submission.panelScores.filter(
          (item) => item.evaluatorEmail.toLowerCase() !== evaluatorKey
        )
      : [];
    const updatedPanelScores = [...existingScores, nextEntry];
    const averagePanelScore = computeAveragePanelScore(updatedPanelScores);

    await docRef.update({
      panelScores: updatedPanelScores,
      averagePanelScore,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        panelScores: updatedPanelScores,
        averagePanelScore,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal menyimpan skor rubrik penilai.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

