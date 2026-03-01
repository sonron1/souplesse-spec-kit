```markdown
# Contract: Payment Webhook

## Endpoint (Server)

- `POST /api/payments/webhook/stripe`

### Headers
- `Stripe-Signature`: signature header (required)

### Body
- Raw Stripe event payload (application/json). Validate using Stripe SDK
  and verify signature.

### Behavior
- On `checkout.session.completed` (or equivalent):
  - Verify signature
  - Idempotently create `Payment` record if not existing (use provider event id)
  - Mark related `Subscription` as `ACTIVE` and set `startDate`/`endDate`
  - Emit internal audit log entry

### Responses
- `200 OK` — event processed successfully
- `400 Bad Request` — invalid signature or malformed payload
- `500 Internal` — retryable server error

### Security
- Verify signature using Stripe webhook secret
- Rate-limit webhook endpoint
- Log webhook events to allow replay / reconciliation

``` 
