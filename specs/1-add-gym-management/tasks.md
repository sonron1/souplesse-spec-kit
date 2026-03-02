---
description: "Task list for Souplesse Fitness - Gym Management"
---

# Tasks: Souplesse Fitness — Gym Management

**Input**: `/specs/1-add-gym-management/spec.md`

## Phase 1: Setup (Project Foundation)

- [ ] T001 Initialize Nuxt 4.3 project and enable TypeScript `strict` in `tsconfig.json`
- [ ] T002 [P] Add TailwindCSS configuration files `tailwind.config.cjs` and `postcss.config.cjs`
- [ ] T003 Configure ESLint and Prettier per constitution in `.eslintrc.cjs` and `.prettierrc`
- [ ] T004 [P] Create project directories: `app/`, `server/`, `prisma/`, `types/`, `tests/`
- [ ] T005 Configure Nuxt aliases and runtime config in `nuxt.config.ts`
- [ ] T006 Create CI pipeline skeleton `.github/workflows/ci.yml` with install → lint → typecheck → tests → build

## Phase 2: Foundational (Database, Infra, Shared Middleware)

- [ ] T007 Create initial Prisma schema in `prisma/schema.prisma` with UUID default generator placeholder
- [ ] T008 [P] Add Docker Compose for Postgres in `docker-compose.yml` and `.env.example` with `DATABASE_URL`
- [ ] T009 Run first migration and generate Prisma client (note: creates `prisma/migrations/`)
- [ ] T00A [P] Implement centralized logger at `server/utils/logger.ts` (pino)
- [ ] T00B Implement server-side Zod validation helpers in `server/validators/index.ts`
- [ ] T00C Create middleware skeletons: `server/middleware/auth.middleware.ts`, `server/middleware/role.middleware.ts`, `server/middleware/rateLimit.middleware.ts`

## Phase 3: User Story 1 - Subscription & Activation (Priority: P1) 🎯

**Goal**: Allow user registration, subscription purchase via Stripe, and activation via webhook.

**Independent Test**: New user can register, purchase a subscription, and see it activated after a verified webhook.

### Models & Schema

- [ ] T010 [P] Add `User`, `Subscription`, and `Payment` models to `prisma/schema.prisma` (fields per spec)

### Repositories & Services

- [ ] T011 [P] Implement `server/repositories/user.repository.ts` (CRUD + findByEmail)
- [ ] T012 [US1] Implement `server/services/auth.service.ts` with `register()`, `login()`, `refreshToken()`, `logout()` and bcrypt/JWT logic
- [ ] T013 [US1] Implement `server/services/subscription.service.ts` with `createSubscription()`, `activateSubscription()`, `expireSubscriptions()`
- [ ] T014 [US1] Implement `server/services/payment.service.ts` for idempotent payment recording and provider reference handling

### API Endpoints & Validation

- [ ] T015 [US1] Add auth API routes: `server/api/auth/register.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/refresh.post.ts`, `server/api/auth/logout.post.ts` (use Zod validators in `server/validators/auth.schemas.ts`)
- [ ] T016 [US1] Add payment endpoints: `server/api/payments/create-session.post.ts` and `server/api/payments/webhook.post.ts` (webhook verifies Stripe signature)

### Tests

- [ ] T017 [US1] Unit tests for `auth.service.ts` in `tests/unit/auth.service.spec.ts` (coverage: 100% for auth)
- [ ] T018 [US1] Integration tests for auth routes in `tests/integration/auth.routes.spec.ts`
- [ ] T019 [US1] Unit tests for payment/webhook behavior in `tests/unit/payment.service.spec.ts` (mock Stripe)
- [ ] T01A [US1] Integration test for payments webhook in `tests/integration/payments.webhook.spec.ts` (signature validation + idempotence)
- [ ] T01B [US1] E2E test for signup → purchase → activation in `tests/e2e/payment-and-activation.spec.ts`

## Phase 4: User Story 2 - Booking Flow (Priority: P1)

**Goal**: Allow clients with active subscriptions to view sessions and book/cancel slots subject to capacity.

### Models & Schema

- [ ] T01C [P] Add `Session` and `Booking` models to `prisma/schema.prisma` (fields per spec)

### Repositories & Services

- [ ] T01D [P] Implement `server/repositories/session.repository.ts` and `server/repositories/booking.repository.ts`
- [ ] T01E [US2] Implement `server/services/booking.service.ts` with: check active subscription, atomic capacity check (DB transaction/locking), prevent double booking, controlled cancellation

