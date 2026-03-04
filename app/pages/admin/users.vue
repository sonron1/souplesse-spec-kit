<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
const { accessToken, user: authUser } = useAuth()

interface SafeUser { id: string; name: string; email: string; role: string; createdAt: string; emailVerified?: boolean }
interface UsersResponse { success: boolean; users: SafeUser[]; total: number; page: number; limit: number }

interface Subscription {
  id: string; status: string; type: string; startsAt: string | null; expiresAt: string | null
  subscriptionPlan?: { name: string; planType: string; price: number } | null
}
interface DetailResponse {
  user: SafeUser & { lockedUntil?: string | null }
  activeSubscription: Subscription | null
  subscriptions: Subscription[]
  assignment: { coach: { id: string; name: string; email: string } } | null
  stats: { totalBookings: number; totalPaid: number; bookingsByStatus: Record<string, number> }
}

const currentUserId = computed(() => (authUser.value as { id?: string } | null)?.id ?? '')
const page = ref(1)
const limit = 20
const search = ref('')
const roleFilter = ref('ALL')
const authHeaders = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

const { data, pending, error, refresh } = await useLazyFetch<UsersResponse>('/api/admin/users', {
  headers: authHeaders,
  query: computed(() => ({ page: page.value, limit })),
  default: () => ({ success: true, users: [], total: 0, page: 1, limit }),
})

const users = computed(() => data.value?.users ?? [])
const total = computed(() => data.value?.total ?? 0)
const hasNextPage = computed(() => page.value * limit < total.value)

const filteredUsers = computed(() => {
  let list = users.value
  if (roleFilter.value !== 'ALL') list = list.filter((u) => u.role === roleFilter.value)
  const q = search.value.toLowerCase().trim()
  if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  return list
})

const clientCount = computed(() => users.value.filter(u => u.role === 'CLIENT').length)
const coachCount = computed(() => users.value.filter(u => u.role === 'COACH').length)

async function changePage(delta: number) { page.value = Math.max(1, page.value + delta); await refresh() }

