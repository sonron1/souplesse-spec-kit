<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Séances</h1>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
      <button
        v-for="t in tabs"
        :key="t.value"
        class="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="tab === t.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
        @click="switchTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Date filters (upcoming tab only) -->
    <div v-if="tab === 'upcoming'" class="card mb-6 flex flex-wrap gap-4 items-end">
      <div>
        <label class="label">A partir du</label>
        <input v-model="fromDate" type="date" class="input w-44" :min="todayStr" />
      </div>
      <div>
        <label class="label">Jusqu au</label>
        <input v-model="toDate" type="date" class="input w-44" :min="todayStr" />
      </div>
      <button class="btn-primary" @click="applyFilters">Filtrer</button>
      <button class="btn-secondary" @click="resetFilters">Reinitialiser</button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="isLoading" :count="5" :height="88" />

    <!-- Error -->
    <div v-else-if="fetchError" class="card text-red-600">
      Erreur lors du chargement des seances.
    </div>

    <!-- Gated content -->
    <SubscriptionGate
      v-else
      :active="subActive"
      message="Souscrivez a une formule pour parcourir les seances disponibles et effectuer des reservations."
    >
      <!-- Empty -->
      <div v-if="!sessions.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p class="text-lg font-semibold text-gray-700 mb-1">
          {{ tab === 'upcoming' ? 'Aucune seance a venir' : 'Aucune seance passee' }}
        </p>
        <p class="text-sm text-gray-400">{{ tab === 'upcoming' ? 'Revenez bientot ou modifiez les filtres.' : 'Aucune seance n a encore eu lieu.' }}</p>
      </div>

      <!-- Session list -->
      <div v-else class="space-y-3">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors"
          :class="tab === 'past' ? 'opacity-70' : 'hover:border-primary-200'"
        >
          <div class="flex items-start gap-4">
            <div
              class="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border"
              :class="tab === 'past' ? 'bg-gray-50 border-gray-200' : 'bg-primary-50 border-primary-100'"
            >
              <span
                class="font-extrabold text-lg leading-none"
                :class="tab === 'past' ? 'text-gray-400' : 'text-primary-600'"
              >{{ new Date(session.dateTime).getDate() }}</span>
              <span
                class="text-xs font-semibold uppercase"
                :class="tab === 'past' ? 'text-gray-400' : 'text-primary-500'"
              >{{ new Date(session.dateTime).toLocaleString('fr-FR', { month: 'short' }) }}</span>
            </div>
            <div>
              <p class="font-bold text-gray-900">{{ formatDateTime(session.dateTime) }}</p>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {{ session.duration }} min
                </span>
                <span v-if="session.location" class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  {{ session.location }}
                </span>
                <span v-if="session.coach != null" class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  {{ session.coach.name }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 sm:shrink-0">
            <template v-if="tab === 'past'">
              <span class="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Seance terminee</span>
              <div class="text-center min-w-[4rem]">
                <p class="text-sm font-bold text-gray-400">{{ session._count != null ? session._count.bookings : 0 }}</p>
                <p class="text-xs text-gray-400">reservee(s)</p>
              </div>
            </template>
            <template v-else>
              <div class="text-center min-w-[4rem]">
                <p class="text-lg font-extrabold" :class="remaining(session) > 0 ? 'text-green-600' : 'text-red-500'">{{ remaining(session) }}</p>
                <p class="text-xs text-gray-400 leading-tight">place(s) dispo</p>
              </div>
              <button
                :disabled="remaining(session) === 0 || bookingInProgress === session.id"
                class="btn-primary"
                @click="bookSession(session.id)"
              >
                <span v-if="bookingInProgress === session.id">Reservation...</span>
                <span v-else-if="remaining(session) === 0">Complet</span>
                <span v-else>Reserver</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.totalPages > 1" class="mt-6 flex items-center justify-center gap-3">
        <button
          class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          :disabled="page === 1"
          @click="goToPage(page - 1)"
        >Precedent</button>
        <span class="text-sm text-gray-500 font-medium px-2">
          Page {{ page }} / {{ pagination.totalPages }}
          <span class="text-gray-400 font-normal ml-1">({{ pagination.total }} seance{{ pagination.total > 1 ? 's' : '' }})</span>
        </span>
        <button
          class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          :disabled="page >= pagination.totalPages"
          @click="goToPage(page + 1)"
        >Suivant</button>
      </div>
    </SubscriptionGate>

    <Teleport to="body">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
      >
        {{ toastMessage }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken, isClient } = useAuth()

  const tabs = [
    { label: 'A venir', value: 'upcoming' },
    { label: 'Passees', value: 'past' },
  ] as const

  const tab = ref<'upcoming' | 'past'>('upcoming')
  const page = ref(1)
  const LIMIT = 10
  const todayStr = computed(() => new Date().toISOString().split('T')[0])
  const fromDate = ref('')
  const toDate = ref('')

  const subHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))
  const { data: subData, pending: subPending } = await useLazyFetch<{ active: boolean }>('/api/me/subscription', {
    headers: subHeaders,
    default: () => ({ active: false }),
  })
  const subActive = computed(() => !isClient.value || (subData.value?.active ?? false))

  interface Session {
    id: string; dateTime: string; duration: number; capacity: number; coachId: string
    location?: string | null
    coach?: { id: string; name: string } | null
    _count?: { bookings: number }
  }

  interface Pagination { page: number; limit: number; total: number; totalPages: number }
  interface SessionsResponse { success: boolean; sessions: Session[]; pagination: Pagination }

  const queryParams = computed(() => {
    const p: Record<string, string | number> = { page: page.value, limit: LIMIT }
    if (tab.value === 'upcoming') {
      // upcoming: from today midnight to optional end date
      p.from = fromDate.value || todayStr.value
      if (toDate.value) p.to = toDate.value
    } else {
      // past: everything strictly before today (use beginning of today as upper bound)
      p.to = todayStr.value + 'T00:00:00.000Z'
    }
    return p
  })

  const { data, pending, error: fetchError, refresh } = await useLazyFetch<SessionsResponse>('/api/sessions', {
    query: queryParams,
    default: () => ({ success: true, sessions: [], pagination: { page: 1, limit: LIMIT, total: 0, totalPages: 1 } }),
  })

  const sessions = computed(() => data.value?.sessions ?? [])
  const pagination = computed(() => data.value?.pagination ?? null)
  const isLoading = computed(() => pending.value || subPending.value)

  function switchTab(value: 'upcoming' | 'past') {
    tab.value = value as 'upcoming' | 'past'
    page.value = 1
    fromDate.value = ''
    toDate.value = ''
  }

  function applyFilters() { page.value = 1; refresh() }
  function resetFilters() { fromDate.value = ''; toDate.value = ''; page.value = 1; refresh() }
  function goToPage(n: number) { page.value = n; window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const bookingInProgress = ref<string | null>(null)
  const toastMessage = ref('')

  async function bookSession(sessionId: string) {
    if (!confirm('Confirmer la reservation de cette seance ?')) return
    bookingInProgress.value = sessionId
    try {
      await $fetch('/api/bookings', {
        method: 'POST',
        body: { sessionId },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      showToast('Reservation confirmee !')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string; statusMessage?: string }; statusMessage?: string }
      showToast('Echec : ' + (err?.data?.message ?? err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'))
    } finally {
      bookingInProgress.value = null
    }
  }

  function showToast(msg: string) { toastMessage.value = msg; setTimeout(() => { toastMessage.value = '' }, 3500) }
  function remaining(s: Session) { return Math.max(0, s.capacity - (s._count?.bookings ?? 0)) }
  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
</script>
