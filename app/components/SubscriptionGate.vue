<template>
  <div class="relative" :class="{ 'min-h-[340px]': !active }">
    <!-- Slot content — blurred and non-interactive when locked -->
    <div :class="{ 'blur-sm opacity-25 pointer-events-none select-none': !active }">
      <slot />
    </div>

    <!-- Lock overlay -->
    <div
      v-if="!active"
      class="absolute inset-0 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-sm w-full">
        <!-- Icon -->
        <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>

        <!-- Text -->
        <h3 class="text-lg font-bold text-gray-900 mb-2">{{ title }}</h3>
        <p class="text-sm text-gray-500 mb-6 leading-relaxed">{{ message }}</p>

        <!-- CTA -->
        <NuxtLink
          to="/subscribe"
          class="btn-primary w-full justify-center text-sm"
        >
          Voir les formules d'abonnement →
        </NuxtLink>

        <p class="text-xs text-gray-400 mt-4">
          Déjà abonné ?
          <NuxtLink to="/dashboard/subscriptions" class="text-primary-600 hover:underline font-medium">
            Vérifier mon abonnement
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  withDefaults(defineProps<{
    active: boolean
    title?: string
    message?: string
  }>(), {
    title: 'Abonnement requis',
    message: 'Souscrivez à une formule pour accéder à cette fonctionnalité et réserver des séances.',
  })
</script>
