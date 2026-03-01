import { defineEventHandler } from 'h3'
import { prisma } from '../../server/utils/prisma'

export default defineEventHandler(async (_event) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } })
  return { statusCode: 200, body: plans }
})
