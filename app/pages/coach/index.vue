<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Espace Coach</h1>
        <p class="text-sm text-gray-500 mt-0.5">Bonjour, {{ user?.name }} !</p>
      </div>
      <NuxtLink to="/coach/sessions" class="btn-primary text-sm">
        + Planifier une séance
      </NuxtLink>
    </div>

    <!-- KPI summary -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
      <div class="card flex flex-col gap-1">
        <p class="text-xs text-gray-500 font-medium">Séances à venir</p>
        <div v-if="sessionsPending" class="h-8 bg-gray-100 rounded animate-pulse w-12" />
        <p v-else class="text-3xl font-extrabold text-primary-600">{{ upcomingSessions }}</p>
        <p class="text-xs text-gray-400">planifiées</p>
      </div>
      <div class="card flex flex-col gap-1">
        <p class="text-xs text-gray-500 font-medium">Programmes</p>
        <p class="text-3xl font-extrabold text-gray-900">📋</p>
        <NuxtLink to="/coach/programs" class="text-xs text-primary-600 font-semibold hover:underline">Gérer les programmes</NuxtLink>
      </div>
      <div class="card flex flex-col gap-1 col-span-2 sm:col-span-1">
        <p class="text-xs text-gray-500 font-medium">Prochaine séance</p>
        <div v-if="sessionsPending" class="h-8 bg-gray-100 rounded animate-pulse w-28" />
        <p v-else class="text-sm font-bold text-gray-800 mt-1">{{ nextSessionLabel }}</p>
      </div>
    </div>

    <!-- Upcoming sessions list -->
    <div class="card mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-bold text-gray-900">Séances à venir</h2>
        <NuxtLink to="/coach/sessions" class="text-xs text-primary-600 hover:text-primary-500 font-semibold">Voir tout →</NuxtLink>
      </div>
      <div v-if="sessionsPending" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div v-else-if="!nextSessions.length" class="text-center py-8 text-gray-400">
        <p class="text-sm">Aucune séance planifiée.</p>
        <NuxtLink to="/coach/sessions" class="btn-primary mt-3 text-xs">Planifier maintenant</NuxtLink>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="s in nextSessions"
          :key="s.id"
          class="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors border border-gray-100"
        >
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ formatDateTime(s.dateTime) }}</p>
            <p class="text-xs text-gray-500">{{ s.duration }} min &middot; {{ s.capacity }} places</p>
          </div>
          <span class="badge-gold text-xs">Planifiée</span>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-4">
      <NuxtLink
        to="/coach/sessions"
        class="card flex items-center gap-4 hover:border-primary-200 hover:bg-primary-50 transition-all border border-gray-100"
      >
        <span class="text-3xl">&#x1f4c5;</span>
        <div>
          <p class="font-bold text-gray-900 text-sm">Mes séances</p>
          <p class="text-xs text-gray-500">Créer, modifier</p>
        </div>
      </NuxtLink>
      <NuxtLink
        to="/coach/programs"
        class="card flex items-center gap-4 hover:border-primary-200 hover:bg-primary-50 transition-all border border-gray-100"
      >
        <span class="text-3xl">&#x1f4cb;</span>
        <div>
          <p class="font-bold text-gray-900 text-sm">Programmes</p>
          <p class="text-xs text-gray-500">Suivi clients</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isCoach, user, accessToken } = useAuth()
  if (!isCoach.value) await navigateTo('/dashboard')

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
