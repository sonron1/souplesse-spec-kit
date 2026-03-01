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
| `STRIPE_SECRET_KEY` | ✅ | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From Stripe webhook settings |

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
| `POST /api/bookings` | Authenticated (Active sub) | Book a session |
| `DELETE /api/bookings/delete/:id` | Authenticated (Owner) | Cancel booking |
| `GET /api/admin/stats` | Admin | Dashboard stats |
| `GET /api/admin/export` | Admin | CSV export |

## 6. Running Tests

```bash
npm test              # all tests
npm run test:coverage # with coverage report
```

Coverage thresholds: 80% global, 100% for auth and payments.

## 7. Payment Flow (Stripe)

1. User registers → logs in
2. `POST /api/payments/create-session` — creates Stripe Checkout session
3. User completes payment on Stripe hosted page
4. Stripe sends `checkout.session.completed` webhook to `POST /api/payments/webhook`
5. Webhook verifies signature → activates subscription

## 8. User Roles

| Role | Capabilities |
|---|---|
| `CLIENT` | Book sessions, view subscriptions/programs |
| `COACH` | Create/edit programs, create sessions, all CLIENT capabilities |
| `ADMIN` | All, plus admin dashboard and user management |
