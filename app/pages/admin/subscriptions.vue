<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Abonnements</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gérez et contrôlez les abonnements clients.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500">{{ total }} abonnement(s)</span>
        <button class="btn-primary gap-1.5 flex items-center" @click="openGrantModal">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Attribuer abonnement
        </button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actifs</p>
        <p class="text-3xl font-extrabold text-green-600">{{ countByStatus('ACTIVE') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expirés</p>
        <p class="text-3xl font-extrabold text-gray-400">{{ countByStatus('EXPIRED') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Annulés</p>
        <p class="text-3xl font-extrabold text-red-500">{{ countByStatus('CANCELLED') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">En attente</p>
        <p class="text-3xl font-extrabold text-amber-500">{{ countByStatus('PENDING') }}</p>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="6" :height="68" />

    <!-- Error -->
    <div v-else-if="loadError" class="card text-red-600 text-sm py-6 text-center">
      Erreur lors du chargement des abonnements.
    </div>

    <!-- Table -->
    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Client</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Formule</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Début</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Expiration</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Jours restants</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="sub in subscriptions"
            :key="sub.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ sub.user?.name ?? '—' }}</p>
              <p class="text-xs text-gray-400">{{ sub.user?.email }}</p>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-gray-800">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
              <p class="text-xs text-gray-400 uppercase">{{ sub.subscriptionPlan?.planType ?? '' }}</p>
            </td>
            <td class="px-4 py-3">
              <span :class="statusClass(sub.status)" class="px-2.5 py-1 rounded-full text-xs font-bold">
                {{ statusLabel(sub.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ formatDate(sub.startsAt) }}</td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ formatDate(sub.expiresAt) }}</td>
            <td class="px-4 py-3">
              <span
                v-if="sub.status === 'ACTIVE' && sub.expiresAt"
                :class="daysLeft(sub.expiresAt) <= 7 ? 'text-amber-600 font-bold' : 'text-gray-600'"
                class="text-xs"
              >
                {{ daysLeft(sub.expiresAt) }} j
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
            <td class="px-4 py-3 text-right flex justify-end gap-2">
              <!-- Extend button for active subscriptions -->
              <button
                v-if="sub.status === 'ACTIVE' && sub.user"
                :disabled="toggling === sub.id"
                class="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                @click="openExtendModal(sub)"
              >
                +
              </button>
              <button
                v-if="sub.status === 'ACTIVE'"
                :disabled="toggling === sub.id"
                class="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                @click="toggleStatus(sub, 'CANCELLED')"
              >
                {{ toggling === sub.id ? '…' : 'Désactiver' }}
              </button>
              <button
                v-else-if="sub.status === 'CANCELLED' || sub.status === 'EXPIRED'"
                :disabled="toggling === sub.id"
                class="text-xs font-semibold text-green-600 hover:text-green-800 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                @click="toggleStatus(sub, 'ACTIVE')"
              >
                {{ toggling === sub.id ? '…' : 'Réactiver' }}
              </button>
              <span v-else-if="sub.status === 'PENDING'" class="text-xs text-gray-300">—</span>
            </td>
          </tr>
          <tr v-if="!subscriptions.length">
            <td colspan="7" class="px-4 py-12 text-center text-gray-400 text-sm">
              Aucun abonnement trouvé.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grant / Extend Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showGrant" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 class="font-semibold text-gray-800 mb-1">
              {{ grantMode === 'extend' ? 'Prolonger l\'abonnement' : 'Attribuer un abonnement' }}
            </h2>
            <p class="text-xs text-gray-400 mb-5">
              {{ grantMode === 'extend' ? 'Ajoute la durée du plan à l\'abonnement actuel.' : 'Crée et active immédiatement un abonnement sans paiement.' }}
            </p>

            <div class="space-y-4">
              <!-- Client select -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Client</label>
                <select v-model="grantForm.userId" class="input w-full" :disabled="grantMode === 'extend'">
                  <option value="" disabled>Sélectionner un client</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }} — {{ c.email }}</option>
                </select>
              </div>

              <!-- Plan select -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Formule</label>
                <select v-model="grantForm.planId" class="input w-full" :disabled="grantMode === 'extend'">
                  <option value="" disabled>Sélectionner une formule</option>
                  <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }} ({{ p.validityDays }}j)</option>
                </select>
              </div>

              <!-- Note -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Note (optionnel)</label>
                <input v-model="grantForm.note" type="text" class="input w-full" placeholder="Raison de l'attribution…" maxlength="500" />
              </div>
            </div>

            <div class="flex gap-3 justify-end mt-6">
              <button class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900" @click="showGrant = false">Annuler</button>
              <button
                class="btn-primary"
                :disabled="!grantForm.userId || !grantForm.planId || granting"
                @click="grantSubscription"
              >
                {{ granting ? 'En cours…' : grantMode === 'extend' ? 'Prolonger' : 'Attribuer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toast.message"
          :class="[
            'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-primary-600 text-black' : 'bg-red-600 text-white',
          ]"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })

  const { accessToken } = useAuth()
  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface Subscription {
    id: string
    type: string
    status: string
    startsAt: string | null
    expiresAt: string | null
    isActive: boolean
    subscriptionPlanId?: string | null
    user?: { id: string; name: string; email: string } | null
    subscriptionPlan?: { id?: string; name: string; planType: string } | null
  }

  interface Client { id: string; name: string; email: string }
  interface Plan { id: string; name: string; planType: string; validityDays: number }

  const loadError = ref(false)
  const { data, pending, refresh } = await useLazyFetch<{
    success: boolean
    subscriptions: Subscription[]
    total: number
  }>('/api/admin/subscriptions', {
    headers: authHeaders,
    default: () => ({ success: true, subscriptions: [], total: 0 }),
    onResponseError: () => { loadError.value = true },
  })

  const subscriptions = computed(() => data.value?.subscriptions ?? [])
  const total = computed(() => data.value?.total ?? 0)

  function countByStatus(s: string) {
    return subscriptions.value.filter((sub) => sub.status === s).length
  }

  // ── Grant modal ──────────────────────────────────────────────
  const showGrant = ref(false)
  const granting = ref(false)
  const grantMode = ref<'new' | 'extend'>('new')
  const grantForm = reactive({ userId: '', planId: '', note: '' })

  const { data: usersData } = await useFetch<{ users: Client[] }>('/api/admin/users', { headers: authHeaders })
  const clients = computed(() => (usersData.value?.users ?? []).filter((u: any) => u.role === 'CLIENT'))

  const { data: plansData } = await useFetch<{ plans: Plan[] }>('/api/subscription-plans', { headers: authHeaders })
  const plans = computed(() => plansData.value?.plans ?? [])

  function openGrantModal() {
    grantMode.value = 'new'
    grantForm.userId = ''
    grantForm.planId = ''
    grantForm.note = ''
    showGrant.value = true
  }

  function openExtendModal(sub: Subscription) {
    grantMode.value = 'extend'
    grantForm.userId = sub.user?.id ?? ''
    grantForm.planId = sub.subscriptionPlanId ?? sub.subscriptionPlan?.id ?? ''
    grantForm.note = ''
    showGrant.value = true
  }

  async function grantSubscription() {
    if (!grantForm.userId || !grantForm.planId) return
    granting.value = true
    try {
      const res = await $fetch<{ ok: boolean; extended: boolean }>('/api/admin/subscriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { userId: grantForm.userId, subscriptionPlanId: grantForm.planId, note: grantForm.note || undefined },
      })
      showToast(res.extended ? 'Abonnement prolongé avec succès.' : 'Abonnement attribué avec succès.', 'success')
      showGrant.value = false
      await refresh()
    } catch (e) {
      const err = e as { data?: { message?: string } }
      showToast(err?.data?.message ?? 'Erreur lors de l\'attribution.', 'error')
    } finally {
      granting.value = false
    }
  }

  // ── Toggle ──────────────────────────────────────────────────
  const toggling = ref<string | null>(null)
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

  async function toggleStatus(sub: Subscription, newStatus: 'ACTIVE' | 'CANCELLED') {
    toggling.value = sub.id
    try {
      await $fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { status: newStatus },
      })
      showToast(
        newStatus === 'ACTIVE' ? 'Abonnement réactivé avec succès.' : 'Abonnement désactivé.',
        'success'
      )
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      showToast(err?.data?.statusMessage ?? 'Erreur lors de la mise à jour.', 'error')
    } finally {
      toggling.value = null
    }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 3500)
  }

  // ── Helpers ──────────────────────────────────────────────────
  function statusLabel(s: string) {
    const map: Record<string, string> = { ACTIVE: 'Actif', EXPIRED: 'Expiré', CANCELLED: 'Annulé', PENDING: 'En attente' }
    return map[s] ?? s
  }

  function statusClass(s: string) {
    if (s === 'ACTIVE') return 'bg-green-100 text-green-700'
    if (s === 'EXPIRED') return 'bg-gray-100 text-gray-500'
    if (s === 'CANCELLED') return 'bg-red-100 text-red-600'
    if (s === 'PENDING') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-500'
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysLeft(end: string | null) {
    if (!end) return 0
    return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000))
  }
