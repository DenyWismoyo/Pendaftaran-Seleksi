import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
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
}

