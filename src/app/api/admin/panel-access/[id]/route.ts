import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { assertAllowedAppOrigin } from '@/lib/security';
import {
  decryptAccessCode,
  encryptAccessCode,
  generatePanelAccessCode,
  hashAccessCode,
  maskAccessCode,
} from '@/lib/panelAuth';
import {
  PanelAccessPublicView,
  PanelAccessRecord,
  UpdatePanelAccessSchema,
} from '@/types/selection';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdatePanelAccessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Perubahan data panitia tidak valid.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.PANEL_ACCESS).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data panitia tidak ditemukan.' },
        { status: 404 }
      );
    }

    const existing = { id: snap.id, ...snap.data() } as PanelAccessRecord;
    const data = parsed.data;
    const now = new Date().toISOString();

    const updatePayload: Partial<PanelAccessRecord> = {
      updatedAt: now,
    };

    if (typeof data.name === 'string') updatePayload.name = data.name.trim();
    if (typeof data.roleTitle === 'string') updatePayload.roleTitle = data.roleTitle.trim();
    if (typeof data.email === 'string') updatePayload.email = data.email.trim();
    if (typeof data.isAllForms === 'boolean') updatePayload.isAllForms = data.isAllForms;
    if (Array.isArray(data.formIds)) {
      updatePayload.formIds = data.isAllForms ? [] : data.formIds;
    } else if (data.isAllForms === true) {
      updatePayload.formIds = [];
    }
    if (Array.isArray(data.allowedStageIds)) {
      updatePayload.allowedStageIds = data.allowedStageIds;
    }
    if (data.permissions) {
      updatePayload.permissions = data.permissions;
    }
    if (typeof data.isActive === 'boolean') {
      updatePayload.isActive = data.isActive;
    }

    let plainCode = decryptAccessCode(existing.accessCodeEncrypted);
    if (data.regenerateCode) {
      plainCode = generatePanelAccessCode();
      updatePayload.accessCodeHash = hashAccessCode(plainCode);
      updatePayload.accessCodeEncrypted = encryptAccessCode(plainCode);
      updatePayload.accessCodeMasked = maskAccessCode(plainCode);
    }

    await docRef.update(updatePayload);

    const updated: PanelAccessRecord = {
      ...existing,
      ...updatePayload,
    };

    const view: PanelAccessPublicView = {
      id: updated.id,
      name: updated.name,
      roleTitle: updated.roleTitle,
      email: updated.email || '',
      accessCode: plainCode || updated.accessCodeMasked,
      accessCodeMasked: updated.accessCodeMasked,
      formIds: updated.formIds || [],
      isAllForms: Boolean(updated.isAllForms),
      allowedStageIds: updated.allowedStageIds || [],
      permissions: updated.permissions,
      isActive: Boolean(updated.isActive),
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    console.error('Error updating panel access:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui akses panitia seleksi.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const docRef = db.collection(COLLECTIONS.PANEL_ACCESS).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Data panitia tidak ditemukan.' },
        { status: 404 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting panel access:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus akses panitia.' },
      { status: 500 }
    );
  }
}

