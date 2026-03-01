# Souplesse Fitness — Gym Management Platform

> A full-stack gym management SaaS built with **Nuxt 4**, **Nitro**, **Prisma**, and **PostgreSQL**.  
> Member subscriptions via **Kkiapay** (exclusive payment provider), session booking, coach programs, and an admin dashboard.

## Architecture Overview

```
souplesse-speckit/
├── app/                        # Nuxt 4 frontend (srcDir: 'app')
│   ├── composables/            # useAuth, useFetch wrappers
│   ├── pages/                  # login, register, dashboard/, coach/, admin/
│   └── components/             # Calendar, KpiCard, SkeletonLoader
├── server/                     # Nitro backend
│   ├── api/                    # Route handlers
│   │   ├── auth/               # register, login, refresh, logout
│   │   ├── sessions/           # list, create
│   │   ├── bookings/           # create (no cancellation in v1)
│   │   ├── programs/           # CRUD (coach/admin)
│   │   ├── payments/           # create-session, kkiapay.webhook
│   │   └── admin/              # stats, users, payments, export, assignments
│   ├── services/               # Business logic (auth, booking, program, payment, stats, settings)
│   ├── repositories/           # Prisma data access (user, session, booking)
│   ├── middleware/             # auth, role, rateLimit
│   ├── validators/             # Zod schemas + sanitize helpers
│   └── utils/                  # prisma singleton, logger (pino), jwt helpers
├── prisma/                     # Schema + migrations
├── tests/
│   ├── unit/                   # Service layer specs (Vitest)
│   ├── integration/            # Route + webhook specs (Vitest)
│   └── e2e/                    # Full user-story flows
├── docs/                       # security-audit.md
└── scripts/                    # perf/check-queries.ts, test/load-test.sh, ci/lint-fix.sh
```

## Role System

| Role     | Capabilities                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------- |
| `CLIENT` | Register, purchase subscription, view & book sessions, view own programs                        |
| `COACH`  | All client capabilities + create sessions, manage programs for assigned clients                 |
| `ADMIN`  | All above + assign coaches to clients, manage users, payment history, CSV export, KPI dashboard |

## Data Model Summary

| Entity                  | Key Fields                                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| `User`                  | id (UUID), name, email (unique), passwordHash, role                           |
| `SubscriptionPlan`      | id, name, planType (enum), priceSingle, priceCouple, validityDays, maxReports |
| `Subscription`          | id, userId, planId, activationDate, expiresAt, status, partnerUserId          |
| `Payment`               | id, userId, amount (XOF int), kkiapayTransactionId (unique), status           |
| `Session`               | id, coachId, dateTime (UTC), duration, capacity                               |
| `Booking`               | id, userId, sessionId, status; unique (userId, sessionId)                     |
| `Program`               | id, clientId, coachId, type, content (JSON)                                   |
| `CoachClientAssignment` | id, coachId, clientId; unique (coachId, clientId)                             |
| `BusinessHours`         | id, dayOfWeek, openTime, closeTime                                            |

### Subscription Plan Types (`PlanType` enum)

`MONTHLY` · `QUARTERLY` · `ANNUAL` · `COUPLE_MONTHLY` · `COUPLE_QUARTERLY` · `COUPLE_ANNUAL`

## Quick Start

1. **Install dependencies:**

```bash
npm install
```

2. **Start PostgreSQL** (Docker Compose):

```bash
docker compose up -d
```

3. **Set environment variables** (copy and fill `.env.example`):

```bash
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, KKIAPAY_SECRET_KEY, KKIAPAY_WEBHOOK_SECRET, etc.
```

4. **Run migrations & generate Prisma client:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Start the dev server:**

```bash
npm run dev
```

See [specs/1-add-gym-management/quickstart.md](specs/1-add-gym-management/quickstart.md) for a full integration walkthrough.

## API Endpoints

### Auth

| Method | Path                 | Description                 |
| ------ | -------------------- | --------------------------- |
| `POST` | `/api/auth/register` | Create account              |
| `POST` | `/api/auth/login`    | Get access + refresh tokens |
| `POST` | `/api/auth/refresh`  | Rotate refresh token        |
| `POST` | `/api/auth/logout`   | Revoke refresh token        |