### API Endpoints & Validation

- [ ] T01F [US2] Create `server/api/sessions/get.ts` (list with pagination) and `server/api/sessions/post.ts` (create session - coach/admin)
- [ ] T01G [US2] Create booking endpoints: `server/api/bookings/post.ts`, `server/api/bookings/delete/[id].delete.ts` with validators in `server/validators/booking.schemas.ts`

### Tests

- [ ] T01H [US2] Unit tests for `booking.service.ts` in `tests/unit/booking.service.spec.ts` (capacity, double-booking)
- [ ] T01I [US2] Integration tests for booking routes in `tests/integration/booking.routes.spec.ts`
- [ ] T01J [US2] E2E booking flow test in `tests/e2e/booking.spec.ts`

## Phase 5: User Story 3 - Coach Program Management (Priority: P2)

**Goal**: Coaches create and manage personalized programs; clients can view.

### Models & Schema

- [ ] T01K [P] Add `Program` model to `prisma/schema.prisma` (content JSON)

### Services & API

- [ ] T01L [US3] Implement `server/services/program.service.ts` with `createProgram()`, `updateProgram()`, `getProgramsByClient()` enforcing coach ownership
- [ ] T01M [US3] Add routes in `server/api/programs/*` and validators in `server/validators/program.schemas.ts`

### Tests

- [ ] T01N [US3] Unit tests for `program.service.ts` in `tests/unit/program.service.spec.ts`
- [ ] T01O [US3] Integration tests for program routes in `tests/integration/program.routes.spec.ts`

## Phase 6: User Story 4 - Admin Dashboard (Priority: P2)

**Goal**: Provide admin metrics and CSV export endpoints.

### Services & API

- [ ] T01P [P] Implement `server/services/stats.service.ts` to compute totals and aggregates (optimize with Prisma aggregations)
- [ ] T01Q [US4] Add admin routes: `server/api/admin/stats.get.ts`, `server/api/admin/users.get.ts`, `server/api/admin/payments.get.ts`, `server/api/admin/export.get.ts`

### Tests

- [ ] T01R [US4] Unit tests for `stats.service.ts` in `tests/unit/stats.service.spec.ts`
- [ ] T01S [US4] Integration tests for admin routes in `tests/integration/admin.routes.spec.ts`

## Phase 7: Frontend Implementation (UI)

- [ ] T01T [P] Create auth UI pages: `app/pages/login.vue`, `app/pages/register.vue` with composables in `app/composables/useAuth.ts`
- [ ] T01U [US2] Create client dashboard pages: `app/pages/dashboard/index.vue`, `app/pages/dashboard/subscriptions.vue`, `app/pages/dashboard/bookings.vue` (calendar component at `app/components/Calendar.vue`)
- [ ] T01V [US3] Create coach dashboard pages: `app/pages/coach/index.vue`, `app/pages/coach/programs.vue`
- [ ] T01W [US4] Create admin dashboard: `app/pages/admin/index.vue`, `app/components/KpiCard.vue`, `app/pages/admin/export.vue`
- [ ] T01X [P] Implement lazy-loading, skeleton loaders, and pagination for lists >20 in `app/components/*` and page files

## Phase 8: Security & Performance Hardening

- [ ] T01Y [P] Add CSRF protection and secure cookie configuration in `nuxt.config.ts` and server middleware
- [ ] T01Z [P] Sanitize all inputs via Zod and helper middleware `server/validators/sanitize.ts`
- [ ] T0200 [P] Add rate limiting implementation in `server/middleware/rateLimit.middleware.ts` and configure in CI/dev env
- [ ] T0201 [P] Create performance checks and query analysis script `scripts/perf/check-queries.ts`

## Phase 9: Final Quality Gate

- [ ] T0202 [P] Add coverage enforcement (80% global, 100% auth+payment) to CI workflow `.github/workflows/ci.yml`
- [ ] T0203 [P] Create audit checklist `docs/security-audit.md` and run manual security review
- [ ] T0204 [P] Run load test script `scripts/test/load-test.sh` and add results to `reports/load/`

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T0205 [P] Documentation updates: update `README.md`, `specs/1-add-gym-management/quickstart.md`, and add JSDoc in `server/services/*`
- [ ] T0206 [P] Code cleanup and refactoring per ESLint autofix in `scripts/ci/lint-fix.sh`

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
