import { defineEventHandler, getRequestHeader, createError } from 'h3'

/**
 * CSRF protection middleware — defends against cross-site request forgery.
 *
 * All state-changing requests (POST, PUT, PATCH, DELETE) that carry an
 * Origin header must originate from the same host as the server.
 *
 * Important design note: All protected API routes already require an
 * `Authorization: Bearer <jwt>` header that browsers cannot inject
 * automatically, which inherently prevents most CSRF attacks.
 * This middleware adds an explicit Origin/Referer check as defense-in-depth.
 *
 * Exempt routes:
 *  - GET / HEAD / OPTIONS — safe methods
 *  - /api/payments/kkiapay.webhook — must accept cross-origin provider POST
 */
export default defineEventHandler((event) => {
  const method = event.node.req.method?.toUpperCase() ?? 'GET'

  // Only check mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return

  const url = event.node.req.url ?? ''

  // Exempt KKiaPay webhook — provider posts from their origin
  if (url.includes('/api/payments/kkiapay')) return

  const origin = getRequestHeader(event, 'origin')
  const referer = getRequestHeader(event, 'referer')

  // If neither Origin nor Referer is present this is a server-to-server or
  // same-origin request — allow it (curl, Postman dev work, etc.)
  if (!origin && !referer) return

  // Determine the allowed origin from the Host header or X-Forwarded-Host
  const host = getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host') ?? ''

  if (origin) {
    // Strip protocol and trailing slash for comparison
    const originHost = origin.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const hostNorm = host.replace(/\/$/, '')
    if (originHost !== hostNorm) {
      throw createError({
        statusCode: 403,
        message: 'CSRF check failed: Origin mismatch.',
      })
    }
  } else if (referer) {
    const refHost = referer.replace(/^https?:\/\//, '').split('/')[0]
    const hostNorm = host.replace(/\/$/, '')
    if (refHost !== hostNorm) {
      throw createError({
        statusCode: 403,
        message: 'CSRF check failed: Referer mismatch.',
      })
    }
  }
})
