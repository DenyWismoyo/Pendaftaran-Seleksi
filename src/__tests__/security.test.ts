import { afterEach, describe, expect, it } from 'vitest';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  hasValidSecretHeader,
  resetRateLimitStore,
} from '@/lib/security';

describe('Application Origin & Secret Key Protection', () => {
  const originalInternalSecret = process.env.INTERNAL_API_SECRET;
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    resetRateLimitStore();
    if (originalInternalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = originalInternalSecret;
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('allows requests from https://pendaftaran-seleksi.vercel.app', () => {
    const req = new Request('https://pendaftaran-seleksi.vercel.app/api/submissions', {
      method: 'POST',
      headers: { origin: 'https://pendaftaran-seleksi.vercel.app' },
    });
    const res = assertAllowedAppOrigin(req, { envOverride: 'production' });
    expect(res.allowed).toBe(true);
  });

  it('blocks requests from unauthorized external origins in production', () => {
    const req = new Request('https://pendaftaran-seleksi.vercel.app/api/admin/ai', {
      method: 'POST',
      headers: { origin: 'https://attacker.example.com' },
    });
    const res = assertAllowedAppOrigin(req, { envOverride: 'production' });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('https://pendaftaran-seleksi.vercel.app');
  });

  it('allows server calls with valid INTERNAL_API_SECRET / CRON_SECRET', () => {
    process.env.INTERNAL_API_SECRET = 'super-secret-token-value-123';
    process.env.CRON_SECRET = 'cron-secret-value-456';

    const internalReq = new Request('https://pendaftaran-seleksi.vercel.app/api/cron/cleanup-drafts', {
      headers: { 'x-app-secret': 'super-secret-token-value-123' },
    });
    const cronReq = new Request('https://pendaftaran-seleksi.vercel.app/api/cron/cleanup-drafts', {
      headers: { authorization: 'Bearer cron-secret-value-456' },
    });
    const badReq = new Request('https://pendaftaran-seleksi.vercel.app/api/cron/cleanup-drafts', {
      headers: { 'x-app-secret': 'wrong-secret' },
    });

    expect(hasValidSecretHeader(internalReq, 'internal')).toBe(true);
    expect(hasValidSecretHeader(cronReq, 'cron')).toBe(true);
    expect(hasValidSecretHeader(badReq, 'either')).toBe(false);
  });

  it('enforces sliding window rate limits', () => {
    expect(checkRateLimit('ip-test', 2, 60_000).ok).toBe(true);
    expect(checkRateLimit('ip-test', 2, 60_000).ok).toBe(true);
    const third = checkRateLimit('ip-test', 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

