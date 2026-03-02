<template>
  <div>
    <div v-if="!user" class="flex items-center justify-center py-20">
      <SkeletonLoader :count="3" :height="60" />
    </div>

    <div v-else>
      <!-- Welcome banner -->
      <div class="card bg-black text-white mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">
            Bonjour, {{ user.name }} !
          </h1>
          <p class="text-gray-400 text-sm mt-1">Bienvenue sur votre espace Souplesse.</p>
        </div>
        <NuxtLink to="/sessions" class="btn-primary self-start sm:self-auto">
          Voir les séances
        </NuxtLink>
      </div>

      <!-- KPI cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <!-- Subscription status -->
        <div class="card">
          <p class="text-sm text-gray-500 mb-1">Abonnement</p>
          <div v-if="subPending" class="h-7 bg-gray-100 rounded animate-pulse w-24" />
          <p v-else class="text-xl font-bold mt-1">
            <span
              v-if="activeSubscription"
              class="text-primary-600"
            >{{ activeSubscription.subscriptionPlan?.name ?? activeSubscription.type }}</span>
            <span v-else class="text-gray-400">Aucun abonnement</span>
          </p>
          <p v-if="activeSubscription?.expiresAt" class="text-xs text-gray-400 mt-1">
            Expire le {{ formatDate(activeSubscription.expiresAt) }}
          </p>
        </div>

        <!-- Next booking -->
        <div class="card">
          <p class="text-sm text-gray-500 mb-1">Prochaine séance</p>
          <div v-if="bookingsPending" class="h-7 bg-gray-100 rounded animate-pulse w-32" />
          <p v-else-if="nextBooking" class="text-base font-semibold mt-1 text-gray-800">
            {{ formatDateTime(nextBooking.session?.dateTime) }}
          </p>
          <p v-else class="text-gray-400 mt-1">—</p>
        </div>

        <!-- Total bookings -->
        <div class="card">
          <p class="text-sm text-gray-500 mb-1">Réservations</p>
          <div v-if="bookingsPending" class="h-7 bg-gray-100 rounded animate-pulse w-12" />
          <p v-else class="text-3xl font-bold text-primary-600 mt-1">
            {{ bookings?.length ?? 0 }}
          </p>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Actions rapides</h2>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/dashboard/bookings" class="btn-primary">Mes réservations</NuxtLink>
          <NuxtLink to="/sessions" class="btn-secondary">Séances disponibles</NuxtLink>
          <NuxtLink to="/dashboard/subscriptions" class="btn-secondary">Mon abonnement</NuxtLink>
          <NuxtLink v-if="!activeSubscription" to="/subscribe" class="btn-secondary text-primary-600 border-primary-400">
            Souscrire un abonnement
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

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
