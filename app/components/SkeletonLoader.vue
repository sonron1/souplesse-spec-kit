<template>
  <div class="animate-pulse space-y-3">
    <div v-for="i in count" :key="i" class="bg-gray-200 rounded-lg" :style="{ height: `${height}px` }" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ count?: number; height?: number }>()
withDefaults(defineProps<{ count?: number; height?: number }>(), { count: 3, height: 60 })
</script>
