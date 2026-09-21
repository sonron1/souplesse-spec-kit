<template>
  <div>
    <!-- ── Hero banner ──────────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-black mb-8 px-6 py-8 sm:px-10 sm:py-10">
      <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #3b82f6 0, #3b82f6 1px, transparent 0, transparent 50%); background-size: 20px 20px;"/>
      <div class="absolute -top-10 -right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl"/>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <span class="text-xs font-bold text-blue-400 uppercase tracking-widest">Espace Coach</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Bonjour, {{ user?.name?.split(' ')[0] }} !</h1>
          <p class="text-sm text-gray-400 mt-1.5">Bienvenue dans votre espace coach Souplesse.</p>
        </div>
        <NuxtLink to="/coach-sessions" class="shrink-0 inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Planifier une séance
        </NuxtLink>
      </div>
    </div>

    <!-- KPI summary -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Séances à venir</p>
          <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        </div>
        <div v-if="sessionsPending" class="h-9 bg-gray-100 rounded animate-pulse w-12" />
        <p v-else class="text-3xl font-extrabold text-primary-600">{{ upcomingSessions }}</p>
        <p class="text-xs text-gray-400">planifiées</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clients</p>
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        </div>
        <div v-if="clientsPending" class="h-9 bg-gray-100 rounded animate-pulse w-12" />
        <p v-else class="text-3xl font-extrabold text-blue-600">{{ clientCount }}</p>
        <NuxtLink to="/coach-programs" class="text-xs text-blue-600 font-semibold hover:underline">Voir les programmes →</NuxtLink>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 col-span-2 sm:col-span-1">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prochaine séance</p>
          <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <div v-if="sessionsPending" class="h-5 bg-gray-100 rounded animate-pulse w-32" />
        <p v-else class="text-sm font-bold text-gray-800 leading-snug">{{ nextSessionLabel }}</p>
        <p class="text-xs text-gray-400">prochainement</p>
      </div>
    </div>

    <!-- Upcoming sessions list -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-base font-bold text-gray-900">Séances à venir</h2>
        <NuxtLink to="/coach-sessions" class="text-xs text-primary-600 hover:text-primary-500 font-semibold">Voir tout →</NuxtLink>
      </div>
      <div v-if="sessionsPending" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-14 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div v-else-if="!nextSessions.length" class="text-center py-10 text-gray-400">
        <svg class="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p class="text-sm font-medium">Aucune séance planifiée.</p>
        <NuxtLink to="/coach-sessions" class="btn-primary mt-3 text-xs">Planifier maintenant</NuxtLink>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="s in nextSessions"
          :key="s.id"
          class="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors border border-gray-100"
        >
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ formatDateTime(s.dateTime) }}</p>
              <p class="text-xs text-gray-500">
                {{ s.duration }} min
                <span v-if="s.location" class="ml-2 text-gray-400">· {{ s.location }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs bg-primary-100 text-primary-700 font-semibold px-2.5 py-1 rounded-full">
              {{ s.capacity }} places
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-4">
      <NuxtLink
        to="/coach-sessions"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:border-primary-200 hover:bg-primary-50 transition-all"
      >
        <div class="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <div>
          <p class="font-bold text-gray-900 text-sm">Mes séances</p>
          <p class="text-xs text-gray-500">Créer et modifier</p>
        </div>
      </NuxtLink>
      <NuxtLink
        to="/coach-programs"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:border-blue-200 hover:bg-blue-50 transition-all"
      >
        <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
        </div>
        <div>
          <p class="font-bold text-gray-900 text-sm">Programmes</p>
          <p class="text-xs text-gray-500">Suivi clients</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'coach'] })
  const { user, accessToken } = useAuth()

  interface Session {
    id: string
    dateTime: string
    duration: number
    capacity: number
    location?: string | null
  }

  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  const { data: sessionsData, pending: sessionsPending } = await useLazyFetch<{ success: boolean; sessions: Session[] }>(
    '/api/sessions',
    { headers, default: () => ({ success: true, sessions: [] }) }
  )

  const { data: clientsData, pending: clientsPending } = await useLazyFetch<{ success: boolean; clients: { id: string }[] }>(
    '/api/coach/clients',
    { headers, default: () => ({ success: true, clients: [] }) }
  )

  const clientCount = computed(() => clientsData.value?.clients?.length ?? 0)

  const allSessions = computed(() => sessionsData.value?.sessions ?? [])

  const now = new Date()
  const nextSessions = computed(() =>
    allSessions.value
      .filter((s) => new Date(s.dateTime) > now)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 5)
  )
  const upcomingSessions = computed(() => nextSessions.value.length)
  const nextSessionLabel = computed(() =>
    nextSessions.value[0] ? formatDateTime(nextSessions.value[0].dateTime) : 'Aucune'
  )

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  }
</script>
