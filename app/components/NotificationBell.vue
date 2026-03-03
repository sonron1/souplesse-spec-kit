<template>
  <div class="relative" @mouseenter="open = true" @mouseleave="handleMouseLeave">
    <!-- Bell button -->
    <button
      class="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
      aria-label="Notifications"
      @click="open = !open"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <!-- Unread badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition name="drop">
      <div
        v-if="open"
        class="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
        @mouseenter="open = true"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <p class="text-sm font-semibold text-white">Notifications</p>
          <button
            v-if="unreadCount > 0"
            class="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
            :disabled="markingAll"
            @click="markAllRead"
          >
            {{ markingAll ? '…' : 'Tout marquer lu' }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="pending" class="px-4 py-6 text-center text-gray-500 text-sm">
          Chargement…
        </div>

        <!-- Empty -->
        <div v-else-if="!notifications.length" class="px-4 py-8 text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p class="text-gray-500 text-xs">Aucune notification</p>
        </div>

        <!-- List -->
        <ul v-else class="divide-y divide-gray-800 max-h-80 overflow-y-auto">
          <li
            v-for="n in notifications"
            :key="n.id"
            class="flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors cursor-pointer"
            :class="{ 'bg-gray-800/60': !n.readAt }"
            @click="markRead(n)"
          >
            <!-- Unread dot -->
            <span
              class="mt-1.5 shrink-0 w-2 h-2 rounded-full transition-colors"
              :class="n.readAt ? 'bg-transparent' : 'bg-primary-400'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white leading-snug">{{ n.title }}</p>
              <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ n.body }}</p>
              <p class="text-[10px] text-gray-600 mt-1">{{ timeAgo(n.createdAt) }}</p>
            </div>
          </li>
        </ul>

        <!-- Footer link -->
        <div class="border-t border-gray-800 px-4 py-2.5">
          <NuxtLink
            to="/dashboard/notifications"
            class="text-xs text-gray-400 hover:text-white transition-colors font-medium"
            @click="open = false"
          >
            Voir toutes les notifications →
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  const { accessToken } = useAuth()
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface Notification {
    id: string
    type: string
    title: string
    body: string
    readAt: string | null
    createdAt: string
  }

  const open = ref(false)
  const markingAll = ref(false)

  const { data, pending, refresh } = await useLazyFetch<{ notifications: Notification[]; unreadCount: number }>(
    '/api/notifications',
    {
      headers,
      query: { limit: 10 },
      default: () => ({ notifications: [], unreadCount: 0 }),
    }
  )

  const notifications = computed(() => data.value?.notifications ?? [])
  const unreadCount = computed(() => data.value?.unreadCount ?? 0)

  // Poll every 60 s for new notifications
  let pollTimer: ReturnType<typeof setInterval> | null = null
  onMounted(() => { pollTimer = setInterval(refresh, 60_000) })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  function handleMouseLeave() {
    // Small delay so user can move from button to panel
    setTimeout(() => { open.value = false }, 200)
  }

  async function markRead(n: Notification) {
    if (n.readAt) return
    n.readAt = new Date().toISOString() // optimistic
    await $fetch(`/api/notifications/${n.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    }).catch(() => {})
    await refresh()
  }

  async function markAllRead() {
    markingAll.value = true
    await $fetch('/api/notifications/all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    }).catch(() => {})
    await refresh()
    markingAll.value = false
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'À l\'instant'
    if (mins < 60) return `Il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Il y a ${hrs} h`
    const days = Math.floor(hrs / 24)
    return `Il y a ${days} j`
  }
</script>
