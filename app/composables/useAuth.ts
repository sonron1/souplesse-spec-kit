import { ref, computed } from 'vue'
import { useCookie, navigateTo } from 'nuxt/app'
import { $fetch } from 'ofetch'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Module-level user ref — shared across all useAuth() calls
const user = ref<AuthUser | null>(null)

export function useAuth() {
  const accessToken = useCookie<string | null>('access_token', { secure: true, sameSite: 'strict' })
  const refreshTokenCookie = useCookie<string | null>('refresh_token', {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
  })
  // Persist user info in cookie so it survives page refresh
  const userInfoCookie = useCookie<AuthUser | null>('user_info', {
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
  })

  // Hydrate module-level user ref from cookie on each call (idempotent)
  if (!user.value && userInfoCookie.value) {
    user.value = userInfoCookie.value
  }

  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isCoach = computed(() => user.value?.role === 'COACH' || user.value?.role === 'ADMIN')
  const isClient = computed(() => user.value?.role === 'CLIENT')

  async function register(name: string, email: string, password: string) {
    const data = await $fetch<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    _setSession(data.user, data.tokens)
    await _redirectByRole(data.user.role)
  }

  async function login(email: string, password: string) {
    const data = await $fetch<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    _setSession(data.user, data.tokens)
    await _redirectByRole(data.user.role)
  }

  async function _redirectByRole(role: string) {
    if (role === 'ADMIN') await navigateTo('/admin')
    else if (role === 'COACH') await navigateTo('/coach')
    else await navigateTo('/dashboard')
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
    } catch {
      // ignore errors on logout
    }
    _clearSession()
    await navigateTo('/login')
  }

  async function refresh() {
    if (!refreshTokenCookie.value) return false
    try {
      const data = await $fetch<{ tokens: AuthTokens }>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshTokenCookie.value },
      })
      accessToken.value = data.tokens.accessToken
      refreshTokenCookie.value = data.tokens.refreshToken
      return true
    } catch {
      _clearSession()
      return false
    }
  }

  function _setSession(u: AuthUser, tokens: AuthTokens) {
    user.value = u
    userInfoCookie.value = u // persist user to cookie
    accessToken.value = tokens.accessToken
    refreshTokenCookie.value = tokens.refreshToken
  }

  function _clearSession() {
    user.value = null
    userInfoCookie.value = null
    accessToken.value = null
    refreshTokenCookie.value = null
  }

  return { user, isLoggedIn, isAdmin, isCoach, isClient, accessToken, register, login, logout, refresh }
}
