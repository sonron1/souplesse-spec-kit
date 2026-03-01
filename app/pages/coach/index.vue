<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Espace Coach</h1>
    <div class="flex gap-4">
      <NuxtLink to="/coach/programs" class="btn-primary">Gérer les programmes</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isCoach } = useAuth()
  if (!isCoach.value) await navigateTo('/dashboard')
</script>
