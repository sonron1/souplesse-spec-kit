---
description: 'Task list for Souplesse Fitness - Gym Management'
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

- Total tasks: 48 (44 original + 4 added post-analysis: T007a, T01Ga, T01Ka, T01Lb)
- US1 tasks: 12
- US2 tasks: 9
- US3 tasks: 6
- US4 tasks: 6
- Parallel opportunities: many [P]-marked tasks under setup, foundational, and services
- Suggested MVP scope: Phase 1 + Phase 2 + User Story 1 (Subscription & Activation)

---

Implementation notes: adjust task IDs if tasks are shuffled; each task above includes a concrete file path to implement.

---

## Phase 10: v2 — UX Redesign & Security Hardening

> Tasks completed after the initial 48. Documents work done in the v2 branch (`feat/v2-homepage-users`).

- [x] T0207 [P] UX redesign — admin, coach, and client dashboards rebuilt with dark-card layout, gradient accents, skeleton loaders (`app/pages/admin/index.vue`, `coach/index.vue`, `dashboard/index.vue`)
- [x] T0208 [P] Auth persistence via `user_info` cookie — `useAuth.ts` now hydrates `user` ref from cookie on every call, fixing page-refresh logout (`app/composables/useAuth.ts`)
- [x] T0209 [P] Role-based Nuxt middleware chain — new `admin.ts`, `coach.ts`, `client-only.ts` middlewares; all pages updated to use `definePageMeta({ middleware: [...] })` (`app/middleware/`)
- [x] T0210 [P] Role-aware post-login redirect — `_redirectByRole()` helper sends ADMIN → /admin, COACH → /coach, CLIENT → /dashboard after successful login (`app/composables/useAuth.ts`)
- [x] T0211 [P] Server-side `requireRole(CLIENT)` enforced on booking creation and payment session endpoints — blocks coaches and admins from purchasing subscriptions (`server/api/bookings/index.post.ts`, `server/api/payments/create-session.post.ts`)
- [x] T0212 [P] Admin dashboard enhanced with 8 KPI cards — added `totalCoaches`, `totalClients`, `totalSessions`, `upcomingSessions` to `stats.service.ts` and displayed in second KPI row (`app/pages/admin/index.vue`, `server/services/stats.service.ts`)
- [x] T0213 [P] Default nav adapted per role — `default.vue` shows client-only nav links only to CLIENT role; "Tableau de bord" link resolves to the correct role dashboard (`app/layouts/default.vue`)
- [x] T0214 [P] Landing page images updated to Black athletes; 5 extra demo clients seeded (`prisma/seed.js`)

## Phase 11: v2 — Subscription Gating (Epic A)

> Blocks unsubscribed or expired clients from accessing sessions/bookings; warns before expiry.

- [x] T0301 [A] `SubscriptionGate.vue` — reusable component; blurs slot content + shows lock overlay with icon, message, "Voir les formules" CTA (`app/components/SubscriptionGate.vue`)
- [x] T0302 [A] `GET /api/me/subscription` — returns `{ active, planName, expiresAt, daysLeft }`; staff roles always receive `active: true` (`server/api/me/subscription.get.ts`)
- [x] T0303 [A] Sessions page gated — `SubscriptionGate` wraps session list; merged `isLoading` combines sessions + sub fetch; coaches/admins bypass gate via `isClient` (`app/pages/sessions/index.vue`)
- [x] T0304 [A] Bookings page gated — gate wraps booking content; header CTA switches to "S'abonner →" when no active subscription (`app/pages/dashboard/bookings.vue`)
- [x] T0305 [A] Dashboard expiry banners — red banner (no subscription) and amber banner (expiring ≤7 days) with renew CTA between welcome hero and KPI cards (`app/pages/dashboard/index.vue`)

## Phase 12: v2 — Admin Subscription Control (Epic B)

> Admin can manually enable or disable any client subscription from a dedicated page.

