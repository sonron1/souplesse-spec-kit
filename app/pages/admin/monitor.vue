<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserRef { id: string; name: string; email: string }
interface LastMessage {
  id: string; body: string; createdAt: string; senderId: string; readAt: string | null
  sender: { name: string; role: string }
}
interface Thread {
  coachId: string; clientId: string
  coach: UserRef | null; client: UserRef | null
  lastMessage: LastMessage | null
  messageCount: number; unreadCount: number
}
interface Message {
  id: string; body: string; createdAt: string; senderId: string; readAt: string | null
  sender: { id: string; name: string; role: string }
}

// ─── Data ────────────────────────────────────────────────────────────────────
const { data: threadsData, pending: loadingThreads, error: threadsError } = await useFetch<{ threads: Thread[]; total: number }>('/api/admin/monitor')

const selectedThread = ref<Thread | null>(null)
const messages = ref<Message[]>([])
const loadingMessages = ref(false)
const search = ref('')

const threads = computed(() => threadsData.value?.threads ?? [])

const filteredThreads = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return threads.value
  return threads.value.filter(t =>
    t.coach?.name?.toLowerCase().includes(q) ||
    t.client?.name?.toLowerCase().includes(q) ||
    t.coach?.email?.toLowerCase().includes(q) ||
    t.client?.email?.toLowerCase().includes(q)
  )
})

