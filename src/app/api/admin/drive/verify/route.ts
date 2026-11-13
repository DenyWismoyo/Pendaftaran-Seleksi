import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebaseAdmin';
import {
  extractDriveFolderId,
  resolveDriveToken,
  verifyDriveFolder,
} from '@/lib/googleDrive';
import { assertAllowedAppOrigin } from '@/lib/security';
import { DriveVerifyRequestSchema } from '@/types/selection';

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
    const parsed = DriveVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Parameter verifikasi folder tidak valid.',
        },
        { status: 400 }
      );
    }

    const folderId =
      extractDriveFolderId(parsed.data.folderInput) ||
      (parsed.data.authMode === 'oauth' ? 'root' : '');

    if (!folderId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Masukkan URL atau ID Folder Google Drive tujuan untuk mode Service Account.',
        },
        { status: 400 }
      );
    }

    const token = await resolveDriveToken(
      parsed.data.authMode,
      parsed.data.driveAccessToken
    );
    const info = await verifyDriveFolder(folderId, token);

    return NextResponse.json({ success: true, data: info });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memverifikasi folder Google Drive.',
      },
      { status: 400 }
    );
  }
}
