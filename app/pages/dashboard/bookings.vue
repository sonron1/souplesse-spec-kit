<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Mes réservations</h1>

    <div v-if="pending" class="text-gray-500">Chargement...</div>

    <div v-else-if="!bookings?.length" class="text-gray-500">
      <p class="mb-4">Aucune réservation pour le moment.</p>
      <NuxtLink to="/sessions" class="btn-primary">Voir les séances disponibles</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="booking in bookings"
        :key="booking.id"
        class="bg-white rounded-lg shadow p-4 flex items-center justify-between"
      >
        <div>
          <p class="font-semibold">{{ formatDateTime(booking.session?.dateTime) }}</p>
          <p class="text-sm text-gray-500">Durée : {{ booking.session?.duration }} min</p>
        </div>
        <div class="flex items-center gap-3">
          <span
            :class="statusClass(booking.status)"
            class="px-3 py-1 rounded-full text-xs font-semibold"
          >
            {{ booking.status }}
          </span>
          <button
            v-if="booking.status === 'BOOKED'"
            class="text-red-600 text-sm hover:underline"
            @click="cancelBooking(booking.id)"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar component placeholder -->
    <Calendar v-if="bookings?.length" :bookings="bookings" class="mt-8" />
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken } = useAuth()

  interface Booking {
    id: string
    status: string
    session?: { dateTime: string; duration: number }
  }

  const {
    data: bookings,
    pending,
    refresh,
  } = await useLazyFetch<Booking[]>('/api/bookings', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  function statusClass(status: string) {
    if (status === 'BOOKED') return 'text-green-600 bg-green-100'
    if (status === 'CANCELLED') return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }

  function formatDateTime(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  }

  async function cancelBooking(id: string) {
    if (!confirm('Annuler cette réservation ?')) return
    try {
      await $fetch(`/api/bookings/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      await refresh()
    } catch (e) {
      alert("Impossible d'annuler : " + (e as { statusMessage?: string })?.statusMessage)
    }
  }
</script>
