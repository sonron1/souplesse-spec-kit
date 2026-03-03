<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Journaux système</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ total }} entrée(s) au total</p>
      </div>
      <button class="btn-secondary text-sm" @click="() => refresh()">Actualiser</button>
    </div>

    <!-- Filters -->
    <div class="card mb-6 flex flex-wrap gap-4 items-end">
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
      <button class="btn-primary text-sm" @click="applyFilters">Filtrer</button>
      <button class="btn-secondary text-sm" @click="resetFilters">Réinitialiser</button>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="8" :height="44" />

    <!-- Empty -->
    <div v-else-if="logs.length === 0" class="card text-center py-12">
      <p class="text-gray-500 font-medium">Aucun journal trouvé</p>
    </div>

    <!-- Table -->
    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Date</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">Niveau</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">Message</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-600">Utilisateur</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="log in logs"
            :key="log.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
              {{ formatDate(log.createdAt) }}
            </td>
            <td class="px-4 py-3">
              <span
                class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="levelClass(log.level)"
              >
                {{ log.level }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{{ log.action }}</span>
            </td>
            <td class="px-4 py-3 text-gray-700 max-w-sm truncate">{{ log.message }}</td>
            <td class="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]">
              {{ log.userId ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p class="text-xs text-gray-400">Page {{ page }} / {{ pages }}</p>
        <div class="flex gap-2">
          <button
            class="btn-secondary text-xs px-3 py-1.5"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >Précédent</button>
          <button
            class="btn-secondary text-xs px-3 py-1.5"
            :disabled="page >= pages"
            @click="goToPage(page + 1)"
          >Suivant</button>
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
    if (level === 'error') return 'bg-red-100 text-red-700'
    if (level === 'warn')  return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }
</script>