### Sessions & Bookings

| Method | Path            | Description                                                          |
| ------ | --------------- | -------------------------------------------------------------------- |
| `GET`  | `/api/sessions` | List upcoming sessions (paginated)                                   |
| `POST` | `/api/sessions` | Create session (coach/admin)                                         |
| `POST` | `/api/bookings` | Book a session (requires active subscription + within BusinessHours) |

> ⚠️ Bookings are **final** in v1 — no cancellation endpoint.

### Programs

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| `GET`  | `/api/programs`     | List client's programs               |
| `POST` | `/api/programs`     | Create program (assigned coach only) |
| `PUT`  | `/api/programs/:id` | Update program (assigned coach only) |

### Payments (Kkiapay)

| Method | Path                            | Description                                 |
| ------ | ------------------------------- | ------------------------------------------- |
| `POST` | `/api/payments/create-session`  | Initiate Kkiapay payment session            |
| `POST` | `/api/payments/kkiapay.webhook` | Kkiapay webhook (HMAC-verified, idempotent) |

### Admin

| Method   | Path                     | Description                                |
| -------- | ------------------------ | ------------------------------------------ |
| `GET`    | `/api/admin/stats`       | KPIs: users, revenue, active subscriptions |
| `GET`    | `/api/admin/users`       | Paginated user list                        |
| `GET`    | `/api/admin/payments`    | Payment history                            |
| `GET`    | `/api/admin/export`      | CSV export (users + payments)              |
| `POST`   | `/api/admin/assignments` | Assign a coach to a client                 |
| `DELETE` | `/api/admin/assignments` | Remove a coach-client assignment           |

## Payment Flow (Kkiapay)

```
Client → POST /api/payments/create-session
       → Kkiapay payment URL returned
       → User completes payment on Kkiapay
       → Kkiapay POSTs to /api/payments/kkiapay.webhook
       → HMAC-SHA256 signature verified (KKIAPAY_WEBHOOK_SECRET)
       → Subscription status set to ACTIVE (atomic DB transaction)
       → expiresAt = activationDate + validityDays
```

## Booking Rules

A booking is accepted **only if all** conditions are met:

1. User is authenticated
2. User has an `ACTIVE` subscription (not expired)
3. Session `dateTime` falls within `BusinessHours` for that day
4. Session capacity not exceeded
5. User has not already booked the same session

All checks run inside a single DB transaction.

## Coach Program Access

Programs can only be created or edited by a coach **explicitly assigned** to the client by an admin via `POST /api/admin/assignments`. Attempting to create or edit a program for an unassigned client returns `403 Forbidden`.

## Environment Variables

| Variable                 | Required | Description                                    |
| ------------------------ | -------- | ---------------------------------------------- |
| `DATABASE_URL`           | ✅       | PostgreSQL connection string                   |
| `JWT_SECRET`             | ✅       | Secret for access tokens (≥32 chars)           |
| `JWT_REFRESH_SECRET`     | ✅       | Secret for refresh tokens (≥32 chars)          |
| `KKIAPAY_SECRET_KEY`     | ✅       | Kkiapay API key                                |
| `KKIAPAY_WEBHOOK_SECRET` | ✅       | Kkiapay HMAC webhook secret                    |
| `NUXT_PUBLIC_APP_URL`    | ✅       | Public base URL (e.g. `http://localhost:3000`) |

## Database & Migrations

```bash
npx prisma generate                # regenerate client after schema changes
npx prisma migrate dev             # local development (creates migration entry)
npx prisma migrate deploy          # apply migrations to production/staging DB
```

## Testing

```bash
npm test                           # run all Vitest unit + integration tests
npm run test:coverage              # with coverage report (targets: 80% global, 100% auth/payment)
```

## CI / GitHub Actions

The `.github/workflows/ci.yml` pipeline runs: **install → lint → typecheck → tests → build**.  
CI blocks on any failure. Required repository secrets: `KKIAPAY_WEBHOOK_SECRET`, `KKIAPAY_SECRET_KEY`, `DATABASE_URL`.

