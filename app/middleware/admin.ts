/**
 * admin middleware — allows only ADMIN users.
 * Non-admins are redirected to their appropriate dashboard.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isAdmin, isCoach } = useAuth()
  if (!isAdmin.value) {
    return navigateTo(isCoach.value ? '/coach' : '/dashboard')
  }
})
