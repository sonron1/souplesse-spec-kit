<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { register } = useAuth()

const form = reactive({ name: '', email: '', password: '' })
const loading = ref(false)
const error = ref<string | null>(null)
// After successful registration, store the email and show confirmation screen
const pendingEmail = ref<string | null>(null)
const resending = ref(false)
const resendMsg = ref('')

async function handleRegister() {
  error.value = null
  loading.value = true
  try {
    const { email } = await register(form.name, form.email, form.password)
    pendingEmail.value = email
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusMessage?: string }
    error.value = err?.data?.message ?? err?.statusMessage ?? "Erreur lors de l'inscription"
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

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
        {{ error }}
      </div>

      <form class="space-y-4" @submit.prevent="handleRegister">
        <div>
          <label class="label" for="name">Nom complet</label>
          <input
            id="name" v-model="form.name" type="text" autocomplete="name"
            required minlength="2" placeholder="Votre prénom et nom" class="input"
          />
        </div>
        <div>
          <label class="label" for="email">Adresse email</label>
          <input
            id="email" v-model="form.email" type="email" autocomplete="email"
            required placeholder="vous@exemple.com" class="input"
          />
        </div>
        <div>
          <label class="label" for="password">Mot de passe</label>
          <input
            id="password" v-model="form.password" type="password" autocomplete="new-password"
            required placeholder="••••••••" class="input"
          />
          <p class="text-xs text-gray-400 mt-1">Minimum 8 caractères, 1 majuscule, 1 chiffre</p>
        </div>
        <button type="submit" :disabled="loading" class="btn-primary w-full mt-2">
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
        <!-- Icon -->
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

        <!-- Resend -->
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
