# Security Audit Checklist — Souplesse Fitness

**Date**: 2026-03-03 | **Auditor**: Engineering Team

## Authentication & Authorization

- [x] Passwords hashed with bcrypt (rounds ≥ 12)
- [x] JWT access tokens short-lived (15m default)
- [x] JWT refresh tokens stored server-side; revocable on logout
- [x] Role-based access control enforced in all protected routes (ADMIN/COACH/CLIENT)
- [x] Auth middleware validates Bearer tokens on every protected request
- [x] `passwordHash` and `refreshToken` never returned in API responses

## Input Validation

- [x] All request bodies validated with Zod schemas
- [x] Email fields normalized (lowercase + trim)
- [x] String fields sanitized against HTML injection
- [x] UUID fields validated with `z.string().uuid()`
- [x] Pagination parameters coerced and bounded (max 100)

## Payment Security

- [x] KKiaPay webhook verified with HMAC-SHA256 (`crypto.timingSafeEqual` on signature)
- [x] Payment idempotency via `providerReference` unique constraint — duplicate webhooks ignored
- [x] Subscriptions activated ONLY after verified webhook — not on frontend claim
- [x] No payment credentials exposed to client-side

## Data Protection

- [x] `DATABASE_URL` in environment variable (never hardcoded)
- [x] Sensitive env vars stored as GitHub Secrets
- [x] `.env` in `.gitignore`
- [x] Prisma Accelerate connection string never committed
- [x] `passwordHash` excluded from all user list endpoints

## API Security

- [x] Rate limiting middleware (200 req/min global, configurable per endpoint)
- [x] CORS controlled by Nitro (restrict in production)
- [x] HTTP-only cookies for refresh tokens (configured in nuxt.config.ts)
- [x] Admin endpoints require `ADMIN` role (separate from JWT auth)
- [x] Route-level protection via Nuxt middleware chain (`admin.ts`, `coach.ts`, `client-only.ts`)
- [x] `user_info` cookie persists auth across page refreshes (SSR-safe, cleared on logout)
- [x] Role-aware post-login redirect prevents staff from reaching client pages
- [x] `/api/bookings` and `/api/payments/create-session` enforce `requireRole(CLIENT)` server-side
- [ ] CSRF token implementation (TODO: add h3 csrf plugin)
- [ ] Content-Security-Policy headers (TODO: configure in Nitro headers)

## Infrastructure

- [x] Docker Compose for local Postgres
- [x] `.env.example` documents all required variables
- [x] CI blocks on lint + type-check + tests
- [x] Coverage enforced (80% global, see vitest.config.ts)
- [x] No `node_modules` committed to git

## Open Items / TODO

1. Add CSRF token validation for state-changing requests
2. Configure CSP headers in `nuxt.config.ts` nitro.routeRules
3. Implement account lockout after N failed login attempts
4. Add email verification flow for new registrations
5. Run dependency audit with `npm audit` in CI
6. Consider refresh token rotation (currently same token reused until logout)
