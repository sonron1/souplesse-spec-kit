import { defineEventHandler, readBody } from 'h3'
import { CreateOrderBody } from '../../validators/payments.schemas'
import * as paymentsService from '../../services/payments.service'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const parse = CreateOrderBody.safeParse(body)
  if (!parse.success) {
    return { statusCode: 400, body: { error: 'invalid_body', details: parse.error.flatten() } }
  }

  // require authenticated user (assumes earlier auth middleware sets event.context.user)
  const user = (event.context as { user?: { id: string } }).user
  if (!user || !user.id) return { statusCode: 401, body: { error: 'unauthenticated' } }

  try {
    const result = await paymentsService.createPaymentOrder({
      userId: user.id,
      subscriptionPlanId: parse.data.subscriptionPlanId,
    })
    return { statusCode: 200, body: { order: result.order, kkiapayToken: result.kkiapayToken } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'server_error'
    return { statusCode: 500, body: { error: 'server_error', message } }
  }
})
