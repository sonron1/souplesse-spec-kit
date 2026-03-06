/**
 * auth-interceptor.client.ts
 *
 * C006 — Intercepts session_revoked (401) responses globally via Nuxt's
 * fetch error hook and redirects to /login with an informative message.
 */
import { defineNuxtPlugin, navigateTo } from 'nuxt/app'
import type { NuxtApp } from 'nuxt/app'

export default defineNuxtPlugin((nuxtApp: NuxtApp) => {
  nuxtApp.hook('app:error', (error: unknown) => {
    const err = error as { statusCode?: number; data?: { data?: { code?: string } } }
    if (err?.statusCode === 401 && err?.data?.data?.code === 'session_revoked') {
      // Clear session cookies
      const cookiesToClear = ['access_token', 'refresh_token', 'user_info']
      for (const name of cookiesToClear) {
        document.cookie = `${name}=; Max-Age=0; path=/`
      }
      void navigateTo('/login?reason=session_revoked')
    }
  })
})

