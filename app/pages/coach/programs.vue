<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Programmes d'entraînement</h1>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <SkeletonLoader v-if="pending" :count="3" :height="80" />

    <div v-else-if="!programs?.length" class="card text-center py-14 text-gray-500">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-2xl">💪</div>
      <p class="text-base font-semibold mb-1">Aucun programme créé</p>
      <p class="text-sm mb-4">Créez votre premier programme pour un client.</p>
      <button class="btn-primary" @click="openCreate">+ Nouveau programme</button>
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="program in programs"
        :key="program.id"
        class="rounded-2xl shadow overflow-hidden border border-gray-100 flex flex-col"
      >
        <!-- Coloured header -->
        <div :class="`bg-gradient-to-r ${typeConfig[program.type]?.color ?? 'from-gray-400 to-gray-500'} p-4 text-white`">
          <div class="flex items-center justify-between">
            <span class="text-3xl">{{ typeConfig[program.type]?.icon ?? '🏋️' }}</span>
            <span class="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5">
              {{ typeConfig[program.type]?.label ?? program.type }}
            </span>
          </div>
          <p class="mt-2 font-bold text-base leading-tight">{{ programTitle(program) }}</p>
          <p class="text-white/70 text-xs mt-0.5">{{ program.client?.name ?? program.client?.email }}</p>
        </div>
        <!-- Stats row -->
        <div class="bg-white px-4 py-3 flex items-center gap-4 text-xs text-gray-500 flex-1">
          <span v-if="program.content?.weeks">📅 {{ program.content.weeks }} sem.</span>
          <span v-if="program.content?.sessionsPerWeek">🔄 {{ program.content.sessionsPerWeek }}×/sem.</span>
          <span v-if="program.content?.exercises?.length">🏃 {{ program.content.exercises.length }} exos</span>
          <span v-if="!program.content?.weeks && !program.content?.sessionsPerWeek && !program.content?.exercises?.length" class="italic text-gray-300">Non renseigné</span>
        </div>
        <!-- Action -->
        <div class="border-t border-gray-100 px-4 py-2.5 flex justify-end">
          <button class="btn-secondary text-sm" @click="openEdit(program)">✏️ Modifier</button>
        </div>
      </div>
    </div>

    <!-- ── Create modal ─────────────────────────────────────────────── -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <h2 class="text-lg font-bold mb-5">Nouveau programme</h2>
        <div class="space-y-5">

          <!-- Client selector -->
          <div>
            <label class="label">Client</label>
            <select v-model="createForm.clientId" class="input">
              <option value="" disabled>Sélectionner un client…</option>
              <option
                v-for="c in assignedClients"
                :key="c.id"
                :value="c.id"
                :disabled="clientsWithProgram.has(c.id)"
              >
                {{ c.name }} ({{ c.email }}){{ clientsWithProgram.has(c.id) ? ' — déjà un programme' : '' }}
              </option>
            </select>
            <p v-if="!assignedClients.length" class="text-xs text-gray-400 mt-1">Aucun client assigné pour l'instant.</p>
          </div>

          <!-- Type cards -->
          <div>
            <label class="label">Type de programme</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              <button
                v-for="(cfg, key) in typeConfig"
                :key="key"
                type="button"
                class="rounded-xl border-2 p-3 text-left transition-all"
                :class="createForm.type === key
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'"
                @click="createForm.type = key as ProgramType"
              >
                <span class="text-2xl block mb-1">{{ cfg.icon }}</span>
                <span class="text-xs font-semibold text-gray-800">{{ cfg.label }}</span>
              </button>
            </div>
          </div>

          <!-- Template preview -->
          <div v-if="createForm.type" class="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p class="text-xs font-semibold text-gray-500 mb-2">📋 Exercices suggérés (modifiables après création)</p>
            <div class="space-y-1">
              <div
                v-for="(ex, i) in EXERCISE_TEMPLATES[createForm.type].slice(0, 4)"
                :key="i"
                class="text-xs text-gray-600 flex items-center gap-1.5"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                {{ ex.name }} — {{ ex.sets }}×{{ ex.reps }}, repos {{ ex.rest }}
              </div>
              <p v-if="EXERCISE_TEMPLATES[createForm.type].length > 4" class="text-xs text-gray-400 italic">
                + {{ EXERCISE_TEMPLATES[createForm.type].length - 4 }} autres exercices…
              </p>
            </div>
          </div>

          <p v-if="createError" class="text-red-600 text-sm">{{ createError }}</p>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn-secondary" @click="showCreateModal = false">Annuler</button>
          <button class="btn-primary" :disabled="!createForm.clientId || saving" @click="submitCreate">
            {{ saving ? 'Création…' : 'Créer le programme' }}
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
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Type de programme</h3>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <button
                v-for="(cfg, key) in typeConfig"
                :key="key"
                type="button"
                class="rounded-xl border-2 p-2.5 text-center transition-all"
                :class="editForm.type === key
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'"
                @click="onEditTypeChange(key as ProgramType)"
              >
                <span class="text-xl block">{{ cfg.icon }}</span>
                <span class="text-[11px] font-semibold text-gray-700 leading-tight mt-0.5 block">{{ cfg.label }}</span>
              </button>
            </div>
            <p v-if="editForm.type !== editingOriginalType" class="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-1.5">
              ⚠️ Changer le type rechargera les exercices suggérés — vos modifications seront conservées.
            </p>
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

  type ProgramType = 'CARDIO' | 'FULL_BODY' | 'ABDO' | 'UPPER_BODY' | 'LOWER_BODY'

  interface Exercise { day: string; name: string; sets: number; reps: string; rest: string }
  interface ProgramContent { title?: string; weeks?: number; sessionsPerWeek?: number; exercises?: Exercise[]; notes?: string }
  interface Program {
    id: string; clientId: string; type: ProgramType
    content?: ProgramContent | null
    client?: { id: string; name: string; email: string } | null
  }
  interface AssignedClient { id: string; name: string; email: string }

  // ── Type metadata ──────────────────────────────────────────────────────────
  const typeConfig: Record<ProgramType, { label: string; icon: string; color: string }> = {
    CARDIO:     { label: 'Cardio',        icon: '🏃', color: 'from-orange-400 to-red-500'    },
    FULL_BODY:  { label: 'Full Body',     icon: '💪', color: 'from-violet-500 to-purple-600' },
    ABDO:       { label: 'Abdo',          icon: '🔥', color: 'from-yellow-400 to-orange-500' },
    UPPER_BODY: { label: 'Haut du Corps', icon: '🤸', color: 'from-blue-500 to-cyan-500'     },
    LOWER_BODY: { label: 'Bas du Corps',  icon: '🦵', color: 'from-green-500 to-teal-500'    },
  }

  // ── Exercise templates (coach can edit before validating) ──────────────────
  const EXERCISE_TEMPLATES: Record<ProgramType, Exercise[]> = {
    CARDIO: [
      { day: '',          name: 'Échauffement – Course sur place', sets: 1, reps: '5 min',  rest: '—'   },
      { day: '',          name: 'Corde à sauter',                  sets: 3, reps: '3 min',  rest: '30s' },
      { day: '',          name: 'Burpees',                         sets: 3, reps: '15',     rest: '90s' },
      { day: '',          name: 'Mountain Climbers',               sets: 3, reps: '30',     rest: '45s' },
      { day: '',          name: 'Jumping Jacks',                   sets: 3, reps: '40',     rest: '30s' },
      { day: '',          name: 'Sprint sur place',                sets: 4, reps: '30s',    rest: '60s' },
      { day: '',          name: 'Gainage planche',                 sets: 3, reps: '45s',    rest: '40s' },
    ],
    FULL_BODY: [
      { day: 'Lundi',    name: 'Squat',                      sets: 4, reps: '10-12', rest: '90s' },
      { day: 'Lundi',    name: 'Pompes',                     sets: 4, reps: '12',    rest: '60s' },
      { day: 'Mercredi', name: 'Fentes avant',               sets: 3, reps: '12',    rest: '90s' },
      { day: 'Mercredi', name: 'Rowing haltère',             sets: 3, reps: '12',    rest: '60s' },
      { day: 'Vendredi', name: 'Soulevé de terre roumain',   sets: 3, reps: '10',    rest: '90s' },
      { day: 'Vendredi', name: 'Développé militaire',        sets: 3, reps: '10',    rest: '60s' },
      { day: 'Vendredi', name: 'Gainage',                    sets: 3, reps: '45s',   rest: '45s' },
    ],
    ABDO: [
      { day: '', name: 'Crunch classique',   sets: 4, reps: '20',  rest: '45s' },
      { day: '', name: 'Planche frontale',   sets: 4, reps: '45s', rest: '30s' },
      { day: '', name: 'Russian Twist',      sets: 3, reps: '20',  rest: '45s' },
      { day: '', name: 'Relevé de jambes',   sets: 3, reps: '15',  rest: '60s' },
      { day: '', name: 'Bicycle Crunch',     sets: 3, reps: '20',  rest: '45s' },
      { day: '', name: 'Mountain Climbers',  sets: 3, reps: '30',  rest: '40s' },
      { day: '', name: 'Superman',           sets: 3, reps: '15',  rest: '40s' },
    ],
    UPPER_BODY: [
      { day: 'Lundi',    name: 'Développé couché haltères',        sets: 4, reps: '10',   rest: '90s' },
      { day: 'Lundi',    name: 'Tractions assistées / Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
      { day: 'Mercredi', name: 'Développé militaire',              sets: 3, reps: '10',   rest: '90s' },
      { day: 'Mercredi', name: 'Curl biceps haltères',             sets: 3, reps: '12',   rest: '60s' },
      { day: 'Vendredi', name: 'Extension triceps poulie',         sets: 3, reps: '12',   rest: '60s' },
      { day: 'Vendredi', name: 'Élévations latérales',             sets: 3, reps: '15',   rest: '60s' },
      { day: 'Vendredi', name: 'Rowing barre',                     sets: 4, reps: '10',   rest: '90s' },
    ],
    LOWER_BODY: [
      { day: 'Lundi',    name: 'Squat barre',                          sets: 4, reps: '12', rest: '90s' },
      { day: 'Lundi',    name: 'Presse à cuisses',                     sets: 4, reps: '12', rest: '90s' },
      { day: 'Mercredi', name: 'Fentes marchées',                      sets: 3, reps: '12', rest: '90s' },
      { day: 'Mercredi', name: 'Leg Curl couché',                      sets: 3, reps: '12', rest: '60s' },
      { day: 'Vendredi', name: 'Soulevé de terre jambes tendues',      sets: 3, reps: '10', rest: '90s' },
      { day: 'Vendredi', name: 'Extensions mollets debout',            sets: 4, reps: '15', rest: '45s' },
      { day: 'Vendredi', name: 'Hip Thrust',                           sets: 4, reps: '12', rest: '90s' },
    ],
  }

  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  const { data: clientsData } = await useLazyFetch<{ success: boolean; clients: AssignedClient[] }>('/api/coach/clients', {
    headers: authHeaders,
    default: () => ({ success: true, clients: [] }),
  })
  const assignedClients = computed(() => clientsData.value?.clients ?? [])

  const { data: response, pending, refresh } = await useLazyFetch<{ success: boolean; programs: Program[] }>('/api/programs', {
    headers: authHeaders,
    default: () => ({ success: true, programs: [] }),
  })
  const programs = computed(() => response.value?.programs ?? [])

  // Set of clientIds that already have a program (for disabling in dropdown)
  const clientsWithProgram = computed(() => new Set(programs.value.map((p) => p.clientId)))

  function programTitle(p: Program) {
    return p.content?.title || typeConfig[p.type]?.label || p.type
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  const showCreateModal = ref(false)
  const createForm = reactive({ clientId: '', type: 'FULL_BODY' as ProgramType })
  const createError = ref('')
  const saving = ref(false)

  function openCreate() {
    createForm.clientId = ''
    createForm.type = 'FULL_BODY'
    createError.value = ''
    showCreateModal.value = true
  }

  async function submitCreate() {
    createError.value = ''
    saving.value = true
    try {
      const content: ProgramContent = {
        title: `Programme ${typeConfig[createForm.type].label}`,
        exercises: EXERCISE_TEMPLATES[createForm.type].map((ex) => ({ ...ex })),
      }
      await $fetch('/api/programs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { clientId: createForm.clientId, type: createForm.type, content },
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

  // ── Edit ───────────────────────────────────────────────────────────────────
  const showEditModal = ref(false)
  const editingId = ref('')
  const editingOriginalType = ref<ProgramType>('FULL_BODY')
  const editForm = reactive({
    type: 'FULL_BODY' as ProgramType,
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
    editingOriginalType.value = program.type
    editForm.type = program.type
    const c = program.content ?? {}
    editForm.content.title = c.title ?? ''
    editForm.content.weeks = c.weeks ?? undefined
    editForm.content.sessionsPerWeek = c.sessionsPerWeek ?? undefined
    editForm.content.notes = c.notes ?? ''
    editForm.content.exercises = (c.exercises ?? []).map((ex) => ({ ...ex }))
    // If no exercises yet, pre-fill from template
    if (!editForm.content.exercises.length) {
      editForm.content.exercises = EXERCISE_TEMPLATES[program.type].map((ex) => ({ ...ex }))
    }
    editError.value = ''
    showEditModal.value = true
  }

  function onEditTypeChange(newType: ProgramType) {
    editForm.type = newType
    // If exercises were untouched template (or empty), replace with new template
    editForm.content.exercises = EXERCISE_TEMPLATES[newType].map((ex) => ({ ...ex }))
    if (!editForm.content.title || editForm.content.title.startsWith('Programme ')) {
      editForm.content.title = `Programme ${typeConfig[newType].label}`
    }
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
