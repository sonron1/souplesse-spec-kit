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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_USER = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  role: 'CLIENT' as const,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any

beforeEach(() => {
  vi.clearAllMocks()
  mockJwt.signAccessToken.mockReturnValue('mock-access-token')
  mockJwt.signRefreshToken.mockReturnValue('mock-refresh-token')
  mockUserRepo.update.mockResolvedValue(MOCK_USER)
})

// ─── register() ───────────────────────────────────────────────────────────────
describe('authService.register', () => {
  it('creates a new user and sends verification email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.findByPhone?.mockResolvedValue?.(null)
    mockUserRepo.create.mockResolvedValue(MOCK_USER)

    const result = await authService.register({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+22900000001',
      gender: 'MALE',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })

    expect(result.user.email).toBe('test@example.com')
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })

  it('throws 409 if email already registered', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(MOCK_USER)

    await expect(
      authService.register({
        firstName: 'X',
        lastName: 'Y',
        email: 'test@example.com',
        phone: '+22900000002',
        gender: 'MALE',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 if phone already registered (phone_taken)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.findByPhone = vi.fn().mockResolvedValue(MOCK_USER)

    await expect(
      authService.register({
        firstName: 'X',
        lastName: 'Y',
        email: 'new@example.com',
        phone: '+22900000001',
        gender: 'MALE',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      })
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'phone_taken' } })
  })

  it('hashes the password before storing', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.findByPhone?.mockResolvedValue?.(null)
    mockUserRepo.create.mockResolvedValue(MOCK_USER)

    await authService.register({
      firstName: 'X',
      lastName: 'Y',
      email: 'new@example.com',
      phone: '+22900000003',
      gender: 'MALE',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })

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

// ─── refreshToken() — C003 session_revoked ────────────────────────────────────
describe('authService.refreshToken — session_revoked', () => {
  it('throws 401 session_revoked when sessionToken in token mismatches DB', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      type: 'refresh',
      sessionToken: 'old-session-token',
    } as any)
    mockUserRepo.findById.mockResolvedValue({
      ...MOCK_USER,
      refreshToken: 'valid-token',
      sessionToken: 'new-session-token', // different from JWT
    })

    await expect(authService.refreshToken('valid-token')).rejects.toMatchObject({
      statusCode: 401,
      data: { code: 'session_revoked' },
    })
  })

  it('passes when sessionToken matches DB', async () => {
    mockJwt.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'CLIENT',
      type: 'refresh',
      sessionToken: 'same-token',
    } as any)
    mockUserRepo.findById.mockResolvedValue({
      ...MOCK_USER,
      refreshToken: 'valid-token',
      sessionToken: 'same-token',
    })

    const tokens = await authService.refreshToken('valid-token')
    expect(tokens.accessToken).toBe('mock-access-token')
  })
})

