<template>
  <div>

    <!-- ── Page header ───────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mon abonnement</h1>
          <p class="text-sm text-gray-500 mt-0.5">Gérez et suivez votre formule active</p>
        </div>
      </div>
      <NuxtLink to="/subscribe" class="btn-primary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="hidden sm:inline">Nouvelle formule</span>
        <span class="sm:hidden">Souscrire</span>
      </NuxtLink>
    </div>

    <SkeletonLoader v-if="pending" :count="2" :height="120" />

    <!-- Empty state -->
    <div v-else-if="!subscriptions?.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-400/10 border border-primary-400/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-gray-800 mb-1">Aucun abonnement actif</p>
      <p class="text-sm text-gray-400 mb-6">Choisissez une formule pour accéder à toutes les séances du club.</p>
      <NuxtLink to="/subscribe" class="btn-primary inline-flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Voir les formules
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">

      <!-- ── Active subscription card ────────────────────────── -->
      <div v-if="activeSub" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <!-- Top accent bar -->
        <div class="h-1.5 w-full bg-primary-400" />

        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0">
                <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div>
                <p class="text-xs font-bold text-primary-600 uppercase tracking-widest mb-0.5">Formule active</p>
                <h3 class="text-xl font-extrabold text-gray-900">{{ activeSub.subscriptionPlan?.name ?? activeSub.type }}</h3>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              Actif
            </span>
          </div>

          <!-- Dates row -->
          <div class="flex flex-wrap gap-3 mb-5">
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
              <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide leading-none">Début</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formatDate(activeSub.startsAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
              <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide leading-none">Expire le</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formatDate(activeSub.expiresAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-primary-400/10 rounded-xl px-4 py-2.5 border border-primary-400/20">
              <svg class="w-4 h-4 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-[10px] text-primary-600 uppercase tracking-wide leading-none font-bold">Restant</p>
                <p class="text-sm font-extrabold text-primary-700 mt-0.5">{{ daysLeft(activeSub.expiresAt) }} jour(s)</p>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div>
            <div class="flex justify-between text-xs mb-2">
              <span class="text-gray-500 font-medium">Progression de la formule</span>
              <span class="font-bold text-primary-600">{{ progressPct(activeSub) }}% écoulé</span>
            </div>
            <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-400 rounded-full transition-all duration-500"
                :style="`width: ${progressPct(activeSub)}%`"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ── History ──────────────────────────────────────────── -->
      <div v-if="pastSubs.length">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-px flex-1 bg-gray-100" />
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Historique</p>
          <div class="h-px flex-1 bg-gray-100" />
        </div>
        <div class="space-y-2">
          <div
            v-for="sub in pastSubs"
            :key="sub.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-800 text-sm">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(sub.startsAt) }} — {{ formatDate(sub.expiresAt) }}</p>
              </div>
            </div>
            <span
              :class="sub.status === 'ACTIVE' ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'"
              class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap"
            >
              {{ sub.status === 'ACTIVE' ? 'Actif' : 'Expiré' }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { accessToken } = useAuth()

  interface Subscription {
    id: string
    type: string
    status: string
    startsAt: string | null
    expiresAt: string | null
    subscriptionPlan?: { name: string; planType: string } | null
  }

  const { data: subscriptions, pending } = await useLazyFetch<Subscription[]>('/api/subscriptions', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  const activeSub = computed(() => subscriptions.value?.find((s) => s.status === 'ACTIVE') ?? null)
  const pastSubs = computed(() => subscriptions.value?.filter((s) => s.status !== 'ACTIVE') ?? [])

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysLeft(end: string | null) {
    if (!end) return 0
    const diff = new Date(end).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86400000))
  }

  function progressPct(sub: Subscription) {
    if (!sub.startsAt || !sub.expiresAt) return 0
    const total = new Date(sub.expiresAt).getTime() - new Date(sub.startsAt).getTime()
    const elapsed = Date.now() - new Date(sub.startsAt).getTime()
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }
</script>
