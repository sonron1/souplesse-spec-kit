```markdown
# Feature Specification: Gestion de la plateforme Souplesse Fitness

**Feature Branch**: `1-add-gym-management`  
**Created**: 2026-03-01  
**Status**: Final  
**Input**: User description: "Full web application for Souplesse Fitness: user management, subscriptions & payments, scheduling & bookings, personalized programs, progress tracking, admin dashboard."

## Clarifications

### Session 2026-03-01

- Q: What is the exclusive payment provider? → A: Kkiapay (primary and exclusive in v1; Stripe and PayPal are out of scope)
- Q: What currency and numeric format are prices stored in? → A: XOF (FCFA), always as integers — no floats allowed
- Q: How is subscription validity computed? → A: Validity starts at confirmed payment date; expiresAt = activationDate + validityDays
- Q: What does maxReports represent? → A: Allowed number of session postponements per subscription period; configured per SubscriptionPlan
- Q: Is only one subscription active per user allowed? → A: Yes — exactly one ACTIVE subscription per user at any time
- Q: What conditions must all be met for a booking to be accepted? → A: Authenticated user + ACTIVE subscription + session within BusinessHours + capacity not exceeded + no duplicate booking for same session
- Q: What are the JWT token security requirements? → A: Access token expires in 15 min; refresh token stored as bcrypt hash (never plaintext)
- Q: What are the UI/UX baseline requirements? → A: Mobile-first; branding colors black/yellow/white; no inline styles; no duplicated components; label+input pairing mandatory for accessibility
- Q: What data integrity rules apply globally? → A: UUID primary keys on all entities; atomic transactions for payment+subscription operations; unique constraints on email, kkiapayTransactionId, and (userId, sessionId) booking pair
- Q: What are role-specific access boundaries? → A: ADMIN full access; COACH manages sessions + assigned client programs (cannot modify plans); CLIENT views own data only; all checks enforced server-side
- Q: What should the unique payment reference field be named on the Payment entity? → A: kkiapayTransactionId — explicit to Kkiapay as current exclusive provider
- Q: What is the cancellation rule for a confirmed booking? → A: No cancellation allowed once a booking is confirmed in v1
- Q: Should Booking status CANCELLED be kept in the schema despite being unreachable in v1? → A: Yes — keep CANCELLED in enum for future-readiness; avoid a migration when cancellation is added in v2
- Q: How is coach-client assignment enforced for program management (FR-008)? → A: Explicit `CoachClientAssignment` table — admin assigns a coach to a client; only the assigned coach can create or edit programs for that client
- Q: Are SubscriptionPlan tiers free-form or enum-constrained? → A: Enum-constrained — `planType` column with values MONTHLY | QUARTERLY | ANNUAL | COUPLE_MONTHLY | COUPLE_QUARTERLY | COUPLE_ANNUAL
- Q: Does FR-007 require full time-overlap detection or same-session deduplication only? → A: Same-session deduplication only — enforced via unique(userId, sessionId); no time-overlap check in v1

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subscription & Activation (Priority: P1)

Un client crée un compte, choisit un abonnement, paie en ligne, et voit son abonnement activé après validation webhook.

**Why this priority**: Core revenue flow — business critical.

**Independent Test**: Create a new account, purchase a monthly plan, simulate a successful provider webhook and verify the subscription is ACTIVE and user can book.

**Acceptance Scenarios**:
1. **Given** an unauthenticated visitor, **When** they register and pay, **Then** their subscription becomes ACTIVE only after a verified webhook.
2. **Given** a user without active subscription, **When** they attempt to reserve, **Then** reservation is denied with an explanatory message.

---

### User Story 2 - Booking Flow (Priority: P1)

Client views available sessions in a calendar and reserves a slot (subject to capacity and active subscription). Bookings are final once confirmed — no cancellation in v1.

**Why this priority**: Drives operations; requires integration with subscriptions and capacity.

**Independent Test**: With an active subscription, reserve a slot that has capacity remaining; verify capacity decrements and double bookings are prevented.

**Acceptance Scenarios**:
1. **Given** a session at capacity N, **When** N users reserve, **Then** further reservations are rejected.
2. **Given** a user with a CONFIRMED booking, **When** they attempt to cancel, **Then** the action is rejected with an explanatory message (no cancellation in v1).

---

### User Story 3 - Coach Program Management (Priority: P2)

Coach creates/modifies personalized programs and tracks client progress; only assigned coach may edit programs.

**Why this priority**: Important for client retention, but not revenue-critical for v1.

**Independent Test**: Coach creates a program for an assigned client and modifies exercises; client can view but not edit.

**Acceptance Scenarios**:
1. **Given** a coach assigned to a client, **When** they edit the program, **Then** changes are persisted and visible to that client.
2. **Given** an unauthorized coach, **When** they attempt to edit, **Then** the action is forbidden.

---

### User Story 4 - Admin Dashboard (Priority: P2)

Admin sees totals (users, active subscriptions), revenue, and can export CSV.

**Independent Test**: Admin logs in and verifies dashboard metrics match persisted records and can export CSV.

**Acceptance Scenarios**:
1. **Given** an admin, **When** they request exports, **Then** CSV with correct columns is delivered.
2. **Given** non-admin, **When** they access dashboard, **Then** access is denied.

---

### Edge Cases

- Payment webhook retry: duplicate webhook must not create duplicate activations (idempotency).
- Partial failures: if subscription creation succeeds but webhook verification fails, system must reconcile and alert admins.
- Timezone differences for session times and bookings.
- Concurrent reservations hitting capacity simultaneously (race conditions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to register with unique email addresses.
- **FR-002**: System MUST store hashed passwords and never expose raw passwords.
- **FR-003**: System MUST support login and issue expiring authentication tokens (or sessions).
- **FR-004**: System MUST enable users to select & pay for a subscription constrained to allowed plan types: `MONTHLY`, `QUARTERLY`, `ANNUAL`, `COUPLE_MONTHLY`, `COUPLE_QUARTERLY`, `COUPLE_ANNUAL`.
- **FR-005**: System MUST validate payments server-side and activate subscriptions only after webhook-confirmed payment.
- **FR-006**: System MUST provide a calendar view with available sessions and enforce capacity on bookings.
- **FR-007**: System MUST prevent a user from booking the same session more than once (enforced via unique constraint on (userId, sessionId)); time-overlap detection across different sessions is out of scope for v1.
- **FR-008**: System MUST allow coaches to create and edit programs only for clients explicitly assigned to them by an admin (via `CoachClientAssignment`); unassigned coaches MUST be forbidden.
- **FR-009**: System MUST provide an admin dashboard with metrics and CSV export.
- **FR-010**: All permissions MUST be enforced server-side via role middleware (admin, coach, client).
- **FR-011**: System MUST log transactional events (payments, bookings) for audit; cancellation event logging deferred to v2 alongside FR-017 relaxation.
- **FR-012**: All subscription prices MUST be stored as integers in XOF (FCFA); floating-point prices are forbidden.
- **FR-013**: Booking MUST be rejected if the requested session falls outside defined BusinessHours.
- **FR-014**: Only one ACTIVE subscription is permitted per user at any time.
- **FR-015**: Subscription validity starts at confirmed payment date; expiresAt = activationDate + validityDays.
- **FR-016**: Couple subscription MUST support linkage of two user accounts; data model must be extensible for this use case from v1.
- **FR-017**: Confirmed bookings are final in v1 — the system MUST reject any cancellation attempt on a CONFIRMED booking.

### Key Entities

- **User**: id (UUID), name, email (unique), passwordHash, role (ADMIN|COACH|CLIENT), createdAt
- **SubscriptionPlan**: id (UUID), name, planType (MONTHLY|QUARTERLY|ANNUAL|COUPLE_MONTHLY|COUPLE_QUARTERLY|COUPLE_ANNUAL), priceSingle (XOF integer), priceCouple (XOF integer, nullable), validityDays, maxReports
- **Subscription**: id (UUID), userId, planId, activationDate, expiresAt, status (PENDING|ACTIVE|EXPIRED|CANCELLED), maxReports (copied from plan at activation), partnerUserId (UUID, nullable — for couple plans)
- **Payment**: id (UUID), userId, subscriptionId, amount (XOF integer), status (PENDING|CONFIRMED|FAILED), provider ("kkiapay"), kkiapayTransactionId (unique), createdAt
- **Session**: id (UUID), coachId, dateTime (UTC), duration, capacity, location
- **Booking**: id (UUID), userId, sessionId, status (CONFIRMED|CANCELLED — CANCELLED reserved for v2, unreachable in v1), createdAt; unique on (userId, sessionId)
- **Program**: id (UUID), clientId, coachId, type, exercises[], createdAt
- **CoachClientAssignment**: id (UUID), coachId, clientId, assignedAt; unique on (coachId, clientId); created by ADMIN only
- **BusinessHours**: id (UUID), dayOfWeek (0–6), openTime, closeTime

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of subscription purchases result in activation (post-webhook) within 60 seconds of provider confirmation in staging tests.
- **SC-002**: Users can complete subscription purchase and activation flow in under 3 minutes (measured in end-to-end tests).
- **SC-003**: Reservation capacity enforcement: 100% of attempts to reserve a full session are rejected (integration tests).
- **SC-004**: LCP for main pages < 2.5s on standard mobile network; API median response time < 300ms.
- **SC-005**: Critical services (auth, payments) have 100% unit test coverage; overall coverage >= 80%.

## Non-Functional Quality Attributes

- **Performance**: API median response time < 300ms; no N+1 database queries; pagination required for all lists > 20 items; aggregations computed at database level.
- **Security**: bcrypt password hashing (min cost 10); JWT access token 15 min expiry; refresh token stored as bcrypt hash; Zod validation on every API route; rate limiting on `/auth` and `/payments` endpoints; no secrets exposed to frontend.
- **Data Integrity**: UUID primary keys on all entities; atomic transactions for payment + subscription operations; unique constraints on email, kkiapayTransactionId, and (userId, sessionId) booking pair.
- **UI/UX**: Mobile-first responsive design; branding palette: black / yellow / white; no inline styles; no duplicated components; all form inputs must have a paired `<label>` for accessibility.
- **Availability**: Webhook processing must be idempotent — duplicate webhooks MUST NOT create duplicate activations.

## Constitution Compliance *(mandatory)*

- TypeScript `strict: true` required if using TypeScript; centralize types in `/types`.
- ESLint + Prettier enforced; CI must fail on lint/type/test failures.
- Runtime validation server-side (Zod or equivalent) for all inputs, especially payments and bookings.
- Server-side role checks for `admin`, `coach`, `client` enforced for all relevant endpoints.
- Webhook verification and idempotency for payment flows; logging for all transactions.

## Assumptions

- Payment provider: Kkiapay (primary and exclusive provider in v1); Stripe and PayPal are out of scope for this feature.
- Timezones are normalized and stored in UTC; client UI converts to local time.
- v1 will be web-only (no native mobile app).

## Notes / Next Steps

- Define concrete API contracts for payment webhook and booking endpoints.  
- Design database schema and indexes (sessions.booking count index).  
- Create test fixtures for payment provider webhooks and concurrency booking tests.

``` 
