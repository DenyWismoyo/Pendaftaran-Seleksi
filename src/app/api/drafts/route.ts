import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import {
  SelectionDraft,
  SelectionDraftPayloadSchema,
} from '@/types/selection';
import { generateDraftToken } from '@/lib/utils';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari retensi

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`draft-get:${ip}`, 40, 60_000);
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan memuat draf.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.trim().toUpperCase();
    const formId = searchParams.get('formId')?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Kode draf wajib diisi.' },
        { status: 400 }
      );
    }

    const snap = await getAdminDb().collection(COLLECTIONS.DRAFTS).doc(token).get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Draf dengan kode tersebut tidak ditemukan.' },
        { status: 404 }
      );
    }

    const draft = snap.data() as SelectionDraft;
    if (formId && draft.formId !== formId) {
      return NextResponse.json(
        { success: false, error: 'Kode draf bukan untuk program seleksi ini.' },
        { status: 403 }
      );
    }

    if (draft.status === 'SUBMITTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Draf ini sudah dikirim menjadi pendaftaran final.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: draft });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memuat draf.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`draft-save:${ip}`, 45, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan simpan draf.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = SelectionDraftPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Data draf tidak valid.' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const db = getAdminDb();
    const token = (payload.draftToken || generateDraftToken()).trim().toUpperCase();
    const docRef = db.collection(COLLECTIONS.DRAFTS).doc(token);
    const existing = await docRef.get();
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const expiresAt = new Date(nowDate.getTime() + DRAFT_TTL_MS).toISOString();

    if (existing.exists && existing.data()?.status === 'SUBMITTED') {
      return NextResponse.json(
        { success: false, error: 'Draf sudah disubmit.' },
        { status: 409 }
      );
    }

    const draftData: SelectionDraft = {
      ...payload,
      draftToken: token,
      status: 'IN_PROGRESS',
      expiresAt,
      createdAt: existing.exists ? String(existing.data()?.createdAt || now) : now,
      updatedAt: now,
    };

    await docRef.set(draftData, { merge: true });

    return NextResponse.json({
      success: true,
      data: {
        draftToken: token,
        updatedAt: now,
        expiresAt,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menyimpan draf.',
      },
      { status: 500 }
    );
  }
}
