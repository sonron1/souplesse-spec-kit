<template>
  <div class="bg-white rounded-xl shadow p-5 border border-gray-100">
    <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{{ label }}</p>
    <p class="text-3xl font-extrabold leading-none" :class="valueClass">{{ formattedValue }}</p>
    <p v-if="sub" class="text-xs text-gray-400 mt-2">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    label: string
    value: number | string
    sub?: string
    type?: 'currency' | 'number' | 'text'
    color?: 'gold' | 'primary' | 'green' | 'blue' | 'purple' | 'orange' | 'red'
  }>()

  const valueClass = computed(() => {
    const map: Record<string, string> = {
      gold: 'text-primary-600',
      primary: 'text-primary-600',
      green: 'text-emerald-600',
      blue: 'text-sky-600',
      purple: 'text-violet-600',
      orange: 'text-orange-500',
      red: 'text-red-600',
    }
    return map[props.color ?? 'primary']
  })

  const formattedValue = computed(() => {
    if (props.type === 'currency' && typeof props.value === 'number') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
      }).format(props.value)
    }
    return props.value
  })
</script>
