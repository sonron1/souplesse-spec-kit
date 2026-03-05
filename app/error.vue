<template>
  <div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">

    <!-- Brand -->
    <NuxtLink to="/" class="flex items-center gap-2 mb-12 group">
      <span class="text-2xl font-extrabold tracking-tight text-white group-hover:text-gray-200 transition-colors">
        Souplesse<span class="text-yellow-400">·</span>
      </span>
    </NuxtLink>

    <!-- Icon -->
    <div class="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shrink-0" :class="iconBg">
      <!-- 404 -->
      <svg v-if="is404" class="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <!-- 403 -->
      <svg v-else-if="is403" class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
      <!-- 500 / other -->
      <svg v-else class="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>

    <!-- Status code -->
    <p class="text-7xl font-black tabular-nums mb-3" :class="codeColor">{{ error?.statusCode ?? 500 }}</p>

    <!-- Title -->
    <h1 class="text-2xl font-extrabold text-white mb-3">{{ title }}</h1>

    <!-- Description -->
    <p class="text-gray-400 max-w-md mb-10 text-sm leading-relaxed">{{ description }}</p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row items-center gap-3">
      <button
        class="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-2xl transition-colors text-sm"
        @click="handleError"
      >
        {{ is403 ? 'Retourner à l\'accueil' : 'Retourner à l\'accueil' }}
      </button>
      <button
        v-if="!is403"
        class="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl transition-colors text-sm"
        @click="reloadPage"
      >
        Réessayer
      </button>
    </div>

    <!-- Debug info in dev -->
    <details v-if="isDev && error?.message" class="mt-12 max-w-xl text-left">
      <summary class="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">Détails techniques</summary>
      <pre class="mt-3 text-xs text-gray-500 bg-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">{{ error?.message }}</pre>
    </details>

  </div>
</template>

<script setup lang="ts">
  import type { NuxtError } from '#app'

  const props = defineProps<{ error: NuxtError | null }>()

  const code = computed(() => props.error?.statusCode ?? 500)
  const is404 = computed(() => code.value === 404)
  const is403 = computed(() => code.value === 403)
  const is500 = computed(() => code.value >= 500)

  const isDev = process.dev

  const iconBg = computed(() => {
    if (is404.value) return 'bg-yellow-400/10 border border-yellow-400/20'
    if (is403.value) return 'bg-red-400/10 border border-red-400/20'
    return 'bg-orange-400/10 border border-orange-400/20'
  })

  const codeColor = computed(() => {
    if (is404.value) return 'text-yellow-400'
    if (is403.value) return 'text-red-400'
    return 'text-orange-400'
  })

  const title = computed(() => {
    if (is404.value) return 'Page introuvable'
    if (is403.value) return 'Accès refusé'
    if (is500.value) return 'Erreur serveur'
    return props.error?.statusMessage ?? 'Une erreur est survenue'
  })

  const description = computed(() => {
    if (is404.value) return 'La page que vous cherchez n\'existe pas ou a été déplacée. Vérifiez l\'URL ou retournez à l\'accueil.'
    if (is403.value) return 'Vous n\'êtes pas autorisé à accéder à cette page. Connectez-vous avec un compte disposant des droits requis.'
    if (is500.value) return 'Le serveur a rencontré une erreur inattendue. Notre équipe a été notifiée. Veuillez réessayer dans quelques instants.'
    return props.error?.statusMessage ?? 'Une erreur inattendue s\'est produite. Veuillez réessayer.'
  })

  function handleError() {
    clearError({ redirect: '/' })
  }

  function reloadPage() {
    clearError()
    window.location.reload()
  }
</script>
