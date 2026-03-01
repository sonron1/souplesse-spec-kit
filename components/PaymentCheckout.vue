<template>
  <div>
    <button :disabled="loading" @click="startCheckout">Pay {{ amountLabel }}</button>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import useKkiapay from '~/utils/kkiapay.client'
  import { useFetch } from '#app'

  interface CreateOrderResponse {
    statusCode?: number
    body?: { kkiapayToken?: string }
    kkiapayToken?: string
  }

  const props = defineProps<{ subscriptionPlanId: string; amountLabel?: string }>()
  const loading = ref(false)

  const startCheckout = async () => {
    loading.value = true
    try {
      // call server to create payment order
      const { data, error } = await useFetch<CreateOrderResponse>(
        '/api/payments/kkiapay.create-order',
        {
          method: 'POST',
          body: { subscriptionPlanId: props.subscriptionPlanId },
        }
      )

      if (error.value) throw error.value

      const kkiapayToken = data.value?.body?.kkiapayToken ?? data.value?.kkiapayToken
      if (!kkiapayToken) throw new Error('Missing kkiapay token')

      const k = await useKkiapay()
      // open checkout (SDK method name depends on Kkiapay; adjust as needed)
      k.open({ token: kkiapayToken })
    } catch (e) {
      console.error('Checkout failed', e)
      alert('Payment initialization failed')
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  button[disabled] {
    opacity: 0.6;
  }
</style>
