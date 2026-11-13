import { NextRequest, NextResponse } from 'next/server';
import {
  buildBatchSummaryMarkdown,
  buildCandidateWordDocBuffer,
  sanitizeDriveName,
} from '@/lib/candidateDossier';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import {
  ensureDriveSubfolder,
  extractDriveFolderId,
  resolveDriveToken,
  upsertDriveFile,
  verifyDriveFolder,
} from '@/lib/googleDrive';
import { assertAllowedAppOrigin } from '@/lib/security';
import {
  DrivePrepareRequestSchema,
  SelectionSubmission,
} from '@/types/selection';

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = DrivePrepareRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Permintaan ekspor Drive tidak valid.',
        },
        { status: 400 }
      );
    }

    const {
      folderInput,
      authMode,
      driveAccessToken,
      createBatchSubfolder,
      batchFolderName,
      format,
      submissionIds,
    } = parsed.data;

    const baseFolderId =
      extractDriveFolderId(folderInput) || (authMode === 'oauth' ? 'root' : '');

    if (!baseFolderId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Masukkan URL atau ID Folder Google Drive tujuan terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    const token = await resolveDriveToken(authMode, driveAccessToken);
    const verifiedBase = await verifyDriveFolder(baseFolderId, token);

    let targetFolder = verifiedBase;
    if (createBatchSubfolder || baseFolderId === 'root') {
      const dateTag = new Date().toISOString().slice(0, 10);
      const subName = sanitizeDriveName(
        batchFolderName.trim() || `Kandidat Batch ${dateTag}`,
        70
      );
      targetFolder = await ensureDriveSubfolder(verifiedBase.id, subName, token);
    }

    // Ambil data pendaftar terpilih untuk membuat dokumen rekap batch (00-Rekap-Batch)
    const db = getAdminDb();
    const refs = submissionIds
      .slice(0, 200)
      .map((id) => db.collection(COLLECTIONS.SUBMISSIONS).doc(id));
    const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
    const submissions = snaps
      .filter((s) => s.exists)
      .map((s) => ({ id: s.id, ...s.data() }) as SelectionSubmission);

    if (submissions.length > 0) {
      const summaryLabel = targetFolder.name || 'Seleksi Kandidat';
      const summaryMd = buildBatchSummaryMarkdown(submissions, summaryLabel);
      const baseSummaryName = '00-Rekap-Batch-Kandidat';

      if (format === 'md' || format === 'both') {
        await upsertDriveFile({
          parentId: targetFolder.id,
          fileName: `${baseSummaryName}.md`,
          mimeType: 'text/markdown; charset=utf-8',
          data: Buffer.from(summaryMd, 'utf-8'),
          token,
        });
      }
      if (format === 'doc' || format === 'both') {
        await upsertDriveFile({
          parentId: targetFolder.id,
          fileName: `${baseSummaryName}.doc`,
          mimeType: 'application/msword',
          data: buildCandidateWordDocBuffer(
            `Rekapitulasi Batch - ${summaryLabel}`,
            summaryMd
          ),
          token,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        targetFolderId: targetFolder.id,
        targetFolderName: targetFolder.name,
        targetFolderUrl: targetFolder.webViewLink,
        baseFolderId: verifiedBase.id,
        baseFolderName: verifiedBase.name,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal menyiapkan folder tujuan di Google Drive.',
      },
      { status: 400 }
    );
  }
}
