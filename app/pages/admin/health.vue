<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const { accessToken } = useAuth()
const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

// ── Types ──────────────────────────────────────────────────────────────────
interface ServiceStatus {
  status: 'ok' | 'error' | 'unconfigured'
  latencyMs?: number
  error?: string
}

interface CronHistory {
  ranAt: string
  message: string
  meta: Record<string, unknown> | null
}

interface CronInfo {
  action: string
  label: string
  lastRanAt: string | null
  lastMessage: string | null
  lastMeta: Record<string, unknown> | null
  history: CronHistory[]
}

interface HealthData {
  checkedAt: string
  db: ServiceStatus
  redis: ServiceStatus
  crons: CronInfo[]
  subscriptions: {
    active: number
    expiredToday: number
    expiringIn3d: number
  }
}

// ── Fetch + auto-refresh ───────────────────────────────────────────────────
const { data, pending, error, refresh } = await useFetch<HealthData>('/api/admin/health', {
  headers: authHeaders,
})

// Auto-refresh every 30 seconds
const { start: startPolling, stop: stopPolling } = usePolling(refresh, 30_000)
onMounted(startPolling)
onUnmounted(stopPolling)

const lastRefresh = ref(new Date())
watch(data, () => { lastRefresh.value = new Date() })

async function manualRefresh() {
  await refresh()
  lastRefresh.value = new Date()
}

