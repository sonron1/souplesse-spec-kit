import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const isAccelerate = (process.env.DATABASE_URL ?? '').startsWith('prisma+')

const base = new PrismaClient()

export const prisma = isAccelerate ? base.$extends(withAccelerate()) : base
