'use client';

import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getSecondaryDriveAuth() {
  const existing = getApps().find((a) => a.name === 'kandidat-drive-oauth');
  const app = existing || initializeApp(firebaseConfig, 'kandidat-drive-oauth');
  return getAuth(app);
}

/**
 * Membuka popup OAuth Google Drive memakai secondary Firebase app agar sesi login
 * Admin utama di `auth` tidak tertimpa/berubah saat menghubungkan akun Drive apa pun.
 */
export async function connectGoogleDriveOAuth(): Promise<{
  accessToken: string;
  email: string;
}> {
  const driveAuth = getSecondaryDriveAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive');
  provider.setCustomParameters({
    prompt: 'select_account consent',
  });

  try {
    const result = await signInWithPopup(driveAuth, provider);
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken || '';
    const email = result.user?.email || 'Akun Google Terhubung';

    // Keluar dari secondary app lokal saja supaya token Drive tidak tersimpan permanen di browser
    await signOut(driveAuth).catch(() => undefined);

    if (!accessToken) {
      throw new Error(
        'Izin akses Google Drive tidak dikembalikan oleh Google. Pastikan Anda mencentang izin Google Drive saat login.'
      );
    }

    return { accessToken, email };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';

    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Jendela otorisasi Google Drive ditutup sebelum selesai.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
    }
    throw err instanceof Error
      ? err
      : new Error('Gagal menghubungkan akun Google Drive.');
  }
}

