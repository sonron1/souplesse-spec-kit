<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 select-none">

    <!-- Subscription info banner -->
    <div
      v-if="subscription && subscription.active"
      class="mb-5 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
      :class="subscription.daysLeft <= 7 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4" :class="subscription.daysLeft <= 7 ? 'text-amber-500' : 'text-green-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span class="font-medium" :class="subscription.daysLeft <= 7 ? 'text-amber-800' : 'text-green-800'">Abonnement actif</span>
      </div>
      <span class="font-bold" :class="subscription.daysLeft <= 7 ? 'text-amber-600' : 'text-green-700'">
        {{ subscription.daysLeft }} j restant{{ subscription.daysLeft > 1 ? 's' : '' }}
        · expire le {{ formatExpiry(subscription.expiresAt) }}
      </span>
    </div>

    <!-- Month navigation -->
    <div class="flex items-center justify-between mb-5">
      <button
        class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors font-bold"
        @click="prevMonth"
      >‹</button>
      <h2 class="text-base font-bold text-gray-900 capitalize">
        {{ monthLabel }}
      </h2>
      <button
        class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors font-bold"
        @click="nextMonth"
      >›</button>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 gap-1 mb-1">
      <div v-for="d in weekDays" :key="d" class="text-center text-xs font-semibold text-gray-400 py-1">{{ d }}</div>
    </div>

    <!-- Calendar cells -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="cell in cells"
        :key="cell.key"
        :title="cell.title"
        class="relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-colors cursor-default"
        :class="cellClass(cell)"
      >
        <span v-if="cell.day" class="font-semibold z-10">{{ cell.day }}</span>
        <!-- Session dot -->
        <span
          v-if="cell.hasSession"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          :class="cell.hasBooking ? 'bg-white' : 'bg-primary-400'"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
      <div class="flex items-center gap-1.5">
        <div class="w-6 h-6 rounded-lg bg-primary-100 ring-2 ring-primary-400 text-primary-700 flex items-center justify-center text-xs font-bold">·</div>
        Aujourd'hui
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center">
          <span class="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        Ma réservation
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-6 h-6 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
          <span class="w-1.5 h-1.5 rounded-full bg-primary-400" />
        </div>
        Séance dispo
      </div>
      <div v-if="subscription && subscription.active" class="flex items-center gap-1.5">
        <div class="w-6 h-6 rounded-lg bg-green-50 border border-green-200" />
        Abonnement actif
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface Booking {
    id: string
    status: string
    session?: { dateTime: string; duration: number }
  }

  interface SessionItem {
    dateTime: string
  }

  interface SubscriptionInfo {
    active: boolean
    daysLeft: number
    expiresAt: string
    planName?: string
  }

  interface CalendarCell {
    key: string
    day: number | null
    isToday: boolean
    isPast: boolean
    hasBooking: boolean
    hasSession: boolean
    inSubPeriod: boolean
    title: string
  }

  const props = defineProps<{
    bookings?: Booking[]
    sessions?: SessionItem[]
    subscription?: SubscriptionInfo
  }>()

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const viewYear = ref(today.getFullYear())
  const viewMonth = ref(today.getMonth()) // 0-indexed

  const monthLabel = computed(() =>
    new Date(viewYear.value, viewMonth.value, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  )

  function prevMonth() {
    if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
    else viewMonth.value--
  }
  function nextMonth() {
    if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
    else viewMonth.value++
  }

  const cells = computed<CalendarCell[]>(() => {
    const year = viewYear.value
    const month = viewMonth.value
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0

    // Build date sets for O(1) lookup
    const bookingDates = new Set<string>()
    for (const b of props.bookings ?? []) {
      if (b.session && b.status === 'CONFIRMED') {
        bookingDates.add(new Date(b.session.dateTime).toDateString())
      }
    }
    const sessionDates = new Set<string>()
    for (const s of props.sessions ?? []) {
      sessionDates.add(new Date(s.dateTime).toDateString())
    }

    // Subscription period
    const subStart = today
    const subEnd = props.subscription?.active && props.subscription.expiresAt
      ? new Date(props.subscription.expiresAt)
      : null

    const result: CalendarCell[] = []

    // Empty leading cells
    for (let i = 0; i < startOffset; i++) {
      result.push({ key: `empty-${i}`, day: null, isToday: false, isPast: false, hasBooking: false, hasSession: false, inSubPeriod: false, title: '' })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d)
      const dateStr = cellDate.toDateString()
      const isPast = cellDate < today
      const isToday = cellDate.getTime() === today.getTime()
      const hasBooking = bookingDates.has(dateStr)
      const hasSession = sessionDates.has(dateStr)
      const inSubPeriod = !!subEnd && cellDate >= subStart && cellDate <= subEnd

      // Build tooltip
      const parts: string[] = []
      if (hasBooking) parts.push('Votre réservation')
      else if (hasSession) parts.push('Séance disponible')
      if (inSubPeriod) parts.push('Abonnement actif')

      result.push({
        key: `${year}-${month}-${d}`,
        day: d,
        isToday,
        isPast,
        hasBooking,
        hasSession,
        inSubPeriod,
        title: parts.join(' · '),
      })
    }

    return result
  })

  function cellClass(cell: CalendarCell) {
    if (!cell.day) return 'cursor-default'
    const classes: string[] = []

    if (cell.hasBooking) {
      classes.push('bg-primary-500 text-white')
    } else if (cell.isToday) {
      classes.push('bg-primary-100 text-primary-700 ring-2 ring-primary-400')
    } else if (cell.inSubPeriod) {
      classes.push('bg-green-50 border border-green-100 text-gray-800')
    } else if (cell.isPast) {
      classes.push('text-gray-300')
    } else if (cell.hasSession) {
      classes.push('bg-gray-50 border border-gray-200 text-gray-700 hover:bg-primary-50 hover:border-primary-200')
    } else {
      classes.push('text-gray-600')
    }

    return classes.join(' ')
  }

  function formatExpiry(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
</script>
