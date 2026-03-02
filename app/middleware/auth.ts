export default defineNuxtRouteMiddleware((_to, _from) => {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn.value) {
    return navigateTo('/login')
  }
})
