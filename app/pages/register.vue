<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { register } = useAuth()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '' as 'MALE' | 'FEMALE' | '',
  password: '',
  confirmPassword: '',
})

const touched = reactive<Record<string, boolean>>({})
const loading = ref(false)
const apiError = ref<string | null>(null)
const pendingEmail = ref<string | null>(null)
const resending = ref(false)
const resendMsg = ref('')

// ── Real-time validation ──────────────────────────────────────────────────────
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (touched.firstName && form.firstName.length < 2) e.firstName = 'Le prénom doit comporter au moins 2 caractères'
  if (touched.lastName && form.lastName.length < 2) e.lastName = 'Le nom doit comporter au moins 2 caractères'
  if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Adresse email invalide'
  if (touched.phone && !/^[+\d\s\-().]{8,20}$/.test(form.phone)) e.phone = 'Numéro de téléphone invalide (8–20 caractères)'
  if (touched.gender && !form.gender) e.gender = 'Le sexe est requis'
  if (touched.password) {
    if (form.password.length < 8) e.password = 'Minimum 8 caractères'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Au moins une majuscule requise'
    else if (!/[0-9]/.test(form.password)) e.password = 'Au moins un chiffre requis'
    else if (!/[^A-Za-z0-9]/.test(form.password)) e.password = 'Au moins un caractère spécial requis'
  }
  if (touched.confirmPassword && form.confirmPassword !== form.password) {
    e.confirmPassword = 'Les mots de passe ne correspondent pas'
  }
  return e
})

// ── Password strength ─────────────────────────────────────────────────────────
const passwordStrength = computed(() => {
  const p = form.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score // 0–4
})

const strengthLabel = computed(() => {
  const labels = ['', 'Très faible', 'Faible', 'Moyen', 'Fort']
  return labels[passwordStrength.value]
})

const strengthColor = computed(() => {
  const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
  return colors[passwordStrength.value]
})

const isFormValid = computed(() => {
  return (
    form.firstName.length >= 2 &&
    form.lastName.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    /^[+\d\s\-().]{8,20}$/.test(form.phone) &&
    form.gender !== '' &&
    passwordStrength.value === 4 &&
    form.confirmPassword === form.password
  )
})

function touch(field: string) {
  touched[field] = true
}

async function handleRegister() {
  // Touch all fields to trigger validation display
  for (const key of ['firstName', 'lastName', 'email', 'phone', 'gender', 'password', 'confirmPassword']) {
    touched[key] = true
  }
  if (!isFormValid.value) return

  apiError.value = null
  loading.value = true
  try {
    const { email } = await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      gender: form.gender as 'MALE' | 'FEMALE',
      password: form.password,
      confirmPassword: form.confirmPassword,
    })
    pendingEmail.value = email
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; data?: { code?: string } }; statusMessage?: string }
    const code = err?.data?.data?.code
    if (code === 'email_taken') {
      apiError.value = 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.'
    } else if (code === 'phone_taken') {
      apiError.value = 'Ce numéro de téléphone est déjà associé à un compte.'
    } else {
      apiError.value = err?.data?.message ?? err?.statusMessage ?? "Erreur lors de l'inscription"
    }
  } finally {
    loading.value = false
  }
}