// ── Helpers ────────────────────────────────────────────────────────────────
function relativeTime(iso: string | null): string {
  if (!iso) return 'Jamais'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusColor(s: ServiceStatus | undefined) {
  if (!s) return 'gray'
  if (s.status === 'ok')           return 'green'
  if (s.status === 'unconfigured') return 'yellow'
  return 'red'
}

function cronAge(iso: string | null): 'ok' | 'stale' | 'never' {
  if (!iso) return 'never'
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000
  return mins < 15 ? 'ok' : 'stale'
}

function metaValue(meta: Record<string, unknown> | null, key: string): string {
  if (!meta || meta[key] === undefined) return '—'
  return String(meta[key])
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="border-b border-gray-800 bg-gray-900/60 px-6 py-4">
      <div class="flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
            Santé système
          </h1>
          <p class="text-xs text-gray-500 mt-0.5">
            Dernière vérification : {{ formatDateTime(data?.checkedAt ?? null) }}
            · Auto-rafraîchissement toutes les 30 s
          </p>
        </div>
        <button
          :disabled="pending"
          class="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          @click="manualRefresh"
        >
          <svg class="w-3.5 h-3.5" :class="pending ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Rafraîchir
        </button>
      </div>
    </div>

    <!-- ── Loading ─────────────────────────────────────────────────────────── -->
    <div v-if="pending && !data" class="flex items-center justify-center py-24">
      <div class="flex items-center gap-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement…
      </div>
    </div>

    <!-- ── Error ───────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="flex items-center justify-center py-24 text-red-400 text-sm">
      Erreur lors du chargement des données de santé.
    </div>

    <div v-else-if="data" class="max-w-6xl mx-auto px-6 py-8 space-y-8">

      <!-- ════════════════════════════════════════════
           ROW 1 — Infrastructure status cards
           ════════════════════════════════════════════ -->
      <section>
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 mb-4">Infrastructure</h2>
        <div class="grid sm:grid-cols-3 gap-4">

          <!-- DB Card -->
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-2.5 h-2.5 rounded-full"
                  :class="statusColor(data.db) === 'green' ? 'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]' : 'bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]'"
                />
                <span class="text-sm font-bold text-white">PostgreSQL</span>
              </div>
              <span
                class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="statusColor(data.db) === 'green' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'"
              >
                {{ data.db.status === 'ok' ? 'Opérationnel' : 'Erreur' }}
              </span>
            </div>
            <p v-if="data.db.latencyMs !== undefined" class="text-xs text-gray-500">
              Latence : <span class="text-gray-300 font-medium">{{ data.db.latencyMs }} ms</span>
            </p>
            <p v-if="data.db.error" class="text-xs text-red-400 mt-1 truncate" :title="data.db.error">{{ data.db.error }}</p>
          </div>

          <!-- Redis Card -->
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-2.5 h-2.5 rounded-full"
                  :class="{
                    'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]': data.redis.status === 'ok',
                    'bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]': data.redis.status === 'unconfigured',
                    'bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]': data.redis.status === 'error',
                  }"
                />
                <span class="text-sm font-bold text-white">Redis (Upstash)</span>
              </div>
              <span
                class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="{
                  'bg-green-500/10 text-green-400 border border-green-500/20': data.redis.status === 'ok',
                  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': data.redis.status === 'unconfigured',
                  'bg-red-500/10 text-red-400 border border-red-500/20': data.redis.status === 'error',
                }"
              >
                {{ data.redis.status === 'ok' ? 'Opérationnel' : data.redis.status === 'unconfigured' ? 'Non configuré' : 'Erreur' }}
              </span>
            </div>
            <p v-if="data.redis.latencyMs !== undefined" class="text-xs text-gray-500">
              Latence : <span class="text-gray-300 font-medium">{{ data.redis.latencyMs }} ms</span>
            </p>
            <p v-if="data.redis.status === 'unconfigured'" class="text-xs text-yellow-600 mt-1">
              UPSTASH_REDIS_REST_URL non définie — verrou en mémoire locale
            </p>
            <p v-if="data.redis.error" class="text-xs text-red-400 mt-1 truncate" :title="data.redis.error">{{ data.redis.error }}</p>
          </div>

          <!-- App Card -->
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]" />
                <span class="text-sm font-bold text-white">API Nitro</span>
              </div>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                En ligne
              </span>
            </div>
            <p class="text-xs text-gray-500">
              Vérifié : <span class="text-gray-300 font-medium">{{ relativeTime(data.checkedAt) }}</span>
            </p>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════
           ROW 2 — Subscription quick stats
           ════════════════════════════════════════════ -->
      <section>
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 mb-4">Abonnements</h2>
        <div class="grid sm:grid-cols-3 gap-4">
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p class="text-xs text-gray-500 mb-1">Actifs en ce moment</p>
            <p class="text-3xl font-extrabold text-white">{{ data.subscriptions.active }}</p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p class="text-xs text-gray-500 mb-1">Expirés dans les 24 h</p>
            <p class="text-3xl font-extrabold" :class="data.subscriptions.expiredToday > 0 ? 'text-orange-400' : 'text-white'">
              {{ data.subscriptions.expiredToday }}
            </p>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p class="text-xs text-gray-500 mb-1">Expirent dans 3 jours</p>
            <p class="text-3xl font-extrabold" :class="data.subscriptions.expiringIn3d > 0 ? 'text-yellow-400' : 'text-white'">
              {{ data.subscriptions.expiringIn3d }}
            </p>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════
           ROW 3 — Cron jobs
           ════════════════════════════════════════════ -->
      <section>
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 mb-4">Tâches planifiées (Cron)</h2>
        <div class="space-y-4">
          <div
            v-for="cron in data.crons"
            :key="cron.action"
            class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
          >
            <!-- Cron header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div class="flex items-center gap-3">
                <!-- Status dot -->
                <div
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :class="{
                    'bg-green-400 shadow-[0_0_6px_theme(colors.green.400)]': cronAge(cron.lastRanAt) === 'ok',
                    'bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]': cronAge(cron.lastRanAt) === 'stale',
                    'bg-gray-600': cronAge(cron.lastRanAt) === 'never',
                  }"
                />
                <div>
                  <p class="text-sm font-bold text-white">{{ cron.label }}</p>
                  <p class="text-[11px] text-gray-600 font-mono">{{ cron.action }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs font-semibold" :class="cronAge(cron.lastRanAt) === 'never' ? 'text-gray-600' : cronAge(cron.lastRanAt) === 'stale' ? 'text-yellow-500' : 'text-green-400'">
                  {{ relativeTime(cron.lastRanAt) }}
                </p>
                <p v-if="cron.lastRanAt" class="text-[11px] text-gray-600">{{ formatDateTime(cron.lastRanAt) }}</p>
              </div>
            </div>

            <!-- Last run stats -->
            <div class="px-5 py-4">
              <div v-if="!cron.lastMeta" class="text-xs text-gray-600 italic">
                Aucune exécution enregistrée — le cron n'a pas encore tourné.
              </div>
              <template v-else>
                <!-- Stat chips row -->
                <div class="flex flex-wrap gap-3 mb-4">
                  <!-- expire-subscriptions stats -->
                  <template v-if="cron.action === 'CRON_EXPIRE_SUBSCRIPTIONS'">
                    <div class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                      <p class="text-xs text-gray-500">Expirés</p>
                      <p class="text-xl font-extrabold text-white">{{ metaValue(cron.lastMeta, 'expired') }}</p>
                    </div>
                    <div class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                      <p class="text-xs text-gray-500">Normaux</p>
                      <p class="text-xl font-extrabold text-gray-300">{{ metaValue(cron.lastMeta, 'normalExpired') }}</p>
                    </div>
                    <div class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                      <p class="text-xs text-gray-500">Pauses OT</p>
                      <p class="text-xl font-extrabold text-gray-300">{{ metaValue(cron.lastMeta, 'pauseExpired') }}</p>
                    </div>
                  </template>
                  <!-- send-reminders stats -->
                  <template v-else-if="cron.action === 'CRON_SEND_REMINDERS'">
                    <div class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                      <p class="text-xs text-gray-500">Rappels envoyés</p>
                      <p class="text-xl font-extrabold text-white">{{ metaValue(cron.lastMeta, 'sent') }}</p>
                    </div>
                  </template>
                  <!-- Duration (always) -->
                  <div class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <p class="text-xs text-gray-500">Durée</p>
                    <p class="text-xl font-extrabold text-blue-400">{{ metaValue(cron.lastMeta, 'durationMs') }} ms</p>
                  </div>
                </div>

                <!-- Recent history table -->
                <div v-if="cron.history.length > 1">
                  <p class="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-2">Historique récent</p>
                  <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                      <thead>
                        <tr class="text-left text-gray-600 border-b border-gray-800">
                          <th class="pb-1.5 pr-4 font-semibold">Exécuté</th>
                          <th v-if="cron.action === 'CRON_EXPIRE_SUBSCRIPTIONS'" class="pb-1.5 pr-4 font-semibold">Expirés</th>
                          <th v-if="cron.action === 'CRON_SEND_REMINDERS'" class="pb-1.5 pr-4 font-semibold">Rappels</th>
                          <th class="pb-1.5 font-semibold">Durée</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-800/50">
                        <tr v-for="(run, i) in cron.history" :key="i" class="text-gray-400">
                          <td class="py-1.5 pr-4">{{ formatDateTime(run.ranAt) }}</td>
                          <td v-if="cron.action === 'CRON_EXPIRE_SUBSCRIPTIONS'" class="py-1.5 pr-4">
                            {{ (run.meta as any)?.expired ?? '—' }}
                          </td>
                          <td v-if="cron.action === 'CRON_SEND_REMINDERS'" class="py-1.5 pr-4">
                            {{ (run.meta as any)?.sent ?? '—' }}
                          </td>
                          <td class="py-1.5 text-blue-500">{{ (run.meta as any)?.durationMs ?? '—' }} ms</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
