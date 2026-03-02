<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mes programmes</h1>
    </div>

    <SkeletonLoader v-if="pending" :count="2" :height="120" />

    <div v-else-if="error" class="card text-red-600">
      Erreur lors du chargement des programmes.
    </div>

    <div v-else-if="!programs.length" class="card text-center py-12 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
      </svg>
      <p class="text-lg font-medium mb-1">Aucun programme</p>
      <p class="text-sm">Votre coach n'a pas encore créé de programme pour vous.</p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="program in programs"
        :key="program.id"
        class="card"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ program.content?.title ?? (program.type === 'GAIN' ? 'Prise de masse' : 'Perte de poids') }}
            </h2>
            <p class="text-sm text-gray-500 mt-0.5">
              <span class="badge-gold">{{ program.type === 'GAIN' ? 'Prise de masse' : 'Perte de poids' }}</span>
              <span v-if="program.content?.weeks" class="ml-2">· {{ program.content.weeks }} semaines</span>
              <span v-if="program.content?.sessionsPerWeek" class="ml-2">· {{ program.content.sessionsPerWeek }}x/semaine</span>
            </p>
          </div>
        </div>

        <!-- Exercises -->
        <div v-if="program.content?.exercises?.length" class="mb-4">
          <button
            class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"
            @click="toggleExercises(program.id)"
          >
            <svg
              class="w-4 h-4 transition-transform"
              :class="expandedIds.has(program.id) ? 'rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            Exercices ({{ program.content.exercises.length }})
          </button>
          <div v-if="expandedIds.has(program.id)" class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="py-2 pr-4 font-semibold text-gray-600">Jour</th>
                  <th class="py-2 pr-4 font-semibold text-gray-600">Exercice</th>
                  <th class="py-2 pr-4 font-semibold text-gray-600">Séries</th>
                  <th class="py-2 pr-4 font-semibold text-gray-600">Reps</th>
                  <th class="py-2 font-semibold text-gray-600">Repos</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(ex, i) in program.content.exercises"
                  :key="i"
                  class="border-b border-gray-100 last:border-0"
                >
                  <td class="py-2 pr-4 text-gray-700">{{ ex.day }}</td>
                  <td class="py-2 pr-4 font-medium text-gray-900">{{ ex.name }}</td>
                  <td class="py-2 pr-4 text-gray-600">{{ ex.sets }}</td>
                  <td class="py-2 pr-4 text-gray-600">{{ ex.reps }}</td>
                  <td class="py-2 text-gray-600">{{ ex.rest }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="program.content?.notes" class="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 italic">
          {{ program.content.notes }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

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
  }

  const { data, pending, error } = await useLazyFetch<{ success: boolean; programs: Program[] }>('/api/programs', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => ({ success: true, programs: [] }),
  })

  const programs = computed(() => data.value?.programs ?? [])

  // Accordion state
  const expandedIds = ref<Set<string>>(new Set())

  function toggleExercises(id: string) {
    const s = new Set(expandedIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    expandedIds.value = s
  }
</script>
