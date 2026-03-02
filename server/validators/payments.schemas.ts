import { z } from 'zod'

export const CreateOrderBody = z.object({
  subscriptionPlanId: z.string().uuid(),
})

export const KkiapayWebhookEnvelope = z.object({
  event: z.string(),
  data: z.record(z.any()),
})

export type CreateOrderBodyType = z.infer<typeof CreateOrderBody>
export type KkiapayWebhookEnvelopeType = z.infer<typeof KkiapayWebhookEnvelope>

export default {
  CreateOrderBody,
  KkiapayWebhookEnvelope,
}
