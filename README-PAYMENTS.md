Payments integration (Kkiapay)
===============================

Environment variables required:
- `KKIAPAY_SECRET_KEY`: server-side API key for creating orders (optional for tests)
- `KKIAPAY_WEBHOOK_SECRET`: secret used to verify webhook HMAC signatures
- `KKIAPAY_SDK_URL` (optional): client SDK URL; defaults to `https://js.kkiapay.me/v1/kkiapay.js`

Server endpoints:
- `POST /api/payments/kkiapay.create-order` — creates a `PaymentOrder` and returns a `kkiapayToken`.
- `POST /api/payments/kkiapay.webhook` — receives webhook events; verifies signature and creates `Transaction` and `Subscription` on success.

Frontend guidance:
- Use the `components/PaymentCheckout.vue` component and pass `subscriptionPlanId`.
- The component calls the create-order endpoint, receives `kkiapayToken`, loads the SDK, and opens the checkout.

Testing:
- Unit tests and integration-style tests are in `tests/` and the CI workflow uses the `KKIAPAY_WEBHOOK_SECRET` repo secret.