## Security Notes

- Passwords hashed with bcrypt (min cost 10); JWT access token 15 min expiry; refresh token stored as bcrypt hash
- Zod validation on every API route; rate limiting on `/auth` and `/payments` endpoints
- Webhook validation mandatory before any DB write; duplicate webhooks are idempotent
- Do **not** commit `.env` files — use repository secrets for CI and deployment environments

## Contributing

1. Create a feature branch: `feat/your-feature`
2. Run `npm test` and `npx tsc --noEmit` locally before pushing
3. Open a PR targeting `master`

## License

See the repository license or consult the project owner for licensing details.

## Architecture Overview

```
souplesse-speckit/
├── app/                        # Nuxt 4 frontend (srcDir: 'app')
│   ├── composables/            # useAuth, useFetch wrappers
│   ├── pages/                  # login, register, dashboard/, coach/, admin/
│   └── components/             # Calendar, KpiCard, SkeletonLoader
├── server/                     # Nitro backend
│   ├── api/                    # Route handlers (auth/, sessions/, bookings/, programs/, admin/, payments/)
│   ├── services/               # Business logic (auth, booking, program, payment, stats)
│   ├── repositories/           # Prisma data access layer (user, session, booking)
│   ├── middleware/             # auth, role, rateLimit
│   ├── validators/             # Zod schemas + sanitize helpers
│   └── utils/                  # prisma singleton, logger (pino), jwt helpers
├── prisma/                     # Schema + migrations
├── tests/
│   ├── unit/                   # Service layer specs (Vitest)
│   ├── integration/            # Route + webhook specs (Vitest)
│   └── e2e/                    # Full user-story flows
├── docs/                       # security-audit.md
└── scripts/                    # perf/check-queries.ts, test/load-test.sh, ci/lint-fix.sh
```

## Role System

| Role     | Capabilities                                                             |
| -------- | ------------------------------------------------------------------------ |
| `CLIENT` | Register, purchase subscription, view & book sessions, view own programs |
| `COACH`  | All client capabilities + create sessions, manage assigned programs      |
| `ADMIN`  | All above + user management, payment history, CSV export, KPI dashboard  |

## Quick Start

1. **Install dependencies:**

```bash
npm install
```

2. **Start PostgreSQL** (Docker Compose):

```bash
docker compose up -d
```

3. **Set environment variables** (copy and fill `.env.example`):

```bash
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, etc.
```

4. **Run migrations & generate Prisma client:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. **Start the dev server:**

```bash
npm run dev
```

See [specs/1-add-gym-management/quickstart.md](specs/1-add-gym-management/quickstart.md) for a full integration walkthrough.

## API Endpoints

### Auth

| Method | Path                 | Description                 |
| ------ | -------------------- | --------------------------- |
| `POST` | `/api/auth/register` | Create account              |
| `POST` | `/api/auth/login`    | Get access + refresh tokens |
| `POST` | `/api/auth/refresh`  | Rotate refresh token        |
| `POST` | `/api/auth/logout`   | Revoke refresh token        |

### Sessions & Bookings

| Method   | Path                | Description                                   |
| -------- | ------------------- | --------------------------------------------- |
| `GET`    | `/api/sessions`     | List upcoming sessions (paginated)            |
| `POST`   | `/api/sessions`     | Create session (coach/admin)                  |
| `POST`   | `/api/bookings`     | Book a session (requires active subscription) |
| `DELETE` | `/api/bookings/:id` | Cancel booking (≥2 h before session)          |

### Programs

| Method | Path                | Description                  |
| ------ | ------------------- | ---------------------------- |
| `GET`  | `/api/programs`     | List client's programs       |
| `POST` | `/api/programs`     | Create program (coach/admin) |
| `PUT`  | `/api/programs/:id` | Update program (coach owner) |

### Payments

| Method | Path                           | Description                                 |
| ------ | ------------------------------ | ------------------------------------------- |
| `POST` | `/api/payments/create-session` | Create Stripe Checkout session              |
| `POST` | `/api/payments/webhook`        | Stripe webhook handler (signature-verified) |

### Admin

