import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import {
  extractDriveFolderId,
  getDriveServiceAccountMeta,
} from '@/lib/googleDrive';
import { assertAllowedAppOrigin } from '@/lib/security';
import { DriveSettingsSchema } from '@/types/selection';

const SETTINGS_DOC_ID = 'google_drive';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await getAdminDb()
      .collection(COLLECTIONS.SETTINGS)
      .doc(SETTINGS_DOC_ID)
      .get();

    const parsed = DriveSettingsSchema.safeParse(snap.exists ? snap.data() : {});
    return NextResponse.json({
      success: true,
      data: {
        settings: parsed.success ? parsed.data : DriveSettingsSchema.parse({}),
        serviceAccount: getDriveServiceAccountMeta(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memuat pengaturan Drive.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const parsed = DriveSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Pengaturan Drive tidak valid.',
        },
        { status: 400 }
      );
    }

    const folderId =
      parsed.data.folderId || extractDriveFolderId(parsed.data.folderInput);

    const payload = {
      ...parsed.data,
      folderId,
      updatedBy: admin.email || admin.uid,
      updatedAt: new Date().toISOString(),
    };

    await getAdminDb()
      .collection(COLLECTIONS.SETTINGS)
      .doc(SETTINGS_DOC_ID)
      .set(payload, { merge: true });

    return NextResponse.json({ success: true, data: payload });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan Drive.',
      },
      { status: 500 }
    );
  }
}

