<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p class="text-sm text-gray-500 mt-0.5">Vue d’ensemble de l’activité du club</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/admin/export" class="btn-secondary text-sm">Exporter CSV</NuxtLink>
        <NuxtLink to="/admin/users" class="btn-primary text-sm">Utilisateurs</NuxtLink>
      </div>
    </div>

    <!-- Skeleton -->
    <SkeletonLoader v-if="pending" :count="4" :height="80" />

    <template v-else-if="stats">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card flex flex-col gap-1">
          <p class="text-xs text-gray-500 font-medium">Membres</p>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalUsers }}</p>
          <p class="text-xs text-gray-400">inscrits au total</p>
        </div>
        <div class="card flex flex-col gap-1">
          <p class="text-xs text-gray-500 font-medium">Abonnements actifs</p>
          <p class="text-3xl font-extrabold text-primary-600">{{ stats.activeSubscriptions }}</p>
          <p class="text-xs text-gray-400">en cours</p>
        </div>
        <div class="card flex flex-col gap-1">
          <p class="text-xs text-gray-500 font-medium">Revenus totaux</p>
          <p class="text-3xl font-extrabold text-gray-900">{{ formatCurrency(stats.totalRevenue) }}</p>
          <p class="text-xs text-gray-400">FCFA collectés</p>
        </div>
        <div class="card flex flex-col gap-1">
          <p class="text-xs text-gray-500 font-medium">Réservations</p>
          <p class="text-3xl font-extrabold text-gray-900">{{ stats.totalBookings }}</p>
          <p class="text-xs text-gray-400">actives</p>
        </div>
      </div>

      <!-- Revenue by month table -->
      <div v-if="stats.revenueByMonth?.length" class="card mb-8">
        <h2 class="text-base font-bold text-gray-900 mb-4">Revenus par mois</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left text-gray-500 font-medium pb-3">Mois</th>
                <th class="text-right text-gray-500 font-medium pb-3">Montant (FCFA)</th>
                <th class="text-right text-gray-500 font-medium pb-3">Part</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in stats.revenueByMonth" :key="row.month" class="hover:bg-gray-50">
                <td class="py-3 font-medium text-gray-800">{{ formatMonth(row.month) }}</td>
                <td class="py-3 text-right font-bold text-gray-900">{{ formatCurrency(row.total) }}</td>
                <td class="py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <div class="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary-500 rounded-full"
                        :style="`width: ${Math.round((row.total / stats.totalRevenue) * 100)}%`"
                      />
                    </div>
                    <span class="text-xs text-gray-500 w-10 text-right">{{ Math.round((row.total / stats.totalRevenue) * 100) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <h2 class="text-base font-bold text-gray-900 mb-4">Accès rapides</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NuxtLink to="/admin/users" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 transition-all group">
            <span class="text-2xl">&#x1f465;</span>
            <span class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Utilisateurs</span>
          </NuxtLink>
          <NuxtLink to="/admin/export" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 transition-all group">
            <span class="text-2xl">&#x1f4be;</span>
            <span class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Export CSV</span>
          </NuxtLink>
          <NuxtLink to="/sessions" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 transition-all group">
            <span class="text-2xl">&#x1f4c5;</span>
            <span class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Séances</span>
          </NuxtLink>
          <NuxtLink to="/coach/sessions" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 transition-all group">
            <span class="text-2xl">&#x1f3cb;&#xfe0f;</span>
            <span class="text-xs font-semibold text-gray-700 group-hover:text-primary-700">Planifier</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isAdmin, accessToken } = useAuth()
  if (!isAdmin.value) await navigateTo('/dashboard')

  interface Stats {
    totalUsers: number
    activeSubscriptions: number
    totalRevenue: number
    totalBookings: number
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
