import { defineEventHandler, getHeader, readBody, readRawBody } from 'h3'
import paymentsService from '../../services/payments.service'
import { KkiapayWebhookEnvelope } from '../../validators/payments.schemas'

export default defineEventHandler(async (event) => {
  // read raw body for signature verification
  const raw = await readRawBody(event)
  const rawString = raw ?? JSON.stringify(await readBody(event))

  const signature = getHeader(event, 'x-kkiapay-signature') || getHeader(event, 'x-signature')

  const ok = await paymentsService.verifyWebhookSignature(rawString, signature as string | undefined)
  if (!ok) {
    return { statusCode: 400, body: { error: 'invalid_signature' } }
  }

  // parse envelope
  const parsed = KkiapayWebhookEnvelope.safeParse(JSON.parse(rawString))
  if (!parsed.success) {
    return { statusCode: 400, body: { error: 'invalid_payload' } }
  }

  try {
    const res = await paymentsService.handleWebhook(parsed.data, JSON.parse(rawString))
    return { statusCode: 200, body: { ok: true, res } }
  } catch (err: any) {
    return { statusCode: 500, body: { error: 'webhook_processing_failed', message: err.message } }
  }
})
