<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p class="text-sm text-gray-500 mt-0.5">Vue d’ensemble de l’activité du club</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/admin/export" class="btn-secondary text-sm gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Exporter
        </NuxtLink>
        <NuxtLink to="/admin/users" class="btn-primary text-sm gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          Utilisateurs
        </NuxtLink>
      </div>
    </div>

    <!-- Skeleton -->
    <SkeletonLoader v-if="pending" :count="4" :height="80" />

    <template v-else-if="stats">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Membres</p>
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalUsers }}</p>
          <p class="text-xs text-gray-400">inscrits au total</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actifs</p>
            <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-green-600">{{ stats.activeSubscriptions }}</p>
          <p class="text-xs text-gray-400">abonnements en cours</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenus</p>
            <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <p class="text-2xl font-extrabold text-gray-900 tabular-nums">{{ formatCurrency(stats.totalRevenue) }}</p>
          <p class="text-xs text-gray-400">FCFA collectés</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Réservations</p>
            <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalBookings }}</p>
          <p class="text-xs text-gray-400">confirmées</p>
        </div>
      </div>

      <!-- Second row KPI: breakdown -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coachs</p>
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalCoaches }}</p>
          <p class="text-xs text-gray-400">entraîneurs actifs</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clients</p>
            <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-green-600">{{ stats.totalClients }}</p>
          <p class="text-xs text-gray-400">membres inscrits</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Séances</p>
            <div class="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalSessions }}</p>
          <p class="text-xs text-gray-400">au total planifiées</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">À venir</p>
            <div class="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <p class="text-3xl font-extrabold text-teal-600">{{ stats.upcomingSessions }}</p>
          <p class="text-xs text-gray-400">séances à venir</p>
        </div>
      </div>
      <div v-if="stats.revenueByMonth?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 class="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
          <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Revenus par mois
        </h2>
        <div class="space-y-3">
          <div v-for="row in stats.revenueByMonth" :key="row.month" class="flex items-center gap-4">
            <span class="text-sm font-medium text-gray-700 w-32 shrink-0">{{ formatMonth(row.month) }}</span>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                :style="`width: ${stats.totalRevenue > 0 ? Math.round((row.total / stats.totalRevenue) * 100) : 0}%`"
              />
            </div>
            <span class="text-sm font-bold text-gray-900 tabular-nums w-28 text-right shrink-0">{{ formatCurrency(row.total) }} F</span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-base font-bold text-gray-900 mb-4">Accès rapides</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NuxtLink to="/admin/users" class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 transition-all">
            <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <span class="text-xs font-bold text-blue-700">Utilisateurs</span>
          </NuxtLink>
          <NuxtLink to="/admin/assignments" class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-green-50 hover:bg-green-100 border border-green-100 hover:border-green-200 transition-all">
            <div class="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <span class="text-xs font-bold text-green-700">Assignations</span>
          </NuxtLink>
          <NuxtLink to="/admin/export" class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-primary-50 hover:bg-primary-100 border border-primary-100 hover:border-primary-200 transition-all">
            <div class="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <span class="text-xs font-bold text-primary-700">Export CSV</span>
          </NuxtLink>
          <NuxtLink to="/admin/settings" class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 transition-all">
            <div class="w-10 h-10 rounded-xl bg-gray-600 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <span class="text-xs font-bold text-gray-700">Paramètres</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })
  const { accessToken } = useAuth()

  interface Stats {
    totalUsers: number
    totalCoaches: number
    totalClients: number
    activeSubscriptions: number
    totalRevenue: number
    totalBookings: number
    totalSessions: number
    upcomingSessions: number
    revenueByMonth: { month: string; total: number }[]
  }

  const { data: statsResp, pending } = await useLazyFetch<{ stats: Stats }>('/api/admin/stats', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
  })

  const stats = computed(() => statsResp.value?.stats)

  function formatCurrency(v: number) {
    return new Intl.NumberFormat('fr-FR').format(v)
  }

  function formatMonth(m: string) {
    const [year, month] = m.split('-')
    const d = new Date(Number(year), Number(month) - 1)
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }
</script>
