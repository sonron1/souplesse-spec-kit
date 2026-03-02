/**
 * coach middleware — allows COACH and ADMIN users.
 * Clients are redirected to /dashboard.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isCoach } = useAuth()
  if (!isCoach.value) {
    return navigateTo('/dashboard')
  }
})
