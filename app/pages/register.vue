<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-md">
      <h1 class="text-3xl font-bold text-center text-primary-700 mb-8">
        Souplesse Fitness
      </h1>

      <form
        class="bg-white shadow-md rounded-lg px-8 pt-6 pb-8"
        @submit.prevent="handleRegister"
      >
        <h2 class="text-xl font-semibold mb-6">Créer un compte</h2>

        <div v-if="error" class="bg-red-50 border border-red-300 text-red-700 rounded px-4 py-2 mb-4 text-sm">
          {{ error }}
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="name">Nom complet</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
            minlength="2"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Mot de passe</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p class="text-xs text-gray-500 mt-1">Minimum 8 caractères, 1 majuscule, 1 chiffre</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          <span v-if="loading">Inscription en cours...</span>
          <span v-else>S'inscrire</span>
        </button>

        <p class="mt-4 text-center text-sm text-gray-600">
          Déjà un compte?
          <NuxtLink to="/login" class="text-primary-600 hover:underline">Se connecter</NuxtLink>
        </p>
      </form>
    </div>
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
