<template>
  <div class="min-h-screen bg-white flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center">

      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
          <svg class="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p class="text-gray-500">Vérification en cours…</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-3">Email vérifié ✓</h1>
        <p class="text-gray-500 mb-8">
          Votre adresse <strong>{{ verifiedEmail }}</strong> a bien été confirmée.
          Vous pouvez maintenant vous connecter.
        </p>
        <NuxtLink to="/login" class="inline-block bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-900 transition-colors">
          Se connecter
        </NuxtLink>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-3">Lien invalide</h1>
        <p class="text-gray-500 mb-8">{{ errorMessage }}</p>
        <NuxtLink to="/register" class="inline-block bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-900 transition-colors">
          Créer un compte
        </NuxtLink>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'landing' })

  const route = useRoute()
  const status = ref<'loading' | 'success' | 'error'>('loading')
  const verifiedEmail = ref('')
  const errorMessage = ref('Ce lien de vérification est invalide ou a déjà été utilisé.')

  onMounted(async () => {
    const token = route.query.token as string | undefined
    if (!token) {
      status.value = 'error'
      errorMessage.value = 'Aucun token de vérification trouvé dans l\'URL.'
      return
    }

    try {
      const data = await $fetch<{ success: boolean; email?: string; message?: string }>(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`
      )
      if (data.success && data.email) {
        verifiedEmail.value = data.email
        status.value = 'success'
      } else {
        errorMessage.value = data.message ?? errorMessage.value
        status.value = 'error'
      }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } }
      errorMessage.value = e?.data?.message ?? errorMessage.value
      status.value = 'error'
    }
  })
</script>
