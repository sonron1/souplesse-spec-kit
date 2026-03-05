<template>
  <div class="max-w-3xl">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Paramètres du club</h1>
          <p class="text-sm text-gray-400 mt-0.5">Informations, horaires et coordonnées</p>
        </div>
      </div>
      <button
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
        :class="saving
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-black text-primary-400 hover:bg-gray-900 shadow-sm hover:shadow-md'"
        :disabled="saving"
        @click="save"
      >
        <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ saving ? 'Enregistrement…' : 'Enregistrer les modifications' }}
      </button>
    </div>

    <SkeletonLoader v-if="pending" :count="3" :height="80" />

    <div v-else class="space-y-6" style="color-scheme: light;">

      <!-- ── Gym identity ─────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <!-- Section header -->
        <div class="h-1 bg-primary-400" />
        <div class="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-primary-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-bold text-gray-900">Identité du club</h2>
            <p class="text-xs text-gray-400 mt-0.5">Nom, slogan, contacts</p>
          </div>
        </div>
        <div class="px-6 py-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nom du club</label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                </div>
                <input v-model="form.gym.name" type="text" class="input pl-9" style="color-scheme:light" placeholder="Souplesse Fitness" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Slogan</label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                </div>
                <input v-model="form.gym.slogan" type="text" class="input pl-9" style="color-scheme:light" placeholder="Stabilité – Progrès – Réussite" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Email de contact</label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <input v-model="form.gym.email" type="email" class="input pl-9" style="color-scheme:light" placeholder="contact@souplesse.com" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                </div>
                <input v-model="form.gym.phone" type="tel" class="input pl-9" style="color-scheme:light" placeholder="+229 96 77 35 09" />
              </div>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
              <div class="relative">
                <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <input v-model="form.gym.address" type="text" class="input pl-9" style="color-scheme:light" placeholder="Cotonou, Bénin" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Opening hours ────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="h-1 bg-amber-400" />
        <div class="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-bold text-gray-900">Horaires d'ouverture</h2>
            <p class="text-xs text-gray-400 mt-0.5">Plages horaires par période</p>
          </div>
        </div>
        <div class="px-6 py-5 space-y-3">
          <div
            v-for="group in hourGroups"
            :key="group.key"
            class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-4 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
              <span class="text-sm font-semibold text-gray-800">{{ group.label }}</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                <svg class="w-3 h-3 inline mr-1 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                Ouverture
              </label>
              <input v-model="form.hours[group.key].open" type="time" class="input" style="color-scheme:light" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                <svg class="w-3 h-3 inline mr-1 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                Fermeture
              </label>
              <input v-model="form.hours[group.key].close" type="time" class="input" style="color-scheme:light" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Save error ──────────────────────────────────────── -->
      <Transition name="fade">
        <div v-if="saveError" class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p class="text-sm font-medium text-red-700">{{ saveError }}</p>
        </div>
      </Transition>

      <!-- ── Save CTA footer ─────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <p class="text-sm text-gray-400">Les modifications s'appliquent immédiatement sur la plateforme.</p>
        <button
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0"
          :class="saving
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-black text-primary-400 hover:bg-gray-900 shadow-sm'"
          :disabled="saving"
          @click="save"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <!-- ── Success toast ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="saved"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-black text-primary-400 px-5 py-3 rounded-xl shadow-xl text-sm font-bold"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          Paramètres enregistrés avec succès
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(10px); }
</style>

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
