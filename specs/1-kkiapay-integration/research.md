Decision: basic Kkiapay integration with server-side order creation and HMAC webhook verification

Rationale:
- Create and persist PaymentOrder server-side to ensure idempotency and reconciliation.
- Rely on webhook signed by a shared secret (HMAC SHA256) to verify payment events.
- Process webhooks idempotently by recording Transaction objects keyed by provider payment ID.

Assumptions / NEEDS CLARIFICATION:
- Kkiapay webhook signature header name and exact algorithm (assumed: HMAC SHA256 in header `x-kkiapay-signature`).
- Kkiapay order creation API shape and required fields; implementation will call the API when `KKIAPAY_SECRET_KEY` is provided, otherwise return a mock token for testing.
- How user identity is passed from frontend to backend (assumed: authenticated session populates `event.context.user.id`).

Alternatives considered:
- Let frontend call Kkiapay directly to create orders: rejected because server must persist PaymentOrder and attach metadata for reconciliation.
- Polling payment status: rejected in favor of webhook-driven finalization (more real-time, lower latency).

Implementation notes:
- Add Prisma models `PaymentOrder` and `Transaction`.
- Create Zod validators for create-order request and minimal webhook envelope parsing.
- `createOrder` flow: validate plan, create PaymentOrder (status `pending`), call Kkiapay orders API (if configured) and store returned token.
- `webhook` flow: verify signature, parse event, check for existing Transaction by provider `paymentId`, persist Transaction, update PaymentOrder status and activate subscription only after successful verified payment.

Next steps for full production rollout:
- Confirm exact webhook signature header/algorithm from Kkiapay docs and update verification accordingly.
- Add retries/backoff and monitoring for webhook processing failures.
- Add integration tests that mock Kkiapay responses and a CI step that simulates webhook deliveries.
