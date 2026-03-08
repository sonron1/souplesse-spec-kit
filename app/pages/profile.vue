<template>
  <div>

    <!-- ── Page header ─────────────────────────────────────── -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mon profil</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gérez vos informations personnelles</p>
      </div>
    </div>

    <!-- ── Save feedback banner ────────────────────────────── -->
    <Transition name="fade-up">
      <div v-if="saved" class="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
        <svg class="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <p class="text-sm font-semibold text-green-800">Profil mis à jour avec succès</p>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── LEFT — Avatar + identity card ─────────────────── -->
      <div class="lg:col-span-1 space-y-5">

        <!-- Avatar card -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">

          <!-- Avatar preview -->
          <div class="relative group">
            <div
              v-if="form.avatarUrl"
              class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-400/30"
            >
              <img :src="form.avatarUrl" alt="avatar" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold ring-4"
              :class="isAdmin ? 'bg-yellow-400 text-black ring-yellow-400/30' : isCoach ? 'bg-blue-400 text-black ring-blue-400/30' : 'bg-primary-400 text-black ring-primary-400/30'"
            >
              {{ initials }}
            </div>
            <!-- Overlay button -->
            <label
              class="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              :title="'Changer l\'avatar'"
            >
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <input type="file" accept="image/*" class="sr-only" @change="onAvatarChange" />
            </label>
          </div>

          <div class="text-center">
            <p class="font-bold text-gray-900 text-lg">{{ fullName || user?.name }}</p>
            <span
              class="inline-block mt-1 text-xs font-bold px-3 py-0.5 rounded-full"
              :class="isAdmin ? 'bg-yellow-100 text-yellow-800' : isCoach ? 'bg-blue-100 text-blue-800' : 'bg-primary-100 text-primary-800'"
            >
              {{ roleLabel }}
            </span>
          </div>

          <p v-if="avatarUploading" class="text-xs text-gray-400 animate-pulse mt-1">Envoi…</p>
        </div>

        <!-- Role-specific summary card ─────────────────────── -->

        <!-- CLIENT: subscription summary -->
        <div v-if="isClient" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mon abonnement</p>
          <div v-if="clientStats.activeSub" class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">{{ clientStats.activeSub.plan?.name ?? 'Abonnement actif' }}</p>
              <p class="text-xs text-gray-500">Expire {{ formatDate(clientStats.activeSub.endDate) }}</p>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400 italic">Aucun abonnement actif</div>
          <div class="flex gap-3 pt-1">
            <div class="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ clientStats.bookingCount }}</p>
              <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Réservations</p>
            </div>
            <div class="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ clientStats.upcomingCount }}</p>
              <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">À venir</p>
            </div>
          </div>
          <NuxtLink to="/dashboard/subscriptions" class="btn-secondary w-full text-center text-sm mt-1 block">
            Gérer mon abonnement
          </NuxtLink>
        </div>

        <!-- COACH: sessions summary -->
        <div v-if="isCoach && !isAdmin" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Aperçu coach</p>
          <div class="flex gap-3">
            <div class="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ coachStats.sessionCount }}</p>
              <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Séances</p>
            </div>
            <div class="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-center">
              <p class="text-xl font-extrabold text-gray-900">{{ coachStats.clientCount }}</p>
              <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Clients</p>
            </div>
          </div>
          <NuxtLink to="/coach/sessions" class="btn-secondary w-full text-center text-sm mt-1 block">
            Mes séances
          </NuxtLink>
        </div>

        <!-- ADMIN: quick links -->
        <div v-if="isAdmin" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Administration</p>
          <div class="space-y-1">
            <NuxtLink to="/admin" class="drawer-link text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Tableau de bord admin
            </NuxtLink>
            <NuxtLink to="/admin/users" class="drawer-link text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Utilisateurs
            </NuxtLink>
            <NuxtLink to="/admin/analytics" class="drawer-link text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Analytique
            </NuxtLink>
          </div>
        </div>

      </div>

      <!-- ── RIGHT — Edit form ──────────────────────────────── -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

          <h2 class="text-base font-bold text-gray-900 mb-6">Informations personnelles</h2>

          <form class="space-y-5" @submit.prevent="saveProfile">

            <!-- First + Last name -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Prénom</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-400': errors.firstName }"
                  placeholder="Votre prénom"
                  autocomplete="given-name"
                />
                <p v-if="errors.firstName" class="form-error">{{ errors.firstName }}</p>
              </div>
              <div>
                <label class="form-label">Nom</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-400': errors.lastName }"
                  placeholder="Votre nom"
                  autocomplete="family-name"
                />
                <p v-if="errors.lastName" class="form-error">{{ errors.lastName }}</p>
              </div>
            </div>

            <!-- Email (read-only) -->
            <div>
              <label class="form-label">Adresse e-mail</label>
              <div class="relative">
                <input
                  :value="profile?.email ?? ''"
                  type="email"
                  class="form-input bg-gray-50 text-gray-500 cursor-not-allowed pr-10"
                  disabled
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1">L'e-mail ne peut pas être modifié.</p>
            </div>

            <!-- Phone -->
            <div>
              <label class="form-label">Téléphone</label>
              <input
                v-model="form.phone"
                type="tel"
                class="form-input"
                :class="{ 'border-red-400': errors.phone }"
                placeholder="+229 00 00 00 00"
                autocomplete="tel"
              />
              <p v-if="errors.phone" class="form-error">{{ errors.phone }}</p>
            </div>

            <!-- Gender -->
            <div>
              <label class="form-label">Genre</label>
              <div class="flex gap-3">
                <label
                  class="flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors"
                  :class="form.gender === 'MALE' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input v-model="form.gender" type="radio" value="MALE" class="sr-only" />
                  <span class="text-xl">👨</span>
                  <span class="text-sm font-semibold text-gray-700">Homme</span>
                </label>
                <label
                  class="flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors"
                  :class="form.gender === 'FEMALE' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input v-model="form.gender" type="radio" value="FEMALE" class="sr-only" />
                  <span class="text-xl">👩</span>
                  <span class="text-sm font-semibold text-gray-700">Femme</span>
                </label>
              </div>
            </div>

            <!-- Birthday (day + month) -->
            <div>
              <label class="form-label">Date de naissance <span class="text-gray-400 font-normal">(optionnel)</span></label>
              <div class="flex gap-3">
                <div class="flex-1">
                  <select v-model="form.birthDay" class="form-input">
                    <option :value="null">Jour</option>
                    <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
                  </select>
                </div>
                <div class="flex-1">
                  <select v-model="form.birthMonth" class="form-input">
                    <option :value="null">Mois</option>
                    <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Error banner -->
            <p v-if="apiError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {{ apiError }}
            </p>

            <!-- Save button -->
            <div class="flex justify-end pt-2">
              <button
                type="submit"
                class="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
                :disabled="saving"
              >
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user, isAdmin, isCoach, isClient, accessToken } = useAuth()

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ── State ──────────────────────────────────────────────────
const saving = ref(false)
const saved = ref(false)
const apiError = ref('')
const avatarUploading = ref(false)

