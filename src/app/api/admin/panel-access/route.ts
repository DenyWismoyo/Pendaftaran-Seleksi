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
  CreatePanelAccessBatchSchema,
  PanelAccessPublicView,
  PanelAccessRecord,
} from '@/types/selection';

function toPublicView(record: PanelAccessRecord): PanelAccessPublicView {
  const plain = decryptAccessCode(record.accessCodeEncrypted);
  return {
    id: record.id,
    name: record.name,
    roleTitle: record.roleTitle,
    email: record.email || '',
    accessCode: plain || record.accessCodeMasked,
    accessCodeMasked: record.accessCodeMasked,
    formIds: record.formIds || [],
    isAllForms: Boolean(record.isAllForms),
    allowedStageIds: record.allowedStageIds || [],
    permissions: record.permissions || {
      canScore: true,
      canAdvanceStage: false,
      canViewFiles: true,
    },
    isActive: Boolean(record.isActive),
    lastUsedAt: record.lastUsedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const formIdFilter = req.nextUrl.searchParams.get('formId')?.trim() || '';

    const snap = await db
      .collection(COLLECTIONS.PANEL_ACCESS)
      .orderBy('createdAt', 'desc')
      .get();

    const list: PanelAccessPublicView[] = snap.docs
      .map((doc) => toPublicView({ id: doc.id, ...doc.data() } as PanelAccessRecord))
      .filter((item) => {
        if (!formIdFilter) return true;
        return item.isAllForms || item.formIds.includes(formIdFilter);
      });

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching panel access list:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat daftar panitia seleksi.' },
      { status: 500 }
    );
  }
}

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
    const parsed = CreatePanelAccessBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data panitia seleksi tidak valid.',
        },
        { status: 400 }
      );
    }

    const { members, formIds, isAllForms, allowedStageIds, permissions } = parsed.data;
    if (!isAllForms && formIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pilih minimal satu program seleksi atau aktifkan akses semua program.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const existingSnap = await db.collection(COLLECTIONS.PANEL_ACCESS).select('accessCodeHash').get();
    const usedHashes = new Set<string>(
      existingSnap.docs.map((d) => String(d.data()?.accessCodeHash || ''))
    );

    const now = new Date().toISOString();
    const batch = db.batch();
    const created: PanelAccessPublicView[] = [];
    const effectivePermissions = permissions || {
      canScore: true,
      canAdvanceStage: false,
      canViewFiles: true,
    };

    for (const member of members) {
      let plainCode = generatePanelAccessCode();
      let codeHash = hashAccessCode(plainCode);
      let guard = 0;
      while (usedHashes.has(codeHash) && guard < 10) {
        plainCode = generatePanelAccessCode();
        codeHash = hashAccessCode(plainCode);
        guard++;
      }
      usedHashes.add(codeHash);

      const docRef = db.collection(COLLECTIONS.PANEL_ACCESS).doc();
      const record: PanelAccessRecord = {
        id: docRef.id,
        name: member.name.trim(),
        roleTitle: (member.roleTitle || 'Panitia Penilai').trim(),
        email: (member.email || '').trim(),
        accessCodeHash: codeHash,
        accessCodeEncrypted: encryptAccessCode(plainCode),
        accessCodeMasked: maskAccessCode(plainCode),
        formIds: isAllForms ? [] : formIds,
        isAllForms,
        allowedStageIds,
        permissions: effectivePermissions,
        isActive: true,
        createdBy: admin.email || 'admin',
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, record);
      created.push({
        id: record.id,
        name: record.name,
        roleTitle: record.roleTitle,
        email: record.email,
        accessCode: plainCode,
        accessCodeMasked: record.accessCodeMasked,
        formIds: record.formIds,
        isAllForms: record.isAllForms,
        allowedStageIds: record.allowedStageIds,
        permissions: record.permissions,
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating panel access batch:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat kode akses panitia seleksi.' },
      { status: 500 }
    );
  }
}

