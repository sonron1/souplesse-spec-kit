```markdown
# Research: Implementation Decisions (Souplesse Fitness)

## Decision: TypeScript + Nuxt (frontend + Nitro server)

Rationale: Nuxt provides an integrated frontend + server (Nitro) experience, has
excellent TypeScript support and aligns with the constitution's separation of
`/app` and `/server` concerns. Nuxt 4.3.1 chosen for stability and Vite support.

Alternatives considered:

- Next.js + Node serverless (rejected: less native Vue ecosystem support)
- Full separate backend (Fastify/FastAPI) (rejected: extra operational complexity)

## Decision: PostgreSQL + Prisma

Rationale: Relational DB suits bookings and transactions; Prisma provides
type-safe DB access integrated with TypeScript and fits the constitution's
preference for typed artifacts.

Alternatives considered: Sequelize (rejected for ergonomics), TypeORM (rejected)

## Decision: Stripe as primary payment provider

Rationale: Stripe provides robust Checkout sessions and webhook signatures.
We will implement provider-agnostic hooks but prioritize Stripe for v1.

Alternatives: PayPal (supported later as fallback)

## Decision: Validation & Security

- Use Zod for runtime validation on all incoming requests and webhook bodies.
- Hash passwords with bcrypt; JWT short-lived tokens + refresh token via
  HTTP-only secure cookie.

## Testing choices

- Vitest for unit/integration tests (fast, works with Vite/Nuxt).
- Playwright for E2E flows (signup, payment, booking).

## Unresolved / NEEDS CLARIFICATION

- Deployment: target Vercel — confirm whether Nitro server will be hosted on
  Vercel Serverless or via a separate server (e.g., Fly, Render). (RECOMMEND: use
  Vercel for frontend and a small server host for webhooks if low latency is needed.)

Decision: treat hosting as flexible; document final choice in quickstart.
```
