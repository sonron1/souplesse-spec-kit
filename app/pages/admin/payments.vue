<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Paiements</h1>
        <p class="text-sm text-gray-500 mt-0.5">Historique de tous les paiements</p>
      </div>
      <span v-if="total" class="text-sm text-gray-500">{{ total }} paiement(s)</span>
    </div>

    <!-- Search -->
    <div class="card mb-4 flex items-center gap-3 py-3 px-4">
      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
      <input v-model="search" type="text" placeholder="Rechercher par nom ou email…" class="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400" />
      <button v-if="search" class="text-gray-400 hover:text-gray-600 text-xs" @click="search = ''">✕</button>
    </div>

    <SkeletonLoader v-if="pending" :count="5" :height="56" />

    <div v-else-if="loadError" class="card text-red-600">Erreur lors du chargement des paiements.</div>

    <div v-else-if="!filteredPayments.length" class="card text-center py-12 text-gray-400">
      <p>Aucun paiement trouvé.</p>
    </div>

    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Membre</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Montant</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Transaction</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in filteredPayments" :key="p.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ p.user?.name ?? '—' }}</p>
              <p class="text-xs text-gray-400">{{ p.user?.email ?? '' }}</p>
            </td>
            <td class="px-4 py-3 font-bold text-gray-900">{{ formatCurrency(p.amount) }}</td>
            <td class="px-4 py-3">
              <span :class="statusClass(p.status)" class="px-2 py-1 rounded-full text-xs font-semibold">
                {{ p.status }}
              </span>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500 max-w-[140px] truncate">
              {{ p.kkiapayTransactionId ?? '—' }}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(p.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!pending && total > limit" class="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>Page {{ page }} · {{ filteredPayments.length }} résultats</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" class="btn-secondary px-3 py-1.5 text-xs" @click="changePage(-1)">← Précédente</button>
        <button :disabled="!hasNextPage" class="btn-secondary px-3 py-1.5 text-xs" @click="changePage(1)">Suivante →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: 'auth' })
  const { isAdmin, accessToken } = useAuth()
  if (!isAdmin.value) await navigateTo('/dashboard')

  interface Payment {
    id: string
    amount: number
    status: string
    kkiapayTransactionId: string | null
    createdAt: string
    user?: { id: string; name: string; email: string } | null
  }
  interface PaymentsResponse { success: boolean; payments: Payment[]; total: number; page: number; limit: number }

  const page = ref(1)
  const limit = 20
  const search = ref('')
  const loadError = ref(false)

  const { data, pending, refresh } = await useLazyFetch<PaymentsResponse>('/api/admin/payments', {
    headers: computed(() => ({ Authorization: `Bearer ${accessToken.value}` })),
    query: computed(() => ({ page: page.value, limit })),
    default: () => ({ success: true, payments: [], total: 0, page: 1, limit }),
    onResponseError: () => { loadError.value = true },
  })

  const payments = computed(() => data.value?.payments ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const hasNextPage = computed(() => page.value * limit < total.value)

  const filteredPayments = computed(() => {
    const q = search.value.toLowerCase().trim()
    if (!q) return payments.value
    return payments.value.filter(
      (p) =>
        (p.user?.name ?? '').toLowerCase().includes(q) ||
        (p.user?.email ?? '').toLowerCase().includes(q) ||
        (p.kkiapayTransactionId ?? '').toLowerCase().includes(q)
    )
  })

  async function changePage(delta: number) {
    page.value = Math.max(1, page.value + delta)
    await refresh()
  }

  function statusClass(s: string) {
    if (s === 'SUCCESS' || s === 'COMPLETED') return 'text-green-700 bg-green-100'
    if (s === 'FAILED') return 'text-red-600 bg-red-100'
    return 'text-yellow-700 bg-yellow-100'
  }

  function formatCurrency(v: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }
</script>