- [x] T0306 [B] `PATCH /api/admin/subscriptions/:id` — force status to `ACTIVE` or `CANCELLED`; auto-computes `startsAt`/`expiresAt` from plan when re-activating a never-started sub (`server/api/admin/subscriptions/[id].patch.ts`)
- [x] T0307 [B] `GET /api/admin/subscriptions` — paginated list with embedded user + plan info (`server/api/admin/subscriptions/index.get.ts`)
- [x] T0308 [B] `/admin/subscriptions` page — 4 stat cards (active/expired/cancelled/pending), table with status badges, days-left countdown (amber ≤7 days), Désactiver/Réactiver toggle buttons, toast feedback (`app/pages/admin/subscriptions.vue`)
- [x] T0309 [B] "Abonnements" link added to admin nav dropdown (desktop) and mobile drawer (`app/layouts/default.vue`)

## Epic C — In-App Notifications (commit `d267089`)

> Clients receive a notification when a coach is assigned to them; bell icon in header shows unread count.

- [x] T0310 [C] `Notification` model added to Prisma schema + `notifications` relation on `User`; migration `20260303064656_add_notifications` applied (`prisma/schema.prisma`)
- [x] T0311 [C] `notification.service.ts` — `create()`, `getForUser()`, `countUnread()`, `markRead()`, `markAllRead()` (`server/services/notification.service.ts`)
- [x] T0312 [C] `assignments.post.ts` updated — fires `notificationService.create()` with type `ASSIGNMENT` after coach upsert; failure wrapped in `.catch()` so it never crashes the assignment response (`server/api/admin/assignments.post.ts`)
- [x] T0313 [C] `GET /api/notifications` — returns `{ notifications, unreadCount }`; supports `?limit=N&unread=true` (`server/api/notifications/index.get.ts`)
- [x] T0314 [C] `PATCH /api/notifications/:id` — mark single notification read; `id=all` marks all read (`server/api/notifications/[id].patch.ts`)
- [x] T0315 [C] `NotificationBell.vue` — bell icon with unread badge (99+ cap), dropdown panel, optimistic mark-read, "Tout marquer lu", 60s polling, link to full notifications page (`app/components/NotificationBell.vue`)
- [x] T0316 [C] `/dashboard/notifications` page — full list, unread highlighted, "Tout marquer lu", click-to-read; `NotificationBell` added to desktop header and "Notifications" link to mobile drawer (`app/pages/dashboard/notifications.vue`, `app/layouts/default.vue`)

## Epic D — Coach-Client Messaging (commit `5c6ccbd`)

> Coach can initiate a conversation with their assigned client. Client can reply but cannot send the first message.

