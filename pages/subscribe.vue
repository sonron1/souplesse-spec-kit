<template>
  <div>
    <h1>Subscribe</h1>
    <div v-if="loading">Loading plans...</div>
    <ul v-else>
      <li v-for="plan in plans" :key="plan.id">
        <strong>{{ plan.name }}</strong> — {{ (plan.priceSingle/100).toFixed(2) }} {{ plan.currency || 'XOF' }}
        <PaymentCheckout :subscriptionPlanId="plan.id" :amountLabel="(plan.priceSingle/100) + ' ' + (plan.currency || 'XOF')" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PaymentCheckout from '~/components/PaymentCheckout.vue'
import { useFetch } from '#app'

const plans = ref<any[]>([])
const loading = ref(true)

const { data, error } = await useFetch('/api/subscription-plans.get')
if (!error.value && data.value) {
  // data returns { statusCode, body }
  const body = (data.value as any).body || data.value
  plans.value = body
}
loading.value = false
</script>

<style scoped>
h1 { margin-bottom: 1rem }
li { margin-bottom: 1rem }
</style>
