<template>
  <div>
    <!-- ── Hero banner ──────────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-black mb-8 px-6 py-8 sm:px-10 sm:py-10">
      <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #eab308 0, #eab308 1px, transparent 0, transparent 50%); background-size: 20px 20px;"/>
      <div class="absolute -top-10 -right-10 w-48 h-48 bg-primary-400/20 rounded-full blur-3xl"/>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-primary-400/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-xs font-bold text-primary-400 uppercase tracking-widest">Calendrier</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Mon calendrier</h1>
          <p class="text-sm text-gray-400 mt-1.5">Séances, réservations et abonnement en un coup d'œil.</p>
        </div>
        <div class="flex gap-3 shrink-0">
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[80px]">
            <p class="text-xl font-extrabold text-primary-400">{{ upcomingSessions }}</p>
            <p class="text-xs text-gray-400 leading-tight mt-0.5">Séances<br/>à venir</p>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[80px]">
            <p class="text-xl font-extrabold text-green-400">{{ confirmedBookings }}</p>
            <p class="text-xs text-gray-400 leading-tight mt-0.5">Réserva-<br/>tions</p>
          </div>
        </div>
      </div>
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
        <div class="bg-white rounded-xl shadow border border-gray-100 text-center py-4" style="color-scheme:light">
          <p class="text-2xl font-extrabold text-primary-500">{{ upcomingSessions }}</p>
          <p class="text-xs text-gray-500 mt-1">Séances à venir</p>
        </div>
        <div class="bg-white rounded-xl shadow border border-gray-100 text-center py-4" style="color-scheme:light">
          <p class="text-2xl font-extrabold text-green-600">{{ confirmedBookings }}</p>
          <p class="text-xs text-gray-500 mt-1">Réservations</p>
        </div>
        <div class="bg-white rounded-xl shadow border border-gray-100 text-center py-4" style="color-scheme:light">
          <p class="text-2xl font-extrabold" :class="(subscription?.daysLeft ?? 0) <= 7 ? 'text-amber-500' : 'text-gray-800'">
            {{ subscription?.daysLeft ?? 0 }}
          </p>
          <p class="text-xs text-gray-500 mt-1">Jours abonnement</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ path: '/calendar', middleware: ['auth', 'client-only', 'subscription'] })

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
        $fetch<{ sessions: SessionItem[] }>('/api/sessions', { headers, query: { limit: 100, from: todayStr } }),
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
