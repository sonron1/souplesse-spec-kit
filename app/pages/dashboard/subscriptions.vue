<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Mon abonnement</h1>

    <div v-if="pending" class="text-gray-500">Chargement...</div>

    <div v-else-if="subscriptions?.length === 0" class="text-gray-500">
      <p class="mb-4">Vous n'avez pas d'abonnement actif.</p>
      <NuxtLink to="/subscribe" class="btn-primary">Souscrire maintenant</NuxtLink>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="sub in subscriptions"
        :key="sub.id"
        class="bg-white rounded-lg shadow p-4 flex items-center justify-between"
      >
        <div>
          <p class="font-semibold text-lg">{{ sub.type }}</p>
          <p class="text-sm text-gray-500">
            Du {{ formatDate(sub.startDate) }} au {{ formatDate(sub.endDate) }}
          </p>
        </div>
        <span
          :class="
            sub.status === 'ACTIVE' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
          "
          class="px-3 py-1 rounded-full text-xs font-semibold"
        >
          {{ sub.status }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken } = useAuth()

  const { data: subscriptions, pending } = await useLazyFetch<
    { id: string; type: string; status: string; startDate: string; endDate: string }[]
  >('/api/subscriptions', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR')
  }
</script>
