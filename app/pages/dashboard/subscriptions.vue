<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mon abonnement</h1>
        <p class="text-sm text-gray-500 mt-0.5">Historique de vos formules</p>
      </div>
      <NuxtLink to="/subscribe" class="btn-primary text-sm">+ Souscrire</NuxtLink>
    </div>

    <SkeletonLoader v-if="pending" :count="2" :height="88" />

    <div v-else-if="!subscriptions?.length" class="card text-center py-14">
      <p class="text-5xl mb-4">&#x1f4b3;</p>
      <p class="font-semibold text-gray-700 mb-1">Aucun abonnement</p>
      <p class="text-sm text-gray-400 mb-5">Choisissez une formule pour accéder aux séances du club.</p>
      <NuxtLink to="/subscribe" class="btn-primary">Voir les formules</NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <!-- Active subscription highlight -->
      <div
        v-if="activeSub"
        class="card border-2 border-primary-400 bg-primary-50 relative overflow-hidden"
      >
        <div class="absolute top-3 right-4">
          <span class="bg-primary-500 text-black text-xs font-bold px-3 py-1 rounded-full">✅ Actif</span>
        </div>
        <p class="text-xs text-primary-600 font-bold uppercase tracking-widest mb-2">Abonnement actuel</p>
        <h3 class="text-xl font-extrabold text-gray-900 mb-1">{{ activeSub.subscriptionPlan?.name ?? activeSub.type }}</h3>
        <p class="text-sm text-gray-600 mb-3">
          Du <strong>{{ formatDate(activeSub.startDate) }}</strong> au <strong>{{ formatDate(activeSub.endDate) }}</strong>
        </p>
        <div class="flex items-center gap-2">
          <div class="h-2 flex-1 bg-white rounded-full overflow-hidden border border-primary-200">
            <div
              class="h-full bg-primary-500 rounded-full transition-all"
              :style="`width: ${progressPct(activeSub)}%`"
            />
          </div>
          <span class="text-xs text-gray-500 whitespace-nowrap">{{ daysLeft(activeSub.endDate) }} jour(s) restant(s)</span>
        </div>
      </div>

      <!-- Other subscriptions -->
      <div
        v-for="sub in pastSubs"
        :key="sub.id"
        class="card flex items-center justify-between gap-4"
      >
        <div>
          <p class="font-semibold text-gray-800">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
          <p class="text-xs text-gray-500 mt-0.5">
            Du {{ formatDate(sub.startDate) }} au {{ formatDate(sub.endDate) }}
          </p>
        </div>
        <span
          :class="sub.status === 'ACTIVE' ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'"
          class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
        >
          {{ sub.status === 'ACTIVE' ? 'Actif' : 'Expiré' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken } = useAuth()

  interface Subscription {
    id: string
    type: string
    status: string
    startDate: string
    endDate: string
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
    if (!sub.startDate || !sub.endDate) return 0
    const total = new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()
    const elapsed = Date.now() - new Date(sub.startDate).getTime()
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }
</script>
