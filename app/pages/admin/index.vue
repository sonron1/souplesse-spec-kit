<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Tableau de bord Admin</h1>

    <div v-if="pending" class="text-gray-400">Chargement des statistiques...</div>

    <div v-else-if="stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KpiCard label="Utilisateurs" :value="stats.totalUsers" color="blue" />
      <KpiCard label="Abonnements actifs" :value="stats.activeSubscriptions" color="green" />
      <KpiCard label="Revenus totaux" :value="stats.totalRevenue" type="currency" color="purple" />
      <KpiCard label="Réservations actives" :value="stats.totalBookings" color="orange" />
    </div>

    <div class="flex gap-4">
      <NuxtLink to="/admin/export" class="btn-secondary">Exporter CSV</NuxtLink>
      <NuxtLink to="/admin/users" class="btn-primary">Gérer les utilisateurs</NuxtLink>
    </div>
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
</script>
