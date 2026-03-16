<template>
  <div>

    <!-- ── Hero banner ─────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-black mb-8 px-6 py-8 sm:px-10 sm:py-10">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #eab308 0, #eab308 1px, transparent 0, transparent 50%); background-size: 20px 20px;"/>
      <!-- Glow -->
      <div class="absolute -top-10 -right-10 w-48 h-48 bg-primary-400/20 rounded-full blur-3xl"/>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-primary-400/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-xs font-bold text-primary-400 uppercase tracking-widest">Séances</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Réservez votre<br class="hidden sm:block"/> prochaine séance</h1>
          <p class="text-sm text-gray-400 mt-1.5">Choisissez parmi nos séances disponibles et réservez en un clic.</p>
        </div>
        <!-- Stats chips -->
        <div class="flex gap-3 shrink-0">
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[80px]">
            <p class="text-xl font-extrabold text-primary-400">{{ sessions.length }}</p>
            <p class="text-xs text-gray-400 leading-tight mt-0.5">{{ tab === 'upcoming' ? 'À venir' : 'Passées' }}</p>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[80px]">
            <svg class="w-6 h-6 text-primary-400/60 mx-auto mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <p class="text-xs text-gray-400 leading-tight">Réservez<br/>maintenant</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────── -->
    <div class="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
      <button
        v-for="t in tabs"
        :key="t.value"
        class="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="switchTab(t.value)"
      >
        <svg v-if="t.value === 'upcoming'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ t.label }}
      </button>
    </div>

    <!-- ── Date filters (upcoming only) ──────────────────── -->
    <div v-if="tab === 'upcoming'" class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
      <!-- Toggle bar -->
      <button
        class="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        @click="showFilters = !showFilters"
      >
        <span class="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Filtrer par date
          <span v-if="fromDate || toDate" class="ml-1 bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">actif</span>
        </span>
        <span class="flex items-center gap-2">
          <span v-if="fromDate || toDate" class="text-xs text-gray-400 font-medium">
            {{ fromDate || '…' }} → {{ toDate || '…' }}
          </span>
          <svg :class="showFilters ? 'rotate-180' : ''" class="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </span>
      </button>
      <!-- Collapsible body -->
      <Transition name="collapse">
        <div v-if="showFilters" class="border-t border-gray-100 px-5 py-4">
          <div class="flex flex-wrap gap-3 items-end">
            <div>
              <label class="label">À partir du</label>
              <div class="relative">
                <input v-model="fromDate" type="date" class="input w-44 pr-8" :min="todayStr" />
                <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <div>
              <label class="label">Jusqu'au</label>
              <div class="relative">
                <input v-model="toDate" type="date" class="input w-44 pr-8" :min="fromDate || todayStr" />
                <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <button class="btn-primary flex items-center gap-1.5" @click="applyFilters(); showFilters = false">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              Appliquer
            </button>
            <button class="btn-secondary flex items-center gap-1.5" @click="resetFilters(); showFilters = false">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Réinitialiser
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Q004: Polling indicator -->
    <Transition name="fade">
      <div v-if="pollingActive" class="flex items-center justify-end gap-1.5 text-xs text-gray-400 mb-2">
        <svg class="w-3.5 h-3.5 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Actualisation en cours…
      </div>
    </Transition>

    <!-- Loading -->
    <SkeletonLoader v-if="isLoading" :count="5" :height="100" />

    <!-- Error -->
    <div v-else-if="fetchError" class="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Erreur lors du chargement des séances.
    </div>

    <!-- Gated content -->
    <SubscriptionGate
      v-else
      :active="subActive"
      message="Souscrivez à une formule pour parcourir les séances disponibles et effectuer des réservations."
    >
      <!-- Empty -->
      <div v-if="!sessions.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 px-6 text-center">
        <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-base font-semibold text-gray-800 mb-1">
          {{ tab === 'upcoming' ? 'Aucune séance à venir' : 'Aucune séance passée' }}
        </p>
        <p class="text-sm text-gray-400">{{ tab === 'upcoming' ? 'Revenez bientôt ou modifiez les filtres.' : 'Aucune séance n\'a encore eu lieu.' }}</p>
      </div>

      <!-- Session list -->
      <div v-else class="space-y-3">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="group bg-white rounded-2xl border shadow-sm overflow-hidden transition-all"
          :class="tab === 'past' ? 'border-gray-100 opacity-80' : 'border-gray-100 hover:shadow-md hover:border-gray-200'"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-0">

            <!-- Left accent band + date chip -->
            <div
              class="flex items-center gap-4 px-5 py-4 flex-1"
            >
              <!-- Date chip -->
              <div
                class="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center leading-none"
                :class="tab === 'past' ? 'bg-gray-100' : 'bg-black'"
              >
                <span class="text-[10px] font-bold uppercase tracking-wide" :class="tab === 'past' ? 'text-gray-400' : 'text-primary-400'">
                  {{ new Date(session.dateTime).toLocaleString('fr-FR', { month: 'short' }).replace('.', '') }}
                </span>
                <span class="text-2xl font-extrabold leading-tight" :class="tab === 'past' ? 'text-gray-400' : 'text-white'">
                  {{ new Date(session.dateTime).getDate() }}
                </span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-900 text-sm sm:text-base leading-snug capitalize truncate">
                  {{ formatDateTime(session.dateTime) }}
                </p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ session.duration }} min
                  </span>
                  <span v-if="session.location" class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ session.location }}
                  </span>
                  <span v-if="session.coach" class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {{ session.coach.name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: slot indicator + CTA -->
            <div class="flex items-center gap-4 px-5 pb-4 sm:pb-0 sm:py-4 sm:border-l border-gray-100 shrink-0">

              <!-- Past tab: bookings count -->
              <template v-if="tab === 'past'">
                <div class="text-center">
                  <p class="text-lg font-extrabold text-gray-400">{{ session._count?.bookings ?? 0 }}</p>
                  <p class="text-[10px] text-gray-400 leading-tight">réservation(s)</p>
                </div>
                <span class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">Terminée</span>
              </template>

              <!-- Upcoming tab: spots + book button -->
              <template v-else>
                <div class="text-center min-w-[56px]">
                  <!-- Seat count -->
                  <p class="text-2xl font-extrabold leading-none" :class="remaining(session) > 3 ? 'text-green-600' : remaining(session) > 0 ? 'text-orange-500' : 'text-red-500'">
                    {{ remaining(session) }}
                  </p>
                  <p class="text-[10px] text-gray-400 leading-tight mt-0.5">place(s)<br/>dispo</p>
                  <!-- Mini progress bar -->
                  <div class="w-full h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="remaining(session) > 3 ? 'bg-green-400' : remaining(session) > 0 ? 'bg-orange-400' : 'bg-red-400'"
                      :style="{ width: `${Math.round((remaining(session) / session.capacity) * 100)}%` }"
                    />
                  </div>
                </div>
                <button
                  :disabled="remaining(session) === 0 || !!bookingInProgress || bookedSessionIds.has(session.id)"
                  class="whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="bookedSessionIds.has(session.id) ? 'btn-secondary' : 'btn-primary'"
                  @click="openConfirmModal(session)"
                >
                  <svg v-if="bookingInProgress === session.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <svg v-else-if="bookedSessionIds.has(session.id)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg v-else-if="remaining(session) > 0" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span v-if="bookingInProgress === session.id">Réservation…</span>
                  <span v-else-if="bookedSessionIds.has(session.id)">Déjà réservé</span>
                  <span v-else-if="remaining(session) === 0">Complet</span>
                  <span v-else>Réserver</span>
                </button>
              </template>
            </div>

          </div>
        </div>
      </div>

      <!-- Pagination (O007: using shared AppPagination) -->
      <AppPagination
        v-if="pagination"
        :model-value="page"
        :total-pages="pagination.totalPages"
        :total="pagination.total"
        @update:model-value="goToPage($event)"
      />
    </SubscriptionGate>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toastMessage"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium"
        >
          <svg class="w-4 h-4 text-primary-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>

    <!-- Booking confirmation modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="confirmSession"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          @click.self="confirmSession = null"
        >
          <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-black flex items-center justify-center">
              <svg class="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-extrabold text-gray-900 mb-1 text-center">Confirmer la réservation</h3>
            <p class="text-sm font-semibold text-gray-700 text-center mb-1 capitalize">
              {{ formatDateTime(confirmSession.dateTime) }}
            </p>
            <div class="flex items-center justify-center gap-3 text-xs text-gray-400 mb-6">
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ confirmSession.duration }} min
              </span>
              <span v-if="confirmSession.location" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                {{ confirmSession.location }}
              </span>
              <span v-if="confirmSession.coach" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                {{ confirmSession.coach.name }}
              </span>
            </div>
            <div class="flex flex-col gap-3">
              <button
                class="btn-primary w-full justify-center"
                :disabled="!!bookingInProgress"
                @click="confirmBook"
              >
                <svg v-if="bookingInProgress === confirmSession.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {{ bookingInProgress === confirmSession.id ? 'Réservation…' : 'Confirmer la réservation' }}
              </button>
              <button class="btn-secondary w-full" :disabled="!!bookingInProgress" @click="confirmSession = null">Annuler</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Subscription required modal (G002/G003) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showSubscriptionModal"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          @click.self="showSubscriptionModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Abonnement requis</h3>
            <p class="text-sm text-gray-500 mb-6">
              Vous devez avoir un abonnement actif pour réserver une séance.<br/>
              Choisissez une formule adaptée à vos objectifs.
            </p>
            <div class="flex flex-col gap-3">
              <NuxtLink to="/subscribe" class="btn-primary w-full text-center" @click="showSubscriptionModal = false">
                Voir les formules
              </NuxtLink>
              <button class="btn-secondary w-full" @click="showSubscriptionModal = false">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  const { accessToken, isClient, ensureFresh } = useAuth()

  const tabs = [
    { label: 'A venir', value: 'upcoming' },
    { label: 'Passees', value: 'past' },
  ] as const

  const tab = ref<'upcoming' | 'past'>('upcoming')
  const page = ref(1)
  const LIMIT = 10
  const todayStr = computed(() => new Date().toISOString().split('T')[0])
  const fromDate = ref('')
  const toDate = ref('')
  const showFilters = ref(false)

  const subHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))
  const { data: subData, pending: subPending } = await useLazyFetch<{ active: boolean }>('/api/me/subscription', {
    headers: subHeaders,
    default: () => ({ active: false }),
  })
  const subActive = computed(() => !isClient.value || (subData.value?.active ?? false))

  interface Session {
    id: string; dateTime: string; duration: number; capacity: number; coachId: string
    location?: string | null
    coach?: { id: string; name: string } | null
    _count?: { bookings: number }
  }

  interface Pagination { page: number; limit: number; total: number; totalPages: number }
  interface SessionsResponse { success: boolean; sessions: Session[]; pagination: Pagination }

  const queryParams = computed(() => {
    const p: Record<string, string | number> = { page: page.value, limit: LIMIT }
    if (tab.value === 'upcoming') {
      // upcoming: from today midnight to optional end date, sorted ASC
      p.from = fromDate.value || todayStr.value
      if (toDate.value) p.to = toDate.value
      p.order = 'asc'
    } else {
      // past: everything strictly before today, sorted DESC (most recent first)
      p.to = todayStr.value + 'T00:00:00.000Z'
      p.order = 'desc'
    }
    return p
  })

  const { data, pending, error: fetchError, refresh } = await useLazyFetch<SessionsResponse>('/api/sessions', {
    query: queryParams,
    // Disable auto-watch: we control exactly WHEN fetches happen to avoid
    // race conditions from rapid date-input changes (fromDate then toDate).
    watch: false,
    default: () => ({ success: true, sessions: [], pagination: { page: 1, limit: LIMIT, total: 0, totalPages: 1 } }),
  })

  const sessions = computed(() => data.value?.sessions ?? [])
  const pagination = computed(() => data.value?.pagination ?? null)
  const isLoading = computed(() => pending.value || subPending.value)

  async function switchTab(value: 'upcoming' | 'past') {
    tab.value = value as 'upcoming' | 'past'
    page.value = 1
    fromDate.value = ''
    toDate.value = ''
    await nextTick()
    refresh()
  }

  function applyFilters() { page.value = 1; refresh() }
  function resetFilters() { fromDate.value = ''; toDate.value = ''; page.value = 1; refresh() }
  async function goToPage(n: number) { page.value = n; window.scrollTo({ top: 0, behavior: 'smooth' }); await nextTick(); refresh() }

  // M005 — track which sessions the user has already booked.
  // Loaded in onMounted (client-only) after ensureFresh() so an expired token
  // never silently empties the Set on page refresh.
  const bookedSessionIds = ref(new Set<string>())

  async function loadBookings() {
    if (!isClient.value) return
    try {
      await ensureFresh()
      const bkData = await $fetch<Array<{ status: string; session: { id: string } }>>('/api/bookings', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      bookedSessionIds.value = new Set(
        bkData
          .filter(b => b.status === 'CONFIRMED')
          .map(b => b.session.id)
      )
    } catch { /* silent */ }
  }

  onMounted(loadBookings)

  // Q001/Q004: Poll sessions every 30s, skip when a refresh is already running
  const pollingActive = ref(false)
  const { isPolling } = usePolling(async () => {
    if (pending.value) return
    pollingActive.value = true
    await Promise.all([refresh(), loadBookings()])
    pollingActive.value = false
  }, 30000, false) // immediate=false, we already fetch on mount via useLazyFetch

  const bookingInProgress = ref<string | null>(null)
  const toastMessage = ref('')
  const showSubscriptionModal = ref(false)

  // confirmSession drives the modern booking confirmation modal
  const confirmSession = ref<Session | null>(null)

  function openConfirmModal(session: Session) {
    confirmSession.value = session
  }

  async function confirmBook() {
    if (!confirmSession.value) return
    const sessionId = confirmSession.value.id
    confirmSession.value = null // close modal immediately
    bookingInProgress.value = sessionId
    try {
      await $fetch('/api/bookings', {
        method: 'POST',
        body: { sessionId },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      showToast('Réservation confirmée !')
      // Immediate local update so the button disables instantly
      bookedSessionIds.value = new Set([...bookedSessionIds.value, sessionId])
      // Sync from server (refreshes both sessions list and booked IDs)
      await Promise.all([refresh(), loadBookings()])
    } catch (e) {
      const err = e as { status?: number; statusCode?: number; data?: { code?: string; message?: string; statusMessage?: string }; statusMessage?: string }
      const code = err?.data?.code
      const status = err?.status ?? err?.statusCode
      if (status === 402 || code === 'subscription_required') {
        showSubscriptionModal.value = true
      } else {
        showToast('Échec : ' + (err?.data?.message ?? err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur'))
      }
    } finally {
      bookingInProgress.value = null
    }
  }

  function showToast(msg: string) { toastMessage.value = msg; setTimeout(() => { toastMessage.value = '' }, 3500) }
  function remaining(s: Session) { return Math.max(0, s.capacity - (s._count?.bookings ?? 0)) }
  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
</script>
<style scoped>
.collapse-enter-active, .collapse-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}
.collapse-enter-from, .collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>