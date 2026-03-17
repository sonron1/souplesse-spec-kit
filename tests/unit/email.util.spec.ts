/**
 * Unit tests for server/utils/email.ts
 * Mocks the Resend SDK and verifies all three email functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock Resend SDK ────────────────────────────────────────────────────────────
const mockSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: mockSend },
  })),
}))

// ── Mock logger ────────────────────────────────────────────────────────────────
vi.mock('../../server/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  sendVerificationEmail,
  sendSubscriptionReminderEmail,
  sendAdminPauseNotification,
} from '../../server/utils/email'
import logger from '../../server/utils/logger'

const mockLogger = vi.mocked(logger)

const VALID_KEY = 're_test_key_abc123'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = VALID_KEY
  process.env.APP_URL = 'https://app.test'
  process.env.RESEND_FROM = 'Test <test@app.test>'
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  delete process.env.RESEND_API_KEY
  delete process.env.APP_URL
  delete process.env.RESEND_FROM
})

// ─── sendVerificationEmail ────────────────────────────────────────────────────
describe('sendVerificationEmail', () => {
  it('sends email with correct to/subject when RESEND_API_KEY is set', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })

    await sendVerificationEmail('user@example.com', 'tok_abc')

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('user@example.com')
    expect(call.subject).toMatch(/Vérifi/)
    expect(call.html).toContain('/verify-email?token=tok_abc')
    expect(call.text).toContain('/verify-email?token=tok_abc')
  })

  it('skips sending and warns when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY

    await sendVerificationEmail('user@example.com', 'tok_missing')

    expect(mockSend).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('logs error when Resend returns an error object', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'invalid_to', message: 'bad address' },
    })

    await sendVerificationEmail('bad@example.com', 'tok_err')

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('logs error and does not throw on Resend unexpected exception', async () => {
    mockSend.mockRejectedValue(new Error('network timeout'))

    await expect(
      sendVerificationEmail('user@example.com', 'tok_throw')
    ).resolves.toBeUndefined()

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('logs verify URL to console in development', async () => {
    process.env.NODE_ENV = 'development'
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockSend.mockResolvedValue({ data: { id: 'e-dev' }, error: null })

    await sendVerificationEmail('dev@example.com', 'tok_dev')

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tok_dev'))
    consoleSpy.mockRestore()
  })
})

// ─── sendSubscriptionReminderEmail ────────────────────────────────────────────
describe('sendSubscriptionReminderEmail', () => {
  it('sends reminder email with correct content', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-2' }, error: null })

    await sendSubscriptionReminderEmail(
      'member@example.com',
      'Alice',
      'Abonnement 1 mois',
      '2026-04-15',
    )

    expect(mockSend).toHaveBeenCalledOnce()
    const call = mockSend.mock.calls[0][0]
    expect(call.to).toBe('member@example.com')
    expect(call.html).toContain('Alice')
    expect(call.html).toContain('Abonnement 1 mois')
    expect(call.html).toContain('2026-04-15')
  })

  it('skips sending and warns when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY

    await sendSubscriptionReminderEmail('m@example.com', 'Bob', 'Plan X', '2026-04-15')

    expect(mockSend).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('logs error when Resend returns an error object', async () => {
    mockSend.mockResolvedValue({ data: null, error: { name: 'err', message: 'fail' } })

    await sendSubscriptionReminderEmail('m@example.com', 'Bob', 'Plan X', '2026-04-15')

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('does not throw on unexpected Resend exception', async () => {
    mockSend.mockRejectedValue(new Error('crash'))

    await expect(
      sendSubscriptionReminderEmail('m@example.com', 'Bob', 'Plan X', '2026-04-15')
    ).resolves.toBeUndefined()
  })
})

// ─── sendAdminPauseNotification ───────────────────────────────────────────────
describe('sendAdminPauseNotification', () => {
  const BASE_OPTS = {
    adminEmails: ['admin1@app.test', 'admin2@app.test'],
    userLabel: 'Alice (alice@example.com)',
    planName: 'Abonnement 3 mois',
    pauseCount: 1,
    maxPauses: 2,
  }

  it('sends one email per admin', async () => {
    mockSend.mockResolvedValue({ data: { id: 'mail' }, error: null })

    await sendAdminPauseNotification(BASE_OPTS)

    expect(mockSend).toHaveBeenCalledTimes(2)
    const recipients = mockSend.mock.calls.map((c) => c[0].to)
    expect(recipients).toContain('admin1@app.test')
    expect(recipients).toContain('admin2@app.test')
  })

  it('skips when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY

    await sendAdminPauseNotification(BASE_OPTS)

    expect(mockSend).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('skips when adminEmails is empty', async () => {
    await sendAdminPauseNotification({ ...BASE_OPTS, adminEmails: [] })

    expect(mockSend).not.toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('logs error when Resend returns an error for an admin', async () => {
    mockSend
      .mockResolvedValueOnce({ data: { id: 'ok' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: 'err', message: 'bad' } })

    await sendAdminPauseNotification(BASE_OPTS)

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('does not throw when Resend throws unexpectedly', async () => {
    mockSend.mockRejectedValue(new Error('boom'))

    await expect(sendAdminPauseNotification(BASE_OPTS)).resolves.toBeUndefined()
  })
})
