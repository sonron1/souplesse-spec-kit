<template>
  <div>
    <div v-if="!user" class="flex items-center justify-center py-20">
      <SkeletonLoader :count="3" :height="60" />
    </div>

    <div v-else>
      <!-- Welcome banner with image -->
      <div class="relative rounded-2xl overflow-hidden mb-6 min-h-[140px]">
        <img
          src="https://images.pexels.com/photos/3838937/pexels-photo-3838937.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&dpr=1"
          alt="Souplesse Fitness"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
        <div class="relative z-10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-primary-400 text-xs font-bold uppercase tracking-widest mb-1">Espace personnel</p>
            <h1 class="text-2xl font-bold text-white">
              Bonjour, {{ user.name.split(' ')[0] }} !
            </h1>
            <p class="text-gray-300 text-sm mt-0.5">Bienvenue sur votre espace Souplesse Fitness.</p>
          </div>
          <NuxtLink to="/sessions" class="btn-primary self-start sm:self-auto shrink-0 gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Voir les séances
          </NuxtLink>
        </div>
      </div>

      <!-- Subscription status banners -->
      <div v-if="!subPending" class="mb-4">
        <!-- No active subscription -->
        <div
          v-if="noActiveSub"
          class="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-red-800">Aucun abonnement actif</p>
              <p class="text-xs text-red-600 mt-0.5">Souscrivez pour accéder aux séances et réservations du club.</p>
            </div>
          </div>
          <NuxtLink
            to="/subscribe"
            class="shrink-0 text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Souscrire →
          </NuxtLink>
        </div>

        <!-- Expiring soon (≤7 days) -->
        <div
          v-else-if="expiringSoon"
          class="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-amber-800">Votre abonnement expire bientôt</p>
              <p class="text-xs text-amber-600 mt-0.5">Plus que {{ daysLeftSub }} jour(s) — renouvelez pour ne pas perdre l’accès.</p>
            </div>
          </div>
          <NuxtLink
            to="/subscribe"
            class="shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 hover:border-amber-500 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Renouveler →
          </NuxtLink>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <!-- Subscription status -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Abonnement</p>
            <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
          </div>
          <div v-if="subPending" class="h-6 bg-gray-100 rounded animate-pulse w-24 mb-2" />
          <p v-else class="text-base font-bold mt-1">
            <span v-if="activeSubscription" class="text-primary-600">
              {{ activeSubscription.subscriptionPlan?.name ?? activeSubscription.type }}
            </span>
            <span v-else class="text-gray-400">Aucun abonnement</span>
          </p>
          <p v-if="activeSubscription?.expiresAt" class="text-xs text-gray-400 mt-1">
            Expire le {{ formatDate(activeSubscription.expiresAt) }}
          </p>
          <NuxtLink v-if="!activeSubscription" to="/subscribe" class="mt-3 inline-flex text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors">
            Souscrire →
          </NuxtLink>
        </div>

        <!-- Next booking -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prochaine séance</p>
            <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
          <div v-if="bookingsPending" class="h-6 bg-gray-100 rounded animate-pulse w-32 mb-2" />
          <p v-else-if="nextBooking" class="text-sm font-bold mt-1 text-gray-800 leading-snug">
            {{ formatDateTime(nextBooking.session?.dateTime) }}
          </p>
          <p v-else class="text-gray-400 mt-1 text-sm">Aucune réservation</p>
          <NuxtLink to="/sessions" class="mt-2 inline-flex text-xs font-semibold text-green-600 hover:text-green-500 transition-colors">
            Réserver une séance →
          </NuxtLink>
        </div>

        <!-- Total bookings -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Séances réservées</p>
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
          </div>
          <div v-if="bookingsPending" class="h-9 bg-gray-100 rounded animate-pulse w-12 mb-2" />
          <p v-else class="text-3xl font-bold text-blue-600 mt-1">
            {{ bookings?.length ?? 0 }}
          </p>
          <p class="text-xs text-gray-400 mt-1">au total</p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Actions rapides</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NuxtLink to="/dashboard/bookings" class="flex flex-col items-center gap-3 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all">
            <div class="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <span class="text-xs font-bold text-blue-700 text-center leading-tight">Mes réservations</span>
          </NuxtLink>
          <NuxtLink to="/sessions" class="flex flex-col items-center gap-3 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-all">
            <div class="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <span class="text-xs font-bold text-primary-700 text-center leading-tight">Séances dispo</span>
          </NuxtLink>
          <NuxtLink to="/dashboard/subscriptions" class="flex flex-col items-center gap-3 p-4 rounded-xl bg-green-50 hover:bg-green-100 border border-green-100 transition-all">
            <div class="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <span class="text-xs font-bold text-green-700 text-center leading-tight">Mon abonnement</span>
          </NuxtLink>
          <NuxtLink to="/dashboard/programs" class="flex flex-col items-center gap-3 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all">
            <div class="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            </div>
            <span class="text-xs font-bold text-purple-700 text-center leading-tight">Mes programmes</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { user, accessToken } = useAuth()

  interface BookingWithSession {
    id: string
    status: string
    session?: { dateTime: string; duration: number }
  }

  interface SubscriptionWithPlan {
    id: string
    type: string
    status: string
    expiresAt: string | null
    subscriptionPlan: { name: string; planType: string } | null
  }

  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  const { data: bookings, pending: bookingsPending } = await useLazyFetch<BookingWithSession[]>(
    '/api/bookings',
    { headers, default: () => [] }
  )

  const { data: subscriptions, pending: subPending } = await useLazyFetch<SubscriptionWithPlan[]>(
    '/api/subscriptions',
    { headers, default: () => [] }
  )

  const activeSubscription = computed(() =>
    subscriptions.value?.find((s) => s.status === 'ACTIVE') ?? null
  )

  const daysLeftSub = computed(() => {
    if (!activeSubscription.value?.expiresAt) return null
    const diff = new Date(activeSubscription.value.expiresAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86_400_000))
  })
  const expiringSoon = computed(() => daysLeftSub.value !== null && daysLeftSub.value <= 7)
  const noActiveSub = computed(() => !subPending.value && !activeSubscription.value)

  const nextBooking = computed(() => {
    const now = new Date()
    return (
      bookings.value
        ?.filter((b) => b.status === 'CONFIRMED' && b.session && new Date(b.session.dateTime) > now)
        .sort((a, b) =>
          new Date(a.session?.dateTime ?? 0).getTime() - new Date(b.session?.dateTime ?? 0).getTime()
        )[0] ?? null
    )
  })

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatDateTime(dt?: string) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  }
</script>
