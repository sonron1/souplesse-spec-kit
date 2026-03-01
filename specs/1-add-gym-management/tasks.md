---
description: "Task list for Souplesse Fitness - Gym Management"
---

# Tasks: Souplesse Fitness — Gym Management

**Input**: `/specs/1-add-gym-management/spec.md`

## Phase 1: Setup (Project Foundation)

- [x] T001 Initialize Nuxt 4.3 project and enable TypeScript `strict` in `tsconfig.json`
- [x] T002 [P] Add TailwindCSS configuration files `tailwind.config.cjs` and `postcss.config.cjs`
- [x] T003 Configure ESLint and Prettier per constitution in `.eslintrc.cjs` and `.prettierrc`
- [x] T004 [P] Create project directories: `app/`, `server/`, `prisma/`, `types/`, `tests/`
- [x] T005 Configure Nuxt aliases and runtime config in `nuxt.config.ts`
- [x] T006 Create CI pipeline skeleton `.github/workflows/ci.yml` with install → lint → typecheck → tests → build

## Phase 2: Foundational (Database, Infra, Shared Middleware)

- [x] T007 Create initial Prisma schema in `prisma/schema.prisma` with UUID default generator placeholder
- [x] T007a Add `PlanType` enum to `prisma/schema.prisma` (MONTHLY | QUARTERLY | ANNUAL | COUPLE_MONTHLY | COUPLE_QUARTERLY | COUPLE_ANNUAL) and apply to `SubscriptionPlan.planType` field; update Zod plan validators to accept only allowed enum values
- [x] T008 [P] Add Docker Compose for Postgres in `docker-compose.yml` and `.env.example` with `DATABASE_URL`
- [x] T009 Run first migration and generate Prisma client (note: creates `prisma/migrations/`)
- [x] T00A [P] Implement centralized logger at `server/utils/logger.ts` (pino)
- [x] T00B Implement server-side Zod validation helpers in `server/validators/index.ts`
- [x] T00C Create middleware skeletons: `server/middleware/auth.middleware.ts`, `server/middleware/role.middleware.ts`, `server/middleware/rateLimit.middleware.ts`

## Phase 3: User Story 1 - Subscription & Activation (Priority: P1) 🎯

**Goal**: Allow user registration, subscription purchase via Stripe, and activation via webhook.

**Independent Test**: New user can register, purchase a subscription, and see it activated after a verified webhook.

### Models & Schema

- [x] T010 [P] Add `User`, `Subscription`, and `Payment` models to `prisma/schema.prisma` (fields per spec)

### Repositories & Services

- [x] T011 [P] Implement `server/repositories/user.repository.ts` (CRUD + findByEmail)
- [x] T012 [US1] Implement `server/services/auth.service.ts` with `register()`, `login()`, `refreshToken()`, `logout()` and bcrypt/JWT logic
- [x] T013 [US1] Implement `server/services/subscription.service.ts` with `createSubscription()`, `activateSubscription()`, `expireSubscriptions()`
- [x] T014 [US1] Implement `server/services/payment.service.ts` for idempotent payment recording and provider reference handling

### API Endpoints & Validation

- [x] T015 [US1] Add auth API routes: `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/refresh.post.ts`, `server/api/auth/logout.post.ts` (use Zod validators in `server/validators/auth.schemas.ts`)
- [x] T016 [US1] Add payment endpoints: `server/api/payments/create-session.post.ts` and `server/api/payments/kkiapay.webhook.ts` (webhook verifies Kkiapay HMAC signature)

### Tests

- [x] T017 [US1] Unit tests for `auth.service.ts` in `tests/unit/auth.service.spec.ts` (coverage: 100% for auth)
- [x] T018 [US1] Integration tests for auth routes in `tests/integration/auth.routes.spec.ts`
- [x] T019 [US1] Unit tests for payment/webhook behavior in `tests/unit/payment.service.spec.ts` (mock Kkiapay SDK)
- [x] T01A [US1] Integration test for payments webhook in `tests/integration/payments.webhook.spec.ts` (Kkiapay HMAC signature validation + idempotence)
- [x] T01B [US1] E2E test for signup → purchase → activation in `tests/e2e/payment-and-activation.spec.ts`

## Phase 4: User Story 2 - Booking Flow (Priority: P1)

**Goal**: Allow clients with active subscriptions to view sessions and book/cancel slots subject to capacity.

### Models & Schema

- [x] T01C [P] Add `Session` and `Booking` models to `prisma/schema.prisma` (fields per spec)

### Repositories & Services

- [x] T01D [P] Implement `server/repositories/session.repository.ts` and `server/repositories/booking.repository.ts`
- [x] T01E [US2] Implement `server/services/booking.service.ts` with: check active subscription, atomic capacity check (DB transaction/locking), prevent double booking, BusinessHours validation (FR-013)

### API Endpoints & Validation

- [x] T01F [US2] Create `server/api/sessions/get.ts` (list with pagination) and `server/api/sessions/post.ts` (create session - coach/admin)
- [x] T01G [US2] Create booking endpoint: `server/api/bookings/post.ts` with validators in `server/validators/booking.schemas.ts`; no user-facing cancellation endpoint in v1 (FR-017 — bookings are final)

### Tests

- [x] T01Ga [US2] Add BusinessHours validation to `server/services/booking.service.ts`: reject booking if session dateTime falls outside `BusinessHours` for that dayOfWeek (FR-013); add unit test case in `tests/unit/booking.service.spec.ts`
- [x] T01H [US2] Unit tests for `booking.service.ts` in `tests/unit/booking.service.spec.ts` (capacity, double-booking)
- [x] T01I [US2] Integration tests for booking routes in `tests/integration/booking.routes.spec.ts`
- [x] T01J [US2] E2E booking flow test in `tests/e2e/booking.spec.ts`

