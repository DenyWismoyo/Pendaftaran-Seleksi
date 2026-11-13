import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Database Firestore terpisah khusus sistem Pendaftaran Seleksi
const seleksiDatabaseId =
  process.env.NEXT_PUBLIC_SELEKSI_DATABASE_ID || 'pendaftaran-seleksi';

// Bucket Cloud Storage terpisah khusus berkas Pendaftaran Seleksi
const seleksiBucket =
  process.env.NEXT_PUBLIC_SELEKSI_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'seleksi-solo-technopark';
const bucketUrl = seleksiBucket.startsWith('gs://')
  ? seleksiBucket
  : `gs://${seleksiBucket}`;

export const auth = getAuth(app);
export const db = getFirestore(app, seleksiDatabaseId);
export const storage = getStorage(app, bucketUrl);
export { app, seleksiDatabaseId, seleksiBucket };
