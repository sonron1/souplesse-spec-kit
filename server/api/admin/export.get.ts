import { defineEventHandler, setHeader } from 'h3'
import { requireAuth } from '../../middleware/auth.middleware'
import { requireAdmin } from '../../utils/role'
import { prisma } from '../../utils/prisma'

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? '' : String(v)
      return `"${s.replace(/"/g, '""')}"`
    })
    .join(',')
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requireAdmin(user)

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  })

  const header = toCsvRow([
    'id',
    'user_name',
    'user_email',
    'amount',
    'currency',
    'status',
    'created_at',
  ])
  const rows = payments.map((p: (typeof payments)[number]) =>
    toCsvRow([
      p.id,
      p.user?.name,
      p.user?.email,
      p.amount,
      p.currency,
      p.status,
      p.createdAt.toISOString(),
    ])
  )

  const csv = [header, ...rows].join('\n')

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="payments-export.csv"')
  return csv
})
