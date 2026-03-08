# souplesse-speckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-06

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
- **Email verification enforced**: `register()` no longer issues tokens — user must verify email before first login. `register.vue` shows a "check your inbox" screen. `POST /api/auth/resend-verification` allows retrying. Login blocked with HTTP 403 if `emailVerified === false`.
- **Admin create user**: `POST /api/admin/users` — creates CLIENT/COACH, auto-generates password, sets `emailVerified = true` (admin bypass, no email). Full user detail via `GET /api/admin/users/:id`.
- **Admin users page**: Full redesign — stats header, role filters, clickable row → sticky detail drawer (sub history, coach assignment, booking stats).
- **Payment flow fixed**: KKiaPay sandbox verify now uses `POST https://api-sandbox.kkiapay.me/api/v1/transactions/status` via `@kkiapay-org/nodejs-sdk`; `confirm.post.ts` now throws `createError()` so `$fetch` catches real failures.
- **Error page**: `app/error.vue` global error boundary — styled 404 / 403 / 500 pages.

## Planned (v3) — specs/2-supplements-fonctionnels/tasks.md

| Bloc | Périmètre | Tâches | Statut |
|------|-----------|--------|--------|
| A | User model étendu (firstName, lastName, phone, gender, birthDay, birthMonth, avatarUrl) — vérif unicité email + phone | A001–A012 | 🔴 todo |
| B | Formulaire inscription amélioré + indicateur force mot de passe + validation temps réel | B001–B006 | 🔴 todo |
| C | Session unique (sessionToken en base, révocation multi-device) | C001–C006 | 🔴 todo |
| D | Idle timeout 30 min + avertissement J-2min + reset sur interaction | D001–D003 | 🔴 todo |
| E | Page profil `/profile` (tous rôles, sections adaptées, upload avatar, nav link) | E001–E011 | 🔴 todo |
| F | Catalogue abonnements officiel (tarifs FCFA, maxPauses, label FCFA) | F001–F005 | 🔴 todo |
| G | Réservation conditionnée à abonnement actif (HTTP 402, modale, redirect dashboard) | G001–G004 | 🔴 todo |
| H | Expiration auto abonnements (Vercel Cron, bandeau in-app, désactiver Réserver) | H001–H004 | 🔴 todo |
| I | Rappel J-3 expiration : email + notification in-app + message interne | I001–I007 | 🔴 todo |
| J | Report / Pause abonnement + notif email admin + notif in-app admin + statut liste | J001–J009 | 🔴 todo |
| K | Cumul abonnements (prolongation au lieu de doublon) | K001–K003 | 🔴 todo |
| L | Validation genre opposé pour abonnement couple + sélecteur partenaire amélioré | L001–L003 | 🔴 todo |
| M | Sessions : tri récent, fix annulation, désactiver si déjà réservé, popup calendrier, permissions admin/coach | M001–M007 | 🔴 todo |
| N | Filtres dates sessions (dateFin ≥ dateDébut, multi-jours, params API from/to) | N001–N003 | 🔴 todo |
| O | Pagination (users, sessions, bookings, messages) + composant réutilisable | O001–O009 | 🔴 todo |
| P | Messagerie : scroll + édition messages (PATCH /api/messages/:id) | P001–P003 | 🔴 todo |
| Q | Mise à jour dynamique polling 30s + composable usePolling + indicateur visuel | Q001–Q004 | 🔴 todo |
| R | Tests couvrant tous les nouveaux blocs | R001–R005 | 🔴 todo |

## Subscription Plans (official — FCFA)

| Formule | Solo | Couple | Validité | Reports |
|---------|------|--------|----------|---------|
| Séance | 1 500 | — | 1 j | 0 |
| Carnet 10 séances | 10 000 | — | 30 j | 0 |
| Carnet 15 séances | 20 000 | — | 90 j | 0 |
| Abonnement 1 mois | 15 000 | 25 000 | 30 j | 0 |
| Suivi personnel | 20 000 | 40 000 | 30 j | 1 |
| Abonnement 3 mois | 40 000 | 75 000 | 90 j | 2 |
| Abonnement 6 mois | 70 000 | 120 000 | 180 j | 2 |
| Abonnement 1 an | 120 000 | 200 000 | 365 j | 3 |
| Fit Dance | 10 000 | — | 30 j | 0 |
| Taekwondo | 10 000 | — | 30 j | 0 |
| Boxe | 10 000 | — | 30 j | 0 |

<!-- MANUAL ADDITIONS START -->
- **Sessions page fixes**: (1) `/api/bookings` returns `Booking[]` directly — fixed `sessions/index.vue` and `profile.vue` to use `bkData` as array (not `bkData.bookings`); `bookedSessionIds` now correctly persists across page refresh. (2) Date filter end-of-day bug fixed in `server/api/sessions/index.get.ts` — plain `to` date now converts to `T23:59:59.999Z` so sessions throughout the end day are included. (3) Native `confirm()` dialog replaced with a modern in-page confirmation modal (dark card, session details, Confirmer/Annuler).

<!-- MANUAL ADDITIONS END -->
