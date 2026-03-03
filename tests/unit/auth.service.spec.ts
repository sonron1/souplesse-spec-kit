import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../../server/services/auth.service'
import { userRepository } from '../../server/repositories/user.repository'
import bcrypt from 'bcryptjs'
import * as jwtUtils from '../../server/utils/jwt'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../../server/repositories/user.repository')
vi.mock('../../server/utils/jwt')
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../server/utils/systemLog', () => ({ systemLog: vi.fn() }))
vi.mock('../../server/utils/email', () => ({ sendVerificationEmail: vi.fn().mockResolvedValue(undefined) }))

const mockUserRepo = vi.mocked(userRepository)
const mockJwt = vi.mocked(jwtUtils)

const MOCK_USER = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  role: 'CLIENT' as const,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockJwt.signAccessToken.mockReturnValue('mock-access-token')
  mockJwt.signRefreshToken.mockReturnValue('mock-refresh-token')
  mockUserRepo.update.mockResolvedValue(MOCK_USER)
})

// ─── register() ───────────────────────────────────────────────────────────────
describe('authService.register', () => {
  it('creates a new user and returns tokens', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(MOCK_USER)

    const result = await authService.register({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password1!',
    })

    expect(result.user.email).toBe('test@example.com')
    expect(result.tokens.accessToken).toBe('mock-access-token')
    expect(result.tokens.refreshToken).toBe('mock-refresh-token')
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })

  it('throws 409 if email already registered', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(MOCK_USER)

    await expect(
      authService.register({ name: 'X', email: 'test@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('hashes the password before storing', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(MOCK_USER)

    await authService.register({ name: 'X', email: 'new@example.com', password: 'Password1!' })

    const createCall = mockUserRepo.create.mock.calls[0][0]
    expect(createCall.passwordHash).not.toBe('Password1!')
    const isHashed = await bcrypt.compare('Password1!', createCall.passwordHash)
    expect(isHashed).toBe(true)
  })
})

// ─── login() ──────────────────────────────────────────────────────────────────
describe('authService.login', () => {
  it('returns tokens for valid credentials', async () => {
    const hash = await bcrypt.hash('Password1!', 1)
    mockUserRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordHash: hash })

    const result = await authService.login({ email: 'test@example.com', password: 'Password1!' })

    expect(result.tokens.accessToken).toBe('mock-access-token')
  })

  it('throws 401 for unknown email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)

    await expect(
      authService.login({ email: 'unknown@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 1)
    mockUserRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordHash: hash })

    await expect(
      authService.login({ email: 'test@example.com', password: 'WrongPass1!' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── refreshToken() ───────────────────────────────────────────────────────────
describe('authService.refreshToken', () => {
  it('issues new tokens for a valid refresh token', async () => {
    const storedRefresh = 'valid-refresh-token'
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      type: 'refresh',
    })
    mockUserRepo.findById.mockResolvedValue({ ...MOCK_USER, refreshToken: storedRefresh })

    const tokens = await authService.refreshToken(storedRefresh)
    expect(tokens.accessToken).toBe('mock-access-token')
  })

  it('throws 401 if refresh token does not match stored token', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      type: 'refresh',
    })
    mockUserRepo.findById.mockResolvedValue({ ...MOCK_USER, refreshToken: 'different-token' })

    await expect(authService.refreshToken('stale-token')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 if token is invalid JWT', async () => {
    mockJwt.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid signature')
    })

    await expect(authService.refreshToken('bad-token')).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ─── logout() ─────────────────────────────────────────────────────────────────
describe('authService.logout', () => {
  it('clears the refresh token for the user', async () => {
    mockUserRepo.clearRefreshToken.mockResolvedValue(undefined)

    await authService.logout('user-1')
    expect(mockUserRepo.clearRefreshToken).toHaveBeenCalledWith('user-1')
  })
})
