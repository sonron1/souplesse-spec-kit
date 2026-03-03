import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const user = await prisma.user.findUnique({
  where: { email: 'angepop1998@gmail.com' },
  select: { emailVerificationToken: true, emailVerified: true, id: true }
})

if (!user) {
  console.log('User not found')
} else if (user.emailVerified) {
  console.log('Account already verified!')
} else {
  const token = user.emailVerificationToken
  const url = `http://localhost:3000/verify-email?token=${token}`
  console.log('\n✉  Verification URL for angepop1998@gmail.com:')
  console.log(`  ${url}\n`)
  console.log('Open the URL above in your browser to verify the account.')
}

await prisma.$disconnect()
