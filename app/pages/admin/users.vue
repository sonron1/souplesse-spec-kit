<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Utilisateurs</h1>
      <span class="text-sm text-gray-500">Total : {{ total ?? '—' }}</span>
    </div>

    <!-- Search bar -->
    <div class="card mb-4 flex items-center gap-3 py-3 px-4">
      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
      <input v-model="search" type="text" placeholder="Rechercher par nom ou email…"
        class="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400" />
      <button v-if="search" class="text-gray-400 hover:text-gray-600" @click="search = ''">✕</button>
    </div>

    <!-- Role filter -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button v-for="r in ['ALL', 'CLIENT', 'COACH', 'ADMIN']" :key="r"
        :class="['px-3 py-1 rounded-full text-xs font-semibold border transition-all',
          roleFilter === r ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400']"
        @click="roleFilter = r">{{ r === 'ALL' ? 'Tous' : r }}</button>
    </div>

    <SkeletonLoader v-if="pending" :count="5" :height="60" />
    <div v-else-if="error" class="card text-red-600">Erreur lors du chargement des utilisateurs.</div>

    <div v-else>
      <div class="card overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Nom</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Role</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Inscrit le</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3 font-medium text-gray-900">{{ u.name }}</td>
              <td class="px-4 py-3 text-gray-600">{{ u.email }}</td>
              <td class="px-4 py-3"><span :class="roleClass(u.role)">{{ u.role }}</span></td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-3 items-center">
                  <button class="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1" @click="openEditModal(u)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Modifier
                  </button>
                  <button v-if="u.id !== currentUserId"
                    class="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                    @click="openDeleteModal(u)">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">Aucun utilisateur trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Page {{ page }} · {{ filteredUsers.length }} affiché(s) / {{ total }} total</span>
        <div class="flex gap-2">
          <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs" @click="changePage(-1)">← Précédente</button>
          <button :disabled="!hasNextPage" class="btn-secondary px-3 py-1.5 text-xs" @click="changePage(1)">Suivante →</button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 class="text-lg font-bold mb-4">Modifier l'utilisateur</h2>
        <div class="space-y-4">
          <div>
            <label class="label">Nom</label>
            <input v-model="editModal.name" type="text" class="input" placeholder="Nom complet" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="editModal.email" type="email" class="input" placeholder="email@exemple.com" />
          </div>
          <div>
            <label class="label">Rôle</label>
            <select v-model="editModal.role" class="input">
              <option value="CLIENT">CLIENT</option>
              <option value="COACH">COACH</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
        <p v-if="editModal.error" class="text-red-600 text-sm mt-3">{{ editModal.error }}</p>
        <div class="flex gap-3 justify-end mt-5">
          <button class="btn-secondary" @click="closeEditModal">Annuler</button>
          <button class="btn-primary" :disabled="editModal.saving" @click="submitEdit">
            {{ editModal.saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div v-if="deleteModal.open" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Supprimer l'utilisateur</h2>
            <p class="text-sm text-gray-500 mt-1">
              Cette action est irréversible. Toutes les données de
              <strong>{{ deleteModal.user?.name }}</strong> ({{ deleteModal.user?.email }}) seront supprimées.
            </p>
          </div>
        </div>
        <p v-if="deleteModal.error" class="text-red-600 text-sm mb-3">{{ deleteModal.error }}</p>
        <div class="flex gap-3 justify-end">
          <button class="btn-secondary" @click="closeDeleteModal">Annuler</button>
          <button class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            :disabled="deleteModal.deleting" @click="submitDelete">
            {{ deleteModal.deleting ? 'Suppression...' : 'Supprimer définitivement' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast.message"
        :class="['fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-black text-white' : 'bg-red-600 text-white']">
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })
  const { accessToken, user: authUser } = useAuth()

  interface SafeUser { id: string; name: string; email: string; role: string; createdAt: string }
  interface UsersResponse { success: boolean; users: SafeUser[]; total: number; page: number; limit: number }

  const currentUserId = computed(() => (authUser.value as { id?: string } | null)?.id ?? '')
  const page = ref(1)
  const limit = 20
  const search = ref('')
  const roleFilter = ref('ALL')
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
    let list = users.value
    if (roleFilter.value !== 'ALL') list = list.filter((u) => u.role === roleFilter.value)
    const q = search.value.toLowerCase().trim()
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    return list
  })

  async function changePage(delta: number) {
    page.value = Math.max(1, page.value + delta)
    await refresh()
  }

  function roleClass(role: string) {
    if (role === 'ADMIN') return 'badge-gold'
    if (role === 'COACH') return 'px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700'
    return 'badge-neutral'
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ── Edit modal ──────────────────────────────────────────────────────────────
  const editModal = reactive({ open: false, user: null as SafeUser | null,
    name: '', email: '', role: 'CLIENT' as string, saving: false, error: '' })

  function openEditModal(u: SafeUser) {
    Object.assign(editModal, { user: u, name: u.name, email: u.email, role: u.role, error: '', open: true })
  }
  function closeEditModal() { editModal.open = false; editModal.user = null }

  async function submitEdit() {
    if (!editModal.user) return
    editModal.error = ''
    editModal.saving = true
    const changes: Record<string, string> = {}
    if (editModal.name.trim()  !== editModal.user.name)  changes.name  = editModal.name.trim()
    if (editModal.email.trim() !== editModal.user.email) changes.email = editModal.email.trim()
    if (editModal.role         !== editModal.user.role)  changes.role  = editModal.role
    if (!Object.keys(changes).length) { closeEditModal(); editModal.saving = false; return }
    try {
      await $fetch(`/api/admin/users/${editModal.user.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: changes,
      })
      closeEditModal()
      showToast('Utilisateur mis à jour.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string }; message?: string }
      editModal.error = err?.data?.message ?? err?.message ?? 'Erreur inconnue'
    } finally { editModal.saving = false }
  }

  // ── Delete modal ────────────────────────────────────────────────────────────
  const deleteModal = reactive({ open: false, user: null as SafeUser | null, deleting: false, error: '' })

  function openDeleteModal(u: SafeUser) {
    Object.assign(deleteModal, { user: u, error: '', open: true })
  }
  function closeDeleteModal() { deleteModal.open = false; deleteModal.user = null }

  async function submitDelete() {
    if (!deleteModal.user) return
    deleteModal.error = ''
    deleteModal.deleting = true
    try {
      await $fetch(`/api/admin/users/${deleteModal.user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      closeDeleteModal()
      showToast('Utilisateur supprimé.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string }; message?: string }
      deleteModal.error = err?.data?.message ?? err?.message ?? 'Erreur inconnue'
    } finally { deleteModal.deleting = false }
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg; toast.type = type
    setTimeout(() => { toast.message = '' }, 3500)
  }
</script>
