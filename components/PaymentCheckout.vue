<template>
  <div>
    <button :disabled="loading" @click="startCheckout">Pay {{ amountLabel }}</button>
  </div>
</template>

<script setup lang="ts">
  import type { ListenerData } from 'kkiapay'
  import { ref, onUnmounted } from 'vue'

  interface CreateOrderResponse {
    statusCode?: number
    body?: { kkiapayToken?: string }
    kkiapayToken?: string
  }

  const props = defineProps<{ subscriptionPlanId: string; amountLabel?: string }>()
  const loading = ref(false)

  const { $kkiapay } = useNuxtApp()

  const onSuccess = (_data: ListenerData) => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
    loading.value = false
  }

  const onFailed = (_data: ListenerData) => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
    loading.value = false
    alert('Payment failed')
  }

  const startCheckout = async () => {
    loading.value = true
    try {
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

      $kkiapay.addKkiapayListener('success', onSuccess)
      $kkiapay.addKkiapayListener('failed', onFailed)
      $kkiapay.openKkiapayWidget({ token: kkiapayToken })
    } catch (e) {
      loading.value = false
      console.error('Checkout failed', e)
      alert('Payment initialization failed')
    }
  }

  onUnmounted(() => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
  })
</script>

<style scoped>
  button[disabled] {
    opacity: 0.6;
  }
</style>
