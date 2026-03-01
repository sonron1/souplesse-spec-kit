```markdown
# Feature Specification: Gestion de la plateforme Souplesse Fitness

**Feature Branch**: `1-add-gym-management`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Full web application for Souplesse Fitness: user management, subscriptions & payments, scheduling & bookings, personalized programs, progress tracking, admin dashboard."

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

Client views available sessions in a calendar, reserves a slot (subject to capacity and active subscription), and can cancel per policy.

**Why this priority**: Drives operations; requires integration with subscriptions and capacity.

**Independent Test**: With an active subscription, reserve a slot that has capacity remaining; verify capacity decrements and double bookings are prevented.

**Acceptance Scenarios**:
1. **Given** a session at capacity N, **When** N users reserve, **Then** further reservations are rejected.
2. **Given** a user reserved a slot, **When** they cancel within allowed window, **Then** capacity is incremented and user refunded or credit applied per policy.

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
- **FR-004**: System MUST enable users to select & pay for a subscription (monthly/quarterly/annual).
- **FR-005**: System MUST validate payments server-side and activate subscriptions only after webhook-confirmed payment.
- **FR-006**: System MUST provide a calendar view with available sessions and enforce capacity on bookings.
- **FR-007**: System MUST prevent double-booking for the same user at overlapping times.
- **FR-008**: System MUST allow coaches to create and edit programs for assigned clients only.
- **FR-009**: System MUST provide an admin dashboard with metrics and CSV export.
- **FR-010**: All permissions MUST be enforced server-side via role middleware (admin, coach, client).
- **FR-011**: System MUST log transactional events (payments, bookings, cancellations) for audit.

### Key Entities

- **User**: id, name, email, passwordHash, role, createdAt
- **Subscription**: id, userId, type (monthly/quarterly/annual), startDate, endDate, status
- **Payment**: id, userId, subscriptionId, amount, status, provider, providerReference, createdAt
- **Session**: id, coachId, dateTime, duration, capacity, location
- **Booking**: id, userId, sessionId, status, createdAt
- **Program**: id, clientId, coachId, type, exercises[], createdAt

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of subscription purchases result in activation (post-webhook) within 60 seconds of provider confirmation in staging tests.
- **SC-002**: Users can complete subscription purchase and activation flow in under 3 minutes (measured in end-to-end tests).
- **SC-003**: Reservation capacity enforcement: 100% of attempts to reserve a full session are rejected (integration tests).
- **SC-004**: LCP for main pages < 2.5s on standard mobile network; API median response time < 300ms.
- **SC-005**: Critical services (auth, payments) have 100% unit test coverage; overall coverage >= 80%.

## Constitution Compliance *(mandatory)*

- TypeScript `strict: true` required if using TypeScript; centralize types in `/types`.
- ESLint + Prettier enforced; CI must fail on lint/type/test failures.
- Runtime validation server-side (Zod or equivalent) for all inputs, especially payments and bookings.
- Server-side role checks for `admin`, `coach`, `client` enforced for all relevant endpoints.
- Webhook verification and idempotency for payment flows; logging for all transactions.

## Assumptions

- Payment providers used: Stripe or PayPal (provider-agnostic design).  
- Timezones are normalized and stored in UTC; client UI converts to local time.
- v1 will be web-only (no native mobile app).  

## Notes / Next Steps

- Define concrete API contracts for payment webhook and booking endpoints.  
- Design database schema and indexes (sessions.booking count index).  
- Create test fixtures for payment provider webhooks and concurrency booking tests.

``` 
