import * as SecureStore from 'expo-secure-store';
import { apiFetch, extractErrorMessage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './client';

// Matches souplesse-api's PublicUser (auth.service.ts / users.service.ts) —
// not the web app's User shape (no name/birthDay/birthMonth/avatarUrl/createdAt).
export interface AuthUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  role: string;
  phoneVerified: boolean;
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

// POST /auth/register does not issue tokens: the account must be verified by
// SMS/OTP before the first login (souplesse-api blocks login with
// phone_not_verified until then) — see VerifyOtpScreen. The caller must not
// treat a successful register() as a login.
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

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const response = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
}

// Deliberately silent server-side on unknown/already-verified phones (avoids
// account enumeration) — always show a generic "code sent" confirmation.
export async function resendOtp(phone: string): Promise<void> {
  const response = await apiFetch('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
