import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import {
  hashAccessCode,
  normalizeAccessCode,
  PANEL_SESSION_COOKIE,
  signPanelSessionToken,
} from '@/lib/panelAuth';
import { PanelAccessRecord, PanelLoginSchema } from '@/types/selection';

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

  const clientIp = getClientIp(req);
  const rl = checkRateLimit(`panel-login:${clientIp}`, 15, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak percobaan login. Coba lagi dalam ${rl.retryAfterSeconds} detik.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = PanelLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Format kode akses tidak valid.',
        },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeAccessCode(parsed.data.accessCode);
    const codeHash = hashAccessCode(normalizedCode);

    const db = getAdminDb();
    const snap = await db
      .collection(COLLECTIONS.PANEL_ACCESS)
      .where('accessCodeHash', '==', codeHash)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { success: false, error: 'Kode akses panitia tidak ditemukan atau salah.' },
        { status: 401 }
      );
    }

    const doc = snap.docs[0];
    const record = { id: doc.id, ...doc.data() } as PanelAccessRecord;

    if (!record.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kode akses ini telah dinonaktifkan oleh Administrator.',
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    await doc.ref.update({ lastUsedAt: now });

    const token = signPanelSessionToken({
      panelistId: record.id,
      name: record.name,
      roleTitle: record.roleTitle,
      formIds: record.formIds || [],
      isAllForms: Boolean(record.isAllForms),
      allowedStageIds: record.allowedStageIds || [],
      permissions: record.permissions || {
        canScore: true,
        canAdvanceStage: false,
        canViewFiles: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: record.id,
        name: record.name,
        roleTitle: record.roleTitle,
        formIds: record.formIds || [],
        isAllForms: Boolean(record.isAllForms),
        allowedStageIds: record.allowedStageIds || [],
        permissions: record.permissions,
      },
    });

    response.cookies.set(PANEL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error('Error in panel login:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memverifikasi kode akses panitia.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json({ success: false, error: originCheck.reason }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(PANEL_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

