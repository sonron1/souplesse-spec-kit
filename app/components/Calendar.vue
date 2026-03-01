<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h2 class="text-lg font-semibold mb-4">Calendrier des réservations</h2>
    <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
      <div v-for="day in weekDays" :key="day" class="font-medium py-1">{{ day }}</div>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="cell in calendarCells"
        :key="cell.date"
        :class="[
          'rounded py-2 text-xs text-center cursor-default',
          cell.isToday ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-700',
          cell.hasBooking ? 'ring-2 ring-primary-400' : '',
          cell.isPast ? 'opacity-40' : '',
        ]"
        :title="cell.bookingTitle"
      >
        {{ cell.day }}
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

  interface CalendarCell {
    date: string
    day: number | ''
    isToday: boolean
    isPast: boolean
    hasBooking: boolean
    bookingTitle: string
  }

  const props = defineProps<{ bookings: Booking[] }>()

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const calendarCells = computed<CalendarCell[]>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // ISO weekday: Mon=1, so adjust
    const startOffset = (firstDay.getDay() + 6) % 7

    const cells: CalendarCell[] = []
    for (let i = 0; i < startOffset; i++) {
      cells.push({
        date: `empty-${year}-${month}-${i}`,
        day: '',
        isToday: false,
        isPast: false,
        hasBooking: false,
        bookingTitle: '',
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d)
      const dateStr = cellDate.toDateString()
      const booking = props.bookings.find(
        (b) =>
          b.session &&
          new Date(b.session.dateTime).toDateString() === dateStr &&
          b.status === 'BOOKED'
      )
      cells.push({
        date: `${year}-${month}-${d}`,
        day: d,
        isToday: cellDate.toDateString() === today.toDateString(),
        isPast: cellDate < today,
        hasBooking: !!booking,
        bookingTitle: booking?.session
          ? `Séance à ${new Date(booking.session.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : '',
      })
    }

    return cells
  })
</script>
