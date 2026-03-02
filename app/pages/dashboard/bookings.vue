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
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucune réservation</p>
      <p class="text-sm text-gray-400 mb-5">Vous n'avez encore réservé aucune séance.</p>
      <NuxtLink to="/sessions" class="btn-primary">Voir les séances disponibles</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="booking in sortedBookings"
        :key="booking.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-gray-200 transition-colors"
      >
        <div class="flex items-start gap-4">
          <!-- Date block -->
          <div
            class="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border"
            :class="booking.status === 'CONFIRMED' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
          >
            <span
              class="font-extrabold text-xl leading-none"
              :class="booking.status === 'CONFIRMED' ? 'text-green-600' : 'text-gray-400'"
            >{{ booking.session ? new Date(booking.session.dateTime).getDate() : '?' }}</span>
            <span
              class="text-xs font-bold uppercase"
              :class="booking.status === 'CONFIRMED' ? 'text-green-500' : 'text-gray-400'"
            >{{ booking.session ? new Date(booking.session.dateTime).toLocaleString('fr-FR', { month: 'short' }) : '' }}</span>
          </div>
          <div>
            <p class="font-bold text-gray-900">{{ formatDateTime(booking.session?.dateTime) }}</p>
            <p class="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ booking.session?.duration ?? 0 }} min
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span :class="statusClass(booking.status)" class="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
            <span v-if="booking.status === 'CONFIRMED'">✓</span>
            <span v-else-if="booking.status === 'CANCELLED'">✗</span>
            {{ statusLabel(booking.status) }}
          </span>
          <button
            v-if="booking.status === 'CONFIRMED'"
            class="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg"
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
  definePageMeta({ middleware: ['auth', 'client-only'] })

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
    if (!dt) return 'Date inconnue'
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
      cancelError.value = 'Impossible d\'annuler : ' + ((e as { statusMessage?: string })?.statusMessage ?? 'Erreur')
      setTimeout(() => { cancelError.value = '' }, 4000)
    }
  }
</script>
