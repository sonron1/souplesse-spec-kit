<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Tableau de bord</h1>

    <div v-if="!user" class="text-gray-500">Chargement...</div>

    <div v-else>
      <p class="text-lg mb-4">Bienvenue, <strong>{{ user.name }}</strong> 👋</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-500">Abonnement</p>
          <p class="text-xl font-semibold text-primary-600 mt-1">
            {{ subscriptionStatus }}
          </p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-500">Prochaine séance</p>
          <p class="text-xl font-semibold mt-1">—</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <p class="text-sm text-gray-500">Réservations</p>
          <p class="text-xl font-semibold mt-1">{{ bookings?.length ?? 0 }}</p>
        </div>
      </div>

      <div class="flex gap-4">
        <NuxtLink to="/dashboard/bookings" class="btn-primary">Mes réservations</NuxtLink>
        <NuxtLink to="/dashboard/subscriptions" class="btn-secondary">Mon abonnement</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, accessToken } = useAuth()

const { data: bookings } = await useLazyFetch('/api/bookings', {
  headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
})

const subscriptionStatus = computed(() => {
  return 'Actif' // TODO: fetch real subscription status
})
</script>
