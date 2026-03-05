<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Assignations coach–client</h1>
          <p class="text-sm text-gray-400 mt-0.5">Proposez des coachs aux clients et gérez les demandes.</p>
        </div>
      </div>
      <!-- Status filter -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="f in filters"
          :key="f.value"
          class="px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-colors"
          :class="statusFilter === f.value
            ? 'bg-black text-primary-400 border-black'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
          @click="statusFilter = f.value"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Create form -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div class="flex items-center gap-2 mb-5">
        <div class="w-8 h-8 rounded-lg bg-primary-400/10 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </div>
        <h2 class="font-semibold text-gray-800">Proposer un coach à un client</h2>
      </div>
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

    <div v-else-if="loadError" class="bg-white rounded-2xl border border-red-100 shadow-sm px-5 py-4 flex items-center gap-3 text-red-600">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Erreur lors du chargement des assignations.
    </div>

    <div v-else-if="!filteredAssignments.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14">
      <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
        <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucune assignation</p>
      <p class="text-sm text-gray-400">{{ statusFilter !== 'ALL' ? 'Aucune assignation avec ce statut.' : 'Créez une première proposition ci-dessus.' }}</p>
    </div>

    <div v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Coach</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Initié par</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th class="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="a in filteredAssignments" :key="a.id" class="hover:bg-gray-50/80 transition-colors">
              <td class="px-5 py-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                    {{ a.coach.name[0]?.toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ a.coach.name }}</p>
                    <p class="text-xs text-gray-400">{{ a.coach.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-primary-400 font-bold text-xs shrink-0">
                    {{ a.client.name[0]?.toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ a.client.name }}</p>
                    <p class="text-xs text-gray-400">{{ a.client.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4">
                <span :class="statusClass(a.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold border">
                  {{ statusLabel(a.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-gray-500 text-xs capitalize">{{ a.requestedBy ?? '—' }}</td>
              <td class="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">{{ formatDate(a.assignedAt) }}</td>
              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <template v-if="a.status === 'PENDING'">
                    <button
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-40 transition-colors"
                      :disabled="acting === a.id"
                      @click="actAssignment(a.id, 'APPROVE')"
                    >✓ Valider</button>
                    <button
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                      :disabled="acting === a.id"
                      @click="actAssignment(a.id, 'REJECT')"
                    >✕ Rejeter</button>
                  </template>
                  <button
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-40 transition-colors"
                    :disabled="removing === a.id"
                    @click="removeAssignment(a)"
                  >{{ removing === a.id ? '…' : 'Supprimer' }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toast.message"
          :class="[
            'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold',
            toast.type === 'success' ? 'bg-black text-primary-400' : 'bg-red-600 text-white',
          ]"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
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

  // Load coaches (no pagination limit)
  const { data: coachesData } = await useLazyFetch<{ coaches: { id: string; name: string; email: string }[] }>(
    '/api/coaches',
    { headers: authHeaders, default: () => ({ coaches: [] }) }
  )
  const coaches = computed(() => coachesData.value?.coaches ?? [])

  // Load clients (within the allowed limit of 100)
  const { data: usersData } = await useLazyFetch<{ success: boolean; users: SimpleUser[] }>('/api/admin/users', {
    headers: authHeaders,
    query: { page: 1, limit: 100 },
    default: () => ({ success: true, users: [] }),
  })
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
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-600 border-red-200',
    }[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'
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

<style scoped>
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(10px); }
</style>
