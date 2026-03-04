import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// Trim to handle CRLF that Vercel CLI embeds when pushing env vars from Windows
if (process.env.DATABASE_URL) process.env.DATABASE_URL = process.env.DATABASE_URL.trim()
if (process.env.DIRECT_DATABASE_URL) process.env.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL.trim()

const isAccelerate = (process.env.DATABASE_URL ?? '').startsWith('prisma+')

const base = new PrismaClient()

export const prisma = isAccelerate ? base.$extends(withAccelerate()) : base
