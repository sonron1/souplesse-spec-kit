<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Programmes entraînement</h1>

    <div v-if="pending" class="text-gray-400">Chargement...</div>

    <div v-else class="space-y-4">
      <div
        v-for="program in programs"
        :key="program.id"
        class="bg-white rounded-lg shadow p-4 flex items-center justify-between"
      >
        <div>
          <p class="font-semibold">Client: {{ program.clientId }}</p>
          <p class="text-sm text-gray-500">Type: {{ program.type }}</p>
        </div>
        <button class="text-primary-600 text-sm hover:underline" @click="editProgram(program.id)">
          Modifier
        </button>
      </div>

      <button class="btn-primary mt-4" @click="showCreateForm = true">+ Nouveau programme</button>
    </div>

    <!-- Simple create form -->
    <div
      v-if="showCreateForm"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 class="text-lg font-semibold mb-4">Nouveau programme</h2>
        <input v-model="newProgram.clientId" placeholder="ID Client" class="input mb-3" />
        <select v-model="newProgram.type" class="input mb-4">
          <option value="GAIN">Prise de masse</option>
          <option value="LOSS">Perte de poids</option>
        </select>
        <div class="flex gap-3 justify-end">
          <button class="btn-secondary" @click="showCreateForm = false">Annuler</button>
          <button class="btn-primary" @click="createProgram">Créer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isCoach, accessToken } = useAuth()
  if (!isCoach.value) await navigateTo('/dashboard')

  interface Program {
    id: string
    clientId: string
    type: string
  }

  const {
    data: programs,
    pending,
    refresh,
  } = await useLazyFetch<Program[]>('/api/programs', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    default: () => [],
  })

  const showCreateForm = ref(false)
  const newProgram = reactive({ clientId: '', type: 'GAIN' })

  function editProgram(_id: string) {
    // TODO: open edit modal
  }

  async function createProgram() {
    await $fetch('/api/programs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: { ...newProgram, content: {} },
    })
    showCreateForm.value = false
    newProgram.clientId = ''
    await refresh()
  }
</script>
