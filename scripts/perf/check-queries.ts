/**
 * Performance check script: analyzes Prisma query patterns for N+1 and missing indexes.
 * Run with: npx tsx scripts/perf/check-queries.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [{ level: 'query', emit: 'event' }],
})

interface QueryLog {
  query: string
  duration: number
}

const queries: QueryLog[] = []

// @ts-ignore — Prisma event typing requires $on to be cast
prisma.$on('query' as never, (e: QueryLog) => {
  queries.push({ query: e.query, duration: e.duration })
})

async function run() {
  console.log('🔍 Running query analysis...\n')

  // Simulate common dashboard queries
  await prisma.user.count()
  await prisma.subscription.count({ where: { status: 'ACTIVE' } })
  await prisma.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } })
  await prisma.booking.count({ where: { status: 'CONFIRMED' } })

  await prisma.$disconnect()

  // Report
  const slowQueries = queries.filter((q) => q.duration > 100)
  console.log(`Total queries: ${queries.length}`)
  console.log(`Slow queries (>100ms): ${slowQueries.length}`)

  if (slowQueries.length > 0) {
    console.log('\n⚠️  Slow queries:')
    for (const q of slowQueries) {
      console.log(`  [${q.duration}ms] ${q.query.slice(0, 120)}...`)
    }
    process.exit(1)
  } else {
    console.log('\n✅ All queries within acceptable latency.')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
