import * as SecureStore from 'expo-secure-store';
import { apiFetch, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './client';

export interface AuthUser {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  gender?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  avatarUrl?: string | null;
  role: string;
  createdAt?: string | null;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE';
  password: string;
  confirmPassword: string;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.message ?? body?.statusMessage ?? body?.error ?? 'Une erreur est survenue.';
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const data = await response.json();
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
  return data.user;
}

// POST /api/auth/register does not issue tokens: the account must be
// email-verified before the first login (see CLAUDE.md — "Email verification
// enforced"). The caller must not treat a successful register() as a login.
export async function register(input: RegisterInput): Promise<AuthUser> {
  const response = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  const data = await response.json();
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