## Phase 5: User Story 3 - Coach Program Management (Priority: P2)

**Goal**: Coaches create and manage personalized programs; clients can view.

### Models & Schema

- [x] T01K [P] Add `Program` model to `prisma/schema.prisma` (content JSON)
- [x] T01Ka [P] Add `CoachClientAssignment` model to `prisma/schema.prisma` with unique on (coachId, clientId); add admin-only API endpoints `server/api/admin/assignments.post.ts` and `server/api/admin/assignments.delete.ts`

### Services & API

- [x] T01L [US3] Implement `server/services/program.service.ts` with `createProgram()`, `updateProgram()`, `getProgramsByClient()` enforcing coach ownership
- [x] T01Lb [US3] Add assignment check to `program.service.ts`: before create/update, verify a `CoachClientAssignment` row exists for (coachId, clientId); return 403 if not found
- [x] T01M [US3] Add routes in `server/api/programs/*` and validators in `server/validators/program.schemas.ts`

### Tests

- [x] T01N [US3] Unit tests for `program.service.ts` in `tests/unit/program.service.spec.ts`
- [x] T01O [US3] Integration tests for program routes in `tests/integration/program.routes.spec.ts`

## Phase 6: User Story 4 - Admin Dashboard (Priority: P2)

**Goal**: Provide admin metrics and CSV export endpoints.

### Services & API

- [x] T01P [P] Implement `server/services/stats.service.ts` to compute totals and aggregates (optimize with Prisma aggregations)
- [x] T01Q [US4] Add admin routes: `server/api/admin/stats.get.ts`, `server/api/admin/users.get.ts`, `server/api/admin/payments.get.ts`, `server/api/admin/export.get.ts`

### Tests

- [x] T01R [US4] Unit tests for `stats.service.ts` in `tests/unit/stats.service.spec.ts`
- [x] T01S [US4] Integration tests for admin routes in `tests/integration/admin.routes.spec.ts`

## Phase 7: Frontend Implementation (UI)

- [x] T01T [P] Create auth UI pages: `app/pages/login.vue`, `app/pages/register.vue` with composables in `app/composables/useAuth.ts`
- [x] T01U [US2] Create client dashboard pages: `app/pages/dashboard/index.vue`, `app/pages/dashboard/subscriptions.vue`, `app/pages/dashboard/bookings.vue` (calendar component at `app/components/Calendar.vue`)
- [x] T01V [US3] Create coach dashboard pages: `app/pages/coach/index.vue`, `app/pages/coach/programs.vue`
- [x] T01W [US4] Create admin dashboard: `app/pages/admin/index.vue`, `app/components/KpiCard.vue`, `app/pages/admin/export.vue`
- [x] T01X [P] Implement lazy-loading, skeleton loaders, and pagination for lists >20 in `app/components/*` and page files

## Phase 8: Security & Performance Hardening

- [x] T01Y [P] Add CSRF protection and secure cookie configuration in `nuxt.config.ts` and server middleware
- [x] T01Z [P] Sanitize all inputs via Zod and helper middleware `server/validators/sanitize.ts`
- [x] T0200 [P] Add rate limiting implementation in `server/middleware/rateLimit.middleware.ts` and configure in CI/dev env
- [x] T0201 [P] Create performance checks and query analysis script `scripts/perf/check-queries.ts`

## Phase 9: Final Quality Gate

- [x] T0202 [P] Add coverage enforcement (80% global, 100% auth+payment) to CI workflow `.github/workflows/ci.yml`
- [x] T0203 [P] Create audit checklist `docs/security-audit.md` and run manual security review
- [x] T0204 [P] Run load test script `scripts/test/load-test.sh` and add results to `reports/load/`

## Phase N: Polish & Cross-Cutting Concerns

> **Deferred items (v2)**: FR-016 (couple subscription linkage — `partnerUserId` field exists in schema but no service logic or API endpoint targets it in v1); FR-017 cancellation event logging (FR-011) deferred alongside cancellation feature.

- [x] T0205 [P] Documentation updates: update `README.md`, `specs/1-add-gym-management/quickstart.md`, and add JSDoc to all `server/services/*.ts` files (constitution requirement: JSDoc REQUIRED for critical services)
- [x] T0206 [P] Code cleanup and refactoring per ESLint autofix in `scripts/ci/lint-fix.sh`

## Dependencies & Execution Order

- **Setup (Phase 1)** must complete before Foundational (Phase 2).
- **Foundational (Phase 2)** blocks all User Stories.
- **User Story phases (Phase 3+)** may be implemented in parallel after Phase 2.

## Parallel Execution Examples

- Run in parallel: `T002`, `T004`, `T00A` (non-overlapping files).  
- Once foundational done: `US1` tasks (T011..T01B) and `US2` tasks (T01D..T01J) can run in parallel by different developers.

## Implementation Strategy

- MVP first: complete Phase 1 + Phase 2, then implement US1 (subscriptions + payments) as MVP.  
- Incremental delivery: after US1 validated, add US2 (bookings), then US3 (programs), then US4 (admin).  
- Tests-first where feasible: write unit/integration tests that fail before implementing behavior.

---

## Summary / Metrics

- Total tasks: 44 (approx)
- US1 tasks: 12
- US2 tasks: 9
- US3 tasks: 6
- US4 tasks: 6
- Parallel opportunities: many [P]-marked tasks under setup, foundational, and services
- Suggested MVP scope: Phase 1 + Phase 2 + User Story 1 (Subscription & Activation)

---

Implementation notes: adjust task IDs if tasks are shuffled; each task above includes a concrete file path to implement.
