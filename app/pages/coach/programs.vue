<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Programmes d'entraînement</h1>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <SkeletonLoader v-if="pending" :count="3" :height="80" />

    <div v-else-if="!programs?.length" class="card text-center py-14 text-gray-500">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <p class="text-base font-semibold mb-1">Aucun programme créé</p>
      <p class="text-sm mb-4">Créez votre premier programme pour un client.</p>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="program in programs"
        :key="program.id"
        class="card flex items-start justify-between gap-4"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-semibold text-gray-900 truncate">{{ programTitle(program) }}</p>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="program.type === 'GAIN' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'"
            >
              {{ program.type === 'GAIN' ? 'Prise de masse' : 'Perte de poids' }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mt-0.5">
            Client : <span class="text-gray-700 font-medium">{{ program.client?.name ?? program.client?.email ?? program.clientId }}</span>
          </p>
          <div v-if="program.content" class="flex items-center gap-3 mt-1.5 flex-wrap">
            <span v-if="program.content.weeks" class="text-xs text-gray-400">
              {{ program.content.weeks }} semaine{{ program.content.weeks > 1 ? 's' : '' }}
            </span>
            <span v-if="program.content.sessionsPerWeek" class="text-xs text-gray-400">
              · {{ program.content.sessionsPerWeek }} séance{{ program.content.sessionsPerWeek > 1 ? 's' : '' }}/sem.
            </span>
            <span v-if="program.content.exercises?.length" class="text-xs text-gray-400">
              · {{ program.content.exercises.length }} exercice{{ program.content.exercises.length > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        <button class="btn-secondary text-sm shrink-0" @click="openEdit(program)">Modifier</button>
      </div>
    </div>

    <!-- ── Create modal ─────────────────────────────────────────────── -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
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
            <label class="label">Type d'objectif</label>
            <select v-model="createForm.type" class="input">
              <option value="GAIN">Prise de masse</option>
              <option value="LOSS">Perte de poids</option>
            </select>
          </div>
          <p v-if="createError" class="text-red-600 text-sm">{{ createError }}</p>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn-secondary" @click="showCreateModal = false">Annuler</button>
          <button class="btn-primary" :disabled="!createForm.clientId || saving" @click="submitCreate">
            {{ saving ? 'Création…' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Edit modal (full content editor) ─────────────────────────── -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl my-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold">Modifier le programme</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="showEditModal = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="space-y-6">

          <!-- Objectif -->
          <section>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Objectif</h3>
            <div>
              <label class="label">Type</label>
              <select v-model="editForm.type" class="input max-w-xs">
                <option value="GAIN">Prise de masse</option>
                <option value="LOSS">Perte de poids</option>
              </select>
            </div>
          </section>

          <!-- Programme général -->
          <section>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Programme</h3>
            <div class="space-y-3">
              <div>
                <label class="label">Titre du programme</label>
                <input v-model="editForm.content.title" type="text" class="input" placeholder="ex : Programme Prise de Masse 12 semaines" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">Durée (semaines)</label>
                  <input v-model.number="editForm.content.weeks" type="number" min="1" max="52" class="input" placeholder="12" />
                </div>
                <div>
                  <label class="label">Séances / semaine</label>
                  <input v-model.number="editForm.content.sessionsPerWeek" type="number" min="1" max="7" class="input" placeholder="3" />
                </div>
              </div>
              <div>
                <label class="label">Notes / conseils</label>
                <textarea
                  v-model="editForm.content.notes"
                  rows="3"
                  class="input resize-none"
                  placeholder="Conseils nutritionnels, récupération, progression…"
                />
              </div>
            </div>
          </section>

          <!-- Exercices -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Exercices</h3>
              <button
                type="button"
                class="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                @click="addExercise"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Ajouter un exercice
              </button>
            </div>

            <div v-if="!editForm.content.exercises?.length" class="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              Aucun exercice — cliquez sur « Ajouter un exercice »
            </div>

            <div v-else class="space-y-2">
              <!-- Column headers -->
              <div class="grid grid-cols-[80px_1fr_60px_70px_70px_32px] gap-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <span>Jour</span><span>Exercice</span><span>Séries</span><span>Reps</span><span>Repos</span><span />
              </div>
              <!-- Exercise rows -->
              <div
                v-for="(ex, idx) in editForm.content.exercises"
                :key="idx"
                class="grid grid-cols-[80px_1fr_60px_70px_70px_32px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2"
              >
                <input v-model="ex.day" type="text" class="input input-sm" placeholder="Lundi" />
                <input v-model="ex.name" type="text" class="input input-sm" placeholder="Squat" />
                <input v-model.number="ex.sets" type="number" min="1" class="input input-sm" placeholder="4" />
                <input v-model="ex.reps" type="text" class="input input-sm" placeholder="8-10" />
                <input v-model="ex.rest" type="text" class="input input-sm" placeholder="90s" />
                <button
                  type="button"
                  class="text-gray-300 hover:text-red-400 transition-colors"
                  title="Supprimer"
                  @click="removeExercise(idx)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </section>

        </div>

        <p v-if="editError" class="text-red-600 text-sm mt-4">{{ editError }}</p>
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

  interface Exercise {
    day: string
    name: string
    sets: number
    reps: string
    rest: string
  }

  interface ProgramContent {
    title?: string
    weeks?: number
    sessionsPerWeek?: number
    exercises?: Exercise[]
    notes?: string
  }

  interface Program {
    id: string
    clientId: string
    type: 'GAIN' | 'LOSS'
    content?: ProgramContent | null
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

  function programTitle(p: Program) {
    return p.content?.title || (p.type === 'GAIN' ? 'Programme Prise de masse' : 'Programme Perte de poids')
  }

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
  const editForm = reactive({
    type: 'GAIN' as 'GAIN' | 'LOSS',
    content: {
      title: '',
      weeks: undefined as number | undefined,
      sessionsPerWeek: undefined as number | undefined,
      notes: '',
      exercises: [] as Exercise[],
    },
  })
  const editError = ref('')

  function openEdit(program: Program) {
    editingId.value = program.id
    editForm.type = program.type
    const c = program.content ?? {}
    editForm.content.title = c.title ?? ''
    editForm.content.weeks = c.weeks ?? undefined
    editForm.content.sessionsPerWeek = c.sessionsPerWeek ?? undefined
    editForm.content.notes = c.notes ?? ''
    editForm.content.exercises = (c.exercises ?? []).map((ex) => ({ ...ex }))
    editError.value = ''
    showEditModal.value = true
  }

  function addExercise() {
    editForm.content.exercises.push({ day: '', name: '', sets: 3, reps: '', rest: '' })
  }

  function removeExercise(idx: number) {
    editForm.content.exercises.splice(idx, 1)
  }

  async function submitEdit() {
    editError.value = ''
    saving.value = true
    try {
      const content: ProgramContent = {
        ...(editForm.content.title && { title: editForm.content.title }),
        ...(editForm.content.weeks ? { weeks: editForm.content.weeks } : {}),
        ...(editForm.content.sessionsPerWeek ? { sessionsPerWeek: editForm.content.sessionsPerWeek } : {}),
        ...(editForm.content.notes && { notes: editForm.content.notes }),
        exercises: editForm.content.exercises,
      }
      await $fetch(`/api/programs/${editingId.value}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { type: editForm.type, content },
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
