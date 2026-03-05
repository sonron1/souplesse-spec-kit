<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Journaux système</h1>
          <p class="text-sm text-gray-400 mt-0.5">{{ total }} entrée(s) au total</p>
        </div>
      </div>
      <button class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors" @click="() => refresh()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        Actualiser
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-5 flex flex-wrap gap-4 items-end">
      <!-- Level -->
      <div>
        <label class="label mb-1">Niveau</label>
        <select v-model="filters.level" class="input w-32 text-sm">
          <option value="">Tous</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
      </div>
      <!-- Action -->
      <div class="flex-1 min-w-[160px]">
        <label class="label mb-1">Action</label>
        <input v-model="filters.action" type="text" placeholder="USER_LOGIN…" class="input text-sm w-full" />
      </div>
      <!-- From -->
      <div>
        <label class="label mb-1">Du</label>
        <input v-model="filters.from" type="date" class="input text-sm" />
      </div>
      <!-- To -->
      <div>
        <label class="label mb-1">Au</label>
        <input v-model="filters.to" type="date" class="input text-sm" />
      </div>
      <div class="flex gap-2">
        <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-black text-primary-400 hover:bg-gray-900 transition-colors" @click="applyFilters">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.828V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.172a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z"/></svg>
          Filtrer
        </button>
        <button class="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors" @click="resetFilters">Réinitialiser</button>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="8" :height="44" />

    <!-- Empty -->
    <div v-else-if="logs.length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14">
      <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
        <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucun journal trouvé</p>
      <p class="text-sm text-gray-400">Modifiez vos filtres pour voir des entrées.</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Niveau</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-gray-50/80 transition-colors"
            >
              <td class="px-5 py-3.5 text-gray-400 whitespace-nowrap font-mono text-xs">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                  :class="levelClass(log.level)"
                >
                  {{ log.level }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <span class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{{ log.action }}</span>
              </td>
              <td class="px-5 py-3.5 text-gray-700 max-w-xs truncate">{{ log.message }}</td>
              <td class="px-5 py-3.5 text-gray-400 font-mono text-xs truncate max-w-[120px]">
                {{ log.userId ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pages > 1" class="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
        <p class="text-xs text-gray-400">Page {{ page }} / {{ pages }}</p>
        <div class="flex gap-2">
          <button
            class="px-4 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >← Précédent</button>
          <button
            class="px-4 py-1.5 rounded-xl text-xs font-semibold bg-black text-primary-400 hover:bg-gray-900 disabled:opacity-40 transition-colors"
            :disabled="page >= pages"
            @click="goToPage(page + 1)"
          >Suivant →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })

  const { accessToken } = useAuth() as { accessToken: ReturnType<typeof useCookie> }
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface SystemLog {
    id: string
    level: string
    action: string
    message: string
    userId: string | null
    target: string | null
    ip: string | null
    createdAt: string
  }

  const page  = ref(1)
  const filters = reactive({ level: '', action: '', from: '', to: '' })
  const activeFilters = ref({ ...filters })

  const url = computed(() => {
    const q: Record<string, string | number> = {
      page: page.value,
      limit: 50,
    }
    if (activeFilters.value.level)  q.level  = activeFilters.value.level
    if (activeFilters.value.action) q.action = activeFilters.value.action
    if (activeFilters.value.from)   q.from   = activeFilters.value.from
    if (activeFilters.value.to)     q.to     = activeFilters.value.to
    return `/api/admin/logs?${new URLSearchParams(q as Record<string, string>).toString()}`
  })

  const { data, pending, refresh } = await useLazyFetch<{
    logs: SystemLog[]
    total: number
    page: number
    pages: number
  }>(url, { headers, watch: [url], default: () => ({ logs: [], total: 0, page: 1, pages: 1 }) })

  const logs  = computed(() => data.value?.logs  ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pages = computed(() => data.value?.pages ?? 1)

  function applyFilters() {
    activeFilters.value = { ...filters }
    page.value = 1
  }

  function resetFilters() {
    Object.assign(filters, { level: '', action: '', from: '', to: '' })
    applyFilters()
  }

  function goToPage(p: number) {
    page.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function levelClass(level: string) {
    if (level === 'error') return 'bg-red-50 text-red-700 border-red-200'
    if (level === 'warn')  return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-green-50 text-green-700 border-green-200'
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }
</script>
