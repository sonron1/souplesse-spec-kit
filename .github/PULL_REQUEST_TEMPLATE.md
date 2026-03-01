**Summary**

Brief description of changes in this PR (one or two sentences):

- Add tests and TypeScript/Vitest configuration
- Add CI workflow to run tests on PRs
- Seed and settings services, admin middleware and admin endpoints

**Related issues/PRs**

Refs: feat/1-add-gym-management

**What changed**

- Added unit tests for admin middleware and admin settings handlers
- Added `vitest` config and `tsconfig.json` for test environment
- Added GitHub Actions workflow `.github/workflows/ci.yml` to run tests

**Testing**

Steps to reproduce locally:

```bash
npm ci
npm test
```

**Migration / Database**

Run Prisma migrations and seed after pulling this branch if you need the seeded business data:

```bash
npx prisma migrate deploy  # or prisma migrate dev
node prisma/seed.js
```

**Notes for reviewers**

- Focus review on security around `requireAdmin` and seed idempotency.
- Tests are included and should pass in CI.
