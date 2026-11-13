import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Akun Anda tidak memiliki role administrator.' },
        { status: 403 }
      );
    }
    return NextResponse.json({
      success: true,
      data: {
        uid: admin.uid,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada verifikasi admin.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

