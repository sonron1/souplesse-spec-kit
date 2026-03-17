<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'client-only'] })

const { accessToken } = useAuth()

const subHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))
const { data: subData, pending: subLoading } = await useLazyFetch<{ active: boolean }>('/api/me/subscription', {
  headers: subHeaders,
  default: () => ({ active: false }),
})
const subActive = computed(() => subData.value?.active ?? false)

interface Booking {
  id: string
  status: string
  session?: { dateTime: string; duration: number; type?: string }
}

const { data: bookings, pending, refresh } = await useLazyFetch<Booking[]>('/api/bookings', {
  headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
  default: () => [],
})

const now = computed(() => new Date())

const upcoming = computed(() =>
  [...(bookings.value ?? [])]
    .filter(b => b.status !== 'CANCELLED' && new Date(b.session?.dateTime ?? 0) >= now.value)
    .sort((a, b) => new Date(a.session?.dateTime ?? 0).getTime() - new Date(b.session?.dateTime ?? 0).getTime())
)

const past = computed(() =>
  [...(bookings.value ?? [])]
    .filter(b => b.status === 'CANCELLED' || new Date(b.session?.dateTime ?? 0) < now.value)
    .sort((a, b) => new Date(b.session?.dateTime ?? 0).getTime() - new Date(a.session?.dateTime ?? 0).getTime())
)

const PAGE_SIZE = 5
const upcomingPage = ref(1)
const pastPage = ref(1)

const upcomingPaged = computed(() =>
  upcoming.value.slice((upcomingPage.value - 1) * PAGE_SIZE, upcomingPage.value * PAGE_SIZE)
)
const upcomingTotalPages = computed(() => Math.max(1, Math.ceil(upcoming.value.length / PAGE_SIZE)))

const pastPaged = computed(() =>
  past.value.slice((pastPage.value - 1) * PAGE_SIZE, pastPage.value * PAGE_SIZE)
)
const pastTotalPages = computed(() => Math.max(1, Math.ceil(past.value.length / PAGE_SIZE)))

const totalCount = computed(() => (bookings.value ?? []).length)

function statusLabel(s: string) {
  if (s === 'CONFIRMED') return 'Confirmée'
  if (s === 'CANCELLED') return 'Annulée'
  return s
}

function statusClass(s: string) {
  if (s === 'CONFIRMED') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  if (s === 'CANCELLED') return 'bg-red-50 text-red-600 border border-red-200'
  return 'bg-gray-100 text-gray-600 border border-gray-200'
}

function dayNum(dt?: string) {
  return dt ? new Date(dt).getDate() : '?'
}
function monthShort(dt?: string) {
  return dt ? new Date(dt).toLocaleString('fr-FR', { month: 'short' }) : ''
}
function weekDay(dt?: string) {
  return dt ? new Date(dt).toLocaleString('fr-FR', { weekday: 'long' }) : ''
}
function timeStr(dt?: string) {
  return dt ? new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
}
function isUpcoming(dt?: string) {
  return dt ? new Date(dt) >= now.value : false
}

const cancelError = ref('')
const cancelling = ref<string | null>(null)
const confirmId = ref<string | null>(null)

// Q002/Q004: Poll bookings every 30s
const pollingActive = ref(false)
const { isPolling } = usePolling(async () => {
  if (pending.value) return
  pollingActive.value = true
  await refresh()
  pollingActive.value = false
}, 30000, false)

function askCancel(id: string) { confirmId.value = id }
function dismissCancel() { confirmId.value = null }

