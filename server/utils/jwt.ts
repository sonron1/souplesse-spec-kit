import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

if (!JWT_SECRET) {
  // do not fail at import time in environments where env is not yet set
  // but callers will throw with a clear error if verification is attempted
}

export function verifyJwt(token: string) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set')
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>
    return payload
  } catch (err) {
    throw err
  }
}
