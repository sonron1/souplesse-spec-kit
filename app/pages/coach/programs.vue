<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Programmes d'entraînement</h1>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <SkeletonLoader v-if="pending" :count="3" :height="72" />

    <div v-else-if="!programs?.length" class="card text-center py-12 text-gray-500">
      <p class="text-lg font-medium mb-2">Aucun programme créé</p>
      <p class="text-sm mb-4">Créez votre premier programme pour un client.</p>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="program in programs"
        :key="program.id"
        class="card flex items-center justify-between gap-4"
      >
        <div>
          <p class="font-semibold text-gray-900">Client : <span class="text-gray-800">{{ program.client?.name ?? program.client?.email ?? program.clientId }}</span></p>
          <p class="text-sm text-gray-500 mt-0.5">
            Type :
            <span class="badge-gold">{{ program.type === 'GAIN' ? 'Prise de masse' : 'Perte de poids' }}</span>
          </p>
        </div>
        <button class="btn-secondary text-sm" @click="openEdit(program)">Modifier</button>
      </div>
    </div>

    <!-- Create modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-5">Nouveau programme</h2>
        <div class="space-y-4">
          <div>
            <label class="label">Client</label>
            <select v-model="createForm.clientId" class="input">
              <option value="" disabled>Sélectionner un client…</option>
              <option v-for="c in assignedClients" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.email }})
              </option>
            </select>
            <p v-if="!assignedClients.length" class="text-xs text-gray-400 mt-1">Aucun client assigné pour l'instant.</p>
          </div>
          <div>
            <label class="label">Type</label>
            <select v-model="createForm.type" class="input">
              <option value="GAIN">Prise de masse</option>
              <option value="LOSS">Perte de poids</option>
            </select>
          </div>
          <p v-if="createError" class="text-red-600 text-sm">{{ createError }}</p>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn-secondary" @click="showCreateModal = false">Annuler</button>
          <button class="btn-primary" :disabled="saving" @click="submitCreate">
            {{ saving ? 'Création…' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-5">Modifier le programme</h2>
        <div class="space-y-4">
          <div>
            <label class="label">Type</label>
            <select v-model="editForm.type" class="input">
              <option value="GAIN">Prise de masse</option>
              <option value="LOSS">Perte de poids</option>
            </select>
          </div>
          <p v-if="editError" class="text-red-600 text-sm">{{ editError }}</p>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn-secondary" @click="showEditModal = false">Annuler</button>
          <button class="btn-primary" :disabled="saving" @click="submitEdit">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'coach'] })
  const { accessToken } = useAuth()

  interface Program {
    id: string
    clientId: string
    type: 'GAIN' | 'LOSS'
    client?: { id: string; name: string; email: string } | null
  }

  interface AssignedClient {
    id: string
    name: string
    email: string
  }

  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  // Fetch coach's assigned clients for the dropdown
  const { data: clientsData } = await useLazyFetch<{ success: boolean; clients: AssignedClient[] }>('/api/coach/clients', {
    headers: authHeaders,
    default: () => ({ success: true, clients: [] }),
  })
  const assignedClients = computed(() => clientsData.value?.clients ?? [])

  const {
    data: response,
    pending,
    refresh,
  } = await useLazyFetch<{ success: boolean; programs: Program[] }>('/api/programs', {
    headers: authHeaders,
    default: () => ({ success: true, programs: [] }),
  })

  const programs = computed(() => response.value?.programs ?? [])

  // --- Create ---
  const showCreateModal = ref(false)
  const createForm = reactive({ clientId: '', type: 'GAIN' as 'GAIN' | 'LOSS' })
  const createError = ref('')
  const saving = ref(false)

  function openCreate() {
    createForm.clientId = ''
    createForm.type = 'GAIN'
    createError.value = ''
    showCreateModal.value = true
  }

  async function submitCreate() {
    createError.value = ''
    saving.value = true
    try {
      await $fetch('/api/programs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { clientId: createForm.clientId, type: createForm.type, content: {} },
      })
      showCreateModal.value = false
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      createError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
    } finally {
      saving.value = false
    }
  }

  // --- Edit ---
  const showEditModal = ref(false)
  const editingId = ref('')
  const editForm = reactive({ type: 'GAIN' as 'GAIN' | 'LOSS' })
  const editError = ref('')

  function openEdit(program: Program) {
    editingId.value = program.id
    editForm.type = program.type
    editError.value = ''
    showEditModal.value = true
  }

  async function submitEdit() {
    editError.value = ''
    saving.value = true
    try {
      await $fetch(`/api/programs/${editingId.value}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { type: editForm.type },
      })
      showEditModal.value = false
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      editError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
    } finally {
      saving.value = false
    }
  }
</script>
