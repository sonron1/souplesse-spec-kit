<template>
  <div />
</template>

<script setup lang="ts">
  const { isLoggedIn } = useAuth()
  await navigateTo(isLoggedIn.value ? '/dashboard' : '/login', { replace: true })
</script>
