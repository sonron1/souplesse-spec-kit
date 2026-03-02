/**
 * client-only middleware — allows only CLIENT users.
 * Coaches and admins are redirected to their own dashboards.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isAdmin, isCoach } = useAuth()
  if (isAdmin.value) return navigateTo('/admin')
  if (isCoach.value) return navigateTo('/coach')
})
