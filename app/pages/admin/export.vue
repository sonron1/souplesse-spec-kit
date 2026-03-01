<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Export des données</h1>

    <p class="text-gray-600 mb-6">
      Téléchargez un export CSV de tous les paiements et abonnements.
    </p>

    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <p class="font-semibold">Paiements</p>
          <p class="text-sm text-gray-500">Tous les paiements avec statut et montant</p>
        </div>
        <button class="btn-primary" :disabled="exporting" @click="exportPayments">
          <span v-if="exporting">Export en cours...</span>
          <span v-else>Télécharger CSV</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { isAdmin, accessToken } = useAuth()
if (!isAdmin.value) await navigateTo('/dashboard')

const exporting = ref(false)

async function exportPayments() {
  exporting.value = true
  try {
    const blob = await $fetch<Blob>('/api/admin/export', {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>