- [x] T0317 [D] `Message` model added to Prisma schema — `senderId`, `recipientId`, `coachId`, `clientId`, `body`, `readAt`; `sentMessages`/`receivedMessages` relations on `User`; migration `20260303070001_add_messaging` applied (`prisma/schema.prisma`)
- [x] T0318 [D] `message.service.ts` — `getConversation()` (marks read), `sendMessage()` (blocks client if coach hasn't initiated), `getConversations()` (coach: all clients, client: their coach), `countUnread()` (`server/services/message.service.ts`)
- [x] T0319 [D] `GET /api/messages` — returns conversations list + `unreadTotal` for the current user (`server/api/messages/index.get.ts`)
- [x] T0320 [D] `GET /api/messages/:withUserId` — returns conversation thread, marks messages read for caller, resolves `coachId`/`clientId` via assignment table (`server/api/messages/[withUserId].get.ts`)
- [x] T0321 [D] `POST /api/messages` — sends a message `{ toUserId, body }`; throws 403 if client tries to initiate; ADMIN blocked (`server/api/messages/index.post.ts`)
- [x] T0322 [D] `/dashboard/messages` — client messaging page: no-coach state, "waiting for coach" state, bubble thread, disabled input until coach sends first message (`app/pages/dashboard/messages.vue`)
- [x] T0323 [D] `/coach/messages` — coach messaging page: left sidebar with client list + unread badges, right thread panel, send first message (`app/pages/coach/messages.vue`)
- [x] T0324 [D] "Messages" nav links added with red unread badge — desktop nav (client + coach dropdown), mobile drawer (client + coach sections); 30s background polling in `default.vue` (`app/layouts/default.vue`)

## Epic E — Admin System Logs (commit `48b7c1e`)

> Admin can view a filterable, paginated audit trail of all key system events.

- [x] T0325 [E] `SystemLog` model added to Prisma schema — `level`, `action`, `userId?`, `target?`, `message`, `meta?`, `ip?`; migration `20260303070613_add_system_logs` applied (`prisma/schema.prisma`)
- [x] T0326 [E] `server/utils/systemLog.ts` — fire-and-forget `systemLog()` helper; writes to `SystemLog` table async, never throws (`server/utils/systemLog.ts`)
- [x] T0327 [E] Services instrumented — `USER_REGISTERED` + `USER_LOGIN` in `auth.service.ts`, `BOOKING_CREATED` in `booking.service.ts`, `COACH_ASSIGNED` in `assignments.post.ts`
- [x] T0328 [E] `GET /api/admin/logs` — paginated, filterable by `level`, `action` (partial), `from`/`to` date range, page/limit (`server/api/admin/logs.get.ts`)
- [x] T0329 [E] `/admin/logs` page — filter bar, color-coded level badges, table with pagination, Actualiser button; "Journaux" link added to admin nav dropdown + mobile drawer (`app/pages/admin/logs.vue`, `app/layouts/default.vue`)
- [x] T0330 [E] Test mocks updated — `vi.mock('../../server/utils/systemLog', ...)` added to `booking.service.spec.ts`, `booking.spec.ts`, `payment-and-activation.spec.ts` to keep 67/67 green

## Security Tasks (v2) — now complete

- [x] T0215 CSRF origin-check middleware — `server/middleware/csrf.middleware.ts`; validates `Origin`/`Referer` header on all mutation requests (POST/PUT/PATCH/DELETE); webhook endpoint exempt
- [x] T0216 Content-Security-Policy headers — added to `nuxt.config.ts` via `nitro.routeRules['/**'].headers`; includes CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] T0217 Account lockout — `loginAttempts Int @default(0)` + `lockedUntil DateTime?` added to `User` model; `auth.service.ts` increments on failure, locks for 15 min after 5 attempts, resets on success; `userRepository` gains `incrementLoginAttempts()` + `resetLoginAttempts()`
- [x] T0218 Email verification — `emailVerified Boolean @default(false)` + `emailVerificationToken String? @unique` added to `User` model; token generated with `crypto.randomBytes(32)` on registration; `GET /api/auth/verify-email?token=` endpoint clears token and sets verified; email delivery requires provider (token logged server-side for now)

## Phase 12: v2 — FR-016 Couple Subscription Linkage

> Two users can be linked under a single couple plan subscription.

- [x] T0401 [FR-016] DB migration `20260303080000_add_security_and_couple` — adds `partnerUserId` to `PaymentOrder`; adds `loginAttempts`, `lockedUntil`, `emailVerified`, `emailVerificationToken` to `User`
- [x] T0402 [FR-016] `create-session.post.ts` — accepts optional `partnerEmail`; resolves to `partnerUserId` (404 if not found; 400 if non-CLIENT); passes to `createPaymentOrder`
- [x] T0403 [FR-016] `confirm.post.ts` — accepts optional `partnerEmail`; resolves to `partnerUserId`; passes to `confirmPayment`
- [x] T0404 [FR-016] `payments.service.ts` — `createPaymentOrder` stores `partnerUserId`; `handleWebhook` + `confirmPayment` create a second `ACTIVE` subscription for the partner when `partnerUserId` is set; `priceCouple` used when plan is a COUPLE type
- [x] T0405 [FR-016] `PaymentCheckout.vue` — new `partnerEmail` prop passed to `/api/payments/confirm` body
- [x] T0406 [FR-016] `subscribe.vue` — partner email `<input>` shown when couple mode selected; `partnerEmails` reactive map per plan; input passed to `PaymentCheckout`

## Bug Fixes (v2)

- [x] BUG-1 `dashboard/calendar.vue` — `limit: 200` exceeded `paginationSchema.max(100)` causing 422; changed to `limit: 100`
