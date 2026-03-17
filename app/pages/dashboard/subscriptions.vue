<template>
  <div>

    <!-- ── Page header ───────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mon abonnement</h1>
          <p class="text-sm text-gray-500 mt-0.5">Gérez et suivez votre formule active</p>
        </div>
      </div>
      <NuxtLink to="/subscribe" class="btn-primary flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="hidden sm:inline">Nouvelle formule</span>
        <span class="sm:hidden">Souscrire</span>
      </NuxtLink>
    </div>

    <!-- ── Payment success banner ─────────────────────────────── -->
    <Transition name="fade-up">
      <div v-if="showSuccessBanner" class="mb-6 flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-green-800 text-sm">{{ isExtended ? 'Abonnement prolongé avec succès !' : 'Paiement effectué avec succès !' }}</p>
            <p class="text-xs text-green-600 mt-0.5">{{ isExtended && activeSub?.expiresAt ? `Votre abonnement a été prolongé jusqu'au ${formatDate(activeSub.expiresAt)}.` : isExtended ? 'La durée de votre abonnement a été prolongée.' : 'Votre abonnement est en cours d\'activation. Actualisez si nécessaire.' }}</p>
          </div>
        </div>
        <button class="text-green-500 hover:text-green-700 shrink-0" @click="dismissBanner">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ── H003: Abonnement expiré banner ─────────────────────── -->
    <Transition name="fade-up">
      <div v-if="!pending && !activeSub && pastSubs.length && !showSuccessBanner && !isPostPayment" class="mb-6 flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-red-800 text-sm">Votre abonnement a expiré</p>
            <p class="text-xs text-red-600 mt-0.5">Renouvelez dès maintenant pour continuer à réserver vos séances.</p>
          </div>
        </div>
        <NuxtLink to="/subscribe" class="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 transition-colors px-3 py-1.5 rounded-lg">
          Renouveler
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </NuxtLink>
      </div>
    </Transition>

    <!-- ── I005: J-3 expiration warning banner ─────────────────── -->
    <Transition name="fade-up">
      <div v-if="!pending && activeSub && daysLeft(activeSub.expiresAt) <= 3 && !activeSub.pausedAt" class="mb-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-amber-800 text-sm">Votre abonnement expire bientôt</p>
            <p class="text-xs text-amber-700 mt-0.5">Il vous reste <strong>{{ daysLeft(activeSub.expiresAt) }} jour(s)</strong> — pensez à renouveler pour ne pas perdre l'accès.</p>
          </div>
        </div>
        <NuxtLink to="/subscribe" class="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors px-3 py-1.5 rounded-lg">
          Renouveler
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </NuxtLink>
      </div>
    </Transition>

    <SkeletonLoader v-if="pending" :count="2" :height="120" />

    <!-- Post-payment processing: payment done but subscription not yet visible -->
    <div v-else-if="isPostPayment && !activeSub && !pendingSubs.length" class="bg-white rounded-2xl border border-yellow-200 shadow-sm text-center py-12 px-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center">
        <svg class="w-8 h-8 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-gray-800 mb-1">Activation en cours…</p>
      <p class="text-sm text-gray-400 mb-5">Votre abonnement est en cours de traitement. Cela peut prendre quelques secondes.</p>
      <button class="btn-primary inline-flex items-center gap-2 text-sm" @click="() => refresh()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Actualiser
      </button>
    </div>

    <!-- Empty state (no payment attempted) -->
    <div v-else-if="!subscriptions?.length && !showSuccessBanner" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-400/10 border border-primary-400/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <p class="text-base font-semibold text-gray-800 mb-1">Aucun abonnement actif</p>
      <p class="text-sm text-gray-400 mb-6">Choisissez une formule pour accéder à toutes les séances du club.</p>
      <NuxtLink to="/subscribe" class="btn-primary inline-flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Voir les formules
      </NuxtLink>
    </div>

    <div v-else class="space-y-6">

      <!-- ── Active subscription card ────────────────────────── -->
      <div v-if="activeSub" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <!-- Top accent bar -->
        <div class="h-1.5 w-full bg-primary-400" />

        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-black flex items-center justify-center shrink-0">
                <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div>
                <p class="text-xs font-bold text-primary-600 uppercase tracking-widest mb-0.5">Formule active</p>
                <h3 class="text-xl font-extrabold text-gray-900">{{ activeSub.subscriptionPlan?.name ?? activeSub.type }}</h3>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span v-if="activeSub.partnerUserId" class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Couple
                  </span>
                  <span v-if="activeSub.subscriptionPlan?.priceSingle" class="text-[11px] text-gray-400 font-semibold">
                    {{ activeSub.partnerUserId && activeSub.subscriptionPlan?.priceCouple
                      ? fmt(activeSub.subscriptionPlan.priceCouple)
                      : fmt(activeSub.subscriptionPlan.priceSingle) }}
                  </span>
                </div>
              </div>
            </div>
            <span v-if="activeSub.pausedAt" class="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6"/></svg>
              En pause
            </span>
            <span v-else class="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              Actif
            </span>
          </div>

          <!-- Couple partner info -->
          <div v-if="activeSub.partnerInfo" class="mb-5 flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <div class="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm shrink-0">
              {{ (activeSub.partnerInfo.name || '?')[0].toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-[10px] text-purple-500 font-bold uppercase tracking-wide">Partenaire</p>
              <p class="text-sm font-bold text-gray-900 truncate">{{ activeSub.partnerInfo.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ activeSub.partnerInfo.email }}</p>
            </div>
          </div>

          <!-- Dates row -->
          <div class="flex flex-wrap gap-3 mb-5">
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
              <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide leading-none">Début</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formatDate(activeSub.startsAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
              <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-wide leading-none">Expire le</p>
                <p class="text-sm font-semibold text-gray-800 mt-0.5">{{ formatDate(activeSub.expiresAt) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-primary-400/10 rounded-xl px-4 py-2.5 border border-primary-400/20">
              <svg class="w-4 h-4 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="text-[10px] text-primary-600 uppercase tracking-wide leading-none font-bold">Restant</p>
                <p class="text-sm font-extrabold text-primary-700 mt-0.5">{{ daysLeft(activeSub.expiresAt) }} jour(s)</p>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div>
            <div class="flex justify-between text-xs mb-2">
              <span class="text-gray-500 font-medium">Progression de la formule</span>
              <span class="font-bold text-primary-600">{{ progressPct(activeSub) }}% écoulé</span>
            </div>
            <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-400 rounded-full transition-all duration-500"
                :style="`width: ${progressPct(activeSub)}%`"
              />
            </div>
          </div>

          <!-- Pause / resume action -->
          <div v-if="activeSub.subscriptionPlan?.maxPauses" class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div class="text-xs text-gray-500">
              <span v-if="activeSub.pausedAt">Abonnement en pause depuis le {{ formatDate(activeSub.pausedAt) }}</span>
              <span v-else>Pauses disponibles : {{ activeSub.pauseCount }} / {{ activeSub.subscriptionPlan.maxPauses }}</span>
            </div>
            <div class="flex items-center gap-2">
              <p v-if="pauseError" class="text-xs text-red-600">{{ pauseError }}</p>
              <button
                v-if="activeSub.pausedAt"
                class="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50"
                :disabled="pauseLoading"
                @click="resumeSub"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ pauseLoading ? 'En cours…' : 'Reprendre' }}
              </button>
              <button
                v-else-if="activeSub.pauseCount < activeSub.subscriptionPlan.maxPauses"
                class="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50"
                :disabled="pauseLoading"
                @click="pauseSub"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ pauseLoading ? 'En cours…' : 'Mettre en pause' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pending subscription card ────────────────────────── -->
      <div v-for="sub in pendingSubs" :key="sub.id" class="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
        <div class="h-1.5 w-full bg-yellow-400" />
        <div class="p-6 flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-0.5">Traitement en cours</p>
            <h3 class="text-lg font-extrabold text-gray-900">{{ sub.subscriptionPlan?.name ?? sub.type }}</h3>
            <p class="text-sm text-gray-500 mt-1">Votre paiement est en cours de validation. L'abonnement sera activé dans quelques instants.</p>
          </div>
        </div>
      </div>

      <!-- ── History ──────────────────────────────────────────── -->
      <div v-if="pastSubs.length">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-px flex-1 bg-gray-100" />
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Historique</p>
          <div class="h-px flex-1 bg-gray-100" />
        </div>
        <div class="space-y-2">
          <div
            v-for="sub in pastSubs"
            :key="sub.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-semibold text-gray-800 text-sm">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
                  <span v-if="sub.partnerUserId" class="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full shrink-0">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Couple
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(sub.startsAt) }} — {{ formatDate(sub.expiresAt) }}</p>
                <p v-if="sub.partnerInfo" class="text-xs text-purple-500 mt-0.5 truncate">Avec {{ sub.partnerInfo.name }}</p>
                <p v-if="sub.subscriptionPlan?.priceSingle" class="text-xs font-semibold text-gray-500 mt-0.5">
                  {{ sub.partnerUserId && sub.subscriptionPlan?.priceCouple
                    ? fmt(sub.subscriptionPlan.priceCouple)
                    : fmt(sub.subscriptionPlan.priceSingle) }}
                </p>
              </div>
            </div>
            <span
              :class="statusClass(sub.status)"
              class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
            >
              {{ statusLabel(sub.status) }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

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
    partnerUserId: string | null
    partnerInfo: { name: string; email: string } | null
    subscriptionPlan?: { name: string; planType: string; maxPauses: number; priceSingle: number; priceCouple: number | null } | null
  }

  const { data: subscriptions, pending, refresh } = await useLazyFetch<Subscription[]>('/api/subscriptions', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  const activeSub = computed(() => subscriptions.value?.find((s) => s.status === 'ACTIVE') ?? null)
  const pendingSubs = computed(() => subscriptions.value?.filter((s) => s.status === 'PENDING') ?? [])
  const pastSubs = computed(() => subscriptions.value?.filter((s) => !['ACTIVE', 'PENDING'].includes(s.status)) ?? [])

  // Banner shown when redirected from successful payment
  const isPostPayment = ref(route.query.payment === 'success')
  const isExtended = ref(route.query.extended === 'true')
  const bannerDismissed = ref(false)
  const showSuccessBanner = computed(() => isPostPayment.value && !bannerDismissed.value)

  // If redirected after payment, clean query and poll once after 3s
  if (isPostPayment.value) {
    router.replace({ query: {} })
    setTimeout(() => { refresh() }, 3000)
  }

  function dismissBanner() { bannerDismissed.value = true }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      ACTIVE: 'Actif', PENDING: 'En attente', FAILED: 'Échoué',
      EXPIRED: 'Expiré', CANCELLED: 'Annulé',
    }
    return map[status] ?? status
  }
  function statusClass(status: string) {
    const map: Record<string, string> = {
      ACTIVE: 'text-green-700 bg-green-100',
      PENDING: 'text-yellow-700 bg-yellow-100',
      FAILED: 'text-red-700 bg-red-100',
    }
    return map[status] ?? 'text-gray-500 bg-gray-100'
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmt(xof: number) {
    return new Intl.NumberFormat('fr-FR').format(xof) + ' FCFA'
  }

  function daysLeft(end: string | null) {
    if (!end) return 0
    const diff = new Date(end).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86400000))
  }

  function progressPct(sub: Subscription) {
    if (!sub.startsAt || !sub.expiresAt) return 0
    const total = new Date(sub.expiresAt).getTime() - new Date(sub.startsAt).getTime()
    const elapsed = Date.now() - new Date(sub.startsAt).getTime()
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  // Pause / resume
  const pauseLoading = ref(false)
  const pauseError = ref('')

  async function pauseSub() {
    if (!activeSub.value) return
    pauseError.value = ''
    pauseLoading.value = true
    try {
      await $fetch(`/api/subscriptions/${activeSub.value.id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      pauseError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'
    } finally {
      pauseLoading.value = false
    }
  }

  async function resumeSub() {
    if (!activeSub.value) return
    pauseError.value = ''
    pauseLoading.value = true
    try {
      await $fetch(`/api/subscriptions/${activeSub.value.id}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      pauseError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'
    } finally {
      pauseLoading.value = false
    }
  }
</script>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .3s ease, transform .3s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
