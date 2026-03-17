/**
 * Unit tests for server/utils/jwt.ts
 * Tests sign/verify functions directly without mocking jsonwebtoken.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const SECRETS = {
  JWT_SECRET: 'test_access_secret_that_is_at_least_32_chars_long',
  JWT_REFRESH_SECRET: 'test_refresh_secret_that_is_at_least_32_chars_long',
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRETS.JWT_SECRET
  process.env.JWT_REFRESH_SECRET = SECRETS.JWT_REFRESH_SECRET
  delete process.env.JWT_EXPIRES_IN
  delete process.env.JWT_REFRESH_EXPIRES_IN
})

afterEach(() => {
  delete process.env.JWT_SECRET
  delete process.env.JWT_REFRESH_SECRET
})

import {
  signAccessToken,
  signRefreshToken,
  verifyJwt,
  verifyRefreshToken,
} from '../../server/utils/jwt'

const BASE_PAYLOAD = {
  sub: 'user-123',
  email: 'user@example.com',
  role: 'CLIENT',
}

// ─── signAccessToken ──────────────────────────────────────────────────────────
describe('signAccessToken', () => {
  it('returns a non-empty JWT string', () => {
    const token = signAccessToken(BASE_PAYLOAD)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('embeds type=access in the payload', () => {
    const token = signAccessToken(BASE_PAYLOAD)
    const decoded = verifyJwt(token)
    expect(decoded.type).toBe('access')
    expect(decoded.sub).toBe('user-123')
    expect(decoded.email).toBe('user@example.com')
    expect(decoded.role).toBe('CLIENT')
  })

  it('includes optional sessionToken when provided', () => {
    const token = signAccessToken({ ...BASE_PAYLOAD, sessionToken: 'sess-abc' })
    const decoded = verifyJwt(token)
    expect(decoded.sessionToken).toBe('sess-abc')
  })

  it('throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET
    expect(() => signAccessToken(BASE_PAYLOAD)).toThrow('JWT_SECRET')
  })

  it('respects JWT_EXPIRES_IN env override', () => {
    process.env.JWT_EXPIRES_IN = '1h'
    const token = signAccessToken(BASE_PAYLOAD)
    const decoded = verifyJwt(token)
    expect(decoded.exp).toBeDefined()
    // exp should be roughly 1 hour from now
    const inOneHour = Math.floor(Date.now() / 1000) + 3600
    expect(Math.abs(decoded.exp! - inOneHour)).toBeLessThan(10)
  })
})

// ─── signRefreshToken ─────────────────────────────────────────────────────────
describe('signRefreshToken', () => {
  it('returns a non-empty JWT string for refresh', () => {
    const token = signRefreshToken(BASE_PAYLOAD)
    expect(token.split('.')).toHaveLength(3)
  })

  it('embeds type=refresh in the payload', () => {
    const token = signRefreshToken(BASE_PAYLOAD)
    const decoded = verifyRefreshToken(token)
    expect(decoded.type).toBe('refresh')
    expect(decoded.sub).toBe('user-123')
  })

  it('throws when JWT_REFRESH_SECRET is not set', () => {
    delete process.env.JWT_REFRESH_SECRET
    expect(() => signRefreshToken(BASE_PAYLOAD)).toThrow('JWT_REFRESH_SECRET')
  })

  it('respects JWT_REFRESH_EXPIRES_IN env override', () => {
    process.env.JWT_REFRESH_EXPIRES_IN = '30d'
    const token = signRefreshToken(BASE_PAYLOAD)
    const decoded = verifyRefreshToken(token)
    expect(decoded.exp).toBeDefined()
    const in30days = Math.floor(Date.now() / 1000) + 30 * 86400
    expect(Math.abs(decoded.exp! - in30days)).toBeLessThan(10)
  })
})

// ─── verifyJwt ────────────────────────────────────────────────────────────────
describe('verifyJwt', () => {
  it('successfully verifies a valid access token', () => {
    const token = signAccessToken(BASE_PAYLOAD)
    const decoded = verifyJwt(token)
    expect(decoded.sub).toBe('user-123')
  })

  it('throws on a tampered token', () => {
    const token = signAccessToken(BASE_PAYLOAD)
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyJwt(tampered)).toThrow()
  })

  it('throws on a refresh token passed to verifyJwt (wrong secret)', () => {
    const refreshToken = signRefreshToken(BASE_PAYLOAD)
    expect(() => verifyJwt(refreshToken)).toThrow()
  })

  it('throws when JWT_SECRET is not set', () => {
    const token = signAccessToken(BASE_PAYLOAD)
    delete process.env.JWT_SECRET
    expect(() => verifyJwt(token)).toThrow('JWT_SECRET')
  })
})

// ─── verifyRefreshToken ───────────────────────────────────────────────────────
describe('verifyRefreshToken', () => {
  it('successfully verifies a valid refresh token', () => {
    const token = signRefreshToken(BASE_PAYLOAD)
    const decoded = verifyRefreshToken(token)
    expect(decoded.sub).toBe('user-123')
    expect(decoded.type).toBe('refresh')
  })

  it('throws when passed an access token (wrong secret)', () => {
    const accessToken = signAccessToken(BASE_PAYLOAD)
    expect(() => verifyRefreshToken(accessToken)).toThrow()
  })

  it('throws when JWT_REFRESH_SECRET is not set', () => {
    const token = signRefreshToken(BASE_PAYLOAD)
    delete process.env.JWT_REFRESH_SECRET
    expect(() => verifyRefreshToken(token)).toThrow('JWT_REFRESH_SECRET')
  })
})
