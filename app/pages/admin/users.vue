<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Utilisateurs</h1>
      <span class="text-sm text-gray-500">Total : {{ total ?? '—' }}</span>
    </div>

    <!-- Search bar -->
    <div class="card mb-4 flex items-center gap-3 py-3 px-4">
      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher par nom ou email…"
        class="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400"
      />
      <button v-if="search" class="text-gray-400 hover:text-gray-600" @click="search = ''">✕</button>
    </div>

    <SkeletonLoader v-if="pending" :count="5" :height="60" />

    <div v-else-if="error" class="card text-red-600">
      Erreur lors du chargement des utilisateurs.
    </div>

    <div v-else>
      <!-- Users table -->
      <div class="card overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Nom</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Rôle</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Inscrit le</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="u in filteredUsers"
              :key="u.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-gray-900">{{ u.name }}</td>
              <td class="px-4 py-3 text-gray-600">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span :class="roleClass(u.role)">{{ u.role }}</span>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(u.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Page {{ page }} · {{ users?.length ?? 0 }} résultats</span>
        <div class="flex gap-2">
          <button
            :disabled="page <= 1"
            class="btn-secondary px-3 py-1.5 text-xs"
            @click="changePage(-1)"
          >← Précédente</button>
          <button
            :disabled="!hasNextPage"
            class="btn-secondary px-3 py-1.5 text-xs"
            @click="changePage(1)"
          >Suivante →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isAdmin, accessToken } = useAuth()
  if (!isAdmin.value) await navigateTo('/dashboard')

  interface SafeUser {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }

  interface UsersResponse {
    success: boolean
    users: SafeUser[]
    total: number
    page: number
    limit: number
  }

  const page = ref(1)
  const limit = 20
  const search = ref('')

  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  const {
    data,
    pending,
    error,
    refresh,
  } = await useLazyFetch<UsersResponse>('/api/admin/users', {
    headers: authHeaders,
    query: computed(() => ({ page: page.value, limit })),
    default: () => ({ success: true, users: [], total: 0, page: 1, limit }),
  })

  const users = computed(() => data.value?.users ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const hasNextPage = computed(() => page.value * limit < total.value)

  const filteredUsers = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return users.value
    return users.value.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  })

  async function changePage(delta: number) {
    page.value = Math.max(1, page.value + delta)
    await refresh()
  }

  function roleClass(role: string) {
    if (role === 'ADMIN') return 'badge-gold'
    if (role === 'COACH') return 'badge-neutral'
    return 'badge-neutral'
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
</script>