async function handleResend() {
  if (!pendingEmail.value || resending.value) return
  resending.value = true
  resendMsg.value = ''
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: pendingEmail.value },
    })
    resendMsg.value = 'Un nouveau lien a été envoyé. Vérifiez votre boîte mail.'
  } catch {
    resendMsg.value = 'Une erreur est survenue. Réessayez dans quelques secondes.'
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div>
    <!-- ── Registration form ── -->
    <template v-if="!pendingEmail">
      <h2 class="text-xl font-bold text-gray-900 mb-1">Créer un compte</h2>
      <p class="text-sm text-gray-500 mb-6">Rejoignez Souplesse Fitness dès aujourd'hui.</p>

      <div v-if="apiError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
        {{ apiError }}
      </div>

      <form class="space-y-4" @submit.prevent="handleRegister">
        <!-- Prénom + Nom -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="firstName">Prénom <span class="text-red-500">*</span></label>
            <input
              id="firstName" v-model="form.firstName" type="text" autocomplete="given-name"
              class="input" :class="{ 'border-red-400': errors.firstName }"
              placeholder="Prénom" @blur="touch('firstName')"
            />
            <p v-if="errors.firstName" class="text-xs text-red-500 mt-1">{{ errors.firstName }}</p>
          </div>
          <div>
            <label class="label" for="lastName">Nom <span class="text-red-500">*</span></label>
            <input
              id="lastName" v-model="form.lastName" type="text" autocomplete="family-name"
              class="input" :class="{ 'border-red-400': errors.lastName }"
              placeholder="Nom de famille" @blur="touch('lastName')"
            />
            <p v-if="errors.lastName" class="text-xs text-red-500 mt-1">{{ errors.lastName }}</p>
          </div>
        </div>

        <!-- Email -->
        <div>
          <label class="label" for="email">Adresse email <span class="text-red-500">*</span></label>
          <input
            id="email" v-model="form.email" type="email" autocomplete="email"
            class="input" :class="{ 'border-red-400': errors.email }"
            placeholder="vous@exemple.com" @blur="touch('email')"
          />
          <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email }}</p>
        </div>

        <!-- Téléphone -->
        <div>
          <label class="label" for="phone">Téléphone <span class="text-red-500">*</span></label>
          <input
            id="phone" v-model="form.phone" type="tel" autocomplete="tel"
            class="input" :class="{ 'border-red-400': errors.phone }"
            placeholder="+229 96 00 00 00" @blur="touch('phone')"
          />
          <p v-if="errors.phone" class="text-xs text-red-500 mt-1">{{ errors.phone }}</p>
        </div>

        <!-- Sexe -->
        <div>
          <label class="label">Sexe <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="form.gender === 'MALE'
                ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            >
              <input v-model="form.gender" type="radio" value="MALE" class="sr-only" @change="touch('gender')" />
              <span>♂</span> Homme
            </label>
            <label
              class="flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="form.gender === 'FEMALE'
                ? 'border-pink-400 bg-pink-50 text-pink-700 font-semibold'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            >
              <input v-model="form.gender" type="radio" value="FEMALE" class="sr-only" @change="touch('gender')" />
              <span>♀</span> Femme
            </label>
          </div>
          <p v-if="errors.gender" class="text-xs text-red-500 mt-1">{{ errors.gender }}</p>
        </div>

        <!-- Mot de passe -->
        <div>
          <label class="label" for="password">Mot de passe <span class="text-red-500">*</span></label>
          <input
            id="password" v-model="form.password" type="password" autocomplete="new-password"
            class="input" :class="{ 'border-red-400': errors.password }"
            placeholder="••••••••" @blur="touch('password')" @input="touch('password')"
          />
          <p v-if="errors.password" class="text-xs text-red-500 mt-1">{{ errors.password }}</p>
          <!-- Indicateur de force mot de passe -->
          <div v-if="form.password" class="mt-3 space-y-2">
            <!-- Barre de force -->
            <div class="flex gap-1.5 h-2">
              <div
                v-for="i in 4" :key="i"
                class="flex-1 rounded-full transition-all duration-300"
                :class="i <= passwordStrength ? strengthColor : 'bg-gray-100'"
              />
            </div>
            <!-- Label -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold" :class="{
                'text-red-500': passwordStrength <= 1,
                'text-orange-500': passwordStrength === 2,
                'text-yellow-600': passwordStrength === 3,
                'text-green-600': passwordStrength === 4,
              }">{{ strengthLabel || 'Trop faible' }}</span>
              <span class="text-xs text-gray-400">{{ passwordStrength }}/4 critères</span>
            </div>
            <!-- Critères visuels -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0 transition-colors" :class="form.password.length >= 8 ? 'text-green-500' : 'text-gray-300'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span class="text-[11px]" :class="form.password.length >= 8 ? 'text-gray-700' : 'text-gray-400'">8 caractères min.</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0 transition-colors" :class="/[A-Z]/.test(form.password) ? 'text-green-500' : 'text-gray-300'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span class="text-[11px]" :class="/[A-Z]/.test(form.password) ? 'text-gray-700' : 'text-gray-400'">Majuscule (A–Z)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0 transition-colors" :class="/[0-9]/.test(form.password) ? 'text-green-500' : 'text-gray-300'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span class="text-[11px]" :class="/[0-9]/.test(form.password) ? 'text-gray-700' : 'text-gray-400'">Chiffre (0–9)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0 transition-colors" :class="/[^A-Za-z0-9]/.test(form.password) ? 'text-green-500' : 'text-gray-300'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span class="text-[11px]" :class="/[^A-Za-z0-9]/.test(form.password) ? 'text-gray-700' : 'text-gray-400'">Caractère spécial</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Confirmation mot de passe -->
        <div>
          <label class="label" for="confirmPassword">Confirmer le mot de passe <span class="text-red-500">*</span></label>
          <input
            id="confirmPassword" v-model="form.confirmPassword" type="password" autocomplete="new-password"
            class="input" :class="{ 'border-red-400': errors.confirmPassword }"
            placeholder="••••••••" @blur="touch('confirmPassword')" @input="touch('confirmPassword')"
          />
          <p v-if="errors.confirmPassword" class="text-xs text-red-500 mt-1">{{ errors.confirmPassword }}</p>
          <p v-else-if="form.confirmPassword && form.confirmPassword === form.password" class="text-xs text-green-600 mt-1">
            ✓ Les mots de passe correspondent
          </p>
        </div>

        <button
          type="submit" :disabled="loading"
          class="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Inscription en cours…</span>
          <span v-else>Créer mon compte</span>
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-gray-500">
        Déjà un compte&nbsp;?
        <NuxtLink to="/login" class="text-primary-600 font-semibold hover:underline">Se connecter</NuxtLink>
      </p>
      <p class="mt-2 text-center text-xs text-gray-400">
        <NuxtLink to="/" class="hover:text-gray-600 transition-colors">← Retour à l'accueil</NuxtLink>
      </p>
    </template>

    <!-- ── Check-your-email confirmation ── -->
    <template v-else>
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-5 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>

        <h2 class="text-xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h2>
        <p class="text-sm text-gray-500 mb-1">Un email de confirmation a été envoyé à&nbsp;:</p>
        <p class="font-semibold text-gray-900 mb-5 break-all">{{ pendingEmail }}</p>

        <div class="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left text-sm text-gray-600 mb-6 space-y-2">
          <p>1. Ouvrez l'email intitulé <strong>"Vérifiez votre adresse email"</strong>.</p>
          <p>2. Cliquez sur le bouton <strong>"Vérifier mon email"</strong>.</p>
          <p>3. Vous serez redirigé vers la page de connexion.</p>
        </div>

        <p v-if="resendMsg" class="text-sm mb-3" :class="resendMsg.includes('erreur') ? 'text-red-600' : 'text-green-600'">
          {{ resendMsg }}
        </p>
        <button
          :disabled="resending"
          class="text-sm font-medium text-primary-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleResend"
        >
          {{ resending ? 'Envoi en cours…' : 'Renvoyer le lien de vérification' }}
        </button>

        <div class="mt-6 pt-5 border-t border-gray-100">
          <NuxtLink to="/login" class="btn-primary w-full inline-block text-center">
            Aller à la connexion
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
