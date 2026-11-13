import { NextRequest, NextResponse } from 'next/server';
import { getAdminBucket, getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { hasValidSecretHeader } from '@/lib/security';
import { SelectionDraft } from '@/types/selection';

export async function POST(req: NextRequest) {
  const authorizedBySecret = hasValidSecretHeader(req, 'either');
  const admin = authorizedBySecret ? null : await verifyAdminRequest(req);

  if (!authorizedBySecret && !admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const bucket = getAdminBucket();
    const now = new Date().toISOString();

    const snap = await db
      .collection(COLLECTIONS.DRAFTS)
      .where('status', '==', 'IN_PROGRESS')
      .limit(100)
      .get();

    const expiredDocs = snap.docs.filter((doc) => {
      const data = doc.data() as SelectionDraft;
      if (data.expiresAt) return data.expiresAt < now;
      // Fallback 30 hari dari updatedAt untuk draf lama
      const updatedMs = new Date(data.updatedAt || data.createdAt || 0).getTime();
      return updatedMs > 0 && Date.now() - updatedMs > 30 * 24 * 60 * 60 * 1000;
    });

    let deletedFiles = 0;
    const batch = db.batch();

    for (const doc of expiredDocs.slice(0, 50)) {
      const data = doc.data() as SelectionDraft;
      if (Array.isArray(data.files)) {
        for (const f of data.files) {
          if (f.storagePath && f.storagePath.includes('/tmp/')) {
            await bucket.file(f.storagePath).delete({ ignoreNotFound: true });
            deletedFiles++;
          }
        }
      }
      batch.delete(doc.ref);
    }

    const cleanedDrafts = Math.min(expiredDocs.length, 50);
    if (cleanedDrafts > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      data: {
        scanned: snap.size,
        cleanedDrafts,
        deletedFiles,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membersihkan draf kadaluarsa.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