async function cancelBooking(id: string) {
  confirmId.value = null
  cancelError.value = ''
  cancelling.value = id
  try {
    await $fetch(`/api/bookings/delete/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    await refresh()
  } catch (e) {
    cancelError.value = 'Impossible d\'annuler : ' + ((e as { statusMessage?: string })?.statusMessage ?? 'Erreur')
    setTimeout(() => { cancelError.value = '' }, 4000)
  } finally {
    cancelling.value = null
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-12">

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900">Mes réservations</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ totalCount }} au total</p>
      </div>
      <NuxtLink v-if="!subLoading && subActive" to="/sessions"
        class="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Réserver
      </NuxtLink>
      <NuxtLink v-else-if="!subLoading && !subActive" to="/subscribe"
        class="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all">
        S'abonner →
      </NuxtLink>
    </div>

    <SkeletonLoader v-if="pending || subLoading" :count="3" :height="88" />

    <!-- Q004: Polling indicator -->
    <Transition name="fade">
      <div v-if="pollingActive" class="flex items-center justify-end gap-1.5 text-xs text-gray-400 mb-2">
        <svg class="w-3.5 h-3.5 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Actualisation en cours…
      </div>
    </Transition>

    <SubscriptionGate v-if="!pending && !subLoading" :active="subActive" message="Souscrivez à une formule pour pouvoir réserver des séances du club.">

      <!-- Empty state -->
      <div v-if="!totalCount" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-1">Aucune réservation</h3>
        <p class="text-sm text-gray-400 mb-6">Commencez par réserver votre première séance.</p>
        <NuxtLink to="/sessions" class="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-xl transition-all">
          Voir les séances disponibles
        </NuxtLink>
      </div>

      <template v-else>
        <!-- ── Upcoming ──────────────────────────────────────── -->
        <section v-if="upcoming.length" class="mb-8">
          <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            Prochaines séances ({{ upcoming.length }})
          </h2>
          <div class="space-y-3">
            <div
              v-for="b in upcomingPaged"
              :key="b.id"
              class="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all p-5 flex items-center gap-5"
            >
              <!-- Date block -->
              <div class="shrink-0 w-14 h-16 rounded-xl bg-yellow-400 flex flex-col items-center justify-center">
                <span class="font-extrabold text-2xl leading-none text-black">{{ dayNum(b.session?.dateTime) }}</span>
                <span class="text-xs font-bold uppercase text-black/70">{{ monthShort(b.session?.dateTime) }}</span>
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-900 capitalize">{{ weekDay(b.session?.dateTime) }}</p>
                <div class="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ timeStr(b.session?.dateTime) }}
                  </span>
                  <span>·</span>
                  <span>{{ b.session?.duration ?? 0 }} min</span>
                </div>
              </div>
              <!-- Status + cancel -->
              <div class="flex items-center gap-2 shrink-0">
                <span :class="statusClass(b.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                  {{ statusLabel(b.status) }}
                </span>
                <button
                  v-if="b.status === 'CONFIRMED'"
                  :disabled="cancelling === b.id"
                  class="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Annuler la réservation"
                  @click="askCancel(b.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
          <!-- Upcoming pagination (O008: AppPagination) -->
          <AppPagination v-model="upcomingPage" :total-pages="upcomingTotalPages" :total="upcoming.length" class="mt-4" />
        </section>

        <!-- ── Past ─────────────────────────────────────────── -->
        <section v-if="past.length">
          <h2 class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-gray-300 inline-block"></span>
            Historique ({{ past.length }})
          </h2>
          <div class="space-y-2">
            <div
              v-for="b in pastPaged"
              :key="b.id"
              class="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-4 opacity-75"
            >
              <div class="shrink-0 w-12 h-14 rounded-lg bg-gray-200 flex flex-col items-center justify-center">
                <span class="font-bold text-xl leading-none text-gray-500">{{ dayNum(b.session?.dateTime) }}</span>
                <span class="text-[10px] font-bold uppercase text-gray-400">{{ monthShort(b.session?.dateTime) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-600 text-sm capitalize">{{ weekDay(b.session?.dateTime) }}</p>
                <p class="text-xs text-gray-400">{{ timeStr(b.session?.dateTime) }} · {{ b.session?.duration ?? 0 }} min</p>
              </div>
              <span :class="statusClass(b.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
                {{ statusLabel(b.status) }}
              </span>
            </div>
          </div>
          <!-- Past pagination (O008: AppPagination) -->
          <AppPagination v-model="pastPage" :total-pages="pastTotalPages" :total="past.length" class="mt-4" />
        </section>
      </template>

    </SubscriptionGate>

    <!-- Confirm cancel modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 text-center mb-1">Annuler la réservation ?</h3>
            <p class="text-sm text-gray-500 text-center mb-6">Cette action ne peut pas être annulée.</p>
            <div class="flex gap-3">
              <button class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all" @click="dismissCancel">Garder</button>
              <button class="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all" @click="cancelBooking(confirmId!)">Confirmer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Error toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div v-if="cancelError" class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ cancelError }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(12px); }
</style>