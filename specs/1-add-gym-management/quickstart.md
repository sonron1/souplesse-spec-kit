# Quick Start Guide — Souplesse Fitness Gym Management

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local PostgreSQL)
- npm

## 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

Key variables:
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, random |
| `KKIAPAY_API_KEY` | ✅ | From Kkiapay dashboard |
| `KKIAPAY_WEBHOOK_SECRET` | ✅ | From Kkiapay webhook settings |

## 2. Start Local Database

```bash
docker compose up -d
```

## 3. Install Dependencies & Migrate

```bash
npm install
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

## 4. Start Development Server

```bash
npm run dev
# App available at http://localhost:3000
```

## 5. Key Routes

| Route | Access | Description |
|---|---|---|
| `POST /api/auth/register` | Public | Register a new user |
| `POST /api/auth/login` | Public | Login, receive tokens |
| `POST /api/auth/refresh` | Public | Refresh access token |
| `POST /api/auth/logout` | Authenticated | Logout |
| `GET /api/sessions` | Public | List training sessions |
| `POST /api/sessions` | Coach/Admin | Create a session |
| `POST /api/bookings` | Authenticated (Active sub) | Book a session (bookings are final — no cancellation in v1) |
| `GET /api/admin/stats` | Admin | Dashboard stats |
| `GET /api/admin/users` | Admin | List all users |
| `GET /api/admin/payments` | Admin | List all payments |
| `GET /api/admin/export` | Admin | CSV export |
| `POST /api/admin/assignments` | Admin | Assign a coach to a client |
| `DELETE /api/admin/assignments` | Admin | Remove a coach-client assignment |

## 6. Running Tests

```bash
npm test              # all tests
npm run test:coverage # with coverage report
```

Coverage thresholds: 80% global, 100% for auth and payments.

## 7. Payment Flow (Kkiapay)

1. User registers → logs in
2. `POST /api/payments/create-session` — initiates Kkiapay payment session
3. User completes payment on Kkiapay hosted page
4. Kkiapay sends a payment confirmation webhook to `POST /api/payments/kkiapay-webhook`
5. Webhook verifies HMAC-SHA256 signature → activates subscription (idempotent — duplicate webhooks are safe)

## 8. User Roles

| Role | Capabilities |
|---|---|
| `CLIENT` | Book sessions, view subscriptions/programs |
| `COACH` | Create/edit programs, create sessions, all CLIENT capabilities |
| `ADMIN` | All, plus admin dashboard and user management |
