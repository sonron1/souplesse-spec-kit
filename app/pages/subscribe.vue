<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'client-only'] })

interface Plan {
  id: string
  name: string
  planType?: string
  priceSingle: number
  priceCouples?: number | null
  validityDays: number
  maxReports?: number | null
}

const coupleMode = reactive<Record<string, 'single' | 'couple'>>({})
const partnerEmails = reactive<Record<string, string>>({})

function activePrice(plan: Plan): number {
  return coupleMode[plan.id] === 'couple' && plan.priceCouples
    ? plan.priceCouples
    : plan.priceSingle
}

const pending = ref(true)
const plans = ref<Plan[]>([])
const errorMsg = ref('')

const { data, error } = await useFetch<{ plans: Plan[] }>('/api/subscription-plans')
if (error.value) {
  errorMsg.value = 'Impossible de charger les abonnements.'
} else if (data.value) {
  plans.value = data.value.plans ?? []
}
pending.value = false

function formatPrice(xof: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(xof)
}

const planErrors = reactive<Record<string, string>>({})
function clearPlanError(planId: string) { delete planErrors[planId] }

const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.message = msg; toast.type = type
  setTimeout(() => { toast.message = '' }, 4000)
}

async function onPaymentSuccess(_planId: string) {
  showToast('Paiement réussi ! Redirection…', 'success')
  await new Promise(r => setTimeout(r, 1500))
  await navigateTo('/dashboard/subscriptions?payment=success')
}
function onPaymentError(planId: string, msg: string) {
  planErrors[planId] = `Paiement échoué : ${msg}`
  showToast(`Paiement échoué : ${msg}`, 'error')
}

// Group plans by type
const grouped = computed(() => {
  const cats: Record<string, Plan[]> = {}
  for (const p of plans.value) {
    const key = p.planType ?? 'Autre'
    if (!cats[key]) cats[key] = []
    cats[key].push(p)
  }
  return cats
})

const typeLabels: Record<string, string> = {
  SESSION: '🎟️ Séances à l\'unité',
  MONTHLY: '📅 Abonnements',
  COACHING: '🏆 Accompagnement',
}
const typeDesc: Record<string, string> = {
  SESSION: 'Payez à la séance, sans engagement.',
  MONTHLY: 'Formules mensuelles tout inclus.',
  COACHING: 'Suivi personnalisé avec votre coach.',
}
</script>

<template>
  <div class="max-w-4xl mx-auto pb-16">

    <!-- Header -->
    <div class="text-center mb-10">
      <div class="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
        Nos formules
      </div>
      <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Choisissez votre abonnement</h1>
      <p class="text-gray-500 max-w-lg mx-auto text-sm">Paiement sécurisé via Mobile Money (KKiaPay). Aucun engagement caché.</p>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="4" :height="160" />

    <!-- Error -->
    <div v-else-if="errorMsg" class="flex flex-col items-center justify-center py-16">
      <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <p class="text-red-600 font-semibold">{{ errorMsg }}</p>
    </div>

    <!-- No plans -->
    <div v-else-if="!plans.length" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
      </div>
      <p class="text-gray-500 font-medium">Aucune formule disponible pour le moment.</p>
    </div>

    <!-- Plans grouped by type -->
    <template v-else>
      <div v-for="(group, type) in grouped" :key="type" class="mb-10">
        <!-- Group header -->
        <div class="mb-4">
          <h2 class="text-lg font-extrabold text-gray-800">{{ typeLabels[type] ?? type }}</h2>
          <p class="text-sm text-gray-400">{{ typeDesc[type] ?? '' }}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="plan in group"
            :key="plan.id"
            class="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-yellow-200 transition-all flex flex-col overflow-hidden"
          >
            <!-- Top accent bar -->
            <div class="h-1.5 w-full bg-gradient-to-r from-yellow-400 to-yellow-300" />

            <div class="p-5 flex-1 flex flex-col">
              <!-- Name -->
              <h3 class="font-extrabold text-gray-900 text-base mb-1">{{ plan.name }}</h3>
              <p class="text-xs text-gray-400 mb-4">
                Valide <strong class="text-gray-600">{{ plan.validityDays }}j</strong>
                <span v-if="plan.maxReports"> · <strong class="text-gray-600">{{ plan.maxReports }} bilans</strong></span>
              </p>

              <!-- Solo / Couple toggle -->
              <div v-if="plan.priceCouples" class="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  :class="coupleMode[plan.id] !== 'couple' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-500'"
                  class="px-3 py-1 rounded-md text-xs transition-all"
                  @click="coupleMode[plan.id] = 'single'"
                >Solo</button>
                <button
                  :class="coupleMode[plan.id] === 'couple' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-500'"
                  class="px-3 py-1 rounded-md text-xs transition-all"
                  @click="coupleMode[plan.id] = 'couple'"
                >Couple</button>
              </div>

              <!-- Partner email -->
              <div v-if="coupleMode[plan.id] === 'couple'" class="mb-4">
                <label class="block text-xs font-semibold text-gray-600 mb-1">Email du partenaire</label>
                <input
                  v-model="partnerEmails[plan.id]"
                  type="email"
                  class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-yellow-400"
                  placeholder="partenaire@email.com"
                />
              </div>

              <!-- Price -->
              <div class="mt-auto mb-5">
                <p class="text-3xl font-extrabold text-gray-900 leading-none">{{ formatPrice(activePrice(plan)) }}</p>
                <p class="text-xs text-gray-400 mt-1">paiement unique · XOF</p>
              </div>

              <!-- Payment -->
              <p v-if="planErrors[plan.id]" class="text-red-600 text-xs mb-2">{{ planErrors[plan.id] }}</p>
              <PaymentCheckout
                :subscription-plan-id="plan.id"
                :amount="activePrice(plan)"
                :amount-label="formatPrice(activePrice(plan))"
                :partner-email="coupleMode[plan.id] === 'couple' ? partnerEmails[plan.id] : undefined"
                @success="onPaymentSuccess(plan.id)"
                @error="(msg: string) => onPaymentError(plan.id, msg)"
              />
              <button
                v-if="planErrors[plan.id]"
                class="w-full mt-2 text-xs text-gray-500 underline"
                @click="clearPlanError(plan.id)"
              >Réessayer</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Trust strip -->
    <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-8">
      <span class="flex items-center gap-1.5">🔒 Paiement sécurisé KKiaPay</span>
      <span class="flex items-center gap-1.5">📱 Mobile Money accepté</span>
      <span class="flex items-center gap-1.5">✅ Accès immédiat après paiement</span>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toast.message"
          :class="['fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold',
            toast.type === 'success' ? 'bg-black text-yellow-400' : 'bg-red-600 text-white']"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(12px); }
</style>