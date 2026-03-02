# Implementation Plan: Souplesse Fitness — Gym Management

**Branch**: `master` | **Date**: 2026-03-01 | **Spec**: [specs/1-add-gym-management/spec.md](specs/1-add-gym-management/spec.md)
**Input**: Feature specification from `specs/1-add-gym-management/spec.md`

**Note**: This plan follows the project's constitution and the implementation
choices agreed in the feature request (Nuxt + Nitro, TypeScript strict, PostgreSQL,
Prisma, Stripe, Vitest, Playwright).

## Summary

Deliver a production-ready web application for Souplesse Fitness enabling
user management (Client/Coach/Admin), subscription purchases and secure
payments (Stripe), session scheduling and booking, coach-managed training
programs, progress tracking, and an admin dashboard with exports.

## Technical Context

**Language/Version**: TypeScript (Node 18+ runtime via Nitro)
**Primary Dependencies**: Nuxt 4.3.1, Nitro, Prisma, Stripe SDK, Zod, TailwindCSS
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
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── payment-webhook.md
│   └── booking-api.md
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

No constitution violations identified. If a future decision requires a
violation (e.g., temporarily allowing `any`), it must include justification
and a migration plan.

