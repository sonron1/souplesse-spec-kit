<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-1">Content(e) de vous revoir&nbsp;!</h2>
    <p class="text-sm text-gray-500 mb-6">Connectez-vous pour accéder à votre espace.</p>

    <!-- C006: session revoked notice -->
    <div
      v-if="sessionRevokedMsg"
      class="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-start gap-2"
    >
      <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ sessionRevokedMsg }}
    </div>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="label" for="email">Adresse email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          placeholder="vous@exemple.com"
          class="input"
        />
      </div>

      <div>
        <label class="label" for="password">Mot de passe</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="••••••••"
          class="input"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="btn-primary w-full mt-2"
      >
        <span v-if="loading">Connexion en cours…</span>
        <span v-else>Se connecter</span>
      </button>
    </form>

    <p class="mt-5 text-center text-sm text-gray-500">
      Pas encore de compte&nbsp;?
      <NuxtLink to="/register" class="text-primary-600 font-semibold hover:underline">S'inscrire</NuxtLink>
    </p>
    <p class="mt-2 text-center text-xs text-gray-400">
      <NuxtLink to="/" class="hover:text-gray-600 transition-colors">← Retour à l'accueil</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
  const { login } = useAuth()
  const route = useRoute()

  const form = reactive({ email: '', password: '' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  definePageMeta({ layout: 'auth' })

  // C006: show message if redirected after session revocation
  const sessionRevokedMsg = computed(() =>
    route.query.reason === 'session_revoked'
      ? 'Votre session a été fermée car vous vous êtes connecté sur un autre appareil.'
      : null
  )

  async function handleLogin() {
    error.value = null
    loading.value = true
    try {
      await login(form.email, form.password)
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; statusMessage?: string }
      error.value = err?.data?.message ?? err?.statusMessage ?? 'Email ou mot de passe incorrect'
    } finally {
      loading.value = false
    }
  }
</script>
