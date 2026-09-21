<template>
  <div>

    <!-- ── Payment success banner ─────────────────────────── -->
    <Transition name="fade-up">
      <div v-if="showSuccessBanner" class="mb-5 flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <p class="font-bold text-green-800 text-sm">{{ isExtended ? 'Abonnement prolongé !' : 'Paiement confirmé !' }}</p>
            <p class="text-xs text-green-600 mt-0.5">{{ isExtended && activeSub?.expiresAt ? `Prolongé jusqu'au ${formatDate(activeSub.expiresAt)}.` : 'Activation en cours, actualisez si nécessaire.' }}</p>
          </div>
        </div>
        <button class="text-green-400 hover:text-green-600 shrink-0" @click="dismissBanner">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </Transition>

    <!-- ── Expiration warnings ──────────────────────────────── -->
    <Transition name="fade-up">
      <div v-if="!pending && !activeSub && pastSubs.length && !showSuccessBanner && !isPostPayment" class="mb-5 flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p class="font-bold text-red-800 text-sm">Abonnement expiré</p>
            <p class="text-xs text-red-600 mt-0.5">Renouvelez pour accéder aux séances.</p>
          </div>
        </div>
        <NuxtLink to="/subscribe" class="shrink-0 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">Renouveler →</NuxtLink>
      </div>
    </Transition>

    <Transition name="fade-up">
      <div v-if="!pending && activeSub && daysLeft(activeSub.expiresAt) <= 3 && !activeSub.pausedAt" class="mb-5 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <div>
            <p class="font-bold text-amber-800 text-sm">Expire bientôt</p>
            <p class="text-xs text-amber-700 mt-0.5">Il vous reste <strong>{{ daysLeft(activeSub.expiresAt) }} jour(s)</strong>.</p>
          </div>
        </div>
        <NuxtLink to="/subscribe" class="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">Renouveler →</NuxtLink>
      </div>
    </Transition>

    <SkeletonLoader v-if="pending" :count="3" :height="100" />

    <!-- Post-payment spinner -->
    <div v-else-if="isPostPayment && !activeSub && !pendingSubs.length" class="bg-white rounded-2xl border border-yellow-200 shadow-sm text-center py-12 px-6">
      <svg class="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      <p class="font-semibold text-gray-800 mb-1">Activation en cours…</p>
      <p class="text-sm text-gray-400 mb-5">Votre paiement est en cours de traitement.</p>
      <button class="btn-primary text-sm inline-flex items-center gap-2" @click="refresh()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Actualiser
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!subscriptions?.length && !showSuccessBanner" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-400/10 border border-primary-400/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
      </div>
      <p class="font-semibold text-gray-800 mb-1">Aucun abonnement</p>
      <p class="text-sm text-gray-400 mb-6">Choisissez une formule pour accéder aux séances.</p>
      <NuxtLink to="/subscribe" class="btn-primary inline-flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Voir les formules
      </NuxtLink>
    </div>

    <div v-else class="space-y-5">

      <!-- ── Stats bar ────────────────────────────────────────── -->
      <div v-if="activeSub" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <!-- Durée restante -->
        <div class="bg-black rounded-2xl p-4 text-center">
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Temps restant</p>
          <p class="text-2xl font-extrabold text-primary-400 leading-none">{{ remainingMonths(activeSub.expiresAt) }}</p>
          <p v-if="remainingDaysSuffix(activeSub.expiresAt)" class="text-xs text-gray-500 mt-0.5">{{ remainingDaysSuffix(activeSub.expiresAt) }}</p>
        </div>
        <!-- Pauses disponibles -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pauses dispo</p>
          <p class="text-2xl font-extrabold leading-none" :class="pausesLeft > 0 ? 'text-yellow-500' : 'text-gray-300'">{{ pausesLeft }}</p>
          <p class="text-xs text-gray-400 mt-0.5">/ {{ activeSub.maxPauses }} total</p>
        </div>
        <!-- Reports disponibles -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Reports dispo</p>
          <p class="text-2xl font-extrabold leading-none" :class="activeSub.maxReports > 0 ? 'text-blue-500' : 'text-gray-300'">{{ activeSub.maxReports }}</p>
          <p class="text-xs text-gray-400 mt-0.5">cumulés</p>
        </div>
        <!-- Total dépensé -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total payé</p>
          <p class="text-lg font-extrabold text-gray-800 leading-none">{{ fmtShort(totalSpent) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">FCFA · {{ paidCount }} achat{{ paidCount > 1 ? 's' : '' }}</p>
        </div>
      </div>

      <!-- ── Active subscription card ────────────────────────── -->
      <div v-if="activeSub" class="rounded-2xl overflow-hidden shadow-sm">
        <!-- Dark gradient header -->
        <div class="bg-gradient-to-br from-gray-900 to-black px-6 pt-6 pb-5">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <p class="text-[10px] text-primary-400 font-bold uppercase tracking-widest mb-1">Formule active</p>
              <h2 class="text-xl font-extrabold text-white">{{ activeSub.subscriptionPlan?.name ?? activeSub.type }}</h2>
              <div class="flex items-center gap-2 mt-2 flex-wrap">
                <span v-if="activeSub.partnerUserId" class="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Couple
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Solo
                </span>
                <span v-if="activeSub.pausedAt" class="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-300 bg-yellow-900/60 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6"/></svg>
                  En pause
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[10px] font-bold text-green-300 bg-green-900/60 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  Actif
                </span>
              </div>
            </div>
            <NuxtLink to="/subscribe" class="shrink-0 text-xs font-bold text-black bg-primary-400 hover:bg-primary-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              + Renouveler
            </NuxtLink>
          </div>

          <!-- Progress bar in header -->
          <div class="mt-1">
            <div class="flex justify-between text-xs mb-1.5">
              <span class="text-gray-400">{{ formatDate(activeSub.startsAt) }}</span>
              <span class="text-primary-400 font-bold">{{ progressPct(activeSub) }}% écoulé</span>
              <span class="text-gray-400">{{ formatDate(activeSub.expiresAt) }}</span>
            </div>
            <div class="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-primary-400 rounded-full transition-all duration-700" :style="`width: ${progressPct(activeSub)}%`" />
            </div>
          </div>
        </div>

        <!-- White body -->
        <div class="bg-white border border-gray-100 border-t-0 rounded-b-2xl p-5">
          <!-- Partner info -->
          <div v-if="activeSub.partnerInfo" class="mb-4 flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <div class="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm shrink-0">
              {{ (activeSub.partnerInfo.name || '?')[0].toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-[10px] text-purple-500 font-bold uppercase tracking-wide">Partenaire</p>
              <p class="text-sm font-bold text-gray-900 truncate">{{ activeSub.partnerInfo.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ activeSub.partnerInfo.email }}</p>
            </div>
          </div>

          <!-- Tarif + dates inline -->
          <div class="flex flex-wrap gap-3 mb-4">
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase leading-none">Tarif</p>
                <p class="text-sm font-extrabold text-gray-900 mt-0.5">
                  {{ activeSub.subscriptionPlan?.priceSingle
                    ? (activeSub.partnerUserId && activeSub.subscriptionPlan?.priceCouple
                        ? fmt(activeSub.subscriptionPlan.priceCouple)
                        : fmt(activeSub.subscriptionPlan.priceSingle))
                    : '—' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase leading-none">Début</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formatDate(activeSub.startsAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-primary-400/10 rounded-xl px-3 py-2 border border-primary-400/20">
              <svg class="w-4 h-4 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <div>
                <p class="text-[10px] text-primary-600 uppercase leading-none font-bold">Expire le</p>
                <p class="text-sm font-extrabold text-primary-700 mt-0.5">{{ formatDate(activeSub.expiresAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Pause / resume -->
          <div v-if="activeSub.maxPauses > 0" class="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500">
              <span v-if="activeSub.pausedAt">En pause depuis le {{ formatDate(activeSub.pausedAt) }}</span>
              <span v-else>Pauses : <strong class="text-gray-800">{{ activeSub.pauseCount }} / {{ activeSub.maxPauses }}</strong> utilisée(s)</span>
            </div>
            <div class="flex items-center gap-2">
              <p v-if="pauseError" class="text-xs text-red-600">{{ pauseError }}</p>
              <button
v-if="activeSub.pausedAt" :disabled="pauseLoading"
                class="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                @click="resumeSub">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ pauseLoading ? 'En cours…' : 'Reprendre' }}
              </button>
              <button
v-else-if="activeSub.pauseCount < activeSub.maxPauses" :disabled="pauseLoading"
                class="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                @click="pauseSub">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ pauseLoading ? 'En cours…' : 'Mettre en pause' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pending cards ─────────────────────────────────── -->
      <div v-for="sub in pendingSubs" :key="sub.id" class="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
        <div class="h-1 w-full bg-yellow-400" />
        <div class="p-5 flex items-center gap-4">
          <svg class="w-8 h-8 text-yellow-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <div>
            <p class="text-xs font-bold text-yellow-600 uppercase tracking-widest">Traitement en cours</p>
            <p class="font-bold text-gray-900">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Votre paiement est en cours de validation.</p>
          </div>
        </div>
      </div>

      <!-- ── History ──────────────────────────────────────── -->
      <div v-if="pastSubs.length">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-px flex-1 bg-gray-100" />
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Historique</p>
          <div class="h-px flex-1 bg-gray-100" />
        </div>
        <div class="space-y-2">
          <div
v-for="sub in pastSubs" :key="sub.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="font-semibold text-gray-800 text-sm">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
                  <span v-if="sub.partnerUserId" class="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">Couple</span>
                  <span v-else class="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Solo</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(sub.startsAt) }} → {{ formatDate(sub.expiresAt) }}</p>
                <p v-if="sub.subscriptionPlan?.priceSingle" class="text-xs font-semibold text-gray-500 mt-0.5">
                  {{ sub.partnerUserId && sub.subscriptionPlan?.priceCouple ? fmt(sub.subscriptionPlan.priceCouple) : fmt(sub.subscriptionPlan.priceSingle) }}
                </p>
              </div>
            </div>
            <span :class="statusClass(sub.status)" class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0">
              {{ statusLabel(sub.status) }}
            </span>
          </div>
        </div>

        <!-- Total spent footer -->
        <div class="mt-3 flex items-center justify-between px-1">
          <span class="text-xs text-gray-400">{{ paidCount }} achat{{ paidCount > 1 ? 's' : '' }} au total</span>
          <span class="text-sm font-extrabold text-gray-800">{{ fmt(totalSpent) }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ path: '/subscriptions', middleware: ['auth', 'client-only'] })

  const { accessToken } = useAuth()
  const route = useRoute()
  const router = useRouter()

  interface Subscription {
    id: string
    type: string
    status: string
    startsAt: string | null
    expiresAt: string | null
    pausedAt: string | null
    pauseCount: number
    maxPauses: number
    maxReports: number
    partnerUserId: string | null
    partnerInfo: { name: string; email: string } | null
    subscriptionPlan?: { name: string; planType: string; maxPauses: number; priceSingle: number; priceCouple: number | null } | null
  }

  const { data: subscriptions, pending, refresh } = await useLazyFetch<Subscription[]>('/api/subscriptions', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  const activeSub = computed(() => {
    const now = new Date()
    return subscriptions.value?.find(s => s.status === 'ACTIVE' && (!s.expiresAt || new Date(s.expiresAt) >= now)) ?? null
  })
  const pendingSubs = computed(() => subscriptions.value?.filter(s => s.status === 'PENDING') ?? [])
  const pastSubs = computed(() => subscriptions.value?.filter(s => !['ACTIVE', 'PENDING'].includes(s.status)) ?? [])

  // ── Stats computeds ────────────────────────────────────────
  const pausesLeft = computed(() => activeSub.value ? Math.max(0, activeSub.value.maxPauses - activeSub.value.pauseCount) : 0)

  const totalSpent = computed(() =>
    (subscriptions.value ?? [])
      .filter(s => ['ACTIVE', 'EXPIRED'].includes(s.status))
      .reduce((sum, s) => {
        if (!s.subscriptionPlan) return sum
        const price = s.partnerUserId && s.subscriptionPlan.priceCouple
          ? s.subscriptionPlan.priceCouple
          : s.subscriptionPlan.priceSingle
        return sum + (price ?? 0)
      }, 0)
  )

  const paidCount = computed(() =>
    (subscriptions.value ?? []).filter(s => ['ACTIVE', 'EXPIRED'].includes(s.status)).length
  )

  // ── Banner state ───────────────────────────────────────────
  const isPostPayment = ref(route.query.payment === 'success')
  const isExtended = ref(route.query.extended === 'true')
  const bannerDismissed = ref(false)
  const showSuccessBanner = computed(() => isPostPayment.value && !bannerDismissed.value)

  if (isPostPayment.value) {
    router.replace({ query: {} })
    setTimeout(() => { refresh() }, 3000)
  }

  function dismissBanner() { bannerDismissed.value = true }

  // ── Helpers ────────────────────────────────────────────────
  function daysLeft(end: string | null) {
    if (!end) return 0
    return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000))
  }

  /** Primary label: "2 mois" or "18 jours" */
  function remainingMonths(end: string | null): string {
    const days = daysLeft(end)
    if (days <= 0) return '0 j'
    if (days < 30) return `${days} j`
    return `${Math.floor(days / 30)} mois`
  }

  /** Secondary label shown below: "27j" or null */
  function remainingDaysSuffix(end: string | null): string | null {
    const days = daysLeft(end)
    if (days < 30) return null
    const rem = days % 30
    return rem > 0 ? `+ ${rem}j` : null
  }

  function progressPct(sub: Subscription) {
    if (!sub.startsAt || !sub.expiresAt) return 0
    const total = new Date(sub.expiresAt).getTime() - new Date(sub.startsAt).getTime()
    const elapsed = Date.now() - new Date(sub.startsAt).getTime()
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmt(xof: number) {
    return new Intl.NumberFormat('fr-FR').format(xof) + ' FCFA'
  }

  function fmtShort(xof: number) {
    if (xof >= 1000) return new Intl.NumberFormat('fr-FR').format(Math.round(xof / 1000)) + 'k'
    return new Intl.NumberFormat('fr-FR').format(xof)
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = { ACTIVE: 'Actif', PENDING: 'En attente', FAILED: 'Échoué', EXPIRED: 'Expiré', CANCELLED: 'Annulé' }
    return map[status] ?? status
  }

  function statusClass(status: string) {
    const map: Record<string, string> = {
      ACTIVE: 'text-green-700 bg-green-100',
      PENDING: 'text-yellow-700 bg-yellow-100',
      FAILED: 'text-red-700 bg-red-100',
      EXPIRED: 'text-gray-500 bg-gray-100',
      CANCELLED: 'text-red-400 bg-red-50',
    }
    return map[status] ?? 'text-gray-400 bg-gray-50'
  }

  // ── Pause / resume ─────────────────────────────────────────
  const pauseLoading = ref(false)
  const pauseError = ref('')

  async function pauseSub() {
    if (!activeSub.value) return
    pauseError.value = ''
    pauseLoading.value = true
    try {
      await $fetch(`/api/subscriptions/${activeSub.value.id}/pause`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken.value}` } })
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      pauseError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'
    } finally { pauseLoading.value = false }
  }

  async function resumeSub() {
    if (!activeSub.value) return
    pauseError.value = ''
    pauseLoading.value = true
    try {
      await $fetch(`/api/subscriptions/${activeSub.value.id}/resume`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken.value}` } })
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      pauseError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'
    } finally { pauseLoading.value = false }
  }
</script>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .3s ease, transform .3s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
