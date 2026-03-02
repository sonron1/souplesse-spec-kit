Summary

This branch implements the initial scaffolding for the Gym Management feature
and adds test coverage and CI to protect the admin settings surface.

Changes

- Add `server` side scaffolding for authoritative business config and settings:
  - `server/config/business.config.json` (source-of-truth seed data)
  - `prisma/schema.prisma` and `prisma/seed.js` to seed subscription plans,
    opening hours, and gym settings.
  - `server/services/settings.service.ts` to read and update settings via Prisma
  - `server/utils/config.ts` and `server/validators/settings.schemas.ts` for
    config loading and runtime validation (Zod)
- Add admin protection and helpers:
  - `server/utils/jwt.ts` for JWT verification
  - `server/middleware/admin.middleware.ts` implementing `requireAdmin(event)`
  - Admin endpoints: `server/api/admin/settings.get.ts` and
    `server/api/admin/settings.put.ts` that use `requireAdmin`
- Add test infrastructure and tests:
  - `vitest` config, `tsconfig.json`, and `package.json` scripts
  - `tests/middleware/admin.middleware.test.ts` (unit)
  - `tests/api/admin.settings.test.ts` (handler level, services mocked)
- Add CI workflow to run tests on push and PRs: `.github/workflows/ci.yml`

Why

These changes implement the authoritative business configuration model and the
admin surface to manage it. Adding tests and CI ensures the admin protection
and settings code stay correct as we iterate.

Testing

Locally you can run:

```bash
npm ci
npm test
```

If you want to populate the DB (Postgres + Prisma) with the official
business config run migrations and seed:

```bash
npx prisma migrate dev
node prisma/seed.js
```

Notes for reviewers

- Review the `requireAdmin` middleware for security and to ensure proper
  error codes are returned.
- Confirm the seed script is idempotent and aligns with `server/config/business.config.json`.
- The tests mock services where appropriate to avoid DB dependency.
