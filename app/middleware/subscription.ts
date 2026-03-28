/**
 * subscription middleware — redirects CLIENT users without an active subscription
 * to /dashboard. Pages that are always accessible (dashboard, subscriptions, profile,
 * subscribe) must NOT use this middleware.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { isClient, accessToken } = useAuth()

  // Only applies to CLIENT users
  if (!isClient.value) return

  // Check subscription status via the API
  try {
    const data = await $fetch<{ active: boolean }>('/api/me/subscription', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    if (!data?.active) {
      return navigateTo('/dashboard')
    }
  } catch {
    // On error (e.g. network, 401), redirect to dashboard to be safe
    return navigateTo('/dashboard')
  }
})
