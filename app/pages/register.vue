<template>
  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-1">Créer un compte</h2>
    <p class="text-sm text-gray-500 mb-6">Rejoignez Souplesse Fitness dès aujourd'hui.</p>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm"
    >
      {{ error }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <div>
        <label class="label" for="name">Nom complet</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          required
          minlength="2"
          placeholder="Votre prénom et nom"
          class="input"
        />
      </div>

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
          autocomplete="new-password"
          required
          placeholder="••••••••"
          class="input"
        />
        <p class="text-xs text-gray-400 mt-1">Minimum 8 caractères, 1 majuscule, 1 chiffre</p>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="btn-primary w-full mt-2"
      >
        <span v-if="loading">Inscription en cours…</span>
        <span v-else>Créer mon compte</span>
      </button>
    </form>

    <p class="mt-5 text-center text-sm text-gray-500">
      Déjà un compte&nbsp;?
      <NuxtLink to="/login" class="text-primary-600 font-semibold hover:underline">Se connecter</NuxtLink>
    </p>
    <p class="mt-2 text-center text-xs text-gray-400">
      <NuxtLink to="/" class="hover:text-gray-600 transition-colors">← Retour à l'accueil</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
  const { register } = useAuth()

  const form = reactive({ name: '', email: '', password: '' })
  const loading = ref(false)
  const error = ref<string | null>(null)

  definePageMeta({ layout: 'auth' })

  async function handleRegister() {
    error.value = null
    loading.value = true
    try {
      await register(form.name, form.email, form.password)
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; statusMessage?: string }
      error.value = err?.data?.message ?? err?.statusMessage ?? "Erreur lors de l'inscription"
    } finally {
      loading.value = false
    }
  }
</script>
