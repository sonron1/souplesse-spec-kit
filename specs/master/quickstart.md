````markdown
# Quickstart — Local Development (Souplesse Fitness)

Prerequisites: Docker, Node 18+, pnpm or npm, Git

1. Copy `.env.example` to `.env` and set:

- `DATABASE_URL` (Postgres)
- `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET`
- `JWT_SECRET`

2. Start local DB and services (Docker):

```powershell
docker compose up -d
```
````

3. Install deps and generate Prisma client:

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
# Seed business configuration (reads server/config/business.config.json)
node prisma/seed.js
```

4. Run dev server:

```bash
pnpm dev
```

5. Run tests:

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

Notes:

- Webhooks: use `stripe listen` in dev and forward to `/api/payments/webhook/stripe`.
- CI will run lint, type-check, unit & integration tests, then build.

```

```
