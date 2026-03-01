import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../server/utils/prisma', () => {
  return {
    prisma: {
      subscriptionPlan: {
        findUnique: vi.fn(),
      },
      paymentOrder: {
        create: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  }
})

import { createPaymentOrder } from '../server/services/payments.service'
import { prisma } from '../server/utils/prisma'

describe('payments.service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.KKIAPAY_SECRET_KEY
  })

  it('creates order and returns mock token when no KKIAPAY_SECRET_KEY', async () => {
    const plan = { id: 'plan1', priceCents: 5000, currency: 'XOF' }
    ;(prisma.subscriptionPlan.findUnique as any).mockResolvedValue(plan)

    const createdOrder = {
      id: 'order1',
      userId: 'user1',
      subscriptionPlanId: 'plan1',
      amount: 5000,
      currency: 'XOF',
      status: 'pending',
    }
    ;(prisma.paymentOrder.create as any).mockResolvedValue(createdOrder)
    ;(prisma.paymentOrder.update as any).mockResolvedValue({
      ...createdOrder,
      kkiapayOrderToken: `mock-token-order1`,
    })

    const res = await createPaymentOrder({ userId: 'user1', subscriptionPlanId: 'plan1' })
    expect(res.kkiapayToken).toContain('mock-token-')
    expect(prisma.subscriptionPlan.findUnique).toHaveBeenCalled()
    expect(prisma.paymentOrder.create).toHaveBeenCalled()
    expect(prisma.paymentOrder.update).toHaveBeenCalled()
  })
})
