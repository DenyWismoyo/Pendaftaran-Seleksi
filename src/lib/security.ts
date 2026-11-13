import crypto from 'crypto';

const DEFAULT_PRODUCTION_ORIGIN = 'https://pendaftaran-seleksi.vercel.app';

const rateLimitStore = new Map<string, number[]>();

export function getPrimaryAppOrigin(): string {
  const raw = process.env.ALLOWED_APP_ORIGIN || DEFAULT_PRODUCTION_ORIGIN;
  const first = raw
    .split(',')
    .map((s) => s.trim())
    .find(Boolean);
  return (first || DEFAULT_PRODUCTION_ORIGIN).replace(/\/+$/, '');
}

export function getAllowedOrigins(envOverride?: string): string[] {
  const configured = (process.env.ALLOWED_APP_ORIGIN || DEFAULT_PRODUCTION_ORIGIN)
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const origins = new Set<string>(
    configured.length > 0 ? configured : [DEFAULT_PRODUCTION_ORIGIN]
  );

  const nodeEnv = envOverride ?? process.env.NODE_ENV;
  if (nodeEnv !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return Array.from(origins);
}

export function extractOriginFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function safeSecretEqual(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const bufA = Buffer.from(candidate);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function hasValidSecretHeader(
  req: Pick<Request, 'headers'>,
  kind: 'internal' | 'cron' | 'either' = 'either'
): boolean {
  const appSecretHeader = req.headers.get('x-app-secret')?.trim() || '';
  const authHeader = req.headers.get('authorization')?.trim() || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  const internalSecret = process.env.INTERNAL_API_SECRET?.trim() || '';
  const cronSecret = process.env.CRON_SECRET?.trim() || '';

  if (kind === 'internal' || kind === 'either') {
    if (
      internalSecret &&
      (safeSecretEqual(appSecretHeader, internalSecret) ||
        safeSecretEqual(bearerToken, internalSecret))
    ) {
      return true;
    }
  }

  if (kind === 'cron' || kind === 'either') {
    if (
      cronSecret &&
      (safeSecretEqual(appSecretHeader, cronSecret) ||
        safeSecretEqual(bearerToken, cronSecret))
    ) {
      return true;
    }
  }

  return false;
}

export function assertAllowedAppOrigin(
  req: Pick<Request, 'headers'>,
  options?: { allowedOrigins?: string[]; envOverride?: string }
): { allowed: boolean; reason?: string } {
  if (hasValidSecretHeader(req, 'internal')) {
    return { allowed: true };
  }

  const allowedOrigins =
    options?.allowedOrigins ?? getAllowedOrigins(options?.envOverride);
  const originHeader = extractOriginFromHeader(req.headers.get('origin'));
  const refererOrigin = extractOriginFromHeader(req.headers.get('referer'));

  if (originHeader && allowedOrigins.includes(originHeader)) {
    return { allowed: true };
  }

  if (refererOrigin && allowedOrigins.includes(refererOrigin)) {
    return { allowed: true };
  }

  const forwardedHost = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim()
    .toLowerCase();
  const forwardedProto = (req.headers.get('x-forwarded-proto') || 'https')
    .split(',')[0]
    .trim()
    .toLowerCase();

  // Only accept same-host fallback when neither foreign Origin nor foreign Referer is present
  if (!originHeader && !refererOrigin && forwardedHost) {
    const reconstructedOrigin = `${forwardedProto}://${forwardedHost}`;
    if (allowedOrigins.includes(reconstructedOrigin)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `Akses ditolak: permintaan hanya diizinkan melalui ${getPrimaryAppOrigin()}.`,
  };
}

export function getClientIp(req: Pick<Request, 'headers'>): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateLimitStore.get(bucketKey) || []).filter((ts) => ts > cutoff);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(bucketKey, timestamps);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  timestamps.push(now);
  rateLimitStore.set(bucketKey, timestamps);

  // Prevent unbounded growth on long-lived serverless instances
  if (rateLimitStore.size > 5000) {
    const firstKey = rateLimitStore.keys().next().value;
    if (firstKey) rateLimitStore.delete(firstKey);
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

