import jwt, { type SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'

export interface JwtPayload {
  sub: string // user id
  email: string
  role: string
  type: 'access' | 'refresh'
  sessionToken?: string // v3 — single-session enforcement
  iat?: number
  exp?: number
}

function getSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const val = process.env[key]?.trim()
  if (!val) throw new Error(`${key} environment variable is not set`)
  return val
}

/** Sign an access token (short-lived). */
export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: ((process.env.JWT_EXPIRES_IN ?? '15m').trim()) as StringValue,
  }
  return jwt.sign({ ...payload, type: 'access' }, getSecret('JWT_SECRET'), options)
}

/** Sign a refresh token (long-lived). */
export function signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: ((process.env.JWT_REFRESH_EXPIRES_IN ?? '7d').trim()) as StringValue,
  }
  return jwt.sign({ ...payload, type: 'refresh' }, getSecret('JWT_REFRESH_SECRET'), options)
}

/** Verify an access token. */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_SECRET')) as JwtPayload
}

/** Verify a refresh token. */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload
}
