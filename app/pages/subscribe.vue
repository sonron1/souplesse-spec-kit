<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'client-only'] })

interface Plan {
  id: string
  name: string
  planType?: string
  priceSingle: number
  priceCouple?: number | null
  validityDays: number
  maxReports?: number | null
  maxPauses?: number | null
}

const { accessToken, user } = useAuth()

// ── Load plans ──────────────────────────────────────────────────────────────
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

// ── Solo / Couple mode per plan ─────────────────────────────────────────────
const coupleMode = reactive<Record<string, boolean>>({})

// ── Partner modal ────────────────────────────────────────────────────────────
const partnerModal = reactive({
  open: false,
  planId: '',
  planName: '',
  planAmount: 0,
  planSoloAmount: 0,
  firstName: '',
  lastName: '',
  phone: '',
  searching: false,
  found: false,
  partnerName: '',
  partnerGender: null as string | null,
  partnerEmail: '',
  searchError: '',
})

function openPartnerModal(plan: Plan) {
  // L001: Check user has gender set before couple subscription
  if (!user.value?.gender) {
    showToast('Veuillez renseigner votre genre dans votre profil avant de souscrire à une formule couple.', 'error')
    return
  }
  partnerModal.open = true
  partnerModal.planId = plan.id
  partnerModal.planName = plan.name
  partnerModal.planAmount = plan.priceCouple ?? plan.priceSingle
  partnerModal.planSoloAmount = plan.priceSingle
  partnerModal.firstName = ''
  partnerModal.lastName = ''
  partnerModal.phone = ''
  partnerModal.searching = false
  partnerModal.found = false
  partnerModal.partnerName = ''
  partnerModal.partnerGender = null
  partnerModal.partnerEmail = ''
  partnerModal.searchError = ''
}

function closePartnerModal() {
  partnerModal.open = false
}

async function searchPartner() {
  const fn = partnerModal.firstName.trim()
  const ln = partnerModal.lastName.trim()
  const ph = partnerModal.phone.trim()
  if (!fn && !ln && !ph) {
    partnerModal.searchError = 'Entrez le téléphone, ou le prénom et/ou le nom du partenaire.'
    return
  }
  partnerModal.searching = true
  partnerModal.found = false
  partnerModal.partnerName = ''
  partnerModal.partnerEmail = ''
  partnerModal.searchError = ''
  try {
    const params = new URLSearchParams()
    if (ph) {
      params.set('phone', ph)
    } else {
      if (fn) params.set('firstName', fn)
      if (ln) params.set('lastName', ln)
    }
    const res = await $fetch<{ found: boolean; name: string; gender: string | null; email: string }>(
      `/api/users/lookup?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken.value}` } }
    )
    partnerModal.found = true
    partnerModal.partnerName = res.name
    partnerModal.partnerGender = res.gender
    partnerModal.partnerEmail = res.email ?? ''
  } catch (e) {
    const err = e as { data?: { message?: string }; message?: string }
    partnerModal.searchError = err?.data?.message ?? err?.message ?? 'Aucun compte trouvé.'
  } finally {
    partnerModal.searching = false
  }
}

// ── Notifications / errors ────────────────────────────────────────────────
const planErrors = reactive<Record<string, string>>({})
const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.message = msg; toast.type = type
  setTimeout(() => { toast.message = '' }, 4000)
}

