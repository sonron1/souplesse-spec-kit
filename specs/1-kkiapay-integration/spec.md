# Feature Specification: Payment Integration — Kkiapay

**Feature Branch**: `1-kkiapay-integration`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Use the official Kkiapay Nuxt.js SDK to implement online payments. Integrate in a secure frontend checkout component; create server API to generate payment orders; validate payment success via webhook/service callback; update subscription status only after successful payment."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Purchase subscription (Priority: P1)

As a customer I want to pay for a subscription in the app so that my membership becomes active immediately after payment.

**Why this priority**: Core revenue path — without it users cannot subscribe.

**Independent Test**: End-to-end test that: user selects a subscription, opens the checkout, completes a simulated payment via Kkiapay sandbox, backend receives and validates webhook/callback, subscription status transitions from `pending` to `active`.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a chosen subscription, **When** they click "Pay", **Then** the frontend opens the Kkiapay checkout using the official SDK and returns a client-side success/failure result.
2. **Given** a payment completes successfully on Kkiapay, **When** the backend receives the webhook/callback, **Then** it verifies the signature, marks the corresponding `PaymentOrder` as `paid`, and updates the user's `Subscription` to `active`.
3. **Given** a duplicate webhook is received, **When** processed, **Then** the system treats it idempotently (no duplicate subscription activations, safe re-processing).

---

### User Story 2 - Payment failure & retry (Priority: P2)

As a customer I want to know if payment fails and be able to retry payment so that I can complete my purchase.

**Why this priority**: Important UX for conversions and recovery from transient errors.

**Independent Test**: Simulate a failed payment in the sandbox and verify frontend shows clear failure message and user can reinitiate checkout; backend leaves subscription in `failed`/`pending` state until success.

**Acceptance Scenarios**:

1. **Given** a payment attempt fails, **When** the Kkiapay callback indicates failure, **Then** the backend records failure reason and user-facing UI shows retry option.

---

### User Story 3 - Admin reconciliation (Priority: P3)

As an admin I want to view and reconcile payment records so I can verify revenue and resolve disputes.

**Why this priority**: Operational visibility; lower priority than purchase flow but required for support.

**Independent Test**: Admin UI shows `PaymentOrder` records, their statuses, and allows marking refunds or manual adjustments.

**Acceptance Scenarios**:

1. **Given** a payment was processed, **When** an admin opens the payments dashboard, **Then** the `PaymentOrder` for that user appears with status `paid` and timestamps.

---

### Edge Cases

- What happens when webhook verification fails (invalid signature)? The webhook should be rejected and logged; an alert/monitoring entry created for manual review.
- What if the Kkiapay callback is delayed or arrives after user session expired? The backend must process webhooks asynchronously and reconcile subscriptions regardless of user session state.
- Race conditions between client success callback and webhook: server-side source-of-truth is webhook; client success should display optimistic confirmation but subscription activation must wait for backend verification.
- Idempotency: webhook and order endpoints must be idempotent; use `orderId` or `paymentId` as idempotency key.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Use the official Kkiapay Nuxt.js SDK for frontend checkout integration.
- **FR-002**: Provide a secure frontend `Checkout` component that calls an authenticated backend endpoint to create a `PaymentOrder` and then opens the Kkiapay checkout (SDK) with the returned order token.
- **FR-003**: Provide a backend API `POST /api/payments/kkiapay/create-order` that accepts `userId`, `subscriptionPlanId`, and returns Kkiapay order data/token. The endpoint MUST validate the request and create a `PaymentOrder` record with status `pending`.
- **FR-004**: Provide a backend webhook endpoint `POST /api/payments/kkiapay/webhook` to receive payment events from Kkiapay. Webhook handler MUST verify signatures/secret per Kkiapay docs before acting.
- **FR-005**: Update the related `Subscription` status to `active` only after a verified successful payment event is processed; do NOT mark subscription active based solely on client-side success callbacks.
- **FR-006**: Ensure idempotency for order creation and webhook processing (duplicate webhooks or retries must not create duplicate activations or records).
- **FR-007**: Log all payment events and persist `Transaction` records with `paymentId`, `orderId`, `status`, `amount`, `currency`, and timestamps for reconciliation.
- **FR-008**: Implement error handling and retry/backoff for transient webhook processing failures; provide monitoring/alerts for repeated failures.
- **FR-009**: Do not store raw card or sensitive payment instrument data on our servers; comply with Kkiapay recommendations and PCI guidance.
- **FR-010**: Provide admin endpoints to query payment records and refund status (read-only for now; refunds may be manual via Kkiapay dashboard initially).

### Key Entities

- **PaymentOrder**: Represents an order created prior to opening checkout. Fields: `id`, `userId`, `subscriptionPlanId`, `amount`, `currency`, `status` (pending/paid/failed/cancelled), `kkiapayOrderToken`, `createdAt`, `updatedAt`.
- **Transaction**: Represents an event recorded from Kkiapay webhook. Fields: `id`, `paymentOrderId`, `paymentId`, `eventType`, `status`, `amount`, `currency`, `rawPayload`, `createdAt`.
- **Subscription**: Existing domain entity; new rules: `activationPendingPayment` flag or `pending` state until payment confirmed.
- **User**: Reference to who purchased; use `userId` to link.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete subscription purchase end-to-end in Kkiapay sandbox and see subscription `active` within 2 minutes of payment completion in 99% of cases.
- **SC-002**: Webhook processing must be idempotent — duplicate webhooks do not create duplicate `Subscription` activations (0 duplicate activations in testing runs).
- **SC-003**: Orders created via the backend must be recorded and retrievable; 100% of created orders have an associated `PaymentOrder` record.
- **SC-004**: Error handling: when webhook signature verification fails, webhook is rejected and logged; the system raises at least one alert for repeated verification failures.

## Constitution Compliance _(mandatory)_

- **TypeScript strict**: All new code must be TypeScript with strict compiler options.
- **Server-side validation**: All backend endpoints must validate input with Zod schemas or similar.
- **Tests**: Add unit tests for order creation, webhook signature verification, and integration tests for end-to-end flow (sandbox/mocked).
- **Secrets**: Store Kkiapay keys in environment variables (`KKIAPAY_PUBLIC_KEY`, `KKIAPAY_SECRET_KEY`, `KKIAPAY_WEBHOOK_SECRET`) and do not commit them.
- **Security**: Do not store card data; follow Kkiapay docs and PCI recommendations.
- **Logging & Monitoring**: Record payment events and errors for auditing.
