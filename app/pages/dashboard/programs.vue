<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'client-only'] })

const { accessToken, isClient } = useAuth()

const { data: subData, pending: subPending } = await useLazyFetch<{ active: boolean }>('/api/me/subscription', {
  headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
  default: () => ({ active: false }),
})
const subActive = computed(() => !isClient.value || (subData.value?.active ?? false))

interface Exercise { day: string; name: string; sets: number; reps: string; rest: string }
interface ProgramContent {
  title?: string; weeks?: number; sessionsPerWeek?: number
  exercises?: Exercise[]; notes?: string
}
interface Program { id: string; clientId: string; type: 'GAIN' | 'LOSS'; content?: ProgramContent | null }

const { data, pending, error } = await useLazyFetch<{ success: boolean; programs: Program[] }>('/api/programs', {
  headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
  default: () => ({ success: true, programs: [] }),
})

const programs = computed(() => data.value?.programs ?? [])
const expandedIds = ref<Set<string>>(new Set())

function toggleExercises(id: string) {
  const s = new Set(expandedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedIds.value = s
}

const typeConfig = {
  GAIN: { label: 'Prise de masse', icon: '💪', color: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  LOSS: { label: 'Perte de poids', icon: '🔥', color: 'from-orange-500 to-red-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-12">

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900">Mes programmes</h1>
        <p class="text-sm text-gray-400 mt-0.5">Programmes personnalisés par votre coach</p>
      </div>
    </div>

    <SkeletonLoader v-if="pending || subPending" :count="2" :height="140" />

    <div v-else-if="error" class="flex flex-col items-center justify-center py-16">
      <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
        <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <p class="text-red-600 font-semibold">Erreur lors du chargement.</p>
    </div>

    <SubscriptionGate v-else :active="subActive" message="Souscrivez à une formule pour accéder à vos programmes personnalisés.">

      <!-- Empty state -->
      <div v-if="!programs.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5 text-3xl">
          📋
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-1">Aucun programme</h3>
        <p class="text-sm text-gray-400 max-w-xs">Votre coach préparera votre programme personnalisé lors de votre prochain bilan.</p>
      </div>

      <!-- Programs list -->
      <div v-else class="space-y-6">
        <div
          v-for="program in programs"
          :key="program.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
        >
          <!-- Gradient Header -->
          <div :class="`bg-gradient-to-r ${typeConfig[program.type].color} p-6 text-white`">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">{{ typeConfig[program.type].icon }}</span>
                  <span class="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {{ typeConfig[program.type].label }}
                  </span>
                </div>
                <h2 class="text-xl font-extrabold leading-tight">
                  {{ program.content?.title ?? typeConfig[program.type].label }}
                </h2>
              </div>
            </div>

            <!-- Stats row -->
            <div class="flex flex-wrap items-center gap-4 mt-4">
              <div v-if="program.content?.weeks" class="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span class="text-xs font-semibold">{{ program.content.weeks }} semaines</span>
              </div>
              <div v-if="program.content?.sessionsPerWeek" class="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span class="text-xs font-semibold">{{ program.content.sessionsPerWeek }}× / semaine</span>
              </div>
              <div v-if="program.content?.exercises?.length" class="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <span class="text-xs font-semibold">{{ program.content.exercises.length }} exercices</span>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="p-5">

            <!-- Notes -->
            <div v-if="program.content?.notes" class="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <span class="text-lg shrink-0">📝</span>
              <p class="text-sm text-amber-800 leading-relaxed italic">{{ program.content.notes }}</p>
            </div>

            <!-- Exercises accordion -->
            <div v-if="program.content?.exercises?.length">
              <button
                class="flex items-center justify-between w-full text-sm font-bold text-gray-700 hover:text-gray-900 py-2 border-t border-gray-100 transition-colors"
                @click="toggleExercises(program.id)"
              >
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                  Voir les exercices ({{ program.content.exercises.length }})
                </span>
                <svg
                  :class="expandedIds.has(program.id) ? 'rotate-180' : ''"
                  class="w-4 h-4 text-gray-400 transition-transform"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>

              <Transition name="slide-down">
                <div v-if="expandedIds.has(program.id)" class="mt-3 space-y-2">
                  <div
                    v-for="(ex, i) in program.content.exercises"
                    :key="i"
                    class="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div class="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {{ i + 1 }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-900 text-sm">{{ ex.name }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ ex.day }}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 text-xs">
                      <span class="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600 font-medium">{{ ex.sets }} × {{ ex.reps }}</span>
                      <span class="text-gray-400">{{ ex.rest }}</span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

          </div>
        </div>
      </div>

    </SubscriptionGate>
  </div>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: opacity .2s ease, max-height .3s ease; overflow: hidden; max-height: 2000px; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; max-height: 0; }
</style>