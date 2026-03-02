<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Choisir un abonnement</h1>
      <p class="text-gray-500 max-w-xl mx-auto">
        Sélectionnez la formule qui correspond à vos objectifs. Paiement sécurisé via Kkiapay.
      </p>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="4" :height="140" />

    <!-- Error -->
    <div v-else-if="errorMsg" class="card text-red-600 text-center">
      {{ errorMsg }}
    </div>

    <!-- Plans grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="card flex flex-col"
      >
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-900 mb-1">{{ plan.name }}</h3>
          <p class="text-sm text-gray-500 mb-3">
            Valide {{ plan.validityDays }} jours
          </p>
          <p class="text-3xl font-extrabold text-primary-600 mb-1">
            {{ formatPrice(plan.priceSingle) }}
          </p>
          <p class="text-xs text-gray-400">XOF — paiement unique</p>
        </div>

        <div class="mt-6 space-y-2">
          <PaymentCheckout
            :subscription-plan-id="plan.id"
            :amount-label="formatPrice(plan.priceSingle)"
            @success="onPaymentSuccess(plan.id)"
            @error="onPaymentError"
          />
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="toast.message"
        :class="[
          'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-primary-600 text-black' : 'bg-red-600 text-white',
        ]"
      >
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })

  interface Plan {
    id: string
    name: string
    priceSingle: number
    validityDays: number
    currency?: string
  }

  interface PlansResponse {
    statusCode?: number
    body?: Plan[]
  }

  const pending = ref(true)
  const plans = ref<Plan[]>([])
  const errorMsg = ref('')

  const { data, error } = await useFetch<PlansResponse | Plan[]>('/api/subscription-plans.get')
  if (error.value) {
    errorMsg.value = 'Impossible de charger les abonnements.'
  } else if (data.value) {
    const raw = data.value
    if (Array.isArray(raw)) {
      plans.value = raw
    } else {
      const body = (raw as PlansResponse).body
      plans.value = Array.isArray(body) ? body : []
    }
  }
  pending.value = false

  function formatPrice(xof: number) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(xof)
  }

  // Toast
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 4000)
  }

  function onPaymentSuccess(_planId: string) {
    showToast('Paiement réussi ! Votre abonnement sera activé sous peu.', 'success')
  }

  function onPaymentError(msg: string) {
    showToast(`Paiement échoué : ${msg}`, 'error')
  }
</script>
