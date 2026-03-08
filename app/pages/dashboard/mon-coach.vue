<template>
  <div class="max-w-4xl mx-auto">

    <!-- ── Page header ──────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mon coach</h1>
        <p class="text-sm text-gray-500 mt-0.5">Votre accompagnateur personnel pour progresser</p>
      </div>
    </div>

    <SkeletonLoader v-if="loadingAssignment" :count="3" :height="72" />

    <template v-else>

      <!-- ══ STATE 1 — Client requested a coach, waiting for admin approval ══ -->
      <!-- The client CANNOT self-approve their own request. Only admin decides. -->
      <div
        v-if="assignment?.status === 'PENDING' && assignment?.requestedBy === 'client'"
        class="bg-white rounded-2xl border border-amber-200 shadow-sm mb-6 overflow-hidden"
      >
        <div class="h-1 w-full bg-amber-400" />
        <div class="p-6 flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <p class="font-bold text-gray-900">Demande en cours de validation</p>
              <span class="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">En attente</span>
            </div>
            <p class="text-sm text-gray-600 mb-4">
              Votre demande pour <span class="font-semibold text-gray-900">{{ assignment.coach.name }}</span>
              a été transmise. Un administrateur va examiner et valider votre choix prochainement.
            </p>
            <div class="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <div class="w-10 h-10 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0">
                <img v-if="assignment.coach.avatarUrl" :src="assignment.coach.avatarUrl" :alt="assignment.coach.name" class="w-full h-full object-cover" />
                <span v-else class="text-primary-400 font-extrabold text-sm">{{ assignment.coach.name?.[0]?.toUpperCase() }}</span>
              </div>
              <div>
                <p class="font-semibold text-gray-900 text-sm">{{ assignment.coach.name }}</p>
                <p class="text-xs text-gray-500">Coach personnel</p>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-3">Vous recevrez une notification dès que votre demande aura été traitée.</p>
          </div>
        </div>
      </div>

      <!-- ══ STATE 2 — Admin proposed a coach → client must accept or refuse ══ -->
      <div
        v-else-if="assignment?.status === 'PENDING' && assignment?.requestedBy !== 'client'"
        class="bg-white rounded-2xl border border-blue-200 shadow-sm mb-6 overflow-hidden"
      >
        <div class="h-1 w-full bg-blue-500" />
        <div class="p-6">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-2">
                <p class="font-bold text-gray-900">Un coach vous a été proposé</p>
                <span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg">À confirmer</span>
              </div>
              <p class="text-sm text-gray-600 mb-4">
                Un administrateur vous propose de travailler avec
                <span class="font-semibold text-gray-900">{{ assignment.coach.name }}</span>.
                Acceptez-vous ce coach ?
              </p>
              <div class="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0">
                  <img v-if="assignment.coach.avatarUrl" :src="assignment.coach.avatarUrl" :alt="assignment.coach.name" class="w-full h-full object-cover" />
                  <span v-else class="text-primary-400 font-extrabold text-sm">{{ assignment.coach.name?.[0]?.toUpperCase() }}</span>
                </div>
                <div>
                  <p class="font-semibold text-gray-900 text-sm">{{ assignment.coach.name }}</p>
                  <p class="text-xs text-gray-500">Coach personnel</p>
                </div>
              </div>
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
              {{ responding === 'ACCEPT' ? 'Traitement…' : 'Accepter ce coach' }}
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

      <!-- ══ STATE 3 — ACCEPTED: show current coach prominently ══ -->
      <div
        v-else-if="assignment?.status === 'ACCEPTED'"
        class="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-xl mb-6 overflow-hidden"
      >
        <div class="p-6 sm:p-8">
          <p class="text-xs font-bold text-primary-400 uppercase tracking-widest mb-5">Votre coach actuel</p>
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div class="w-24 h-24 rounded-2xl overflow-hidden bg-gray-800 border-2 border-primary-400/30 flex items-center justify-center shrink-0">
              <img v-if="assignment.coach.avatarUrl" :src="assignment.coach.avatarUrl" :alt="assignment.coach.name" class="w-full h-full object-cover" />
              <span v-else class="text-4xl font-extrabold text-primary-400">{{ assignment.coach.name?.[0]?.toUpperCase() }}</span>
            </div>
            <div class="flex-1 text-center sm:text-left">
              <div class="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                <p class="font-bold text-white text-2xl">{{ assignment.coach.name }}</p>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-green-400/20 text-green-400 text-xs font-bold border border-green-400/30 shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  Actif
                </span>
              </div>
              <p class="text-sm text-gray-400 mb-5">{{ assignment.coach.email }}</p>
              <NuxtLink
                to="/dashboard/messages"
                class="inline-flex items-center gap-2 bg-primary-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-300 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Envoyer un message
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ STATE 4 — No assignment or REJECTED → coach selection grid ══ -->
      <template v-if="!assignment || assignment.status === 'REJECTED'">

        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-gray-800 mb-0.5">Aucun coach assigné</p>
            <p class="text-sm text-gray-500">
              <template v-if="assignment?.status === 'REJECTED'">Votre dernière proposition a été refusée. Choisissez un autre coach ci-dessous.</template>
              <template v-else>Choisissez un coach ci-dessous, ou attendez qu'un administrateur vous en assigne un.</template>
            </p>
          </div>
        </div>

        <!-- Coach grid -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <h2 class="font-bold text-gray-800 text-sm">Nos coachs disponibles</h2>
              <p class="text-xs text-gray-400">{{ coaches.length }} coach{{ coaches.length > 1 ? 's' : '' }} disponible{{ coaches.length > 1 ? 's' : '' }}</p>
            </div>
          </div>

          <div class="p-6">
            <SkeletonLoader v-if="loadingCoaches" :count="4" :height="108" />

            <div v-else-if="coaches.length === 0" class="text-center py-14">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <p class="text-gray-600 font-semibold">Aucun coach disponible pour le moment</p>
              <p class="text-sm text-gray-400 mt-1">Revenez plus tard ou contactez un administrateur.</p>
            </div>

            <div v-else>
              <!-- Cards grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <button
                  v-for="c in coaches"
                  :key="c.id"
                  class="relative group text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  :class="selectedCoachId === c.id
                    ? 'border-primary-400 shadow-lg shadow-primary-400/10'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-md'"
                  @click="selectedCoachId = c.id"
                >
                  <!-- Check badge -->
                  <div
                    class="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
                    :class="selectedCoachId === c.id ? 'bg-primary-400' : 'bg-white border-2 border-gray-200'"
                  >
                    <svg v-if="selectedCoachId === c.id" class="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>

                  <!-- Avatar area -->
                  <div
                    class="h-32 flex items-center justify-center transition-colors"
                    :class="selectedCoachId === c.id ? 'bg-black' : 'bg-gray-50 group-hover:bg-gray-100'"
                  >
                    <div
                      class="w-20 h-20 rounded-full overflow-hidden border-4 transition-all"
                      :class="selectedCoachId === c.id ? 'border-primary-400' : 'border-white shadow-sm'"
                    >
                      <img v-if="c.avatarUrl" :src="c.avatarUrl" :alt="c.name" class="w-full h-full object-cover" />
                      <div
                        v-else
                        class="w-full h-full flex items-center justify-center text-2xl font-extrabold transition-colors"
                        :class="selectedCoachId === c.id ? 'bg-gray-800 text-primary-400' : 'bg-gray-200 text-gray-500'"
                      >
                        {{ c.name?.[0]?.toUpperCase() }}
                      </div>
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="px-4 py-3 bg-white">
                    <p class="font-bold text-gray-900 text-sm truncate pr-4">{{ c.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 mb-2.5 truncate">{{ c.email }}</p>
                    <span
                      class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors"
                      :class="selectedCoachId === c.id ? 'bg-primary-400/10 text-primary-700' : 'bg-gray-100 text-gray-500'"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Coach certifié
                    </span>
                  </div>
                </button>
              </div>

              <p v-if="requestError" class="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ requestError }}
              </p>

              <!-- CTA bar -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <p class="text-sm">
                  <template v-if="selectedCoachId">
                    <span class="text-gray-500">Coach sélectionné : </span>
                    <span class="font-semibold text-gray-900">{{ coaches.find(c => c.id === selectedCoachId)?.name }}</span>
                  </template>
                  <span v-else class="text-gray-400">Cliquez sur un coach pour le sélectionner</span>
                </p>
                <button
                  class="btn-primary flex items-center gap-2 shrink-0"
                  :disabled="!selectedCoachId || requesting"
                  @click="requestCoach"
                >
                  <svg v-if="!requesting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {{ requesting ? 'Envoi…' : 'Demander ce coach' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

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
          <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
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

  interface Coach {
    id: string
    name: string
    email: string
    avatarUrl?: string | null
  }

  interface Assignment {
    id: string
    coachId: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    requestedBy: string | null
    assignedAt: string
    respondedAt: string | null
    coach: Coach
  }

  const { data: assignData, pending: loadingAssignment, refresh: refreshAssignment } =
    await useLazyFetch<{ assignment: Assignment | null }>('/api/me/assignment', {
      headers,
      default: () => ({ assignment: null }),
    })
  const assignment = computed(() => assignData.value?.assignment ?? null)

  const { data: coachData, pending: loadingCoaches } =
    await useLazyFetch<{ coaches: Coach[] }>('/api/coaches', {
      headers,
      default: () => ({ coaches: [] }),
    })
  const coaches = computed(() => coachData.value?.coaches ?? [])

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

  // Accept / Refuse applies ONLY to admin-initiated proposals (requestedBy !== 'client')
  const responding = ref<'ACCEPT' | 'REFUSE' | null>(null)

  async function respond(action: 'ACCEPT' | 'REFUSE') {
    responding.value = action
    try {
      await $fetch('/api/me/assignment', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { action },
      })
      showToast(action === 'ACCEPT' ? 'Coach accepté !' : 'Proposition refusée.', 'success')
      await refreshAssignment()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      showToast(err?.data?.message ?? 'Erreur lors de la réponse.', 'error')
    } finally {
      responding.value = null
    }
  }

  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 4000)
  }
</script>
