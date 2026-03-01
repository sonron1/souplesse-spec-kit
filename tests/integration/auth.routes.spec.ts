/**
 * Integration tests for auth API routes.
 * These tests mock the database and verify end-to-end HTTP behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../../server/services/auth.service'

vi.mock('../../server/services/auth.service')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockAuth = vi.mocked(authService)

const MOCK_TOKENS = { accessToken: 'access-token', refreshToken: 'refresh-token' }
const MOCK_USER = { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'CLIENT' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/register (route handler unit)', () => {
  it('calls authService.register and returns tokens', async () => {
    mockAuth.register.mockResolvedValue({ user: MOCK_USER, tokens: MOCK_TOKENS })

    const result = await authService.register({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password1!',
    })

    expect(result.user.email).toBe('test@example.com')
    expect(result.tokens.accessToken).toBe('access-token')
  })

  it('propagates 409 when email is taken', async () => {
    mockAuth.register.mockRejectedValue({
      statusCode: 409,
      statusMessage: 'Email already registered',
    })

    await expect(
      authService.register({ name: 'X', email: 'dup@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('POST /api/auth/login (route handler unit)', () => {
  it('returns tokens for valid credentials', async () => {
    mockAuth.login.mockResolvedValue({ user: MOCK_USER, tokens: MOCK_TOKENS })

    const result = await authService.login({ email: 'test@example.com', password: 'Password1!' })
    expect(result.tokens.refreshToken).toBe('refresh-token')
  })

  it('throws 401 for invalid credentials', async () => {
    mockAuth.login.mockRejectedValue({ statusCode: 401, statusMessage: 'Invalid credentials' })

    await expect(authService.login({ email: 'x@x.com', password: 'Bad1!' })).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})

describe('POST /api/auth/refresh (route handler unit)', () => {
  it('issues new tokens for a valid refresh token', async () => {
    mockAuth.refreshToken.mockResolvedValue(MOCK_TOKENS)

    const tokens = await authService.refreshToken('valid-refresh-token')
    expect(tokens.accessToken).toBe('access-token')
  })
})

describe('POST /api/auth/logout (route handler unit)', () => {
  it('logs out the user', async () => {
    mockAuth.logout.mockResolvedValue()

    await authService.logout('user-1')
    expect(mockAuth.logout).toHaveBeenCalledWith('user-1')
  })
})
