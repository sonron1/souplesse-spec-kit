<template>
  <button
    :disabled="loading"
    class="btn-primary w-full"
    @click="startCheckout"
  >
    <span v-if="loading" class="flex items-center justify-center gap-2">
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Initialisation…
    </span>
    <span v-else>Payer {{ amountLabel }}</span>
  </button>
</template>

<script setup lang="ts">
  import useKkiapay from '../../utils/kkiapay.client'

  interface CreateOrderResponse {
    kkiapayToken?: string
    body?: { kkiapayToken?: string }
  }

  const props = defineProps<{
    subscriptionPlanId: string
    amountLabel?: string
  }>()

  const emit = defineEmits<{
    (e: 'success'): void
    (e: 'error', msg: string): void
  }>()

  const { accessToken } = useAuth()
  const loading = ref(false)

  const startCheckout = async () => {
    loading.value = true
    try {
      const data = await $fetch<CreateOrderResponse>('/api/payments/kkiapay.create-order', {
        method: 'POST',
        body: { subscriptionPlanId: props.subscriptionPlanId },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })

      const kkiapayToken = data?.body?.kkiapayToken ?? data?.kkiapayToken
      if (!kkiapayToken) throw new Error('Token Kkiapay manquant')

      const k = await useKkiapay()
      k.open({ token: kkiapayToken })

      emit('success')
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Erreur de paiement'
      emit('error', msg)
    } finally {
      loading.value = false
    }
  }
</script>
