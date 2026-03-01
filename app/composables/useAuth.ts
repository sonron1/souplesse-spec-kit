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

const user = ref<AuthUser | null>(null)
const accessToken = useCookie<string | null>('access_token', { secure: true, sameSite: 'strict' })
const refreshTokenCookie = useCookie<string | null>('refresh_token', {
  httpOnly: false,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
})

export function useAuth() {
  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isCoach = computed(() => user.value?.role === 'COACH' || user.value?.role === 'ADMIN')

  async function register(name: string, email: string, password: string) {
    const data = await $fetch<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    _setSession(data.user, data.tokens)
    await navigateTo('/dashboard')
  }

  async function login(email: string, password: string) {
    const data = await $fetch<{ user: AuthUser; tokens: AuthTokens }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    _setSession(data.user, data.tokens)
    await navigateTo('/dashboard')
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
    accessToken.value = tokens.accessToken
    refreshTokenCookie.value = tokens.refreshToken
  }

  function _clearSession() {
    user.value = null
    accessToken.value = null
    refreshTokenCookie.value = null
  }

  return { user, isLoggedIn, isAdmin, isCoach, accessToken, register, login, logout, refresh }
}
