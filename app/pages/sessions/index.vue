<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Séances disponibles</h1>
    </div>

    <!-- Filters -->
    <div class="card mb-6 flex flex-wrap gap-4 items-end">
      <div>
        <label class="label">À partir du</label>
        <input v-model="fromDate" type="date" class="input w-44" />
      </div>
      <div>
        <label class="label">Jusqu'au</label>
        <input v-model="toDate" type="date" class="input w-44" />
      </div>
      <button class="btn-primary" @click="() => refresh()">Filtrer</button>
      <button class="btn-secondary" @click="resetFilters">Réinitialiser</button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="isLoading" :count="4" :height="80" />

    <!-- Error -->
    <div v-else-if="error" class="card text-red-600">
      Erreur lors du chargement des séances.
    </div>

    <!-- Content (gated for clients without active subscription) -->
    <SubscriptionGate
      v-else
      :active="subActive"
      message="Souscrivez à une formule pour parcourir les séances disponibles et effectuer des réservations."
    >
      <!-- Empty -->
      <div v-if="!sessions?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p class="text-lg font-semibold text-gray-700 mb-1">Aucune séance disponible</p>
        <p class="text-sm text-gray-400">Revenez bientôt ou modifiez les filtres de date.</p>
      </div>

      <!-- Session list -->
      <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-primary-200 transition-colors"
      >
        <!-- Left: date + info -->
        <div class="flex items-start gap-4">
          <div class="shrink-0 w-14 h-14 rounded-xl bg-primary-50 flex flex-col items-center justify-center border border-primary-100">
            <span class="text-primary-600 font-extrabold text-lg leading-none">{{ new Date(session.dateTime).getDate() }}</span>
            <span class="text-primary-500 text-xs font-semibold uppercase">{{ new Date(session.dateTime).toLocaleString('fr-FR', { month: 'short' }) }}</span>
          </div>
          <div>
            <p class="font-bold text-gray-900">
              {{ formatDateTime(session.dateTime) }}
            </p>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span class="flex items-center gap-1 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ session.duration }} min
              </span>
              <span v-if="session.location" class="flex items-center gap-1 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {{ session.location }}
              </span>
              <span v-if="session.coach?.name" class="flex items-center gap-1 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                {{ session.coach.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: capacity + button -->
        <div class="flex items-center gap-3 sm:shrink-0">
          <div class="text-center min-w-[4rem]">
            <p class="text-lg font-extrabold" :class="remaining(session) > 0 ? 'text-green-600' : 'text-red-500'">{{ remaining(session) }}</p>
            <p class="text-xs text-gray-400 leading-tight">place(s)<br>dispo</p>
          </div>
          <button
            :disabled="remaining(session) === 0 || bookingInProgress === session.id"
            class="btn-primary"
            @click="bookSession(session.id)"
          >
            <span v-if="bookingInProgress === session.id">Réservation…</span>
            <span v-else-if="remaining(session) === 0">Complet</span>
            <span v-else>Réserver</span>
          </button>
        </div>
      </div>
    </div>
    </SubscriptionGate>

    <!-- Booking success toast -->
    <Teleport to="body">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2"
      >
        <span>{{ toastMessage }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken, isClient } = useAuth()

  // Subscription gate — blocks unsubscribed clients from browsing/booking sessions
  const subHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))
  const { data: subData, pending: subPending } = await useLazyFetch<{ active: boolean }>('/api/me/subscription', {
    headers: subHeaders,
    default: () => ({ active: false }),
  })
  const subActive = computed(() => !isClient.value || (subData.value?.active ?? false))

  interface Session {
    id: string
    dateTime: string
    duration: number
    capacity: number
    coachId: string
    location?: string | null
    coach?: { id: string; name: string } | null
    _count?: { bookings: number }
  }

  interface SessionsResponse {
    success: boolean
    sessions: Session[]
  }

  // Filters
  const fromDate = ref('')
  const toDate = ref('')

  const queryParams = computed(() => {
    const p: Record<string, string> = {}
    if (fromDate.value) p.from = fromDate.value
    if (toDate.value) p.to = toDate.value
    return p
  })

  const {
    data,
    pending,
    error,
    refresh,
  } = await useLazyFetch<SessionsResponse>('/api/sessions', {
    query: queryParams,
    default: () => ({ success: true, sessions: [] }),
  })

  const sessions = computed(() => data.value?.sessions ?? [])
  const isLoading = computed(() => pending.value || subPending.value)

  function resetFilters() {
    fromDate.value = ''
    toDate.value = ''
    refresh()
  }

  // Booking
  const bookingInProgress = ref<string | null>(null)
  const toastMessage = ref('')

  async function bookSession(sessionId: string) {
    if (!confirm('Confirmer la réservation de cette séance ?')) return
    bookingInProgress.value = sessionId
    try {
      await $fetch('/api/bookings', {
        method: 'POST',
        body: { sessionId },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      showToast('Réservation confirmée !')
      await refresh()
    } catch (e) {
      const err = e as { statusMessage?: string; data?: { statusMessage?: string } }
      const msg = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
      showToast(`Échec : ${msg}`)
    } finally {
      bookingInProgress.value = null
    }
  }

  function showToast(msg: string) {
    toastMessage.value = msg
    setTimeout(() => {
      toastMessage.value = ''
    }, 3500)
  }

  function remaining(s: Session) {
    return Math.max(0, s.capacity - (s._count?.bookings ?? 0))
  }

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>
