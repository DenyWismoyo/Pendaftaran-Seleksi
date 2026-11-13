import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { PanelAccessRecord, PanelPermissions } from '@/types/selection';

export const PANEL_SESSION_COOKIE = 'kandidat_panel_session';

export interface PanelSessionPayload {
  panelistId: string;
  name: string;
  roleTitle: string;
  formIds: string[];
  isAllForms: boolean;
  allowedStageIds: string[];
  permissions: PanelPermissions;
  exp: number;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function getServerSecretSeed(): string {
  return (
    process.env.INTERNAL_API_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_AI_STUDIO_API_KEY?.trim() ||
    'kandidat-local-dev-panel-secret-fallback'
  );
}

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(`enc:${getServerSecretSeed()}`).digest();
}

function getHmacKey(): Buffer {
  return crypto.createHash('sha256').update(`hmac:${getServerSecretSeed()}`).digest();
}

export function normalizeAccessCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
}

export function generatePanelAccessCode(): string {
  const pick = (len: number) => {
    const bytes = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return out;
  };
  return `KND-${pick(4)}-${pick(4)}`;
}

export function maskAccessCode(plainCode: string): string {
  const normalized = normalizeAccessCode(plainCode);
  const parts = normalized.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-••••-${parts[parts.length - 1]}`;
  }
  return `••••-${normalized.slice(-4)}`;
}

export function hashAccessCode(plainCode: string): string {
  const normalized = normalizeAccessCode(plainCode);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function encryptAccessCode(plainCode: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeAccessCode(plainCode), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptAccessCode(payload: string): string {
  try {
    const [ivB64, tagB64, encB64] = (payload || '').split('.');
    if (!ivB64 || !tagB64 || !encB64) return '';
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function signPanelSessionToken(
  payload: Omit<PanelSessionPayload, 'exp'>,
  ttlSeconds = 60 * 60 * 12 // 12 jam sesi kerja panitia
): string {
  const fullPayload: PanelSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getHmacKey())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPanelSessionToken(token: string): PanelSessionPayload | null {
  try {
    const [body, sig] = (token || '').split('.');
    if (!body || !sig) return null;

    const expectedSig = crypto
      .createHmac('sha256', getHmacKey())
      .update(body)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as PanelSessionPayload;

    if (!decoded.panelistId || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Memverifikasi cookie sesi panitia kode akses sekaligus memastikan status panitia
 * masih aktif di Firestore (sehingga pencabutan akses oleh admin berlaku seketika).
 */
export async function verifyPanelRequest(
  req: NextRequest
): Promise<PanelAccessRecord | null> {
  try {
    const cookieVal = req.cookies.get(PANEL_SESSION_COOKIE)?.value || '';
    const session = verifyPanelSessionToken(cookieVal);
    if (!session) return null;

    const snap = await getAdminDb()
      .collection(COLLECTIONS.PANEL_ACCESS)
      .doc(session.panelistId)
      .get();
    if (!snap.exists) return null;

    const record = { id: snap.id, ...snap.data() } as PanelAccessRecord;
    if (!record.isActive) return null;

    return record;
  } catch {
    return null;
  }
}

