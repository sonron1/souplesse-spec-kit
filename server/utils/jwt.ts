import jwt from 'jsonwebtoken'

export interface JwtPayload {
  sub: string // user id
  email: string
  role: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

function getSecret(key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const val = process.env[key]
  if (!val) throw new Error(`${key} environment variable is not set`)
  return val
}

/** Sign an access token (short-lived). */
export function signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'access' }, getSecret('JWT_SECRET'), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any,
  })
}

/** Sign a refresh token (long-lived). */
export function signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
  })
}

/** Verify an access token. */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_SECRET')) as JwtPayload
}

/** Verify a refresh token. */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as JwtPayload
}

