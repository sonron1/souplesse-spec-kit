<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Notifications</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ unreadCount }} non lue(s)</p>
      </div>
      <button
        v-if="unreadCount > 0"
        class="btn-secondary text-sm"
        :disabled="markingAll"
        @click="markAllRead"
      >
        {{ markingAll ? 'En cours…' : 'Tout marquer lu' }}
      </button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="5" :height="72" />

    <!-- Empty -->
    <div v-else-if="!notifications.length" class="card text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucune notification</p>
      <p class="text-sm text-gray-400">Vous êtes à jour !</p>
    </div>

    <!-- Notification list -->
    <div v-else class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="bg-white rounded-2xl shadow-sm border transition-all duration-200 p-5 flex items-start gap-4 cursor-pointer hover:shadow-md"
        :class="n.readAt ? 'border-gray-100' : 'border-primary-200 bg-gradient-to-r from-primary-50/60 to-white'"
        @click="markRead(n)"
      >
        <!-- Icon by type -->
        <div
          class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          :class="iconBg(n.type)"
        >
          <!-- ASSIGNMENT -->
          <svg v-if="n.type === 'ASSIGNMENT'" class="w-5 h-5" :class="iconColor(n.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <!-- Default bell -->
          <svg v-else class="w-5 h-5" :class="iconColor(n.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-gray-900 text-sm leading-snug">{{ n.title }}</p>
            <span
              v-if="!n.readAt"
              class="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-primary-500"
            />
          </div>
          <p class="text-sm text-gray-500 mt-1 leading-relaxed">{{ n.body }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ formatDate(n.createdAt) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

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

  const { data, pending, refresh } = await useLazyFetch<{ notifications: Notification[]; unreadCount: number }>(
    '/api/notifications',
    {
      headers,
      query: { limit: 50 },
      default: () => ({ notifications: [], unreadCount: 0 }),
    }
  )

  const notifications = computed(() => data.value?.notifications ?? [])
  const unreadCount = computed(() => data.value?.unreadCount ?? 0)
  const markingAll = ref(false)

  async function markRead(n: Notification) {
    if (n.readAt) return
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

  function iconBg(type: string) {
    if (type === 'ASSIGNMENT') return 'bg-blue-50'
    return 'bg-primary-50'
  }
  function iconColor(type: string) {
    if (type === 'ASSIGNMENT') return 'text-blue-500'
    return 'text-primary-500'
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
</script>
