<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mes réservations</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ bookings?.length ?? 0 }} réservation(s)</p>
      </div>
      <NuxtLink to="/sessions" class="btn-primary text-sm">+ Réserver une séance</NuxtLink>
    </div>

    <SkeletonLoader v-if="pending" :count="4" :height="72" />

    <div v-else-if="!bookings?.length" class="card text-center py-12">
      <p class="text-5xl mb-4">&#x1f4c5;</p>
      <p class="font-semibold text-gray-700 mb-1">Aucune réservation</p>
      <p class="text-sm text-gray-400 mb-5">Vous n'avez encore réservé aucune séance.</p>
      <NuxtLink to="/sessions" class="btn-primary">Voir les séances disponibles</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="booking in sortedBookings"
        :key="booking.id"
        class="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <p class="font-semibold text-gray-900">{{ formatDateTime(booking.session?.dateTime) }}</p>
          <p class="text-sm text-gray-500 mt-0.5">
            Durée : {{ booking.session?.duration ?? '—' }} min
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span :class="statusClass(booking.status)" class="px-3 py-1 rounded-full text-xs font-semibold">
            {{ statusLabel(booking.status) }}
          </span>
          <button
            v-if="booking.status === 'CONFIRMED'"
            class="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
            @click="cancelBooking(booking.id)"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar view -->
    <Calendar v-if="bookings?.length" :bookings="bookings" class="mt-8" />

    <!-- Cancel error toast -->
    <Teleport to="body">
      <div
        v-if="cancelError"
        class="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
      >
        {{ cancelError }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken } = useAuth()
  const cancelError = ref('')

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

  const sortedBookings = computed(() =>
    [...(bookings.value ?? [])].sort((a, b) => {
      const da = new Date(a.session?.dateTime ?? 0).getTime()
      const db = new Date(b.session?.dateTime ?? 0).getTime()
      return da - db
    })
  )

  function statusLabel(s: string) {
    if (s === 'CONFIRMED') return 'Confirmée'
    if (s === 'CANCELLED') return 'Annulée'
    return s
  }

  function statusClass(s: string) {
    if (s === 'CONFIRMED') return 'text-green-700 bg-green-100'
    if (s === 'CANCELLED') return 'text-red-600 bg-red-100'
    return 'text-gray-600 bg-gray-100'
  }

  function formatDateTime(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  }

  async function cancelBooking(id: string) {
    if (!confirm('Annuler cette réservation ?')) return
    cancelError.value = ''
    try {
      await $fetch(`/api/bookings/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      await refresh()
    } catch (e) {
      cancelError.value = 'Impossible d’annuler : ' + ((e as { statusMessage?: string })?.statusMessage ?? 'Erreur')
      setTimeout(() => { cancelError.value = '' }, 4000)
    }
  }
</script>
