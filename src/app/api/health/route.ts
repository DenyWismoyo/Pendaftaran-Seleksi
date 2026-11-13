import { NextResponse } from 'next/server';

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

  let stage = 'import-firebaseAdmin';
  try {
    const mod = await import('@/lib/firebaseAdmin');
    stage = 'getAdminDb';
    const db = mod.getAdminDb();
    stage = 'firestore-query';
    await db.collection('users').limit(1).get();
    return NextResponse.json({
      ok: true,
      nodeVersion: process.version,
      databaseId: mod.SELEKSI_DATABASE_ID,
      hasServiceAccountJson,
      hasAdminKeyParts,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        stage,
        nodeVersion: process.version,
        hasServiceAccountJson,
        hasAdminKeyParts,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      },
      { status: 500 }
    );
  }
}
