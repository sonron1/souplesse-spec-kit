import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/env';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

/** souplesse-api wraps most rejections as `{ code?, message }`; class-validator
 * errors instead return `message` as a string array — joined here so callers
 * always get a single displayable string. */
export async function extractErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const message = body?.message ?? body?.statusMessage ?? body?.error;
  if (Array.isArray(message)) return message.join('\n');
  return message ?? 'Une erreur est survenue.';
}

async function buildHeaders(existing?: HeadersInit, isFormData = false): Promise<Headers> {
  const headers = new Headers(existing);
  // multipart bodies (file upload) need the browser/RN runtime to set its own
  // Content-Type with the multipart boundary — setting it ourselves breaks the upload.
  if (!isFormData) headers.set('Content-Type', 'application/json');
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

/**
 * Refreshes the access+refresh token pair using the stored refresh token.
 * Concurrent 401s share a single in-flight refresh instead of each firing
 * their own POST /auth/refresh.
 */
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const data = await response.json();
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// Endpoints that must never trigger a refresh-and-retry: refreshing on their
// own 401 would either loop (refresh calling itself) or mask a genuine
// invalid-credentials error (login) as a silent retry.
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login'];

/**
 * Authenticated fetch wrapper. On a 401 (expired access token) it transparently
 * refreshes and retries the request once; if the refresh itself fails (revoked
 * or expired refresh token), it clears the stored tokens and returns the
 * original 401 so the caller's existing error handling applies — this is what
 * makes AuthContext.restoreSession() correctly fall back to the login screen
 * without any extra wiring here.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isFormData = options.body instanceof FormData;

  const doFetch = async () =>
    fetch(`${API_URL}${path}`, { ...options, headers: await buildHeaders(options.headers, isFormData) });

  const response = await doFetch();

  if (response.status !== 401 || NO_REFRESH_PATHS.includes(path)) {
    return response;
  }

  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  const refreshed = await refreshPromise;

  if (!refreshed) {
    await clearTokens();
    return response; // original 401 — caller treats this as "not authenticated"
  }

  return doFetch();
}