// ─── login() — account lockout (T0217) ───────────────────────────────────────
describe('authService.login — account lockout', () => {
  it('throws 403 when email not yet verified', async () => {
    const hash = await bcrypt.hash('Password1!', 1)
    mockUserRepo.findByEmail.mockResolvedValue({
      ...MOCK_USER,
      passwordHash: hash,
      emailVerified: false,
    })

    await expect(
      authService.login({ email: 'test@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 423 when account is locked', async () => {
    const hash = await bcrypt.hash('Password1!', 1)
    mockUserRepo.findByEmail.mockResolvedValue({
      ...MOCK_USER,
      passwordHash: hash,
      emailVerified: true,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more min
    })

    await expect(
      authService.login({ email: 'test@example.com', password: 'Password1!' })
    ).rejects.toMatchObject({ statusCode: 423 })
  })
})

// ─── verifyEmail() ────────────────────────────────────────────────────────────
describe('authService.verifyEmail', () => {
  it('marks user as verified and clears token', async () => {
    mockUserRepo.findByVerificationToken = vi.fn().mockResolvedValue(MOCK_USER)
    mockUserRepo.update.mockResolvedValue({ ...MOCK_USER, emailVerified: true })

    const result = await authService.verifyEmail('valid-token-123')

    expect(result.email).toBe(MOCK_USER.email)
    expect(mockUserRepo.update).toHaveBeenCalledWith(
      MOCK_USER.id,
      expect.objectContaining({ emailVerified: true, emailVerificationToken: null })
    )
  })

  it('throws 404 for invalid/already-used token', async () => {
    mockUserRepo.findByVerificationToken = vi.fn().mockResolvedValue(null)

    await expect(authService.verifyEmail('bad-token')).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ─── getProfile() ─────────────────────────────────────────────────────────────
describe('authService.getProfile', () => {
  it('returns the safe user profile', async () => {
    const fullUser = {
      ...MOCK_USER,
      firstName: 'Test',
      lastName: 'User',
      phone: '+22900000001',
      gender: 'MALE',
      birthDay: 5,
      birthMonth: 3,
      avatarUrl: null,
    }
    mockUserRepo.findById.mockResolvedValue(fullUser)

    const result = await authService.getProfile('user-1')
    expect(result.id).toBe('user-1')
    expect(result.firstName).toBe('Test')
    expect(result.phone).toBe('+22900000001')
  })

  it('throws 404 when user not found', async () => {
    mockUserRepo.findById.mockResolvedValue(null)

    await expect(authService.getProfile('ghost-id')).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ─── updateProfile() ─────────────────────────────────────────────────────────
describe('authService.updateProfile', () => {
  const FULL_USER = {
    ...MOCK_USER,
    firstName: 'Old',
    lastName: 'Name',
    phone: '+22900000001',
    gender: 'MALE',
    birthDay: null,
    birthMonth: null,
    avatarUrl: null,
  }

  it('updates the user profile fields', async () => {
    mockUserRepo.findByPhone = vi.fn().mockResolvedValue(null)
    mockUserRepo.findById.mockResolvedValue(FULL_USER)
    mockUserRepo.update.mockResolvedValue({ ...FULL_USER, firstName: 'New', phone: '+22900000099' })

    const result = await authService.updateProfile('user-1', {
      firstName: 'New',
      phone: '+22900000099',
    })

    expect(result.firstName).toBe('New')
    expect(mockUserRepo.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ firstName: 'New' })
    )
  })

  it('throws 409 phone_taken if phone belongs to another user', async () => {
    const otherUser = { ...MOCK_USER, id: 'other-user' }
    mockUserRepo.findByPhone = vi.fn().mockResolvedValue(otherUser)
    mockUserRepo.findById.mockResolvedValue(FULL_USER)

    await expect(
      authService.updateProfile('user-1', { phone: '+22900000099' })
    ).rejects.toMatchObject({ statusCode: 409, data: { code: 'phone_taken' } })
  })

  it('throws 404 when user not found', async () => {
    mockUserRepo.findByPhone = vi.fn().mockResolvedValue(null)
    mockUserRepo.findById.mockResolvedValue(null)

    await expect(
      authService.updateProfile('ghost-id', { firstName: 'X' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('allows same phone number update for the same user (no conflict)', async () => {
    // phone finds the same user — should be allowed
    mockUserRepo.findByPhone = vi.fn().mockResolvedValue(FULL_USER)
    mockUserRepo.findById.mockResolvedValue(FULL_USER)
    mockUserRepo.update.mockResolvedValue(FULL_USER)

    await expect(
      authService.updateProfile('user-1', { phone: '+22900000001' })
    ).resolves.toBeDefined()
  })
})

// ─── resendVerification() ─────────────────────────────────────────────────────
describe('authService.resendVerification', () => {
  it('silently returns when email is not found (prevents enumeration)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    await expect(authService.resendVerification('ghost@example.com')).resolves.toBeUndefined()
    expect(mockUserRepo.update).not.toHaveBeenCalled()
  })

  it('silently returns when user is already verified', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, emailVerified: true })
    await expect(authService.resendVerification('test@example.com')).resolves.toBeUndefined()
    expect(mockUserRepo.update).not.toHaveBeenCalled()
  })

  it('generates a fresh token and calls update + sendVerificationEmail', async () => {
    const unverifiedUser = { ...MOCK_USER, emailVerified: false }
    mockUserRepo.findByEmail.mockResolvedValue(unverifiedUser)
    mockUserRepo.update.mockResolvedValue(unverifiedUser)

    await authService.resendVerification('test@example.com')

    expect(mockUserRepo.update).toHaveBeenCalledWith(
      MOCK_USER.id,
      expect.objectContaining({ emailVerificationToken: expect.any(String) })
    )
  })
})
