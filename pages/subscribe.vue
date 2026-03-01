<template>
  <div>
    <h1>Subscribe</h1>
    <div v-if="loading">Loading plans...</div>
    <ul v-else>
      <li v-for="plan in plans" :key="plan.id">
        <strong>{{ plan.name }}</strong> — {{ (plan.priceSingle / 100).toFixed(2) }}
        {{ plan.currency || 'XOF' }}
        <PaymentCheckout
          :subscription-plan-id="plan.id"
          :amount-label="plan.priceSingle / 100 + ' ' + (plan.currency || 'XOF')"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import PaymentCheckout from '../components/PaymentCheckout.vue'

  interface SubscriptionPlanResponse {
    id: string
    name: string
    priceSingle: number
    currency?: string
  }

  interface PlansApiResponse {
    statusCode?: number
    body?: SubscriptionPlanResponse[]
  }

  const plans = ref<SubscriptionPlanResponse[]>([])
  const loading = ref(true)

  const { data, error } = await useFetch<PlansApiResponse>('/api/subscription-plans.get')
  if (!error.value && data.value) {
    // data returns { statusCode, body }
    const body = data.value.body ?? (data.value as unknown as SubscriptionPlanResponse[])
    plans.value = Array.isArray(body) ? body : []
  }
  loading.value = false
</script>

<style scoped>
  h1 {
    margin-bottom: 1rem;
  }
  li {
    margin-bottom: 1rem;
  }
</style>