async function onPaymentSuccess(data?: { extended?: boolean }) {
  partnerModal.open = false
  showToast(data?.extended ? 'Abonnement prolongé ! Redirection…' : 'Paiement réussi ! Redirection…', 'success')
  await new Promise(r => setTimeout(r, 1500))
  await navigateTo('/dashboard')
}
function onPaymentError(planId: string, msg: string) {
  planErrors[planId] = `Paiement échoué : ${msg}`
  showToast(`Paiement échoué : ${msg}`, 'error')
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(xof: number) {
  return new Intl.NumberFormat('fr-FR').format(xof) + ' FCFA'
}

function validityLabel(days: number) {
  if (days === 1) return '1 jour'
  if (days < 30) return `${days} jours`
  if (days === 30) return '1 mois'
  if (days === 90) return '3 mois'
  if (days === 180) return '6 mois'
  if (days === 365) return '1 an'
  return `${days} jours`
}

/** How much you save vs buying 2 solo subscriptions. */
function couplesSavings(plan: Plan): number {
  if (!plan.priceCouple) return 0
  return plan.priceSingle * 2 - plan.priceCouple
}

/** Approximate daily cost hint string. */
function pricePerDay(price: number, days: number): string {
  if (days <= 1) return ''
  const ppd = Math.round(price / days)
  return `≈ ${new Intl.NumberFormat('fr-FR').format(ppd)} FCFA/jour`
}

/** Currently displayed price for a plan card (respects couple toggle). */
function displayPrice(plan: Plan): number {
  return coupleMode[plan.id] && plan.priceCouple ? plan.priceCouple : plan.priceSingle
}

// ── Plan grouping ─────────────────────────────────────────────────────────
const SPECIALIZED_NAMES = new Set(['Fit Dance', 'Taekwondo', 'Boxe'])

const sessionPlan      = computed(() => plans.value.find(p => p.validityDays === 1))
const carnetPlans      = computed(() => plans.value.filter(p => p.name.startsWith('Carnet')))
const mainPlans        = computed(() => plans.value.filter(p =>
  p !== sessionPlan.value &&
  !carnetPlans.value.includes(p) &&
  !SPECIALIZED_NAMES.has(p.name)
))
const specializedPlans = computed(() => plans.value.filter(p => SPECIALIZED_NAMES.has(p.name)))

// ── Plan badges ───────────────────────────────────────────────────────────
function isPopular(plan: Plan)   { return plan.name === 'Abonnement 1 mois' }
function isBestValue(plan: Plan) { return plan.name === 'Abonnement 1 an' }

// L001: true when partner's gender is the same as the current user's (blocks couple payment)
const sameGenderError = computed(() =>
  partnerModal.found &&
  partnerModal.partnerGender != null &&
  user.value?.gender != null &&
  partnerModal.partnerGender === user.value.gender
)

/** Savings shown in partner modal (couple vs 2× solo). */
const modalSavings = computed(() =>
  partnerModal.planSoloAmount > 0
    ? partnerModal.planSoloAmount * 2 - partnerModal.planAmount
    : 0
)
</script>

<template>
  <div class="max-w-3xl mx-auto pb-20">

    <!-- Page header -->
    <div class="text-center mb-10 pt-2">
      <span class="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full mb-3">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.951-.69L9.049 2.927z"/></svg>
        Nos formules
      </span>
      <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Choisissez votre abonnement</h1>
      <p class="text-sm text-gray-400 max-w-md mx-auto">Paiement sécurisé via Mobile Money (KKiaPay). Accès immédiat après confirmation.</p>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="5" :height="120" />

    <!-- Error -->
    <div v-else-if="errorMsg" class="text-center py-16">
      <p class="text-red-500 font-semibold">{{ errorMsg }}</p>
    </div>

    <template v-else-if="plans.length">

      <!-- ════════════════════════════════════════════
           SECTION 1 — Accès à l'unité
           ════════════════════════════════════════════ -->
      <div v-if="sessionPlan" class="mb-8">
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
          <span class="w-4 h-px bg-gray-200" /> Accès à l'unité <span class="flex-1 h-px bg-gray-200" />
        </h2>
        <div class="flex items-center justify-between bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-5 hover:border-yellow-200 hover:shadow-md transition-all">
          <div>
            <p class="font-extrabold text-gray-900 text-lg">{{ sessionPlan.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Valide {{ validityLabel(sessionPlan.validityDays) }} · Solo uniquement</p>
          </div>
          <div class="flex items-center gap-6">
            <p class="text-2xl font-extrabold text-gray-900">{{ fmt(sessionPlan.priceSingle) }}</p>
            <div class="w-44">
              <p v-if="planErrors[sessionPlan.id]" class="text-red-500 text-xs mb-1">{{ planErrors[sessionPlan.id] }}</p>
              <PaymentCheckout
                :subscription-plan-id="sessionPlan.id"
                :amount="sessionPlan.priceSingle"
                :amount-label="fmt(sessionPlan.priceSingle)"
                @success="onPaymentSuccess"
                @error="(msg: string) => onPaymentError(sessionPlan!.id, msg)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           SECTION 2 — Carnets de séances
           ════════════════════════════════════════════ -->
      <div v-if="carnetPlans.length" class="mb-8">
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
          <span class="w-4 h-px bg-gray-200" /> Carnets de séances <span class="flex-1 h-px bg-gray-200" />
        </h2>
        <div class="space-y-3">
          <div
            v-for="plan in carnetPlans"
            :key="plan.id"
            class="flex items-center justify-between bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-5 hover:border-yellow-200 hover:shadow-md transition-all"
          >
            <div>
              <p class="font-extrabold text-gray-900 text-base">{{ plan.name }}</p>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {{ validityLabel(plan.validityDays) }}
                </span>
                <span class="text-[11px] text-gray-400">{{ pricePerDay(plan.priceSingle, plan.validityDays) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-6">
              <p class="text-2xl font-extrabold text-gray-900">{{ fmt(plan.priceSingle) }}</p>
              <div class="w-44">
                <p v-if="planErrors[plan.id]" class="text-red-500 text-xs mb-1">{{ planErrors[plan.id] }}</p>
                <PaymentCheckout
                  :subscription-plan-id="plan.id"
                  :amount="plan.priceSingle"
                  :amount-label="fmt(plan.priceSingle)"
                  @success="onPaymentSuccess"
                  @error="(msg: string) => onPaymentError(plan.id, msg)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           SECTION 3 — Abonnements (avec couple)
           ════════════════════════════════════════════ -->
      <div v-if="mainPlans.length" class="mb-8">
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
          <span class="w-4 h-px bg-gray-200" /> Abonnements <span class="flex-1 h-px bg-gray-200" />
        </h2>
        <div class="space-y-4">
          <div
            v-for="plan in mainPlans"
            :key="plan.id"
            class="bg-white border rounded-2xl shadow-sm transition-all overflow-hidden"
            :class="isPopular(plan)
              ? 'border-yellow-300 ring-1 ring-yellow-200 shadow-md'
              : 'border-gray-100 hover:border-yellow-200 hover:shadow-md'"
          >
            <!-- Top accent bar -->
            <div
              class="h-1 w-full"
              :class="isBestValue(plan)
                ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                : isPopular(plan)
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-400'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-300'"
            />

            <div class="px-6 py-5">
              <!-- Plan name + badges row -->
              <div class="flex items-start justify-between mb-4 gap-3">
                <div>
                  <div class="flex items-center gap-2 mb-1.5">
                    <h3 class="font-extrabold text-gray-900 text-lg leading-tight">{{ plan.name }}</h3>
                    <span
                      v-if="isPopular(plan)"
                      class="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-yellow-700 bg-yellow-100 border border-yellow-200 px-2 py-0.5 rounded-full shrink-0"
                    >
                      ★ Populaire
                    </span>
                    <span
                      v-else-if="isBestValue(plan)"
                      class="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0"
                    >
                      ✦ Meilleure valeur
                    </span>
                  </div>
                  <!-- Feature badges -->
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      {{ validityLabel(plan.validityDays) }}
                    </span>
                    <span v-if="plan.maxPauses && plan.maxPauses > 0" class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"/></svg>
                      {{ plan.maxPauses }} pause{{ plan.maxPauses > 1 ? 's' : '' }}
                    </span>
                    <span v-if="plan.maxReports && plan.maxReports > 0" class="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                      {{ plan.maxReports }} report{{ plan.maxReports > 1 ? 's' : '' }}
                    </span>
                    <span v-if="plan.priceCouple" class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Couple disponible
                    </span>
                  </div>
                </div>

                <!-- Solo/Couple toggle -->
                <div v-if="plan.priceCouple" class="flex p-0.5 bg-gray-100 rounded-xl shrink-0">
                  <button
                    :class="!coupleMode[plan.id] ? 'bg-white shadow-sm text-gray-900 font-bold' : 'text-gray-400'"
                    class="px-3 py-1.5 rounded-[10px] text-xs transition-all"
                    @click="coupleMode[plan.id] = false"
                  >Solo</button>
                  <button
                    :class="coupleMode[plan.id] ? 'bg-white shadow-sm text-gray-900 font-bold' : 'text-gray-400'"
                    class="px-3 py-1.5 rounded-[10px] text-xs transition-all"
                    @click="coupleMode[plan.id] = true"
                  >Couple</button>
                </div>
              </div>

              <!-- Pricing row -->
              <div class="flex items-end justify-between gap-4">
                <div>
                  <!-- Main price -->
                  <div class="flex items-baseline gap-2">
                    <span class="text-3xl font-extrabold text-gray-900">
                      {{ fmt(displayPrice(plan)) }}
                    </span>
                    <span v-if="plan.validityDays >= 30 && plan.validityDays <= 31" class="text-xs text-gray-400">/mois</span>
                  </div>

                  <!-- Hints row -->
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span class="text-xs text-gray-400">
                      {{ pricePerDay(displayPrice(plan), plan.validityDays) }}
                    </span>
                    <span v-if="!coupleMode[plan.id] && plan.priceCouple" class="text-xs text-gray-400">
                      Couple : {{ fmt(plan.priceCouple) }}
                    </span>
                    <span v-else-if="coupleMode[plan.id]" class="text-xs text-gray-400">
                      Solo : {{ fmt(plan.priceSingle) }}
                    </span>
                    <!-- Couple savings badge -->
                    <span
                      v-if="coupleMode[plan.id] && couplesSavings(plan) > 0"
                      class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                      Économisez {{ fmt(couplesSavings(plan)) }}
                    </span>
                  </div>
                </div>

                <!-- CTA -->
                <div class="w-44 shrink-0">
                  <p v-if="planErrors[plan.id]" class="text-red-500 text-xs mb-1 text-right">{{ planErrors[plan.id] }}</p>
                  <!-- COUPLE MODE → modal first -->
                  <button
                    v-if="coupleMode[plan.id]"
                    class="btn-primary w-full"
                    @click="openPartnerModal(plan)"
                  >
                    <span class="flex items-center justify-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Souscrire (Couple)
                    </span>
                  </button>
                  <!-- SOLO MODE → direct payment -->
                  <PaymentCheckout
                    v-else
                    :subscription-plan-id="plan.id"
                    :amount="plan.priceSingle"
                    :amount-label="fmt(plan.priceSingle)"
                    @success="onPaymentSuccess"
                    @error="(msg: string) => onPaymentError(plan.id, msg)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════
           SECTION 4 — Activités spécifiques
           ════════════════════════════════════════════ -->
      <div v-if="specializedPlans.length" class="mb-8">
        <h2 class="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
          <span class="w-4 h-px bg-gray-200" /> Activités spécifiques <span class="flex-1 h-px bg-gray-200" />
        </h2>
        <div class="grid sm:grid-cols-3 gap-3">
          <div
            v-for="plan in specializedPlans"
            :key="plan.id"
            class="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-5 hover:border-yellow-200 hover:shadow-md transition-all flex flex-col gap-3"
          >
            <!-- Top accent -->
            <div class="h-0.5 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-300" />
            <!-- Name + validity -->
            <div>
              <p class="font-extrabold text-gray-900 text-base">{{ plan.name }}</p>
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1.5">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                {{ validityLabel(plan.validityDays) }}
              </span>
            </div>
            <!-- Price + CTA -->
            <div class="mt-auto flex flex-col gap-2">
              <div>
                <p class="text-2xl font-extrabold text-gray-900">{{ fmt(plan.priceSingle) }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">{{ pricePerDay(plan.priceSingle, plan.validityDays) }}</p>
              </div>
              <p v-if="planErrors[plan.id]" class="text-red-500 text-xs">{{ planErrors[plan.id] }}</p>
              <PaymentCheckout
                :subscription-plan-id="plan.id"
                :amount="plan.priceSingle"
                :amount-label="fmt(plan.priceSingle)"
                @success="onPaymentSuccess"
                @error="(msg: string) => onPaymentError(plan.id, msg)"
              />
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- Trust strip -->
    <div class="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-8">
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        Paiement sécurisé KKiaPay
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
        Mobile Money accepté
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Accès immédiat après paiement
      </span>
    </div>

    <!-- ╔═══════════════════════════════════════════╗
         ║      COUPLE — PARTNER MODAL               ║
         ╚═══════════════════════════════════════════╝ -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="partnerModal.open"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          @click.self="closePartnerModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 class="font-extrabold text-gray-900 text-lg">Abonnement couple</h3>
                <p class="text-sm text-gray-400 mt-0.5">{{ partnerModal.planName }}</p>
              </div>
              <button class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all" @click="closePartnerModal">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="px-6 py-5 space-y-5">

              <!-- Info -->
              <div class="flex items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                <svg class="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-xs text-yellow-700 leading-relaxed">
                  Votre partenaire doit avoir un compte actif sur Souplesse Fitness.
                  Recherchez-le par téléphone, ou par prénom / nom.
                </p>
              </div>

              <!-- Phone search (priority) -->
              <div>
                <label class="block text-xs font-bold text-gray-600 mb-1.5">Téléphone du partenaire</label>
                <input
                  v-model="partnerModal.phone"
                  type="tel"
                  placeholder="Ex : +22501234567"
                  class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400 transition"
                  @keydown.enter="searchPartner"
                />
              </div>

              <!-- Separator -->
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <div class="flex-1 h-px bg-gray-200" />
                <span>ou par nom</span>
                <div class="flex-1 h-px bg-gray-200" />
              </div>

              <!-- Name inputs -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-gray-600 mb-1.5">Prénom</label>
                  <input
                    v-model="partnerModal.firstName"
                    type="text"
                    placeholder="Ex : Aminata"
                    class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400 transition"
                    @keydown.enter="searchPartner"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-600 mb-1.5">Nom</label>
                  <input
                    v-model="partnerModal.lastName"
                    type="text"
                    placeholder="Ex : Koné"
                    class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400 transition"
                    @keydown.enter="searchPartner"
                  />
                </div>
              </div>

              <!-- Search button -->
              <button
                :disabled="partnerModal.searching"
                class="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
                @click="searchPartner"
              >
                <svg v-if="partnerModal.searching" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                {{ partnerModal.searching ? 'Recherche…' : 'Rechercher le partenaire' }}
              </button>

              <!-- Search error -->
              <div v-if="partnerModal.searchError" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-sm text-red-600">{{ partnerModal.searchError }}</p>
              </div>

              <!-- Partner found -->
              <div v-if="partnerModal.found" class="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p class="text-xs font-bold text-green-700 mb-2 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Partenaire trouvé
                </p>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm shrink-0">
                    {{ (partnerModal.partnerName || '?')[0].toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-bold text-gray-900 text-sm">{{ partnerModal.partnerName }}</p>
                    <span
                      class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      :class="partnerModal.partnerGender === 'MALE' ? 'bg-blue-100 text-blue-700' : partnerModal.partnerGender === 'FEMALE' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ partnerModal.partnerGender === 'MALE' ? '♂ Homme' : partnerModal.partnerGender === 'FEMALE' ? '♀ Femme' : 'Genre non renseigné' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Divider + price recap -->
              <div v-if="partnerModal.found" class="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs text-gray-500">Tarif couple</p>
                    <p class="font-extrabold text-gray-900 text-xl">{{ fmt(partnerModal.planAmount) }}</p>
                  </div>
                  <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.449a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.951-.69L9.049 2.927z"/></svg>
                </div>
                <!-- Savings reminder -->
                <p v-if="modalSavings > 0" class="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  Économie de {{ fmt(modalSavings) }} vs 2 abonnements solo
                </p>
              </div>

              <!-- Payment CTA (shows only when partner confirmed) -->
              <div v-if="partnerModal.found">
                <!-- L001: Block payment if same gender -->
                <div v-if="sameGenderError" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                  <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p class="text-sm text-red-600">L'abonnement couple est réservé aux partenaires de genres opposés.</p>
                </div>
                <PaymentCheckout
                  v-if="!sameGenderError"
                  :subscription-plan-id="partnerModal.planId"
                  :amount="partnerModal.planAmount"
                  :amount-label="fmt(partnerModal.planAmount)"
                  :partner-email="partnerModal.partnerEmail"
                  @success="onPaymentSuccess"
                  @error="(msg: string) => { planErrors[partnerModal.planId] = msg; showToast(msg, 'error') }"
                />
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-up-enter-active, .fade-up-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(12px); }
</style>
