<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Paiements</h1>
          <p class="text-sm text-gray-400 mt-0.5">Historique de tous les paiements</p>
        </div>
      </div>
      <span v-if="total" class="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-xl">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        {{ total }} paiement(s)
      </span>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 flex items-center gap-3 py-3 px-4">
      <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
      </div>
      <input v-model="search" type="text" placeholder="Rechercher par nom, email ou transaction…" class="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder-gray-400" />
      <button v-if="search" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors text-xs" @click="search = ''">✕</button>
    </div>

    <SkeletonLoader v-if="pending" :count="5" :height="56" />

    <div v-else-if="loadError" class="bg-white rounded-2xl border border-red-100 shadow-sm px-5 py-4 flex items-center gap-3 text-red-600">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Erreur lors du chargement des paiements.
    </div>

    <div v-else-if="!filteredPayments.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
      <div class="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
        <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucun paiement trouvé</p>
      <p class="text-sm text-gray-400">Modifiez votre recherche ou attendez de nouvelles transactions.</p>
    </div>

    <div v-else class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Membre</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction</th>
              <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="p in filteredPayments" :key="p.id" class="hover:bg-gray-50/80 transition-colors group">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-primary-400 font-bold text-xs shrink-0">
                    {{ (p.user?.name ?? '?')[0]?.toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ p.user?.name ?? '—' }}</p>
                    <p class="text-xs text-gray-400">{{ p.user?.email ?? '' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 font-extrabold text-gray-900">{{ formatCurrency(p.amount) }}</td>
              <td class="px-5 py-4">
                <span :class="statusClass(p.status)" class="px-2.5 py-1 rounded-full text-xs font-semibold border">
                  {{ p.status }}
                </span>
              </td>
              <td class="px-5 py-4">
                <span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {{ p.kkiapayTransactionId ?? '—' }}
                </span>
              </td>
              <td class="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{{ formatDate(p.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!pending && total > limit" class="flex items-center justify-between mt-4">
      <span class="text-sm text-gray-400">Page {{ page }} · {{ filteredPayments.length }} sur {{ total }} résultats</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" @click="changePage(-1)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Précédente
        </button>
        <button :disabled="!hasNextPage" class="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-black text-primary-400 hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" @click="changePage(1)">
          Suivante
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })
  const { accessToken } = useAuth()

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
    if (s === 'SUCCESS' || s === 'COMPLETED') return 'text-green-700 bg-green-50 border-green-200'
    if (s === 'FAILED') return 'text-red-600 bg-red-50 border-red-200'
    return 'text-amber-700 bg-amber-50 border-amber-200'
  }

  function formatCurrency(v: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }
</script>
