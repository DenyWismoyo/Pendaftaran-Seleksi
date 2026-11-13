import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { assertAllowedAppOrigin } from '@/lib/security';
import { verifyPanelRequest } from '@/lib/panelAuth';
import { computeAveragePanelScore } from '@/lib/validation';
import {
  computeWeightedStageScore,
  resolveFormStages,
  resolveStageCriteria,
} from '@/lib/selectionStages';
import {
  PanelScore,
  PanelSubmitScoreSchema,
  SelectionForm,
  SelectionSubmission,
  StageEvaluation,
  StageHistoryEntry,
} from '@/types/selection';

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

  const panelist = await verifyPanelRequest(req);
  if (!panelist) {
    return NextResponse.json(
      { success: false, error: 'Sesi panitia tidak valid atau telah berakhir.' },
      { status: 401 }
    );
  }

  if (!panelist.permissions?.canScore) {
    return NextResponse.json(
      { success: false, error: 'Akun panitia ini hanya memiliki izin lihat (tanpa hak menilai).' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = PanelSubmitScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Input nilai panitia tidak valid.',
        },
        { status: 400 }
      );
    }

    const { submissionId, stageId, criteriaScores, recommendation, note, advanceToStageId } =
      parsed.data;

    const db = getAdminDb();
    const subRef = db.collection(COLLECTIONS.SUBMISSIONS).doc(submissionId);
    const subSnap = await subRef.get();
    if (!subSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data pelamar tidak ditemukan.' },
        { status: 404 }
      );
    }

    const submission = { id: subSnap.id, ...subSnap.data() } as SelectionSubmission;
    if (!panelist.isAllForms && !panelist.formIds.includes(submission.formId)) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki akses ke program seleksi pelamar ini.' },
        { status: 403 }
      );
    }

    if (
      panelist.allowedStageIds.length > 0 &&
      !panelist.allowedStageIds.includes(stageId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak ditugaskan untuk menilai pada tahapan ini.' },
        { status: 403 }
      );
    }

    const formSnap = await db.collection(COLLECTIONS.FORMS).doc(submission.formId).get();
    const formData = formSnap.exists
      ? ({ id: formSnap.id, ...formSnap.data() } as SelectionForm)
      : undefined;

    const stages = resolveFormStages(formData);
    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) {
      return NextResponse.json(
        { success: false, error: 'Tahapan seleksi tidak valid untuk formulir ini.' },
        { status: 400 }
      );
    }

    const criteria = resolveStageCriteria(formData, stageId);
    const totalScore = computeWeightedStageScore(criteria, criteriaScores);
    const now = new Date().toISOString();

    const newEval: StageEvaluation = {
      stageId,
      stageName: targetStage.name,
      evaluatorId: panelist.id,
      evaluatorName: panelist.name,
      roleTitle: panelist.roleTitle,
      criteriaScores,
      totalScore,
      recommendation,
      note: note.trim(),
      scoredAt: now,
    };

    const existingEvals: StageEvaluation[] = Array.isArray(submission.stageEvaluations)
      ? [...submission.stageEvaluations]
      : [];
    const evalIdx = existingEvals.findIndex(
      (e) => e.stageId === stageId && e.evaluatorId === panelist.id
    );
    if (evalIdx >= 0) {
      existingEvals[evalIdx] = newEval;
    } else {
      existingEvals.push(newEval);
    }

    // Sinkronkan juga ke panelScores agar dashboard admin, CSV, & ekspor Drive tetap menyatu
    const legacyKey = `panel:${panelist.id}:${stageId}`;
    const existingPanelScores: PanelScore[] = Array.isArray(submission.panelScores)
      ? [...submission.panelScores]
      : [];
    const mappedLegacy: PanelScore = {
      evaluatorEmail: legacyKey,
      evaluatorName: `${panelist.name} (${panelist.roleTitle}) — ${targetStage.name}`,
      adminScore: Math.min(100, Math.round(criteriaScores.administrasi ?? totalScore)),
      trackRecordScore: Math.min(100, Math.round(criteriaScores.rekam_jejak ?? totalScore)),
      conceptScore: Math.min(100, Math.round(criteriaScores.kompetensi ?? totalScore)),
      interviewScore: Math.min(100, Math.round(criteriaScores.wawancara ?? totalScore)),
      totalScore,
      note: `[${targetStage.name} • ${recommendation}] ${note.trim()}`.trim(),
      scoredAt: now,
    };

    const legacyIdx = existingPanelScores.findIndex((p) => p.evaluatorEmail === legacyKey);
    if (legacyIdx >= 0) {
      existingPanelScores[legacyIdx] = mappedLegacy;
    } else {
      existingPanelScores.push(mappedLegacy);
    }

    const averagePanelScore = computeAveragePanelScore(existingPanelScores);

    const updatePayload: Partial<SelectionSubmission> = {
      stageEvaluations: existingEvals,
      panelScores: existingPanelScores,
      averagePanelScore,
      updatedAt: now,
    };

    if (submission.status === 'SUBMITTED') {
      updatePayload.status = 'REVIEWING';
    }

    if (advanceToStageId && advanceToStageId !== submission.currentStageId) {
      if (!panelist.permissions?.canAdvanceStage) {
        return NextResponse.json(
          {
            success: false,
            error: 'Anda tidak memiliki izin memindahkan tahapan kandidat.',
          },
          { status: 403 }
        );
      }

      const nextStage = stages.find((s) => s.id === advanceToStageId);
      if (!nextStage) {
        return NextResponse.json(
          { success: false, error: 'Tahap tujuan tidak ditemukan pada konfigurasi seleksi.' },
          { status: 400 }
        );
      }

      const history: StageHistoryEntry[] = Array.isArray(submission.stageHistory)
        ? [...submission.stageHistory]
        : [];
      history.push({
        stageId: nextStage.id,
        stageName: nextStage.name,
        updatedBy: `${panelist.name} (${panelist.roleTitle})`,
        updatedAt: now,
        note: note.trim() || `Dipindahkan ke ${nextStage.name}`,
      });

      updatePayload.currentStageId = nextStage.id;
      updatePayload.stageHistory = history;
    }

    await subRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      data: {
        evaluation: newEval,
        stageEvaluations: existingEvals,
        panelScores: existingPanelScores,
        averagePanelScore,
        currentStageId: updatePayload.currentStageId ?? submission.currentStageId,
        stageHistory: updatePayload.stageHistory ?? submission.stageHistory,
        status: updatePayload.status ?? submission.status,
      },
    });
  } catch (error) {
    console.error('Error submitting panelist score:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan nilai tahapan panitia.' },
      { status: 500 }
    );
  }
}

