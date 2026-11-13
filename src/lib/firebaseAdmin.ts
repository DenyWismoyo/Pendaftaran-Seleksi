import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { ADMIN_ROLES } from './constants';

let adminApp: App | null = null;

function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;

  // 1. Local development: file service-account-katalog.json (gitignored)
  const localServiceAccountPath = path.resolve(process.cwd(), 'service-account-katalog.json');
  if (fs.existsSync(localServiceAccountPath)) {
    const raw = fs.readFileSync(localServiceAccountPath, 'utf-8');
    const sa = JSON.parse(raw);
    adminApp = initializeApp({
      credential: cert(sa),
      storageBucket: bucket,
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
      storageBucket: bucket,
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
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: bucket,
    });
    return adminApp;
  }

  // 4. Default ADC fallback (Google Cloud / App Hosting)
  adminApp = initializeApp({
    projectId,
    storageBucket: bucket,
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  const db = getFirestore(initAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already initialized
  }
  return db;
}

export function getAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

export function getAdminBucket() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return getStorage(initAdminApp()).bucket(bucketName);
}

export interface VerifiedAdminUser {
  uid: string;
  email?: string;
  role: string;
  token: DecodedIdToken;
}

/**
 * Verifikasi Firebase ID Token dari header Authorization: Bearer <token>
 * dan pastikan user memiliki salah satu ADMIN_ROLES.
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
    let role = (decoded.role as string | undefined) || '';

    if (!role) {
      const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
      if (userSnap.exists) {
        role = String(userSnap.data()?.role || '');
      }
    }

    if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      token: decoded,
    };
  } catch {
    return null;
  }
}