| Method | Path                  | Description                                |
| ------ | --------------------- | ------------------------------------------ |
| `GET`  | `/api/admin/stats`    | KPIs: users, revenue, active subscriptions |
| `GET`  | `/api/admin/users`    | Paginated user list                        |
| `GET`  | `/api/admin/payments` | Payment history                            |
| `GET`  | `/api/admin/export`   | CSV export (users + payments)              |

## Payment Flow (Stripe)

```
Client → POST /api/payments/create-session
       → Stripe Checkout URL returned
       → User completes payment on Stripe
       → Stripe POSTs to /api/payments/webhook
       → Signature verified (STRIPE_WEBHOOK_SECRET)
       → Subscription status set to ACTIVE
       → Client polling or redirect detects activation
```

## Environment Variables

| Variable                 | Required | Description                                    |
| ------------------------ | -------- | ---------------------------------------------- |
| `DATABASE_URL`           | ✅       | PostgreSQL connection string                   |
| `JWT_SECRET`             | ✅       | Secret for access tokens (≥32 chars)           |
| `JWT_REFRESH_SECRET`     | ✅       | Secret for refresh tokens (≥32 chars)          |
| `STRIPE_SECRET_KEY`      | ✅       | Stripe API secret key                          |
| `STRIPE_WEBHOOK_SECRET`  | ✅       | Stripe webhook signing secret                  |
| `KKIAPAY_WEBHOOK_SECRET` | ✅       | Kkiapay HMAC webhook secret                    |
| `KKIAPAY_SECRET_KEY`     | ✅       | Kkiapay API key                                |
| `NUXT_PUBLIC_APP_URL`    | ✅       | Public base URL (e.g. `http://localhost:3000`) |

## Database & Migrations

This project uses Prisma with Postgres. Migration SQL files are included under `prisma/migrations` for Postgres.

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate deploy      # apply migrations to a production/staging DB
npx prisma migrate dev         # local development (creates a dev migration entry)
```

## Testing

Run tests locally with:

```bash
npm test
```

Tests are written with Vitest and include unit tests for services and integration-style tests for webhook handling. CI will run the test suite using repository secrets for integration checks.

## Payments integration

This branch includes a Kkiapay integration as a feature example:

- Server: `server/services/payments.service.ts`, `server/api/payments/kkiapay.*` routes.
- Frontend: `components/PaymentCheckout.vue`, `utils/kkiapay.client.ts`, and `pages/subscribe.vue` example.

Important notes:

- Webhook signature verification is implemented using HMAC-SHA256 against `KKIAPAY_WEBHOOK_SECRET` — ensure the value matches your provider settings.
- Payment processing is idempotent: the webhook handler records `Transaction` records and creates `Subscription` only after verified, unique success events.

## CI / GitHub Actions

The `.github/workflows/payment-integration.yml` workflow runs installs, type checks, and tests. It expects the repository secrets `KKIAPAY_WEBHOOK_SECRET`, `KKIAPAY_SECRET_KEY`, and `DATABASE_URL` to be set in the repository settings.

## Contributing

1. Create a feature branch named descriptively, e.g. `feat/your-feature`.
2. Run tests and linters locally before pushing.
3. Push branch and open a draft PR for review. The project default branch is `master` — use `master` as the PR base.

When you provide a temporary token to help automate tasks (like uploading secrets), revoke it in GitHub after the task is done:

1. Go to GitHub → Settings → Developer settings → Personal access tokens (classic) or Personal access tokens (fine-grained).
2. Locate and revoke the token.

## Security

- Do not commit `.env` files or secrets. Use repository secrets for CI and environment variable management in deployment.
- Rotate provider keys and webhook secrets if they were shared outside secure channels.

## Notes and troubleshooting

- If you see unexpected failures due to missing `DATABASE_URL`, confirm the env var is set and reachable from your environment.
- If the Nuxt dev server fails to start locally, ensure Node.js and npm versions match the project's expectations and run `npm ci` to produce a clean `node_modules`.

## Contact / Support

If you need help with this repo or the payments integration, open an issue or ping the repo owner.

## License

See the repository license (if present) or consult the project owner for licensing details.
