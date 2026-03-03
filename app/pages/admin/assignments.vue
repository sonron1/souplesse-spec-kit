<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Assignations coach–client</h1>
        <p class="text-sm text-gray-500 mt-0.5">Proposez des coachs aux clients et gérez les demandes.</p>
      </div>
      <!-- Status filter -->
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.value"
          class="px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors"
          :class="statusFilter === f.value
            ? 'bg-primary-500 text-white border-primary-500'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
          @click="statusFilter = f.value"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Create form -->
    <div class="card mb-6">
      <h2 class="font-semibold text-gray-800 mb-4">Proposer un coach à un client</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="label">Coach</label>
          <select v-model="form.coachId" class="input">
            <option value="" disabled>Sélectionner un coach</option>
            <option v-for="c in coaches" :key="c.id" :value="c.id">{{ c.name }} — {{ c.email }}</option>
          </select>
        </div>
        <div>
          <label class="label">Client</label>
          <select v-model="form.clientId" class="input">
            <option value="" disabled>Sélectionner un client</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }} — {{ c.email }}</option>
          </select>
        </div>
      </div>
      <p v-if="formError" class="text-red-600 text-sm mt-2">{{ formError }}</p>
      <div class="mt-4 flex justify-end">
        <button class="btn-primary" :disabled="saving" @click="submitCreate">
          {{ saving ? 'Enregistrement…' : 'Proposer →' }}
        </button>
      </div>
    </div>

    <!-- Assignments list -->
    <SkeletonLoader v-if="pending" :count="4" :height="56" />

    <div v-else-if="loadError" class="card text-red-600">Erreur lors du chargement des assignations.</div>

    <div v-else-if="!assignments.length" class="card text-center py-10 text-gray-400">
      Aucune assignation{{ statusFilter !== 'ALL' ? ' avec ce statut' : '' }} pour le moment.
    </div>

    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Coach</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Client</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Initié par</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="a in filteredAssignments" :key="a.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ a.coach.name }}</p>
              <p class="text-xs text-gray-400">{{ a.coach.email }}</p>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ a.client.name }}</p>
              <p class="text-xs text-gray-400">{{ a.client.email }}</p>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(a.status)" class="px-2 py-0.5 rounded-full text-xs font-semibold">
                {{ statusLabel(a.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs capitalize">{{ a.requestedBy ?? '—' }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(a.assignedAt) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <template v-if="a.status === 'PENDING'">
                  <button
                    class="text-xs font-semibold text-green-600 hover:text-green-800 disabled:opacity-40"
                    :disabled="acting === a.id"
                    @click="actAssignment(a.id, 'APPROVE')"
                  >Valider</button>
                  <button
                    class="text-xs font-semibold text-orange-500 hover:text-orange-700 disabled:opacity-40"
                    :disabled="acting === a.id"
                    @click="actAssignment(a.id, 'REJECT')"
                  >Rejeter</button>
                </template>
                <button
                  class="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                  :disabled="removing === a.id"
                  @click="removeAssignment(a)"
                >{{ removing === a.id ? '…' : 'Supprimer' }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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

  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  const filters = [
    { label: 'Tous', value: 'ALL' },
    { label: 'En attente', value: 'PENDING' },
    { label: 'Acceptés', value: 'ACCEPTED' },
    { label: 'Refusés', value: 'REJECTED' },
  ]
  const statusFilter = ref('ALL')

  interface SimpleUser { id: string; name: string; email: string; role: string }
  interface Assignment {
    id: string
    coachId: string
    clientId: string
    assignedAt: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    requestedBy: string | null
    coach: { id: string; name: string; email: string }
    client: { id: string; name: string; email: string }
  }

  // Load users (coaches + clients)
  const { data: usersData } = await useLazyFetch<{ success: boolean; users: SimpleUser[] }>('/api/admin/users', {
    headers: authHeaders,
    query: { page: 1, limit: 200 },
    default: () => ({ success: true, users: [] }),
  })
  const coaches = computed(() => (usersData.value?.users ?? []).filter((u) => u.role === 'COACH'))
  const clients = computed(() => (usersData.value?.users ?? []).filter((u) => u.role === 'CLIENT'))

  // Load assignments
  const loadError = ref(false)
  const { data: assignData, pending, refresh } = await useLazyFetch<{ success: boolean; assignments: Assignment[] }>('/api/admin/assignments', {
    headers: authHeaders,
    default: () => ({ success: true, assignments: [] }),
    onResponseError: () => { loadError.value = true },
  })
  const assignments = computed(() => assignData.value?.assignments ?? [])
  const filteredAssignments = computed(() =>
    statusFilter.value === 'ALL'
      ? assignments.value
      : assignments.value.filter((a) => a.status === statusFilter.value)
  )

  // Create form
  const form = reactive({ coachId: '', clientId: '' })
  const formError = ref('')
  const saving = ref(false)

  async function submitCreate() {
    formError.value = ''
    if (!form.coachId || !form.clientId) {
      formError.value = 'Veuillez sélectionner un coach et un client.'
      return
    }
    saving.value = true
    try {
      await $fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { coachId: form.coachId, clientId: form.clientId },
      })
      form.coachId = ''
      form.clientId = ''
      showToast('Proposition envoyée au client.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      formError.value = err?.data?.message ?? 'Erreur inconnue'
    } finally {
      saving.value = false
    }
  }

  // Approve / Reject
  const acting = ref<string | null>(null)

  async function actAssignment(id: string, action: 'APPROVE' | 'REJECT') {
    acting.value = id
    try {
      await $fetch(`/api/admin/assignments/${id}`, {
        method: 'patch' as const,
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { action },
      })
      showToast(action === 'APPROVE' ? 'Assignation validée.' : 'Assignation rejetée.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      showToast(err?.data?.message ?? 'Erreur.', 'error')
    } finally {
      acting.value = null
    }
  }

  // Remove assignment
  const removing = ref<string | null>(null)

  async function removeAssignment(a: Assignment) {
    removing.value = a.id
    try {
      await $fetch('/api/admin/assignments', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { coachId: a.coachId, clientId: a.clientId },
      })
      showToast('Assignation supprimée.', 'success')
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      showToast(err?.data?.message ?? 'Erreur lors de la suppression.', 'error')
    } finally {
      removing.value = null
    }
  }

  function statusLabel(s: string) {
    return { PENDING: 'En attente', ACCEPTED: 'Accepté', REJECTED: 'Refusé' }[s] ?? s
  }
  function statusClass(s: string) {
    return {
      PENDING: 'bg-amber-100 text-amber-700',
      ACCEPTED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-600',
    }[s] ?? 'bg-gray-100 text-gray-600'
  }

  // Toast
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 3500)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }
</script>