</script>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actifs</p>
        <p class="text-3xl font-extrabold text-green-600">{{ countByStatus('ACTIVE') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expirés</p>
        <p class="text-3xl font-extrabold text-gray-400">{{ countByStatus('EXPIRED') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Annulés</p>
        <p class="text-3xl font-extrabold text-red-500">{{ countByStatus('CANCELLED') }}</p>
      </div>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">En attente</p>
        <p class="text-3xl font-extrabold text-amber-500">{{ countByStatus('PENDING') }}</p>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="6" :height="68" />

    <!-- Error -->
    <div v-else-if="loadError" class="card text-red-600 text-sm py-6 text-center">
      Erreur lors du chargement des abonnements.
    </div>

    <!-- Table -->
    <div v-else class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Client</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Formule</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Statut</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Expiration</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Jours restants</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="sub in subscriptions"
            :key="sub.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <!-- Client -->
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ sub.user?.name ?? '—' }}</p>
              <p class="text-xs text-gray-400">{{ sub.user?.email }}</p>
            </td>

            <!-- Plan -->
            <td class="px-4 py-3">
              <p class="font-medium text-gray-800">{{ sub.subscriptionPlan?.name ?? sub.type }}</p>
              <p class="text-xs text-gray-400 uppercase">{{ sub.subscriptionPlan?.planType ?? '' }}</p>
            </td>

            <!-- Status badge -->
            <td class="px-4 py-3">
              <span :class="statusClass(sub.status)" class="px-2.5 py-1 rounded-full text-xs font-bold">
                {{ statusLabel(sub.status) }}
              </span>
            </td>

            <!-- Expiry -->
            <td class="px-4 py-3 text-gray-600 text-xs">
              {{ formatDate(sub.expiresAt) }}
            </td>

            <!-- Days left -->
            <td class="px-4 py-3">
              <span
                v-if="sub.status === 'ACTIVE' && sub.expiresAt"
                :class="daysLeft(sub.expiresAt) <= 7 ? 'text-amber-600 font-bold' : 'text-gray-600'"
                class="text-xs"
              >
                {{ daysLeft(sub.expiresAt) }} j
              </span>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>

            <!-- Toggle action -->
            <td class="px-4 py-3 text-right">
              <button
                v-if="sub.status === 'ACTIVE'"
                :disabled="toggling === sub.id"
                class="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                @click="toggleStatus(sub, 'CANCELLED')"
              >
                {{ toggling === sub.id ? '…' : 'Désactiver' }}
              </button>
              <button
                v-else-if="sub.status === 'CANCELLED' || sub.status === 'EXPIRED'"
                :disabled="toggling === sub.id"
                class="text-xs font-semibold text-green-600 hover:text-green-800 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                @click="toggleStatus(sub, 'ACTIVE')"
              >
                {{ toggling === sub.id ? '…' : 'Réactiver' }}
              </button>
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
          </tr>
          <tr v-if="!subscriptions.length">
            <td colspan="6" class="px-4 py-12 text-center text-gray-400 text-sm">
              Aucun abonnement trouvé.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div
          v-if="toast.message"
          :class="[
            'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-primary-600 text-black' : 'bg-red-600 text-white',
          ]"
        >
          <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })

  const { accessToken } = useAuth()
  const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface Subscription {
    id: string
    type: string
    status: string
    startsAt: string | null
    expiresAt: string | null
    isActive: boolean
    user?: { id: string; name: string; email: string } | null
    subscriptionPlan?: { name: string; planType: string } | null
  }

  const loadError = ref(false)
  const { data, pending, refresh } = await useLazyFetch<{
    success: boolean
    subscriptions: Subscription[]
    total: number
  }>('/api/admin/subscriptions', {
    headers: authHeaders,
    default: () => ({ success: true, subscriptions: [], total: 0 }),
    onResponseError: () => { loadError.value = true },
  })

  const subscriptions = computed(() => data.value?.subscriptions ?? [])
  const total = computed(() => data.value?.total ?? 0)

  function countByStatus(s: string) {
    return subscriptions.value.filter((sub) => sub.status === s).length
  }

  // ── Toggle ──────────────────────────────────────────────────
  const toggling = ref<string | null>(null)
  const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })

  async function toggleStatus(sub: Subscription, newStatus: 'ACTIVE' | 'CANCELLED') {
    toggling.value = sub.id
    try {
      await $fetch(`/api/admin/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { status: newStatus },
      })
      showToast(
        newStatus === 'ACTIVE' ? 'Abonnement réactivé avec succès.' : 'Abonnement désactivé.',
        'success'
      )
      await refresh()
    } catch (e) {
      const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
      showToast(err?.data?.statusMessage ?? 'Erreur lors de la mise à jour.', 'error')
    } finally {
      toggling.value = null
    }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    toast.message = msg
    toast.type = type
    setTimeout(() => { toast.message = '' }, 3500)
  }

  // ── Helpers ──────────────────────────────────────────────────
  function statusLabel(s: string) {
    const map: Record<string, string> = {
      ACTIVE: 'Actif',
      EXPIRED: 'Expiré',
      CANCELLED: 'Annulé',
      PENDING: 'En attente',
    }
    return map[s] ?? s
  }

  function statusClass(s: string) {
    if (s === 'ACTIVE') return 'bg-green-100 text-green-700'
    if (s === 'EXPIRED') return 'bg-gray-100 text-gray-500'
    if (s === 'CANCELLED') return 'bg-red-100 text-red-600'
    if (s === 'PENDING') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-500'
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysLeft(end: string | null) {
    if (!end) return 0
    return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000))
  }
</script>