// ── Profile data (fetch from /api/auth/me) ─────────────────
const { data: profile, refresh: refreshProfile } = await useAsyncData('profile', () =>
  $fetch<{
    id: string; name: string; firstName: string | null; lastName: string | null
    email: string; phone: string | null; gender: string | null
    birthDay: number | null; birthMonth: number | null; avatarUrl: string | null
    role: string
  }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken.value}` },
  })
)

// Form state — initialised from profile
const form = reactive({
  firstName: profile.value?.firstName ?? '',
  lastName: profile.value?.lastName ?? '',
  phone: profile.value?.phone ?? '',
  gender: profile.value?.gender ?? '' as string,
  birthDay: profile.value?.birthDay ?? null as number | null,
  birthMonth: profile.value?.birthMonth ?? null as number | null,
  avatarUrl: profile.value?.avatarUrl ?? null as string | null,
})

// Sync when profile loads (SSR / re-fetch)
watch(profile, (p) => {
  if (!p) return
  form.firstName = p.firstName ?? ''
  form.lastName = p.lastName ?? ''
  form.phone = p.phone ?? ''
  form.gender = p.gender ?? ''
  form.birthDay = p.birthDay ?? null
  form.birthMonth = p.birthMonth ?? null
  form.avatarUrl = p.avatarUrl ?? null
})

// ── Computed ───────────────────────────────────────────────
const fullName = computed(() => [form.firstName, form.lastName].filter(Boolean).join(' '))
const initials = computed(() => {
  const f = (form.firstName || user.value?.name || '?')[0]?.toUpperCase() ?? '?'
  const l = (form.lastName || '')[0]?.toUpperCase() ?? ''
  return l ? f + l : f
})
const roleLabel = computed(() => {
  if (isAdmin.value) return 'Admin'
  if (isCoach.value) return 'Coach'
  return 'Client'
})

// Form validation
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.firstName.trim() || form.firstName.trim().length < 2) e.firstName = 'Minimum 2 caractères'
  if (!form.lastName.trim() || form.lastName.trim().length < 2) e.lastName = 'Minimum 2 caractères'
  if (form.phone && !/^[+\d\s\-(). ]{8,}$/.test(form.phone)) e.phone = 'Numéro invalide'
  return e
})

const isFormValid = computed(() => Object.keys(errors.value).length === 0)

// ── Role-specific stats ────────────────────────────────────
const clientStats = reactive({
  activeSub: null as { plan: { name: string } | null; endDate: string } | null,
  bookingCount: 0,
  upcomingCount: 0,
})

const coachStats = reactive({ sessionCount: 0, clientCount: 0 })

if (isClient.value) {
  try {
    const [subData, bkData] = await Promise.all([
      $fetch<{ subscriptions: { status: string; plan: { name: string } | null; endDate: string }[] }>('/api/subscriptions', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      }),
      $fetch<Array<{ status: string; session: { dateTime: string } }>>('/api/bookings', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      }),
    ])
    clientStats.activeSub = subData.subscriptions.find(s => s.status === 'ACTIVE') ?? null
    clientStats.bookingCount = bkData.length
    clientStats.upcomingCount = bkData.filter(
      b => b.status === 'CONFIRMED' && new Date(b.session.dateTime) > new Date()
    ).length
  } catch { /* no stats */ }
}

if (isCoach.value && !isAdmin.value) {
  try {
    const sData = await $fetch<{ sessions: unknown[]; total?: number }>('/api/coach/sessions', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    coachStats.sessionCount = sData.total ?? sData.sessions?.length ?? 0
    const aData = await $fetch<{ assignments: unknown[] }>('/api/coach/assignments', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    }).catch(() => ({ assignments: [] }))
    coachStats.clientCount = aData.assignments.length
  } catch { /* no stats */ }
}

// ── Actions ────────────────────────────────────────────────
async function saveProfile() {
  if (!isFormValid.value) return
  saving.value = true
  apiError.value = ''
  try {
    await $fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        birthDay: form.birthDay ?? undefined,
        birthMonth: form.birthMonth ?? undefined,
      },
    })
    await refreshProfile()
    saved.value = true
    setTimeout(() => { saved.value = false }, 4000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    apiError.value = e?.data?.message ?? e?.statusMessage ?? 'Une erreur est survenue'
  } finally {
    saving.value = false
  }
}

async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    apiError.value = 'Image trop volumineuse (max 2 Mo)'
    return
  }
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await $fetch<{ avatarUrl: string }>('/api/auth/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: formData,
    })
    form.avatarUrl = res.avatarUrl
    saved.value = true
    setTimeout(() => { saved.value = false }, 4000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    apiError.value = e?.data?.message ?? 'Erreur lors de l\'envoi de l\'image'
  } finally {
    avatarUploading.value = false
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
