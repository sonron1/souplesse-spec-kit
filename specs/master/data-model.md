```markdown
# Data Model (Conceptual) — Souplesse Fitness

## Entities

### User
- `id: UUID`
- `name: string`
- `email: string` (unique, indexed)
- `passwordHash: string`
- `role: 'CLIENT' | 'COACH' | 'ADMIN'`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Validation rules:
- email required, normalized
- passwordHash never exposed

### Subscription
- `id: UUID`
- `userId: UUID` (FK, indexed)
- `type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'`
- `status: 'PENDING' | 'ACTIVE' | 'EXPIRED'`
- `startDate: DateTime`
- `endDate: DateTime`

### Payment
- `id: UUID`
- `userId: UUID` (indexed)
- `subscriptionId: UUID` (indexed)
- `stripeSessionId: string | null`
- `amount: Decimal`
- `status: 'PENDING' | 'SUCCEEDED' | 'FAILED'`
- `providerReference: string` (webhook idempotency)
- `createdAt: DateTime`

### Session
- `id: UUID`
- `coachId: UUID` (indexed)
- `dateTime: DateTime`
- `duration: Int` (minutes)
- `capacity: Int`
- `createdAt: DateTime`

### Booking
- `id: UUID`
- `userId: UUID` (indexed)
- `sessionId: UUID` (indexed)
- `status: 'BOOKED' | 'CANCELLED' | 'ATTENDED'`
- `createdAt: DateTime`

### Program
- `id: UUID`
- `clientId: UUID` (indexed)
- `coachId: UUID` (indexed)
- `type: 'GAIN' | 'LOSS'`
- `content: JSON` (structured exercises)
- `createdAt: DateTime`

## Indexes / Performance
- Index on `User.email`, `Payment.createdAt`, `Booking.sessionId`, `Subscription.userId`.
- Consider materialized views or cached aggregates for admin dashboard metrics.

## Prisma Schema (starter snippet)

```prisma
model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  password   String
  role       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Additional models follow the conceptual definitions above
```

``` 
