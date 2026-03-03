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
      Traitement…
    </span>
    <span v-else>Payer {{ amountLabel }}</span>
  </button>
</template>

<script setup lang="ts">
  import type { ListenerData } from 'kkiapay'
  type KkiapayInstance = typeof import('kkiapay')

  interface ConfirmResponse {
    statusCode?: number
    body?: { ok: boolean; error?: string }
  }

  const props = defineProps<{
    subscriptionPlanId: string
    amount: number          // raw XOF integer
    amountLabel?: string
    partnerEmail?: string   // FR-016: optional partner for couple plans
  }>()

  const emit = defineEmits<{
    (e: 'success'): void
    (e: 'error', msg: string): void
  }>()

  const { $kkiapay: _kkiapay } = useNuxtApp()
  const $kkiapay = _kkiapay as KkiapayInstance
  const { accessToken } = useAuth()
  const runtimeConfig = useRuntimeConfig()
  const loading = ref(false)

  const onSuccess = async (data: ListenerData) => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
    try {
      const transactionId = (data as { transactionId?: string })?.transactionId
      if (!transactionId) throw new Error('transactionId manquant')

      await $fetch<ConfirmResponse>('/api/payments/confirm', {
        method: 'POST',
        body: {
          transactionId,
          subscriptionPlanId: props.subscriptionPlanId,
          ...(props.partnerEmail ? { partnerEmail: props.partnerEmail } : {}),
        },
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      emit('success')
    } catch (e) {
      emit('error', (e as { message?: string })?.message ?? 'Erreur de confirmation')
    } finally {
      loading.value = false
    }
  }

  const onFailed = (data: ListenerData) => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
    loading.value = false
    emit('error', (data as { message?: string })?.message ?? 'Paiement échoué')
  }

  const startCheckout = () => {
    if (!runtimeConfig.public.kkiapayPublicKey) {
      emit('error', 'Clé KKiaPay non configurée')
      return
    }
    loading.value = true
    $kkiapay.addKkiapayListener('success', onSuccess)
    $kkiapay.addKkiapayListener('failed', onFailed)
    $kkiapay.openKkiapayWidget({
      amount: props.amount,
      key: runtimeConfig.public.kkiapayPublicKey,
      sandbox: runtimeConfig.public.kkiapayIsSandbox,
    })
  }

  onUnmounted(() => {
    $kkiapay.removeKkiapayListener('success')
    $kkiapay.removeKkiapayListener('failed')
  })
</script>
