<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mon abonnement</h1>
        <p class="text-sm text-gray-500 mt-0.5">Historique de vos formules</p>
      </div>
      <NuxtLink to="/subscribe" class="btn-primary text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Souscrire
      </NuxtLink>
    </div>

    <SkeletonLoader v-if="pending" :count="2" :height="88" />

    <div v-else-if="!subscriptions?.length" class="card text-center py-14">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucun abonnement</p>
      <p class="text-sm text-gray-400 mb-5">Choisissez une formule pour accéder aux séances du club.</p>
      <NuxtLink to="/subscribe" class="btn-primary">Voir les formules</NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <!-- Active subscription highlight -->
      <div
        v-if="activeSub"
        class="rounded-2xl border-2 border-primary-400 bg-gradient-to-br from-primary-50 to-white p-6 relative overflow-hidden shadow-sm"
      >
        <!-- Decorative circle -->
        <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary-100 opacity-40 pointer-events-none"></div>

        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-xs text-primary-600 font-bold uppercase tracking-widest mb-1">Abonnement actuel</p>
            <h3 class="text-2xl font-extrabold text-gray-900">{{ activeSub.subscriptionPlan?.name ?? activeSub.type }}</h3>
          </div>
          <span class="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shrink-0">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Actif
          </span>
        </div>

        <p class="text-sm text-gray-600 mb-4">
          Du <strong>{{ formatDate(activeSub.startsAt) }}</strong> au <strong>{{ formatDate(activeSub.expiresAt) }}</strong>
        </p>

        <div class="space-y-1.5">
          <div class="flex justify-between text-xs text-gray-500">
            <span>Progression</span>
            <span class="font-semibold text-primary-600">{{ progressPct(activeSub) }}% écoulé</span>
          </div>
          <div class="h-2.5 w-full bg-white rounded-full overflow-hidden border border-primary-200">
            <div
              class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
              :style="`width: ${progressPct(activeSub)}%`"
            />
          </div>
          <p class="text-xs text-gray-500 text-right">{{ daysLeft(activeSub.expiresAt) }} jour(s) restant(s)</p>
        </div>
      </div>

      <!-- Past subscriptions -->
      <div v-if="pastSubs.length">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 mt-6">Historique</p>
        <div class="space-y-2">
          <div
            v-for="sub in pastSubs"
            :key="sub.id"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-800">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ formatDate(sub.startsAt) }} — {{ formatDate(sub.expiresAt) }}
                </p>
              </div>
            </div>
            <span
              :class="sub.status === 'ACTIVE' ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'"
              class="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
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
