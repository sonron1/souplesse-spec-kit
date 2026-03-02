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
      <button class="btn-primary" @click="refresh">Filtrer</button>
      <button class="btn-secondary" @click="resetFilters">Réinitialiser</button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="4" :height="80" />

    <!-- Error -->
    <div v-else-if="error" class="card text-red-600">
      Erreur lors du chargement des séances.
    </div>

    <!-- Empty -->
    <div v-else-if="!sessions?.length" class="card text-gray-500 text-center py-12">
      <p class="text-lg font-medium mb-2">Aucune séance disponible</p>
      <p class="text-sm">Revenez bientôt ou modifiez les filtres de date.</p>
    </div>

    <!-- Session list -->
    <div v-else class="space-y-4">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <p class="font-semibold text-gray-900 text-base">
            {{ formatDateTime(session.dateTime) }}
          </p>
          <p class="text-sm text-gray-500 mt-0.5">
            Durée : <span class="font-medium">{{ session.duration }} min</span>
            &nbsp;·&nbsp; Capacité : <span class="font-medium">{{ session.capacity }} places</span>
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span
            :class="session.capacity > 0 ? 'badge-success' : 'badge-danger'"
          >
            {{ session.capacity > 0 ? 'Places disponibles' : 'Complet' }}
          </span>

          <button
            :disabled="session.capacity === 0 || bookingInProgress === session.id"
            class="btn-primary"
            @click="bookSession(session.id)"
          >
            <span v-if="bookingInProgress === session.id">Réservation…</span>
            <span v-else>Réserver</span>
          </button>
        </div>
      </div>
    </div>

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

  const { accessToken } = useAuth()

  interface Session {
    id: string
    dateTime: string
    duration: number
    capacity: number
    coachId: string
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
