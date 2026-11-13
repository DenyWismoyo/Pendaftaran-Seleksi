import { NextResponse } from 'next/server';
import { getAdminDb, SELEKSI_DATABASE_ID } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasServiceAccountJson = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT
  );
  const hasAdminKeyParts = Boolean(
    (process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  try {
    const db = getAdminDb();
    await db.collection('users').limit(1).get();
    return NextResponse.json({
      ok: true,
      databaseId: SELEKSI_DATABASE_ID,
      hasServiceAccountJson,
      hasAdminKeyParts,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        databaseId: SELEKSI_DATABASE_ID,
        hasServiceAccountJson,
        hasAdminKeyParts,
        error: err instanceof Error ? err.message : 'Admin SDK gagal terhubung.',
      },
      { status: 500 }
    );
  }
}

