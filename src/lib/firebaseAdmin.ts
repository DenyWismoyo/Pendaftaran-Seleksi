import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { ADMIN_ROLES } from './constants';

let adminApp: App | null = null;
let seleksiDb: Firestore | null = null;

export const SELEKSI_DATABASE_ID =
  process.env.NEXT_PUBLIC_SELEKSI_DATABASE_ID || 'pendaftaran-seleksi';

export const SELEKSI_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SELEKSI_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'seleksi-solo-technopark';

function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // 1. Local development: file service-account-katalog.json (gitignored)
  const localServiceAccountPath = path.resolve(
    process.cwd(),
    'service-account-katalog.json'
  );
  if (fs.existsSync(localServiceAccountPath)) {
    const raw = fs.readFileSync(localServiceAccountPath, 'utf-8');
    const sa = JSON.parse(raw);
    adminApp = initializeApp({
      credential: cert(sa),
      storageBucket: SELEKSI_STORAGE_BUCKET,
    });
    return adminApp;
  }

  // 2. Env JSON string (Vercel / App Hosting / Secret Manager)
  const saJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (saJson) {
    const sa = JSON.parse(saJson);
    adminApp = initializeApp({
      credential: cert(sa),
      storageBucket: SELEKSI_STORAGE_BUCKET,
    });
    return adminApp;
  }

  // 3. Individual Admin Env Vars
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: SELEKSI_STORAGE_BUCKET,
    });
    return adminApp;
  }

  // 4. Default ADC fallback (Google Cloud / App Hosting)
  adminApp = initializeApp({
    projectId,
    storageBucket: SELEKSI_STORAGE_BUCKET,
  });
  return adminApp;
}

/**
 * Mengambil instance Firestore Admin yang terhubung ke database terpisah "pendaftaran-seleksi".
 */
export function getAdminDb(): Firestore {
  if (seleksiDb) return seleksiDb;
  seleksiDb = getFirestore(initAdminApp(), SELEKSI_DATABASE_ID);
  try {
    seleksiDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already initialized
  }
  return seleksiDb;
}

export function getAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

/**
 * Mengambil bucket Cloud Storage terpisah "seleksi-solo-technopark".
 */
export function getAdminBucket() {
  return getStorage(initAdminApp()).bucket(SELEKSI_STORAGE_BUCKET);
}

export interface VerifiedAdminUser {
  uid: string;
  email?: string;
  name?: string;
  role: string;
  token: DecodedIdToken;
}

/**
 * Verifikasi Firebase ID Token dari header Authorization: Bearer <token>
 * dan cek tabel admin terpisah `users/{uid}` di database "pendaftaran-seleksi".
 */
export async function verifyAdminRequest(
  req: NextRequest
): Promise<VerifiedAdminUser | null> {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const idToken = authHeader.slice(7).trim();
    if (!idToken) return null;

    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Role diverifikasi khusus dari koleksi `users` di database "pendaftaran-seleksi"
    // agar akun admin terpisah dari sistem lain.
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) {
      return null;
    }

    const userData = userSnap.data();
    const role = String(userData?.role || '');
    const isActive = userData?.isActive !== false;

    if (!isActive || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email || String(userData?.email || ''),
      name: String(userData?.name || decoded.name || ''),
      role,
      token: decoded,
    };
  } catch (err) {
    console.error('[verifyAdminRequest] Gagal verifikasi admin:', err);
    return null;
  }
}
