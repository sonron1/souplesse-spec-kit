<template>
  <div class="max-w-2xl mx-auto">

    <!-- ── Page header ───────────────────────────────────────── -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mon coach</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gérez votre coach personnel ou faites une demande</p>
      </div>
    </div>

    <SkeletonLoader v-if="loadingAssignment" :count="3" :height="60" />

    <template v-else>

      <!-- ── PENDING assignment from admin ───────────────────── -->
      <div v-if="assignment?.status === 'PENDING'" class="bg-white rounded-2xl border border-amber-200 shadow-sm mb-6 overflow-hidden">
        <div class="h-1 w-full bg-amber-400" />
        <div class="p-6">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <p class="font-bold text-gray-900">Proposition de coach</p>
                <span class="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">En attente</span>
              </div>
              <p class="text-sm text-gray-600">
                <span class="font-semibold text-gray-900">{{ assignment.coach.name }}</span>
                {{ assignment.requestedBy === 'client' ? ' vous a été proposé suite à votre demande.' : ' vous a été proposé par un administrateur.' }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              class="flex-1 btn-primary justify-center"
              :disabled="!!responding"
              @click="respond('ACCEPT')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ responding === 'ACCEPT' ? 'Traitement…' : 'Accepter' }}
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
              :disabled="!!responding"
              @click="respond('REFUSE')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              {{ responding === 'REFUSE' ? 'Traitement…' : 'Refuser' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── ACCEPTED assignment ─────────────────────────────── -->
      <div v-else-if="assignment?.status === 'ACCEPTED'" class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div class="h-1 w-full bg-primary-400" />
        <div class="p-6">
          <p class="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Votre coach actuel</p>
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-black flex items-center justify-center text-xl font-extrabold text-primary-400 shrink-0">
              {{ assignment.coach.name?.[0]?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <p class="font-bold text-gray-900 text-lg">{{ assignment.coach.name }}</p>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-green-100 text-green-700 text-xs font-bold shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Actif
                </span>
              </div>
              <p class="text-sm text-gray-500">{{ assignment.coach.email }}</p>
            </div>
            <NuxtLink to="/dashboard/messages" class="btn-primary shrink-0 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Message
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ── REJECTED or no assignment ──────────────────────── -->
      <div v-if="!assignment || assignment.status === 'REJECTED'" class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 text-center py-10 px-6">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <p class="font-bold text-gray-800 mb-1">Aucun coach assigné</p>
        <p class="text-sm text-gray-500">
          <template v-if="assignment?.status === 'REJECTED'">Votre dernière proposition a été refusée. Choisissez-en un autre ci-dessous.</template>
          <template v-else>Faites une demande ci-dessous ou attendez qu'un administrateur vous assigne un coach.</template>
        </p>
      </div>

      <!-- ── Coach selection ────────────────────────────────── -->
      <div v-if="!assignment || assignment.status === 'REJECTED'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <h2 class="font-bold text-gray-800">Choisir votre coach</h2>
        </div>

        <div class="p-6">
          <SkeletonLoader v-if="loadingCoaches" :count="3" :height="52" />

          <div v-else-if="coaches.length === 0" class="text-sm text-gray-400 text-center py-6">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Aucun coach disponible pour le moment.
          </div>

          <div v-else class="space-y-2 mb-5">
            <button
              v-for="c in coaches"
              :key="c.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
              :class="selectedCoachId === c.id
                ? 'border-primary-400 bg-primary-400/5 shadow-sm'
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'"
              @click="selectedCoachId = c.id"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors"
                :class="selectedCoachId === c.id ? 'bg-black text-primary-400' : 'bg-gray-100 text-gray-600'"
              >
                {{ c.name?.[0]?.toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">{{ c.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ c.email }}</p>
              </div>
              <div
                class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                :class="selectedCoachId === c.id ? 'bg-primary-400' : 'border-2 border-gray-200'"
              >
                <svg v-if="selectedCoachId === c.id" class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </button>
          </div>

          <p v-if="requestError" class="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ requestError }}
          </p>

          <div class="flex justify-end">
            <button
              class="btn-primary flex items-center gap-2"
              :disabled="!selectedCoachId || requesting"
              @click="requestCoach"
            >
              <svg v-if="!requesting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ requesting ? 'Envoi…' : 'Demander ce coach' }}
            </button>
          </div>
        </div>
      </div>

    </template>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toast.message"
          :class="[
            'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium',
            toast.type === 'success' ? 'bg-black text-primary-400' : 'bg-red-600 text-white',
          ]"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
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
