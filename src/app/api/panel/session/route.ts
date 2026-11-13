import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { verifyPanelRequest } from '@/lib/panelAuth';
import { resolveFormStages } from '@/lib/selectionStages';
import { SelectionForm, SelectionSubmission } from '@/types/selection';

export async function GET(req: NextRequest) {
  const panelist = await verifyPanelRequest(req);
  if (!panelist) {
    return NextResponse.json(
      { success: false, error: 'Sesi panitia tidak ditemukan atau sudah berakhir.' },
      { status: 401 }
    );
  }

  try {
    const db = getAdminDb();

    const formsSnap = await db.collection(COLLECTIONS.FORMS).get();
    const allForms: SelectionForm[] = formsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SelectionForm)
    );

    const assignedForms = allForms
      .filter((f) => panelist.isAllForms || panelist.formIds.includes(f.id))
      .map((f) => ({
        ...f,
        selectionStages: resolveFormStages(f),
      }));

    const assignedFormIdSet = new Set(assignedForms.map((f) => f.id));

    const subsSnap = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .orderBy('createdAt', 'desc')
      .get();

    const canViewFiles = panelist.permissions?.canViewFiles !== false;

    const submissions: SelectionSubmission[] = subsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as SelectionSubmission))
      .filter((sub) => assignedFormIdSet.has(sub.formId))
      .map((sub) => ({
        ...sub,
        files: canViewFiles
          ? sub.files || []
          : (sub.files || []).map((f) => ({ ...f, url: '', storagePath: '' })),
      }));

    return NextResponse.json({
      success: true,
      data: {
        panelist: {
          id: panelist.id,
          name: panelist.name,
          roleTitle: panelist.roleTitle,
          email: panelist.email || '',
          formIds: panelist.formIds || [],
          isAllForms: Boolean(panelist.isAllForms),
          allowedStageIds: panelist.allowedStageIds || [],
          permissions: panelist.permissions || {
            canScore: true,
            canAdvanceStage: false,
            canViewFiles: true,
          },
          lastUsedAt: panelist.lastUsedAt,
        },
        forms: assignedForms,
        submissions,
      },
    });
  } catch (error) {
    console.error('Error loading panel session workspace:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat ruang kerja penilai.' },
      { status: 500 }
    );
  }
}

