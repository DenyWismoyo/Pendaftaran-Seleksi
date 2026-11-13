import { auth } from './firebase';

export async function adminFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'Sesi login tidak ditemukan.' };
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({
    success: false,
    error: 'Respons server tidak valid.',
  }));
  return json;
}

