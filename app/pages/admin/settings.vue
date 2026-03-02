<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Paramètres du club</h1>
        <p class="text-sm text-gray-500 mt-0.5">Informations, horaires et coordonnées</p>
      </div>
      <button class="btn-primary" :disabled="saving" @click="save">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </div>

    <SkeletonLoader v-if="pending" :count="3" :height="80" />

    <div v-else class="space-y-6">
      <!-- Gym identity -->
      <div class="card">
        <h2 class="text-base font-bold text-gray-900 mb-5">Identité du club</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Nom du club</label>
            <input v-model="form.gym.name" type="text" class="input" />
          </div>
          <div>
            <label class="label">Slogan</label>
            <input v-model="form.gym.slogan" type="text" class="input" placeholder="Stabilité – Progrès – Réussite" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="form.gym.email" type="email" class="input" />
          </div>
          <div>
            <label class="label">Téléphone</label>
            <input v-model="form.gym.phone" type="tel" class="input" placeholder="+229 96 77 35 09" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">Adresse</label>
            <input v-model="form.gym.address" type="text" class="input" />
          </div>
        </div>
      </div>

      <!-- Opening hours -->
      <div class="card">
        <h2 class="text-base font-bold text-gray-900 mb-5">Horaires d'ouverture</h2>
        <div class="space-y-4">
          <div
            v-for="group in hourGroups"
            :key="group.key"
            class="grid grid-cols-3 gap-4 items-center"
          >
            <label class="text-sm font-medium text-gray-700">{{ group.label }}</label>
            <div>
              <label class="label text-xs">Ouverture</label>
              <input v-model="form.hours[group.key].open" type="time" class="input" />
            </div>
            <div>
              <label class="label text-xs">Fermeture</label>
              <input v-model="form.hours[group.key].close" type="time" class="input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Save error -->
      <div v-if="saveError" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        {{ saveError }}
      </div>

      <!-- Success toast -->
      <Teleport to="body">
        <div
          v-if="saved"
          class="fixed bottom-6 right-6 z-50 bg-primary-500 text-black px-5 py-3 rounded-xl shadow-lg text-sm font-bold"
        >
          ✓ Paramètres enregistrés
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })
  const { accessToken } = useAuth()

  interface GymSettings {
    name: string; slogan: string | null; email: string | null
    phone: string | null; address: string | null; currency: string
  }
  interface HourEntry { open: string; close: string }
  interface BusinessHour { dayOfWeek: string; openTime: string; closeTime: string }
  interface SettingsResponse {
    gym: GymSettings | null
    hours: BusinessHour[]
  }

  const saving = ref(false)
  const saved = ref(false)
  const saveError = ref('')

  const form = reactive({
    gym: { name: '', slogan: '', email: '', phone: '', address: '', currency: 'XOF' },
    hours: {
      mondayToFriday: { open: '07:00', close: '22:00' } as HourEntry,
      saturday:       { open: '07:00', close: '20:00' } as HourEntry,
      sundayAndHolidays: { open: '08:00', close: '18:00' } as HourEntry,
    },
  })

  const hourGroups = [
    { key: 'mondayToFriday' as const, label: 'Lundi – Vendredi' },
    { key: 'saturday' as const, label: 'Samedi' },
    { key: 'sundayAndHolidays' as const, label: 'Dimanche & Jours fériés' },
  ]

  const dayToGroup: Record<string, keyof typeof form.hours> = {
    MONDAY: 'mondayToFriday', TUESDAY: 'mondayToFriday', WEDNESDAY: 'mondayToFriday',
    THURSDAY: 'mondayToFriday', FRIDAY: 'mondayToFriday',
    SATURDAY: 'saturday',
    SUNDAY: 'sundayAndHolidays',
  }

  const { data, pending } = await useLazyFetch<SettingsResponse>('/api/admin/settings', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
  })

  watch(data, (v) => {
    if (!v) return
    if (v.gym) {
      form.gym.name = v.gym.name ?? ''
      form.gym.slogan = v.gym.slogan ?? ''
      form.gym.email = v.gym.email ?? ''
      form.gym.phone = v.gym.phone ?? ''
      form.gym.address = v.gym.address ?? ''
      form.gym.currency = v.gym.currency ?? 'XOF'
    }
    if (v.hours?.length) {
      for (const h of v.hours) {
        const gk = dayToGroup[h.dayOfWeek]
        if (gk) {
          form.hours[gk].open = h.openTime.slice(0, 5)
          form.hours[gk].close = h.closeTime.slice(0, 5)
        }
      }
    }
  }, { immediate: true })

  async function save() {
    saving.value = true
    saveError.value = ''
    try {
      await $fetch('/api/admin/settings', {
        method: 'PUT',
        body: { gym: form.gym, openingHours: form.hours },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      saved.value = true
      setTimeout(() => { saved.value = false }, 3000)
    } catch (e) {
      saveError.value = (e as { statusMessage?: string })?.statusMessage ?? 'Erreur lors de la sauvegarde'
    } finally {
      saving.value = false
    }
  }
</script>
