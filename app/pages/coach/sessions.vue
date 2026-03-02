<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mes séances</h1>
      <button class="btn-primary" @click="showModal = true">+ Créer une séance</button>
    </div>

    <SkeletonLoader v-if="pending" :count="4" :height="72" />

    <div v-else-if="error" class="card text-red-600">
      Erreur lors du chargement des séances.
    </div>

    <div v-else-if="!sessions?.length" class="card text-center py-12 text-gray-500">
      <p class="text-lg font-medium mb-2">Aucune séance planifiée</p>
      <p class="text-sm mb-4">Créez votre première séance pour vos clients.</p>
      <button class="btn-primary" @click="showModal = true">+ Créer une séance</button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div>
          <p class="font-semibold text-gray-900">{{ formatDateTime(session.dateTime) }}</p>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ session.duration }} min
            · Capacité : {{ session.capacity }} places
            <span v-if="session.location"> · {{ session.location }}</span>
          </p>
        </div>
        <span class="badge-gold self-start sm:self-auto">Planifiée</span>
      </div>
    </div>

    <!-- Create session modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
    >
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 class="text-lg font-bold mb-5">Nouvelle séance</h2>
        <div class="space-y-4">
          <div>
            <label class="label">Date et heure</label>
            <input v-model="form.dateTime" type="datetime-local" class="input" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Durée (min)</label>
              <input v-model.number="form.duration" type="number" min="15" max="240" step="15" class="input" placeholder="60" />
            </div>
            <div>
              <label class="label">Capacité</label>
              <input v-model.number="form.capacity" type="number" min="1" max="200" class="input" placeholder="10" />
            </div>
          </div>
          <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button class="btn-secondary" @click="closeModal">Annuler</button>
          <button class="btn-primary" :disabled="saving" @click="submitCreate">
            {{ saving ? 'Création…' : 'Créer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isCoach, accessToken } = useAuth()
  if (!isCoach.value) await navigateTo('/dashboard')

  interface Session {
    id: string
    dateTime: string
    duration: number
    capacity: number
    location?: string | null
  }

  interface SessionsResponse {
    success: boolean
    sessions: Session[]
  }

  const { data, pending, error, refresh } = await useLazyFetch<SessionsResponse>('/api/sessions', {
    default: () => ({ success: true, sessions: [] }),
  })

  const sessions = computed(() => data.value?.sessions ?? [])

  // Modal state
  const showModal = ref(false)
  const form = reactive({ dateTime: '', duration: 60, capacity: 10 })
  const formError = ref('')
  const saving = ref(false)

  function closeModal() {
    showModal.value = false
    formError.value = ''
  }

  async function submitCreate() {
    formError.value = ''
    if (!form.dateTime) {
      formError.value = 'Veuillez sélectionner une date et heure.'
      return
    }
    saving.value = true
    try {
      await $fetch('/api/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: {
          dateTime: new Date(form.dateTime).toISOString(),
          duration: form.duration,
          capacity: form.capacity,
        },
      })
      closeModal()
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      formError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
    } finally {
      saving.value = false
    }
  }

  function formatDateTime(dt: string) {
    return new Date(dt).toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>
