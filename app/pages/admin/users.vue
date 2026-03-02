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
              <th class="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
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
              <td class="px-4 py-3">
                <button
                  class="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
                  @click="openRoleModal(u)"
                >
                  Changer le rôle
                </button>
              </td>
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

    <!-- Role change modal -->
    <div
      v-if="roleModal.open"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 class="text-lg font-bold mb-1">Changer le rôle</h2>
        <p class="text-sm text-gray-500 mb-5">
          {{ roleModal.user?.name }} ({{ roleModal.user?.email }})
        </p>
        <div class="mb-4">
          <label class="label">Nouveau rôle</label>
          <select v-model="roleModal.selected" class="input">
            <option value="CLIENT">CLIENT</option>
            <option value="COACH">COACH</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <p v-if="roleModal.error" class="text-red-600 text-sm mb-3">{{ roleModal.error }}</p>
        <div class="flex gap-3 justify-end">
          <button class="btn-secondary" @click="closeRoleModal">Annuler</button>
          <button class="btn-primary" :disabled="roleModal.saving" @click="submitRoleChange">
            {{ roleModal.saving ? 'Enregistrement…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="toast.message"
        :class="[
          'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-primary-600 text-black' : 'bg-red-600 text-white',
        ]"
      >
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })
  const { accessToken } = useAuth()

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

  const { data, pending, error, refresh } = await useLazyFetch<UsersResponse>('/api/admin/users', {
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
    return 'badge-neutral'
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Role modal
  const roleModal = reactive({
    open: false,
    user: null as SafeUser | null,
    selected: 'CLIENT' as string,
    saving: false,
    error: '',
  })

  function openRoleModal(u: SafeUser) {
    roleModal.user = u
    roleModal.selected = u.role
    roleModal.error = ''
    roleModal.open = true
  }

  function closeRoleModal() {
    roleModal.open = false
    roleModal.user = null
  }

  async function submitRoleChange() {
    if (!roleModal.user) return
    roleModal.error = ''
    roleModal.saving = true
    try {
      await $fetch(`/api/admin/users/${roleModal.user.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { role: roleModal.selected },
      })
      closeRoleModal()
      showToast('Rôle mis à jour avec succès.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      roleModal.error = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
    } finally {
      roleModal.saving = false
    }
  }

  // Toast
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 3500)
  }
</script>
