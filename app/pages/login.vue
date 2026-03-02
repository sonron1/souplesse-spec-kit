<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-1">Content(e) de vous revoir&nbsp;!</h2>
    <p class="text-sm text-gray-500 mb-6">Connectez-vous pour accéder à votre espace.</p>

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

  const form = reactive({ email: '', password: '' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  definePageMeta({ layout: 'auth' })

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
