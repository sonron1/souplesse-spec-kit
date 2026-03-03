# souplesse-speckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-03

## Active Technologies

- **Runtime**: TypeScript, Node 18+, Nitro (via Nuxt 4.3.1)
- **Frontend**: Nuxt 4.3.1, Vue 3, TailwindCSS, Pinia-free (composables), Zod (client schemas)
- **Backend**: Nitro server routes, Prisma 5.22 / PostgreSQL, Zod (server schemas)
- **Payments**: KKiaPay (HMAC-SHA256 webhook verification) — NOT Stripe
- **Auth**: JWT (15m access token) + HTTP-only refresh token cookie + `user_info` cookie for SSR hydration
- **Testing**: Vitest (67 tests, 17 test files), coverage ≥ 80%

## Project Structure

```text
app/                   # Nuxt srcDir — all frontend code
  components/          # Vue components
  composables/         # useAuth, etc.
  layouts/             # default.vue, auth.vue
  middleware/          # auth.ts, admin.ts, coach.ts, client-only.ts
  pages/               # File-based routing
    admin/             # ADMIN only (middleware: auth + admin)
    coach/             # COACH only (middleware: auth + coach)
    dashboard/         # CLIENT only (middleware: auth + client-only)
    sessions/, bookings/, subscriptions/, programs/, subscribe.vue
server/                # Nitro server — API + services + utils
  api/                 # Route handlers  
  middleware/          # auth.middleware.ts, admin.middleware.ts, rateLimit.middleware.ts
  services/            # Business logic (auth, booking, payments, stats, subscription…)
  repositories/        # Prisma-wrapping data access
  utils/               # jwt.ts, prisma.ts, role.ts, logger.ts
  validators/          # Zod schemas (server-side)
prisma/                # schema.prisma, migrations/, seed.js
tests/                 # Vitest test suite
  unit/                # Service unit tests
  integration/         # Route integration tests
  e2e/                 # End-to-end scenarios
  middleware/          # Middleware tests
types/                 # Shared TypeScript types
docs/                  # Security audit, architecture notes
specs/                 # Feature specs and task checklists
```

## Role Model

| Role   | Can Access                        | Blocked From             |
|--------|-----------------------------------|--------------------------|
| ADMIN  | /admin/*, /coach/* (read-only)    | /dashboard, /subscribe   |
| COACH  | /coach/*                          | /dashboard, /subscribe   |
| CLIENT | /dashboard/*, /sessions, /bookings, /subscriptions, /programs, /subscribe | /admin, /coach |

## Commands

```bash
npm test          # Vitest run (all 67 tests)
npm run lint      # ESLint
npm run build     # Nuxt build
npm run dev       # Dev server (port 3000)
npx prisma migrate dev   # Apply DB migrations
npx prisma db seed       # Seed demo data
```

## Code Style

- TypeScript strict mode; no `any` except where unavoidable
- Zod schemas in `server/validators/` for all request bodies
- Services are plain async functions, not classes; imported directly
- Repositories wrap all Prisma calls; services call repositories
- `requireAuth()` + `requireRole()` at the top of every protected API handler
- Composables use `useCookie` for SSR-safe auth state (no `localStorage`)
- Page-level auth via Nuxt middleware chain: `definePageMeta({ middleware: ['auth', 'admin'] })`

## Environment Variables

```env
DATABASE_URL=           # PostgreSQL connection string
JWT_SECRET=             # ≥ 32 chars random secret
JWT_REFRESH_SECRET=     # ≥ 32 chars random secret  
KKIAPAY_SECRET_KEY=     # KKiaPay merchant secret
KKIAPAY_WEBHOOK_SECRET= # HMAC-SHA256 webhook signing secret
```

## Recent Changes (v2)

- **Phase 16**: UX redesign — admin, coach, client dashboards rebuilt with dark cards, gradient accents
- **Auth fix**: `user_info` cookie added to persist auth across page refreshes (SSR-safe)
- **Route protection**: Nuxt middleware chain (`admin.ts`, `coach.ts`, `client-only.ts`) replaces fragile inline checks
- **Role-aware redirect**: Post-login redirect by role (ADMIN → /admin, COACH → /coach, CLIENT → /dashboard)
- **Staff access blocked**: `requireRole(user, 'CLIENT')` enforced on `/api/bookings` and `/api/payments/create-session`
- **Admin dashboard**: 8 KPI cards including totalCoaches, totalClients, totalSessions, upcomingSessions

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
