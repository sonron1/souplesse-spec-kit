<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-6">
    <button
      class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      :disabled="modelValue <= 1"
      @click="$emit('update:modelValue', modelValue - 1)"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      Précédent
    </button>

    <span class="text-sm text-gray-500 font-medium whitespace-nowrap">
      {{ modelValue }} / {{ totalPages }}
      <span v-if="total !== undefined" class="text-gray-400 font-normal">({{ total }})</span>
    </span>

    <button
      class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      :disabled="modelValue >= totalPages"
      @click="$emit('update:modelValue', modelValue + 1)"
    >
      Suivant
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number     // current page (v-model)
  totalPages: number
  total?: number         // optional total item count shown in label
}>()

defineEmits<{
  (e: 'update:modelValue', page: number): void
}>()
</script>
