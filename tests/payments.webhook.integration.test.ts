import { vi, describe, it, expect, beforeEach } from 'vitest'

process.env.KKIAPAY_WEBHOOK_SECRET = 'test_webhook_secret'

vi.mock('../server/utils/prisma', () => {
  return {
    prisma: {
      subscriptionPlan: { findUnique: vi.fn() },
      paymentOrder: { findUnique: vi.fn(), update: vi.fn() },
      transaction: { findUnique: vi.fn(), create: vi.fn() },
      subscription: { create: vi.fn() },
    },
  }
})

// Mock h3 before importing the handler so the module uses our mocks
vi.mock('h3', () => {
  return {
    getHeader: (event: any, name: string) =>
      event.headers[name.toLowerCase()] || event.headers[name],
    readBody: async (event: any) => JSON.parse(event.raw),
    readRawBody: async (event: any) => event.raw,
    defineEventHandler: (fn: any) => fn,
  }
})

import handler from '../server/api/payments/kkiapay.webhook'
import crypto from 'crypto'
import { prisma } from '../server/utils/prisma'

describe('payments webhook integration test (mocked h3)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('accepts signed webhook and processes payment', async () => {
    const envelope = {
      event: 'payment.succeeded',
      data: { id: 'pay_abc', status: 'paid', reference: 'order1', amount: 2000, currency: 'XOF' },
    }
    const raw = JSON.stringify(envelope)

    const secret = process.env.KKIAPAY_WEBHOOK_SECRET ?? 'test_webhook_secret'
    const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex')

    ;(prisma.transaction.findUnique as any).mockResolvedValue(null)
    ;(prisma.paymentOrder.findUnique as any).mockResolvedValue({
      id: 'order1',
      userId: 'user1',
      subscriptionPlanId: 'plan1',
    })
    ;(prisma.subscriptionPlan.findUnique as any).mockResolvedValue({
      id: 'plan1',
      validityDays: 30,
    })

    const event = { raw, headers: { 'x-kkiapay-signature': sig } }

    const res = await handler(event as any)

    expect(res).toHaveProperty('statusCode', 200)
    expect(prisma.transaction.create).toHaveBeenCalled()
    expect(prisma.subscription.create).toHaveBeenCalled()
  })
})
