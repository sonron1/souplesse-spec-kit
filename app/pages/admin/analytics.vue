<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Analytique & Comptabilité</h1>
        <p class="text-sm text-gray-500 mt-0.5">Inventaire financier et statistiques détaillées.</p>
      </div>
      <button class="btn-secondary text-sm flex items-center gap-1.5" @click="refresh">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Actualiser
      </button>
    </div>

    <SkeletonLoader v-if="pending" :count="8" :height="80" />

    <template v-else-if="data">
      <!-- KPI Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Revenu total</p>
          <p class="text-3xl font-extrabold text-primary-600">{{ formatXOF(data.kpis.totalRevenue) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Revenu ce mois</p>
          <p class="text-3xl font-extrabold text-green-600">{{ formatXOF(data.kpis.revenueThisMonth) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Abonnements actifs</p>
          <p class="text-3xl font-extrabold text-blue-600">{{ data.kpis.activeSubscriptions }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Abonnements expirés</p>
          <p class="text-3xl font-extrabold text-gray-400">{{ data.kpis.expiredSubscriptions }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">En attente paiement</p>
          <p class="text-3xl font-extrabold text-amber-500">{{ data.kpis.pendingSubscriptions }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total clients</p>
          <p class="text-3xl font-extrabold text-gray-800">{{ data.kpis.totalClients }}</p>
          <p class="text-xs text-green-600 mt-1">+{{ data.kpis.newClientsThisMonth }} ce mois</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Séances totales</p>
          <p class="text-3xl font-extrabold text-gray-800">{{ data.kpis.totalSessions }}</p>
          <p class="text-xs text-blue-600 mt-1">{{ data.kpis.upcomingSessions }} à venir</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Réservations confirmées</p>
          <p class="text-3xl font-extrabold text-gray-800">{{ data.kpis.confirmedBookings }}</p>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Monthly revenue bar chart -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Revenus mensuels (XOF)</h2>
          <div v-if="data.monthlyData.length === 0" class="text-center text-gray-400 text-sm py-8">Aucune donnée</div>
          <div v-else class="flex items-end gap-2 h-40">
            <div
              v-for="m in data.monthlyData"
              :key="m.month"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <span class="text-[10px] text-gray-500">{{ formatXOF(m.revenue, true) }}</span>
              <div
                class="w-full rounded-t-lg bg-primary-400 transition-all"
                :style="{ height: barHeight(m.revenue, maxRevenue) }"
              />
              <span class="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">{{ m.month }}</span>
            </div>
          </div>
        </div>

        <!-- Monthly subscriptions bar chart -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Nouveaux abonnements par mois</h2>
          <div v-if="data.monthlyData.length === 0" class="text-center text-gray-400 text-sm py-8">Aucune donnée</div>
          <div v-else class="flex items-end gap-2 h-40">
            <div
              v-for="m in data.monthlyData"
              :key="m.month"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <span class="text-[10px] text-gray-500">{{ m.subscriptions }}</span>
              <div
                class="w-full rounded-t-lg bg-blue-400 transition-all"
                :style="{ height: barHeight(m.subscriptions, maxSubscriptions) }"
              />
              <span class="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">{{ m.month }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Plan breakdown + Top clients -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Active subscriptions by plan -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Abonnements actifs par formule</h2>
          <div v-if="!data.planStats.length" class="text-center text-gray-400 text-sm py-8">Aucun abonnement actif</div>
          <div v-else class="space-y-3">
            <div v-for="p in data.planStats" :key="p.planId ?? ''" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ p.planName }}</p>
                <p class="text-xs text-gray-400 uppercase">{{ p.planType }}</p>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary-400 rounded-full"
                    :style="{ width: planBarWidth(p.count) }"
                  />
                </div>
                <span class="text-sm font-bold text-gray-700 w-6 text-right">{{ p.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top clients -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Top 5 clients (paiements)</h2>
          <div v-if="!data.topClients.length" class="text-center text-gray-400 text-sm py-8">Aucun paiement confirmé</div>
          <div v-else class="space-y-3">
            <div v-for="(c, i) in data.topClients" :key="c.userId" class="flex items-center gap-3">
              <span class="text-xs font-extrabold text-gray-400 w-5">#{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ c.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ c.email }}</p>
              </div>
              <span class="text-sm font-bold text-primary-600 shrink-0">{{ formatXOF(c.totalPaid) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })

  const { accessToken } = useAuth()

  interface MonthlyData { month: string; revenue: number; subscriptions: number }
  interface PlanStat { planId: string | null; planName: string; planType: string; count: number }
  interface TopClient { userId: string; name: string; email: string; totalPaid: number }
  interface Kpis {
    totalClients: number; totalCoaches: number; activeSubscriptions: number
    expiredSubscriptions: number; pendingSubscriptions: number; totalSessions: number
    upcomingSessions: number; confirmedBookings: number; totalRevenue: number
    revenueThisMonth: number; newClientsThisMonth: number
  }

  const { data, pending, refresh } = await useLazyFetch<{
    success: boolean; kpis: Kpis; planStats: PlanStat[]
    topClients: TopClient[]; monthlyData: MonthlyData[]
  }>('/api/admin/analytics', {
    headers: { Authorization: `Bearer ${accessToken.value}` },
  })

  const maxRevenue = computed(() => Math.max(1, ...( data.value?.monthlyData.map(m => m.revenue) ?? [0])))
  const maxSubscriptions = computed(() => Math.max(1, ...(data.value?.monthlyData.map(m => m.subscriptions) ?? [0])))
  const maxPlanCount = computed(() => Math.max(1, ...(data.value?.planStats.map(p => p.count) ?? [0])))

  function barHeight(value: number, max: number): string {
    return `${Math.max(4, Math.round((value / max) * 120))}px`
  }

  function planBarWidth(count: number): string {
    return `${Math.round((count / maxPlanCount.value) * 100)}%`
  }

  function formatXOF(v: number, short = false): string {
    if (short && v >= 1000) return `${Math.round(v / 1000)}k`
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)
  }
</script>
