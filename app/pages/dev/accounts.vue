<template>
  <div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
    <!-- Dev-only banner -->
    <div class="mb-8 flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-sm font-mono px-4 py-2 rounded-lg">
      <span>⚠</span>
      <span>Page de développement — ne pas exposer en production</span>
    </div>

    <h1 class="text-2xl font-extrabold text-white mb-1">Comptes de démonstration</h1>
    <p class="text-gray-500 text-sm mb-8">Cliquez sur un compte pour vous y connecter instantanément.</p>

    <!-- Currently logged in -->
    <div v-if="currentUser" class="mb-6 w-full max-w-xl bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono text-gray-300 flex items-center gap-3">
      <span class="text-gray-500">Connecté&nbsp;:</span>
      <span class="text-white font-semibold">{{ currentUser.name }}</span>
      <span :class="roleColor(currentUser.role)" class="text-xs px-2 py-0.5 rounded-full font-bold ml-auto">{{ currentUser.role }}</span>
    </div>

    <!-- Account cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
      <div
        v-for="account in demoAccounts"
        :key="account.email"
        class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-600 transition-colors"
      >
        <!-- Role badge -->
        <div class="flex items-center justify-between">
          <span :class="roleColor(account.role)" class="text-xs font-bold px-3 py-1 rounded-full">
            {{ account.role }}
          </span>
          <span v-if="currentUser?.email === account.email" class="text-xs text-green-400 font-mono">actif</span>
        </div>

        <!-- Credentials -->
        <div>
          <p class="text-white font-semibold text-sm mb-0.5">{{ account.name }}</p>
          <p class="text-gray-400 font-mono text-xs">{{ account.email }}</p>
          <p class="text-gray-600 font-mono text-xs mt-0.5">{{ account.password }}</p>
        </div>

        <!-- Login button -->
        <button
          :disabled="loggingIn === account.email || currentUser?.email === account.email"
          class="w-full rounded-lg py-2 text-sm font-semibold transition-all disabled:opacity-50"
          :class="currentUser?.email === account.email
            ? 'bg-green-900/40 text-green-400 border border-green-700 cursor-default'
            : 'bg-primary-500 hover:bg-primary-400 text-black'"
          @click="loginAs(account)"
        >
          {{ currentUser?.email === account.email ? '✓ Connecté' : loggingIn === account.email ? 'Connexion…' : 'Se connecter' }}
        </button>
      </div>
    </div>

    <!-- Error -->
    <p v-if="loginError" class="mt-6 text-red-400 text-sm font-mono">{{ loginError }}</p>

    <!-- Actions -->
    <div class="flex gap-4 mt-10">
      <button class="text-sm text-gray-500 hover:text-gray-300 transition-colors" @click="goToDashboard">
        → Aller au tableau de bord
      </button>
      <button class="text-sm text-gray-500 hover:text-gray-300 transition-colors" @click="handleLogout">
        Déconnexion
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  // No auth middleware — dev page accessible unauthenticated
  definePageMeta({ layout: false })

  const { logout, user: currentUser, accessToken } = useAuth()

  const loggingIn = ref<string | null>(null)
  const loginError = ref('')

  const demoAccounts = [
    { role: 'ADMIN',  name: 'Admin Demo',  email: 'admin@demo.com',  password: 'Demo1234!' },
    { role: 'COACH',  name: 'Coach Demo',  email: 'coach@demo.com',  password: 'Demo1234!' },
    { role: 'CLIENT', name: 'Client Demo', email: 'client@demo.com', password: 'Demo1234!' },
  ]

  const accessTokenCookie = useCookie<string | null>('access_token', { secure: true, sameSite: 'strict' })
  const refreshTokenCookie = useCookie<string | null>('refresh_token', { secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 })

  async function loginAs(account: { name: string; role: string; email: string; password: string }) {
    if (loggingIn.value) return
    loginError.value = ''
    loggingIn.value = account.email
    try {
      const data = await $fetch<{
        success: boolean
        user: { id: string; name: string; email: string; role: string }
        tokens: { accessToken: string; refreshToken: string }
      }>('/api/auth/login', {
        method: 'POST',
        body: { email: account.email, password: account.password },
      })
      // Set cookies without navigating away
      accessTokenCookie.value = data.tokens.accessToken
      refreshTokenCookie.value = data.tokens.refreshToken
      // Force page reload so useAuth reactive state re-hydrates from cookies
      window.location.reload()
    } catch {
      loginError.value = `Connexion échouée (${account.email}). Avez-vous exécuté le seed ?`
    } finally {
      loggingIn.value = null
    }
  }

  async function goToDashboard() {
    await navigateTo('/dashboard')
  }

  async function handleLogout() {
    await logout()
    window.location.reload()
  }

  function roleColor(role: string) {
    if (role === 'ADMIN') return 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
    if (role === 'COACH') return 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
    return 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
  }
</script>
