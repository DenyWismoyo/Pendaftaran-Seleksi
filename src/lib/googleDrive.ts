import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

interface ServiceAccountCreds {
  clientEmail: string;
  privateKey: string;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
  driveId?: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Mengekstrak Google Drive Folder ID dari URL lengkap Google Drive atau raw ID.
 * Mendukung `/drive/folders/<id>`, `/drive/u/0/folders/<id>`, `?id=<id>`, atau `'root'`.
 */
export function extractDriveFolderId(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'root') return 'root';

  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch?.[1]) return foldersMatch[1];

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch?.[1]) return queryMatch[1];

  // Jika hanya berupa ID valid Google Drive
  if (/^[a-zA-Z0-9_-]{10,128}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function loadServiceAccountCredentials(): ServiceAccountCreds | null {
  const localPath = path.resolve(process.cwd(), 'service-account-katalog.json');
  if (fs.existsSync(localPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      if (sa.client_email && sa.private_key) {
        return {
          clientEmail: String(sa.client_email).trim(),
          privateKey: String(sa.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch {
      // Lanjut cek env
    }
  }

  const saJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (saJson) {
    try {
      const sa = JSON.parse(saJson);
      if (sa.client_email && sa.private_key) {
        return {
          clientEmail: String(sa.client_email).trim(),
          privateKey: String(sa.private_key).replace(/\\n/g, '\n'),
        };
      }
    } catch {
      // Lanjut cek env terpisah
    }
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function getDriveServiceAccountMeta(): {
  configured: boolean;
  clientEmail: string;
} {
  const creds = loadServiceAccountCredentials();
  return {
    configured: Boolean(creds),
    clientEmail: creds?.clientEmail || '',
  };
}

let cachedSaToken: { token: string; expiresAt: number } | null = null;

export async function getServiceAccountDriveToken(): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedSaToken && cachedSaToken.expiresAt > nowSec + 120) {
    return cachedSaToken.token;
  }

  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new Error(
      'Kredensial Service Account tidak ditemukan di server untuk koneksi Google Drive.'
    );
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url'
  );
  const payload = Buffer.from(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(creds.privateKey, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Gagal memperoleh token akses Google Drive dari Service Account.'
    );
  }

  cachedSaToken = {
    token: String(data.access_token),
    expiresAt: nowSec + Number(data.expires_in || 3600),
  };
  return cachedSaToken.token;
}

export async function resolveDriveToken(
  authMode: 'oauth' | 'service_account',
  oauthAccessToken?: string
): Promise<string> {
  if (authMode === 'oauth') {
    const clean = (oauthAccessToken || '').trim();
    if (!clean) {
      throw new Error(
        'Sesi Google Drive OAuth belum terhubung atau sudah kedaluwarsa. Klik tombol "Hubungkan Google Drive" terlebih dahulu.'
      );
    }
    return clean;
  }
  return getServiceAccountDriveToken();
}

function translateDriveApiError(status: number, bodyText: string): string {
  let reason = '';
  let message = bodyText;
  try {
    const parsed = JSON.parse(bodyText);
    message = parsed?.error?.message || bodyText;
    reason = parsed?.error?.errors?.[0]?.reason || '';
  } catch {
    // plain text fallback
  }

  if (status === 401) {
    return 'Token akses Google Drive sudah kedaluwarsa. Silakan hubungkan ulang akun Google Anda.';
  }
  if (reason === 'storageQuotaExceeded' || /storage quota/i.test(message)) {
    return 'Folder Drive ini berada di My Drive pribadi yang menolak unggahan Service Account (kuota 0 GB). Gunakan mode "Hubungkan Akun Google (OAuth)" atau gunakan Google Workspace Shared Drive.';
  }
  if (status === 404 || reason === 'notFound') {
    return 'Folder Google Drive tidak ditemukan atau akun saat ini belum diberi akses Lihat/Editor ke folder tersebut.';
  }
  if (status === 403 || reason === 'insufficientFilePermissions') {
    return `Izin Google Drive ditolak: ${message}`;
  }
  return `Google Drive API (${status}): ${message}`;
}

async function driveJsonFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(translateDriveApiError(res.status, text));
  }
  return JSON.parse(text) as T;
}

export async function verifyDriveFolder(
  folderId: string,
  token: string
): Promise<DriveFolderInfo> {
  if (!folderId) {
    throw new Error('ID atau URL folder Google Drive wajib diisi.');
  }

  if (folderId === 'root') {
    return {
      id: 'root',
      name: 'My Drive (Root Folder)',
      webViewLink: 'https://drive.google.com/drive/my-drive',
    };
  }

  const fields = 'id,name,mimeType,webViewLink,driveId,trashed,capabilities(canAddChildren)';
  const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(
    folderId
  )}?fields=${encodeURIComponent(fields)}&supportsAllDrives=true`;

  const meta = await driveJsonFetch<{
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    driveId?: string;
    trashed?: boolean;
    capabilities?: { canAddChildren?: boolean };
  }>(url, token);

  if (meta.trashed) {
    throw new Error('Folder Google Drive target berada di Trash / Sampah.');
  }
  if (meta.mimeType !== DRIVE_FOLDER_MIME) {
    throw new Error(
      `ID "${meta.name}" bukan sebuah Folder Google Drive (${meta.mimeType}).`
    );
  }
  if (meta.capabilities && meta.capabilities.canAddChildren === false) {
    throw new Error(
      `Akun tidak memiliki izin Editor untuk menulis file ke dalam folder "${meta.name}".`
    );
  }

  return {
    id: meta.id,
    name: meta.name,
    webViewLink:
      meta.webViewLink || `https://drive.google.com/drive/folders/${meta.id}`,
    driveId: meta.driveId,
  };
}

