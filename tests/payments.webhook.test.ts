import { vi, describe, it, expect, beforeEach } from 'vitest'

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

import { handleWebhook } from '../server/services/payments.service'
import { prisma } from '../server/utils/prisma'

describe('payments webhook handler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('creates subscription when payment succeeded', async () => {
    const envelope = { event: 'payment.succeeded', data: { id: 'pay_123', status: 'paid', reference: 'order1', amount: 5000, currency: 'XOF' } }

    ;(prisma.transaction.findUnique as any).mockResolvedValue(null)
    ;(prisma.paymentOrder.findUnique as any).mockResolvedValue({ id: 'order1', userId: 'user1', subscriptionPlanId: 'plan1' })
    ;(prisma.subscriptionPlan.findUnique as any).mockResolvedValue({ id: 'plan1', validityDays: 30 })

    const res = await handleWebhook(envelope as any, envelope)
    expect(prisma.transaction.create).toHaveBeenCalled()
    expect(prisma.subscription.create).toHaveBeenCalled()
    expect(res.processed).toBe(true)
  })
})
