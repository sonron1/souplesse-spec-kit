import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/env';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}