async function selectThread(thread: Thread) {
  selectedThread.value = thread
  loadingMessages.value = true
  messages.value = []
  try {
    const res = await $fetch<{ messages: Message[] }>(
      `/api/admin/monitor/thread?coachId=${thread.coachId}&clientId=${thread.clientId}`
    )
    messages.value = res.messages
  } catch {
    messages.value = []
  } finally {
    loadingMessages.value = false
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

const totalUnread = computed(() => threads.value.reduce((s, t) => s + t.unreadCount, 0))
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <!-- Page header -->
    <div class="border-b border-gray-800 bg-gray-900/60 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Surveillance des messages
          </h1>
          <p class="text-sm text-gray-400 mt-0.5">Modération des conversations coach ↔ client — lecture seule</p>
        </div>
        <div class="flex items-center gap-3 text-sm text-gray-400">
          <span>{{ threads.length }} conversation{{ threads.length !== 1 ? 's' : '' }}</span>
          <span v-if="totalUnread > 0" class="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-xs font-semibold">
            {{ totalUnread }} non lu{{ totalUnread !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading / Error states -->
    <div v-if="loadingThreads" class="flex items-center justify-center min-h-[50vh]">
      <div class="flex items-center gap-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des conversations…
      </div>
    </div>

    <div v-else-if="threadsError" class="max-w-7xl mx-auto px-6 py-12 text-center text-red-400">
      Erreur lors du chargement des conversations.
    </div>

    <div v-else class="max-w-7xl mx-auto flex h-[calc(100vh-120px)]">
      <!-- ── Sidebar: thread list ────────────────────────────── -->
      <aside class="w-80 shrink-0 border-r border-gray-800 flex flex-col">
        <!-- Search -->
        <div class="p-3 border-b border-gray-800">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Rechercher…"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filteredThreads.length === 0" class="flex-1 flex items-center justify-center text-center p-6">
          <div class="text-gray-500 text-sm">Aucune conversation trouvée</div>
        </div>

        <!-- Thread list -->
        <div v-else class="flex-1 overflow-y-auto">
          <button
            v-for="thread in filteredThreads"
            :key="`${thread.coachId}_${thread.clientId}`"
            class="w-full text-left p-4 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors"
            :class="selectedThread?.coachId === thread.coachId && selectedThread?.clientId === thread.clientId
              ? 'bg-gray-800 border-l-2 border-l-yellow-400'
              : ''"
            @click="selectThread(thread)"
          >
            <!-- Names -->
            <div class="flex items-start justify-between gap-2 mb-1">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="text-xs font-semibold text-blue-400">Coach</span>
                  <span class="text-sm font-medium text-white truncate">{{ thread.coach?.name ?? '—' }}</span>
                </div>
                <div class="flex items-center gap-1.5 truncate">
                  <span class="text-xs font-semibold text-green-400">Client</span>
                  <span class="text-sm text-gray-300 truncate">{{ thread.client?.name ?? '—' }}</span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-[10px] text-gray-500">
                  {{ thread.lastMessage ? relativeTime(thread.lastMessage.createdAt) : '' }}
                </div>
                <span v-if="thread.unreadCount > 0" class="inline-block mt-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5">
                  {{ thread.unreadCount }}
                </span>
              </div>
            </div>
            <!-- Last message preview -->
            <p v-if="thread.lastMessage" class="text-xs text-gray-500 truncate mt-1">
              <span class="font-medium text-gray-400">{{ thread.lastMessage.sender.name }}:</span>
              {{ thread.lastMessage.body }}
            </p>
            <!-- Stats -->
            <div class="flex items-center gap-3 mt-2">
              <span class="text-[10px] text-gray-600">{{ thread.messageCount }} message{{ thread.messageCount !== 1 ? 's' : '' }}</span>
            </div>
          </button>
        </div>
      </aside>

      <!-- ── Right: thread viewer ────────────────────────────── -->
      <main class="flex-1 flex flex-col bg-gray-950 min-w-0">
        <!-- No thread selected -->
        <div v-if="!selectedThread" class="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <svg class="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p class="text-gray-500 text-sm">Sélectionnez une conversation pour la lire</p>
          </div>
        </div>

        <template v-else>
          <!-- Thread header -->
          <div class="border-b border-gray-800 bg-gray-900/40 px-5 py-3 shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <!-- Coach -->
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                    {{ selectedThread.coach?.name?.charAt(0).toUpperCase() ?? '?' }}
                  </div>
                  <div>
                    <p class="text-xs text-blue-400 font-semibold leading-tight">Coach</p>
                    <p class="text-sm font-medium text-white leading-tight">{{ selectedThread.coach?.name ?? '—' }}</p>
                  </div>
                </div>
                <!-- Arrow -->
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                <!-- Client -->
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-400">
                    {{ selectedThread.client?.name?.charAt(0).toUpperCase() ?? '?' }}
                  </div>
                  <div>
                    <p class="text-xs text-green-400 font-semibold leading-tight">Client</p>
                    <p class="text-sm font-medium text-white leading-tight">{{ selectedThread.client?.name ?? '—' }}</p>
                  </div>
                </div>
              </div>
              <div class="text-xs text-gray-500">
                {{ messages.length }} message{{ messages.length !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-5 space-y-3">
            <div v-if="loadingMessages" class="flex items-center justify-center h-full">
              <div class="flex items-center gap-2 text-gray-500 text-sm">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Chargement…
              </div>
            </div>

            <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full">
              <p class="text-gray-600 text-sm">Aucun message dans cette conversation.</p>
            </div>

            <template v-else>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-3"
                :class="msg.sender.role === 'COACH' ? 'flex-row-reverse' : ''"
              >
                <!-- Avatar -->
                <div
                  class="w-7 h-7 rounded-full flex-none flex items-center justify-center text-xs font-bold"
                  :class="msg.sender.role === 'COACH' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'"
                >
                  {{ msg.sender.name.charAt(0).toUpperCase() }}
                </div>
                <!-- Bubble -->
                <div class="max-w-[72%]">
                  <div
                    class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    :class="msg.sender.role === 'COACH'
                      ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                      : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'"
                  >
                    {{ msg.body }}
                  </div>
                  <div
                    class="flex items-center gap-2 mt-1 text-[10px] text-gray-600"
                    :class="msg.sender.role === 'COACH' ? 'flex-row-reverse' : ''"
                  >
                    <span class="font-medium" :class="msg.sender.role === 'COACH' ? 'text-blue-500' : 'text-green-500'">
                      {{ msg.sender.name }}
                    </span>
                    <span>{{ formatTime(msg.createdAt) }}</span>
                    <span v-if="msg.readAt" class="text-gray-700">Lu</span>
                    <span v-else class="text-orange-500/70">Non lu</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Read-only notice -->
          <div class="border-t border-gray-800 bg-gray-900/40 px-5 py-3 shrink-0">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Mode consultation — vous ne pouvez pas envoyer de messages ici.
              Pour contacter un coach, utilisez la page <NuxtLink to="/admin/messages" class="text-yellow-400 hover:underline">Messages coachs</NuxtLink>.
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
