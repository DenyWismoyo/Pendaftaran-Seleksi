import { NextRequest, NextResponse } from 'next/server';
import {
  buildCandidateDossierMarkdown,
  buildCandidateFolderName,
  buildCandidateWordDocBuffer,
  sanitizeDriveName,
} from '@/lib/candidateDossier';
import { COLLECTIONS } from '@/lib/constants';
import {
  getAdminBucket,
  getAdminDb,
  verifyAdminRequest,
} from '@/lib/firebaseAdmin';
import {
  ensureDriveSubfolder,
  resolveDriveToken,
  upsertDriveFile,
} from '@/lib/googleDrive';
import { assertAllowedAppOrigin } from '@/lib/security';
import {
  DriveExportCandidateRequestSchema,
  SelectionForm,
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
    const parsed = DriveExportCandidateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data ekspor kandidat tidak valid.',
        },
        { status: 400 }
      );
    }

    const {
      submissionId,
      parentFolderId,
      authMode,
      driveAccessToken,
      format,
      includeFiles,
    } = parsed.data;

    const db = getAdminDb();
    const subSnap = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .doc(submissionId)
      .get();

    if (!subSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data kandidat tidak ditemukan.' },
        { status: 404 }
      );
    }

    const submission = {
      id: subSnap.id,
      ...subSnap.data(),
    } as SelectionSubmission;

    let formDef: SelectionForm | undefined;
    if (submission.formId) {
      const formSnap = await db
        .collection(COLLECTIONS.FORMS)
        .doc(submission.formId)
        .get();
      if (formSnap.exists) {
        formDef = { id: formSnap.id, ...formSnap.data() } as SelectionForm;
      }
    }

    const token = await resolveDriveToken(authMode, driveAccessToken);
    const folderName = buildCandidateFolderName(submission);
    const candidateFolder = await ensureDriveSubfolder(
      parentFolderId,
      folderName,
      token
    );

    const safeApplicantName = sanitizeDriveName(submission.applicantName, 50);
    const dossierMd = buildCandidateDossierMarkdown(submission, formDef);
    const dossierBaseName = `01-Biodata-dan-Jawaban-${safeApplicantName}`;

    let uploadedCount = 0;

    if (format === 'md' || format === 'both') {
      await upsertDriveFile({
        parentId: candidateFolder.id,
        fileName: `${dossierBaseName}.md`,
        mimeType: 'text/markdown; charset=utf-8',
        data: Buffer.from(dossierMd, 'utf-8'),
        token,
      });
      uploadedCount++;
    }

    if (format === 'doc' || format === 'both') {
      await upsertDriveFile({
        parentId: candidateFolder.id,
        fileName: `${dossierBaseName}.doc`,
        mimeType: 'application/msword',
        data: buildCandidateWordDocBuffer(
          `Profil Kandidat - ${submission.applicantName}`,
          dossierMd
        ),
        token,
      });
      uploadedCount++;
    }

    const attachmentWarnings: string[] = [];
    if (includeFiles && Array.isArray(submission.files) && submission.files.length > 0) {
      const bucket = getAdminBucket();
      for (let i = 0; i < submission.files.length; i++) {
        const f = submission.files[i];
        try {
          let fileBuffer: Buffer | null = null;
          if (f.storagePath && !f.storagePath.includes('..')) {
            const [downloaded] = await bucket.file(f.storagePath).download();
            fileBuffer = downloaded;
          } else if (f.url && f.url.startsWith('https://')) {
            const remoteRes = await fetch(f.url);
            if (remoteRes.ok) {
              fileBuffer = Buffer.from(await remoteRes.arrayBuffer());
            }
          }

          if (!fileBuffer || fileBuffer.byteLength === 0) {
            attachmentWarnings.push(`${f.fileName}: file kosong atau gagal diunduh`);
            continue;
          }

          const numPrefix = String(i + 2).padStart(2, '0');
          const cleanLabel = sanitizeDriveName(f.fieldLabel || 'Berkas', 36);
          const cleanOriginalName = sanitizeDriveName(f.fileName || 'lampiran', 64);
          const driveFileName = `${numPrefix}-${cleanLabel} - ${cleanOriginalName}`;

          await upsertDriveFile({
            parentId: candidateFolder.id,
            fileName: driveFileName,
            mimeType: f.mimeType || 'application/octet-stream',
            data: fileBuffer,
            token,
          });
          uploadedCount++;
        } catch (fileErr: unknown) {
          attachmentWarnings.push(
            `${f.fileName}: ${
              fileErr instanceof Error ? fileErr.message : 'gagal unggah'
            }`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        applicantName: submission.applicantName,
        registrationCode: submission.registrationCode,
        folderId: candidateFolder.id,
        folderName: candidateFolder.name,
        folderUrl: candidateFolder.webViewLink,
        uploadedCount,
        attachmentWarnings,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal mengekspor data kandidat ke Google Drive.',
      },
      { status: 400 }
    );
  }
}

