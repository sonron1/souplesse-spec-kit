# Implementation Plan: Souplesse Fitness — Gym Management

**Branch**: `master` | **Date**: 2026-03-01 | **Spec**: [specs/1-add-gym-management/spec.md](specs/1-add-gym-management/spec.md)
**Input**: Feature specification from `specs/1-add-gym-management/spec.md`

**Note**: This plan follows the project's constitution and the implementation
choices agreed in the feature request (Nuxt + Nitro, TypeScript strict, PostgreSQL,
Prisma, Kkiapay SDK, Vitest, Playwright).

## Summary

Deliver a production-ready web application for Souplesse Fitness enabling
user management (Client/Coach/Admin), subscription purchases and secure
payments (Kkiapay — exclusive provider in v1), session scheduling and booking,
coach-managed training programs, progress tracking, and an admin dashboard with exports.

## Technical Context

**Language/Version**: TypeScript (Node 18+ runtime via Nitro)
**Primary Dependencies**: Nuxt 4.3.1, Nitro, Prisma, Kkiapay SDK, Zod, TailwindCSS
**Storage**: PostgreSQL (managed or Dockerized)
**Testing**: Vitest (unit/integration), Playwright (E2E), Supertest for API
**Target Platform**: Vercel (preview + production) for frontend and Nitro server
**Project Type**: Web application (frontend + backend in monorepo Nuxt app)
**Performance Goals**: LCP < 2.5s, API median < 300ms
**Constraints**: CI must block on lint/type/tests; pagination required; no N+1 queries
**Scale/Scope**: Initial target 1k-10k users, design for horizontal scaling

## Constitution Check

GATE: The plan adheres to the constitution. Key verifications:
- TypeScript `strict: true` (planned)
- ESLint + Prettier configured in CI (planned)
- Server-side runtime validation: Zod for request bodies (planned)
- Test coverage targets: 80% global, 100% for auth/payment (planned)
- Role middleware (admin/coach/client) enforced in server routes (planned)

Any deviations from these gates must be documented in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/1-add-gym-management/
├── plan.md
├── research.md          # deferred — not created in v1
├── data-model.md        # deferred — not created in v1
├── quickstart.md
├── contracts/
│   ├── payment-webhook.md   # deferred — not created in v1
│   └── booking-api.md       # deferred — not created in v1
└── tasks.md    # created in Phase 2 via /speckit.tasks
```

### Source Code (repository root)

We will use the Nuxt monorepo layout with clear server/client separation:

```text
app/                # Nuxt UI (pages, components, composables)
server/             # Nitro server code (api routes, services, repos)
  /api
  /services
  /repositories
  /validators
  /middleware
prisma/             # Prisma schema + migrations
types/              # Shared TypeScript types
tests/              # unit/integration/e2e helpers
```

**Structure Decision**: Use Nuxt default layout enhanced with `server/` for
business logic to enforce clean separation — UI code under `app/` and server
logic under `server/` as required by the constitution.

## Complexity Tracking

### Documented `any` Exceptions (Constitution I — requires justification)

| Location | Usage | Justification | Removal Target |
|---|---|---|---|
| `server/utils/jwt.ts` | `expiresIn: env as any` | `jsonwebtoken` v9 overload types do not accept a generic `string`; type-safe signature requires `StringValue` from `ms` pkg | Upgrade `@types/jsonwebtoken` or replace with `jose` library |
| `tests/**/*.spec.ts` | `vi.mocked(prisma) as any` | Prisma Client method types (`findUnique`, etc.) are not preserved through Vitest's `vi.mocked` without a complex generic helper | Add a typed `createMockPrisma()` factory in `tests/helpers/` when test infra is stabilized |
| `tests/**/*.spec.ts` | `$transaction` mock fn typed `(tx: any) => any` | `Prisma.TransactionClient` is not re-exported by Vitest mock boundary | Same resolution as above |

### Payment Provider Change

Spec clarification (2026-03-01) establishes **Kkiapay** as the exclusive payment provider in v1.
Stripe SDK and all Stripe-specific references previously in this plan have been replaced.
Any implementation artifact still referencing Stripe (imports, env vars, tests) must be
updated before the feature is merged.