function escapeDriveQueryValue(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findChildItem(
  parentId: string,
  name: string,
  mimeType: string | null,
  token: string
): Promise<DriveUploadResult | null> {
  const parts = [
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    `name = '${escapeDriveQueryValue(name)}'`,
    'trashed = false',
  ];
  if (mimeType) {
    parts.push(`mimeType = '${escapeDriveQueryValue(mimeType)}'`);
  }

  const q = encodeURIComponent(parts.join(' and '));
  const url = `${DRIVE_API_BASE}/files?q=${q}&fields=${encodeURIComponent(
    'files(id,name,webViewLink)'
  )}&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await driveJsonFetch<{ files?: DriveUploadResult[] }>(url, token);
  return res.files?.[0] || null;
}

/**
 * Mengambil atau membuat subfolder di dalam parentId secara idempoten.
 */
export async function ensureDriveSubfolder(
  parentId: string,
  folderName: string,
  token: string
): Promise<DriveFolderInfo> {
  const existing = await findChildItem(parentId, folderName, DRIVE_FOLDER_MIME, token);
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      webViewLink:
        existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  const created = await driveJsonFetch<{
    id: string;
    name: string;
    webViewLink?: string;
  }>(`${DRIVE_API_BASE}/files?fields=id,name,webViewLink&supportsAllDrives=true`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentId],
    }),
  });

  return {
    id: created.id,
    name: created.name,
    webViewLink:
      created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

/**
 * Mengunggah atau memperbarui file (teks maupun biner) ke Google Drive via multipart/related.
 */
export async function upsertDriveFile(params: {
  parentId: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  token: string;
}): Promise<DriveUploadResult> {
  const { parentId, fileName, mimeType, data, token } = params;
  const existing = await findChildItem(parentId, fileName, null, token);

  const boundary = `kandidat-drive-${crypto.randomBytes(12).toString('hex')}`;
  const metadata = existing
    ? { name: fileName }
    : { name: fileName, parents: [parentId] };

  const metaPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  const bodyBuffer = Buffer.concat([metaPart, mediaHeader, data, closing]);

  const targetUrl = existing
    ? `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(
        existing.id
      )}?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true`
    : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true`;

  return driveJsonFetch<DriveUploadResult>(targetUrl, token, {
    method: existing ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(bodyBuffer.byteLength),
    },
    body: new Uint8Array(bodyBuffer),
  });
}
