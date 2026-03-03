<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mon calendrier</h1>
      <p class="text-sm text-gray-500 mt-0.5">Seances disponibles, reservations et abonnement en un coup d oeil.</p>
    </div>

    <SkeletonLoader v-if="loading" :count="1" :height="420" />

    <div v-else class="max-w-2xl">
      <Calendar
        :sessions="sessions"
        :bookings="bookings"
        :subscription="subscription ?? undefined"
      />

      <!-- Stats row -->
      <div class="mt-4 grid grid-cols-3 gap-3">
        <div class="card text-center py-4">
          <p class="text-2xl font-extrabold text-primary-600">{{ upcomingSessions }}</p>
          <p class="text-xs text-gray-400 mt-1">Seances a venir</p>
        </div>
        <div class="card text-center py-4">
          <p class="text-2xl font-extrabold text-green-600">{{ confirmedBookings }}</p>
          <p class="text-xs text-gray-400 mt-1">Reservations</p>
        </div>
        <div class="card text-center py-4">
          <p class="text-2xl font-extrabold" :class="(subscription?.daysLeft ?? 0) <= 7 ? 'text-amber-500' : 'text-gray-900'">
            {{ subscription?.daysLeft ?? 0 }}
          </p>
          <p class="text-xs text-gray-400 mt-1">Jours abonnement</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { accessToken, ensureFresh } = useAuth()

  interface SessionItem { id: string; dateTime: string }
  interface Booking { id: string; status: string; session?: { dateTime: string; duration: number } }
  interface SubInfo { active: boolean; daysLeft: number; expiresAt: string; planName?: string }

  const loading = ref(true)
  const sessions = ref<SessionItem[]>([])
  const bookings = ref<Booking[]>([])
  const subscription = ref<SubInfo | null>(null)

  const upcomingSessions = computed(() => {
    const now = new Date()
    return sessions.value.filter(s => new Date(s.dateTime) >= now).length
  })
  const confirmedBookings = computed(() => bookings.value.filter(b => b.status === 'CONFIRMED').length)

  onMounted(async () => {
    await ensureFresh()
    const headers = { Authorization: `Bearer ${accessToken.value}` }
    const todayStr = new Date().toISOString().split('T')[0]
    try {
      const [subData, sessionsData, bookingsData] = await Promise.all([
        $fetch<SubInfo>('/api/me/subscription', { headers }),
        $fetch<{ sessions: SessionItem[] }>('/api/sessions', { headers, query: { limit: 200, from: todayStr } }),
        $fetch<Booking[]>('/api/bookings', { headers }),
      ])
      subscription.value = subData
      sessions.value = sessionsData.sessions ?? []
      bookings.value = Array.isArray(bookingsData) ? bookingsData : []
    } catch (_) {
      // show calendar anyway; data just won't have markers
    } finally {
      loading.value = false
    }
  })
</script>
