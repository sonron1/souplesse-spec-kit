<template>
  <div class="bg-white rounded-xl shadow p-5">
    <p class="text-sm text-gray-500 mb-1">{{ label }}</p>
    <p class="text-3xl font-bold" :class="valueClass">{{ formattedValue }}</p>
    <p v-if="sub" class="text-xs text-gray-400 mt-1">{{ sub }}</p>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    label: string
    value: number | string
    sub?: string
    type?: 'currency' | 'number' | 'text'
    color?: 'green' | 'blue' | 'purple' | 'orange'
  }>()

  const valueClass = computed(() => {
    const map: Record<string, string> = {
      green: 'text-green-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
    }
    return map[props.color ?? 'blue']
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