function roleClass(role: string) {
  if (role === 'ADMIN') return 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-400 text-black'
  if (role === 'COACH') return 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700'
  return 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Detail panel ──────────────────────────────────────────────
const detailUserId = ref<string | null>(null)
const detail = ref<DetailResponse | null>(null)
const loadingDetail = ref(false)

async function openDetail(u: SafeUser) {
  if (detailUserId.value === u.id) { detailUserId.value = null; detail.value = null; return }
  detailUserId.value = u.id
  loadingDetail.value = true
  detail.value = null
  try {
    detail.value = await $fetch<DetailResponse>(`/api/admin/users/${u.id}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
  } catch { detail.value = null }
  finally { loadingDetail.value = false }
}

function closeDetail() { detailUserId.value = null; detail.value = null }

function subStatusClass(s: string) {
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700'
  if (s === 'EXPIRED') return 'bg-gray-100 text-gray-500'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

function subStatusLabel(s: string) {
  const m: Record<string, string> = { ACTIVE: 'Actif', EXPIRED: 'Expire', CANCELLED: 'Annule', PENDING: 'En attente' }
  return m[s] ?? s
}

function daysLeft(end: string | null) {
  if (!end) return 0
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000))
}

// ── Create modal ──────────────────────────────────────────────
const createModal = reactive({
  open: false, name: '', email: '', password: '', role: 'CLIENT' as string,
  saving: false, error: '', generatedPassword: '',
})

function openCreate() {
  Object.assign(createModal, { open: true, name: '', email: '', password: '', role: 'CLIENT', error: '', generatedPassword: '' })
}

async function submitCreate() {
  createModal.error = ''
  createModal.saving = true
  try {
    const res = await $fetch<{ ok: boolean; generatedPassword?: string }>('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        name: createModal.name.trim(),
        email: createModal.email.trim(),
        password: createModal.password || undefined,
        role: createModal.role,
      },
    })
    if (res.generatedPassword) createModal.generatedPassword = res.generatedPassword
    else createModal.open = false
    showToast(`Utilisateur cree avec succes.`, 'success')
    await refresh()
  } catch (e) {
    const err = e as { data?: { message?: string }; message?: string }
    createModal.error = err?.data?.message ?? err?.message ?? 'Erreur inconnue'
  } finally { createModal.saving = false }
}

// ── Edit modal ────────────────────────────────────────────────
const editModal = reactive({ open: false, user: null as SafeUser | null,
  name: '', email: '', role: 'CLIENT' as string, saving: false, error: '' })

function openEditModal(u: SafeUser, e: Event) {
  e.stopPropagation()
  Object.assign(editModal, { user: u, name: u.name, email: u.email, role: u.role, error: '', open: true })
}
function closeEditModal() { editModal.open = false; editModal.user = null }

async function submitEdit() {
  if (!editModal.user) return
  editModal.error = ''; editModal.saving = true
  const changes: Record<string, string> = {}
  if (editModal.name.trim()  !== editModal.user.name)  changes.name  = editModal.name.trim()
  if (editModal.email.trim() !== editModal.user.email) changes.email = editModal.email.trim()
  if (editModal.role         !== editModal.user.role)  changes.role  = editModal.role
  if (!Object.keys(changes).length) { closeEditModal(); editModal.saving = false; return }
  try {
    await $fetch(`/api/admin/users/${editModal.user.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: changes,
    })
    closeEditModal(); showToast('Utilisateur mis a jour.', 'success'); await refresh()
    if (detailUserId.value === editModal.user.id) await openDetail({ ...editModal.user, ...changes } as SafeUser)
  } catch (e) {
    const err = e as { data?: { message?: string }; message?: string }
    editModal.error = err?.data?.message ?? err?.message ?? 'Erreur inconnue'
  } finally { editModal.saving = false }
}

// ── Delete modal ──────────────────────────────────────────────
const deleteModal = reactive({ open: false, user: null as SafeUser | null, deleting: false, error: '' })

function openDeleteModal(u: SafeUser, e: Event) {
  e.stopPropagation()
  Object.assign(deleteModal, { user: u, error: '', open: true })
}
function closeDeleteModal() { deleteModal.open = false; deleteModal.user = null }

async function submitDelete() {
  if (!deleteModal.user) return
  deleteModal.error = ''; deleteModal.deleting = true
  try {
    await $fetch(`/api/admin/users/${deleteModal.user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    closeDeleteModal(); showToast('Utilisateur supprime.', 'success')
    if (detailUserId.value === deleteModal.user.id) closeDetail()
    await refresh()
  } catch (e) {
    const err = e as { data?: { message?: string }; message?: string }
    deleteModal.error = err?.data?.message ?? err?.message ?? 'Erreur inconnue'
  } finally { deleteModal.deleting = false }
}

// ── Toast ─────────────────────────────────────────────────────
const toast = reactive({ message: '', type: 'success' as 'success' | 'error' })
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.message = msg; toast.type = type
  setTimeout(() => { toast.message = '' }, 3500)
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50">

    <!-- ══ Page header ══ -->
    <div class="bg-black text-white px-6 py-6 mb-6 rounded-2xl mx-0">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-white">Utilisateurs</h1>
          <p class="text-sm text-gray-400 mt-0.5">Gerez les comptes clients et coachs</p>
        </div>
        <!-- Stats chips -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
            <span class="text-xs text-gray-300">Total</span>
            <span class="text-sm font-bold text-yellow-400">{{ total }}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
            <span class="text-xs text-gray-300">Clients</span>
            <span class="text-sm font-bold text-white">{{ clientCount }}</span>
          </div>
          <div class="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
            <span class="text-xs text-gray-300">Coachs</span>
            <span class="text-sm font-bold text-blue-400">{{ coachCount }}</span>
          </div>
          <button
            class="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            @click="openCreate"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Creer un utilisateur
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Filters ══ -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4 px-0">
      <!-- Search -->
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input v-model="search" type="text" placeholder="Rechercher par nom ou email..."
          class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
        <button v-if="search" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="search = ''">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <!-- Role pills -->
      <div class="flex gap-2 flex-wrap">
        <button v-for="r in ['ALL', 'CLIENT', 'COACH', 'ADMIN']" :key="r"
          :class="['px-4 py-2 rounded-xl text-xs font-bold border transition-all',
            roleFilter === r
              ? 'bg-black text-yellow-400 border-black shadow'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50']"
          @click="roleFilter = r">
          {{ r === 'ALL' ? 'Tous' : r }}
        </button>
      </div>
    </div>

    <!-- ══ Main layout: table + detail panel ══ -->
    <div class="flex gap-5 flex-1 min-h-0">

      <!-- Table -->
      <div class="flex-1 min-w-0">
        <SkeletonLoader v-if="pending" :count="8" :height="56" />
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm text-center">
          Erreur lors du chargement des utilisateurs.
        </div>
        <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-black text-white">
                <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Utilisateur</th>
                <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Role</th>
                <th class="px-4 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell">Inscrit le</th>
                <th class="px-4 py-3.5 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="u in filteredUsers"
                :key="u.id"
                class="hover:bg-yellow-50/40 transition-colors cursor-pointer"
                :class="detailUserId === u.id ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''"
                @click="openDetail(u)"
              >
                <td class="px-4 py-3.5">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      :class="u.role === 'ADMIN' ? 'bg-yellow-400 text-black' : u.role === 'COACH' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
                    >
                      {{ u.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <p class="font-semibold text-gray-900 truncate">{{ u.name }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5">
                  <span :class="roleClass(u.role)">{{ u.role }}</span>
                </td>
                <td class="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell">{{ formatDate(u.createdAt) }}</td>
                <td class="px-4 py-3.5">
                  <div class="flex gap-2 items-center justify-end">
                    <button
                      class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Modifier"
                      @click="openEditModal(u, $event)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button
                      v-if="u.id !== currentUserId"
                      class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                      @click="openDeleteModal(u, $event)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="4" class="px-4 py-12 text-center text-gray-400 text-sm">
                  Aucun utilisateur trouve.
                </td>
              </tr>
            </tbody>
          </table>
          <!-- Pagination -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/50">
            <span class="text-xs text-gray-400">{{ filteredUsers.length }} affiche(s) / {{ total }} total</span>
            <div class="flex gap-2">
              <button :disabled="page <= 1"
                class="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                @click="changePage(-1)">Precedente</button>
              <span class="px-3 py-1.5 text-xs font-bold bg-black text-yellow-400 rounded-lg">{{ page }}</span>
              <button :disabled="!hasNextPage"
                class="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                @click="changePage(1)">Suivante</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ Detail panel ══ -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <aside
          v-if="detailUserId"
          class="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden"
          style="max-height: calc(100vh - 220px); position: sticky; top: 80px;"
        >
          <!-- Panel header -->
          <div class="bg-black px-4 py-3 flex items-center justify-between shrink-0">
            <p class="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Fiche utilisateur</p>
            <button class="text-gray-400 hover:text-white transition-colors" @click="closeDetail">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loadingDetail" class="flex-1 flex items-center justify-center py-12">
            <svg class="w-6 h-6 animate-spin text-yellow-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>

          <div v-else-if="detail" class="flex-1 overflow-y-auto">
            <!-- Identity -->
            <div class="px-4 py-5 border-b border-gray-50">
              <div class="flex items-start gap-3">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0"
                  :class="detail.user.role === 'ADMIN' ? 'bg-yellow-400 text-black' : detail.user.role === 'COACH' ? 'bg-blue-100 text-blue-700' : 'bg-black text-yellow-400'"
                >
                  {{ detail.user.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-bold text-gray-900 text-base leading-tight truncate">{{ detail.user.name }}</p>
                  <p class="text-xs text-gray-400 truncate mt-0.5">{{ detail.user.email }}</p>
                  <div class="flex items-center gap-2 mt-2">
                    <span :class="roleClass(detail.user.role)">{{ detail.user.role }}</span>
                    <span v-if="detail.user.emailVerified" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                      Email verifie
                    </span>
                    <span v-else class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                      Non verifie
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-3 text-xs text-gray-400">
                Inscrit le <span class="font-medium text-gray-600">{{ formatDate(detail.user.createdAt) }}</span>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 border-b border-gray-50">
              <div class="px-3 py-3 text-center border-r border-gray-50">
                <p class="text-lg font-extrabold text-gray-900">{{ detail.stats.totalBookings }}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">Reservations</p>
              </div>
              <div class="px-3 py-3 text-center border-r border-gray-50">
                <p class="text-lg font-extrabold text-gray-900">{{ detail.subscriptions.length }}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">Abonnements</p>
              </div>
              <div class="px-3 py-3 text-center">
                <p class="text-lg font-extrabold text-yellow-600">{{ detail.stats.totalPaid.toLocaleString() }}<span class="text-xs font-medium"> FCFA</span></p>
                <p class="text-[10px] text-gray-400 mt-0.5">Total paye</p>
              </div>
            </div>

            <!-- Active subscription -->
            <div class="px-4 py-4 border-b border-gray-50">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Abonnement actif</p>
              <div v-if="detail.activeSubscription" class="bg-green-50 border border-green-100 rounded-xl p-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-bold text-gray-900 text-sm">{{ detail.activeSubscription.subscriptionPlan?.name ?? detail.activeSubscription.type }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ detail.activeSubscription.subscriptionPlan?.planType ?? '' }}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 shrink-0">Actif</span>
                </div>
                <div v-if="detail.activeSubscription.expiresAt" class="mt-2 pt-2 border-t border-green-100 flex items-center justify-between text-xs">
                  <span class="text-gray-500">Expire le {{ formatDate(detail.activeSubscription.expiresAt) }}</span>
                  <span :class="daysLeft(detail.activeSubscription.expiresAt) <= 7 ? 'text-orange-600 font-bold' : 'text-gray-600 font-medium'">
                    {{ daysLeft(detail.activeSubscription.expiresAt) }}j restants
                  </span>
                </div>
              </div>
              <div v-else class="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center text-xs text-gray-400">
                Aucun abonnement actif
              </div>

              <!-- Assign subscription quick link -->
              <NuxtLink
                :to="`/admin/subscriptions`"
                class="mt-2 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-xl border border-yellow-200 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                Attribuer un abonnement
              </NuxtLink>
            </div>

            <!-- Coach assignment -->
            <div v-if="detail.user.role === 'CLIENT'" class="px-4 py-4 border-b border-gray-50">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coach assigne</p>
              <div v-if="detail.assignment" class="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                  {{ detail.assignment.coach.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-900 text-sm truncate">{{ detail.assignment.coach.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ detail.assignment.coach.email }}</p>
                </div>
              </div>
              <div v-else class="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                Aucun coach assigne
              </div>
            </div>

            <!-- All subscriptions -->
            <div v-if="detail.subscriptions.length > 0" class="px-4 py-4">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Historique abonnements</p>
              <div class="space-y-1.5">
                <div
                  v-for="sub in detail.subscriptions.slice(0, 5)"
                  :key="sub.id"
                  class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-xs"
                >
                  <span class="font-medium text-gray-700 truncate max-w-[60%]">{{ sub.subscriptionPlan?.name ?? sub.type }}</span>
                  <span :class="['px-2 py-0.5 rounded-full font-bold text-[10px]', subStatusClass(sub.status)]">
                    {{ subStatusLabel(sub.status) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="px-4 py-4 border-t border-gray-100 flex gap-2">
              <button
                class="flex-1 py-2 text-xs font-bold bg-black text-yellow-400 rounded-xl hover:bg-gray-900 transition-colors"
                @click="openEditModal(detail.user as SafeUser, $event)"
              >
                Modifier
              </button>
              <button
                v-if="detail.user.id !== currentUserId"
                class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                @click="openDeleteModal(detail.user as SafeUser, $event)"
              >
                Supprimer
              </button>
            </div>
          </div>
        </aside>
      </Transition>
    </div>
  </div>

  <!-- ══ Create user modal ══ -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="createModal.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <!-- Modal header -->
          <div class="bg-black px-6 py-4">
            <h2 class="text-lg font-extrabold text-white">Creer un utilisateur</h2>
            <p class="text-xs text-gray-400 mt-0.5">Le compte sera immediatement actif</p>
          </div>

          <div v-if="createModal.generatedPassword" class="px-6 py-6">
            <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <svg class="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="font-bold text-green-700 mb-3">Utilisateur cree avec succes !</p>
              <div class="bg-white border border-green-200 rounded-lg p-3 text-left">
                <p class="text-xs text-gray-500 mb-1">Mot de passe genere :</p>
                <p class="font-mono font-bold text-gray-900 select-all text-base">{{ createModal.generatedPassword }}</p>
              </div>
              <p class="text-xs text-gray-500 mt-2">Notez ce mot de passe — il ne sera plus affiche.</p>
            </div>
            <button class="mt-4 w-full py-2.5 bg-black text-yellow-400 font-bold rounded-xl hover:bg-gray-900 transition-colors" @click="createModal.open = false; createModal.generatedPassword = ''">Fermer</button>
          </div>

          <div v-else class="px-6 py-6 space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nom complet</label>
              <input v-model="createModal.name" type="text" placeholder="Jean Dupont"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input v-model="createModal.email" type="email" placeholder="jean@example.com"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe <span class="text-gray-400 font-normal">(laisser vide pour auto-generer)</span></label>
              <input v-model="createModal.password" type="password" placeholder="Min. 8 caracteres"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
              <div class="flex gap-2">
                <button v-for="r in ['CLIENT', 'COACH']" :key="r"
                  :class="['flex-1 py-2 text-sm font-bold rounded-xl border-2 transition-all',
                    createModal.role === r
                      ? 'bg-black text-yellow-400 border-black'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400']"
                  @click="createModal.role = r">
                  {{ r }}
                </button>
              </div>
            </div>
            <p v-if="createModal.error" class="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{{ createModal.error }}</p>
            <div class="flex gap-3 pt-1">
              <button class="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors" @click="createModal.open = false">Annuler</button>
              <button
                class="flex-1 py-2.5 text-sm font-bold bg-yellow-400 text-black rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!createModal.name || !createModal.email || createModal.saving"
                @click="submitCreate"
              >
                {{ createModal.saving ? 'Creation...' : 'Creer le compte' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ══ Edit modal ══ -->
  <Teleport to="body">
    <div v-if="editModal.open" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div class="bg-black px-6 py-4">
          <h2 class="text-base font-extrabold text-white">Modifier l'utilisateur</h2>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
            <input v-model="editModal.name" type="text" class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" placeholder="Nom complet"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input v-model="editModal.email" type="email" class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition" placeholder="email@exemple.com"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
            <select v-model="editModal.role" class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition bg-white">
              <option value="CLIENT">CLIENT</option>
              <option value="COACH">COACH</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <p v-if="editModal.error" class="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{{ editModal.error }}</p>
          <div class="flex gap-3 pt-1">
            <button class="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors" @click="closeEditModal">Annuler</button>
            <button class="flex-1 py-2.5 text-sm font-bold bg-black text-yellow-400 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-60" :disabled="editModal.saving" @click="submitEdit">
              {{ editModal.saving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ Delete modal ══ -->
  <Teleport to="body">
    <div v-if="deleteModal.open" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div class="bg-red-600 px-6 py-4 flex items-center gap-3">
          <svg class="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          <h2 class="text-base font-extrabold text-white">Supprimer l'utilisateur</h2>
        </div>
        <div class="px-6 py-5">
          <p class="text-sm text-gray-600 leading-relaxed">
            Cette action est irreversible. Toutes les donnees de
            <strong class="text-gray-900">{{ deleteModal.user?.name }}</strong>
            seront supprimees.
          </p>
          <p v-if="deleteModal.error" class="text-red-600 text-sm mt-3 bg-red-50 rounded-xl px-3 py-2">{{ deleteModal.error }}</p>
          <div class="flex gap-3 mt-5">
            <button class="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors" @click="closeDeleteModal">Annuler</button>
            <button
              class="flex-1 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
              :disabled="deleteModal.deleting" @click="submitDelete">
              {{ deleteModal.deleting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ Toast ══ -->
  <Teleport to="body">
    <Transition name="fade-up">
      <div
        v-if="toast.message"
        :class="[
          'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold',
          toast.type === 'success' ? 'bg-black text-yellow-400' : 'bg-red-600 text-white'
        ]"
      >
        <svg v-if="toast.type === 'success'" class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>