<template>
  <div class="max-w-2xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Mon coach</h1>
      <p class="text-sm text-gray-500 mt-0.5">Gérez votre coach personnel ou faites une demande.</p>
    </div>

    <SkeletonLoader v-if="loadingAssignment" :count="3" :height="60" />

    <template v-else>
      <!-- ── PENDING assignment from admin ─────────────────────────── -->
      <div v-if="assignment?.status === 'PENDING'" class="card mb-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-900">Proposition de coach</p>
            <p class="text-sm text-gray-500 mt-0.5">
              <span class="font-medium text-gray-800">{{ assignment.coach.name }}</span>
              vous a été proposé{{ assignment.requestedBy === 'client' ? ' suite à votre demande' : ' par un administrateur' }}.
              Acceptez ou refusez cette proposition.
            </p>
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            class="btn-primary flex-1 justify-center"
            :disabled="responding"
            @click="respond('ACCEPT')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ responding === 'ACCEPT' ? 'Traitement…' : 'Accepter' }}
          </button>
          <button
            class="flex-1 justify-center flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            :disabled="!!responding"
            @click="respond('REFUSE')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {{ responding === 'REFUSE' ? 'Traitement…' : 'Refuser' }}
          </button>
        </div>
      </div>

      <!-- ── ACCEPTED assignment ────────────────────────────────────── -->
      <div v-else-if="assignment?.status === 'ACCEPTED'" class="card mb-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700 shrink-0">
            {{ assignment.coach.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-gray-900">{{ assignment.coach.name }}</p>
              <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Actif</span>
            </div>
            <p class="text-sm text-gray-500">{{ assignment.coach.email }}</p>
          </div>
          <NuxtLink to="/dashboard/messages" class="btn-primary text-sm gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            Écrire un message
          </NuxtLink>
        </div>
      </div>

      <!-- ── REJECTED or no assignment ─────────────────────────────── -->
      <div v-if="!assignment || assignment.status === 'REJECTED'" class="card mb-6 text-center py-10">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <p class="font-semibold text-gray-700 mb-1">Aucun coach assigné</p>
        <p class="text-sm text-gray-400 mb-5">
          <template v-if="assignment?.status === 'REJECTED'">Votre dernière proposition a été refusée.</template>
          <template v-else>Vous pouvez demander un coach ci-dessous ou attendre qu'un administrateur vous en propose un.</template>
        </p>
      </div>

      <!-- ── Request a coach ────────────────────────────────────────── -->
      <div v-if="!assignment || assignment.status === 'REJECTED'" class="card">
        <h2 class="font-semibold text-gray-800 mb-4">Choisir votre coach</h2>

        <SkeletonLoader v-if="loadingCoaches" :count="3" :height="52" />

        <div v-else-if="coaches.length === 0" class="text-sm text-gray-400 text-center py-4">
          Aucun coach disponible pour le moment.
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="c in coaches"
            :key="c.id"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left"
            :class="selectedCoachId === c.id
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-100 hover:bg-gray-50'"
            @click="selectedCoachId = c.id"
          >
            <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
              {{ c.name?.[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 text-sm">{{ c.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ c.email }}</p>
            </div>
            <div v-if="selectedCoachId === c.id" class="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
              <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          </button>
        </div>

        <p v-if="requestError" class="text-red-600 text-sm mt-3">{{ requestError }}</p>

        <div class="mt-4 flex justify-end">
          <button
            class="btn-primary"
            :disabled="!selectedCoachId || requesting"
            @click="requestCoach"
          >
            {{ requesting ? 'Envoi…' : 'Demander ce coach →' }}
          </button>
        </div>
      </div>
    </template>

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
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { accessToken } = useAuth()
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface Coach { id: string; name: string; email: string }
  interface Assignment {
    id: string
    coachId: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    requestedBy: string | null
    assignedAt: string
    respondedAt: string | null
    coach: Coach
  }

  // Load current assignment
  const { data: assignData, pending: loadingAssignment, refresh: refreshAssignment } =
    await useLazyFetch<{ assignment: Assignment | null }>('/api/me/assignment', {
      headers,
      default: () => ({ assignment: null }),
    })
  const assignment = computed(() => assignData.value?.assignment ?? null)

  // Load coaches list
  const { data: coachData, pending: loadingCoaches } =
    await useLazyFetch<{ coaches: Coach[] }>('/api/coaches', {
      headers,
      default: () => ({ coaches: [] }),
    })
  const coaches = computed(() => coachData.value?.coaches ?? [])

  // Request a coach
  const selectedCoachId = ref('')
  const requesting = ref(false)
  const requestError = ref('')

  async function requestCoach() {
    if (!selectedCoachId.value) return
    requesting.value = true
    requestError.value = ''
    try {
      await $fetch('/api/me/coach-request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { coachId: selectedCoachId.value },
      })
      showToast('Demande envoyée ! Un administrateur va valider votre choix.', 'success')
      selectedCoachId.value = ''
      await refreshAssignment()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      requestError.value = err?.data?.message ?? 'Erreur lors de la demande.'
    } finally {
      requesting.value = false
    }
  }

  // Accept / Refuse pending assignment
  const responding = ref<'ACCEPT' | 'REFUSE' | null>(null)

  async function respond(action: 'ACCEPT' | 'REFUSE') {
    responding.value = action
    try {
      await $fetch('/api/me/assignment', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { action },
      })
      const label = action === 'ACCEPT' ? 'Assignation acceptée !' : 'Proposition refusée.'
      showToast(label, 'success')
      await refreshAssignment()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      showToast(err?.data?.message ?? 'Erreur lors de la réponse.', 'error')
    } finally {
      responding.value = null
    }
  }

  // Toast
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 4000)
  }
</script>
