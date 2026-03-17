import { z } from 'zod'

export const CreateOrderBody = z.object({
  subscriptionPlanId: z.string().uuid(),
})

/**
 * KKiaPay webhook payload `data` field.
 * All fields are optional because KKiaPay's event shape varies by event type.
 * `.passthrough()` preserves unknown keys for raw logging / future-proofing.
 */
export const KkiapayWebhookData = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  paymentId: z.string().optional(),
  payment_id: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  amountCents: z.number().optional(),
  currency: z.string().optional(),
  reference: z.string().optional(),
  metadata: z
    .object({
      reference: z.string().optional(),
      orderReference: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
  meta: z
    .object({
      reference: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
}).passthrough()

export const KkiapayWebhookEnvelope = z.object({
  event: z.string().min(1),
  data: KkiapayWebhookData,
})

export type CreateOrderBodyType = z.infer<typeof CreateOrderBody>
export type KkiapayWebhookDataType = z.infer<typeof KkiapayWebhookData>
export type KkiapayWebhookEnvelopeType = z.infer<typeof KkiapayWebhookEnvelope>

export default {
  CreateOrderBody,
  KkiapayWebhookData,
  KkiapayWebhookEnvelope,
}
