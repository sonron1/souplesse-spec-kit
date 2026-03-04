<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

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
interface CoachGroup { coach: UserRef | null; threads: Thread[] }
interface Message {
  id: string; body: string; createdAt: string; senderId: string; readAt: string | null
  sender: { id: string; name: string; role: string }
}

const { data, pending: loadingThreads, error: threadsError } = await useFetch<{ byCoach: CoachGroup[]; totalThreads: number }>('/api/admin/monitor')

const selectedCoach = ref<CoachGroup | null>(null)
const selectedThread = ref<Thread | null>(null)
const messages = ref<Message[]>([])
const loadingMessages = ref(false)
const search = ref('')

const byCoach = computed(() => data.value?.byCoach ?? [])
const totalThreads = computed(() => data.value?.totalThreads ?? 0)
const totalUnread = computed(() =>
  byCoach.value.reduce((s, g) => s + g.threads.reduce((ts, t) => ts + t.unreadCount, 0), 0)
)

const filteredCoaches = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return byCoach.value
  return byCoach.value
    .map(g => ({
      ...g,
      threads: g.threads.filter(t =>
        t.client?.name?.toLowerCase().includes(q) ||
        t.client?.email?.toLowerCase().includes(q)
      ),
    }))
    .filter(g =>
      g.coach?.name?.toLowerCase().includes(q) ||
      g.coach?.email?.toLowerCase().includes(q) ||
      g.threads.length > 0
    )
})

function selectCoach(group: CoachGroup) {
  selectedCoach.value = group
  selectedThread.value = null
  messages.value = []
}

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
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function coachUnread(group: CoachGroup) {
  return group.threads.reduce((s, t) => s + t.unreadCount, 0)
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white flex flex-col">
    <!-- Header -->
    <div class="border-b border-gray-800 bg-gray-900/60 px-6 py-4 shrink-0">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Surveillance des messages
          </h1>
          <p class="text-sm text-gray-400 mt-0.5">Moderation coach cliento client — lecture seule</p>
        </div>
        <div class="flex items-center gap-3 text-sm text-gray-400">
          <span>{{ totalThreads }} conversation{{ totalThreads !== 1 ? 's' : '' }}</span>
          <span v-if="totalUnread > 0" class="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-xs font-semibold">
            {{ totalUnread }} non lu{{ totalUnread !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingThreads" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-400">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des conversations...
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="threadsError" class="flex-1 flex items-center justify-center text-red-400 text-sm">
      Erreur lors du chargement des conversations.
    </div>

    <!-- 3-panel layout -->
    <div v-else class="flex flex-1 overflow-hidden">

      <!-- Panel 1: Coaches -->
      <aside class="w-56 shrink-0 border-r border-gray-800 flex flex-col bg-gray-900/30">
        <div class="p-3 border-b border-gray-800">
          <p class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">Coachs</p>
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input v-model="search" type="text" placeholder="Rechercher..."
              class="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"/>
          </div>
        </div>
        <div v-if="filteredCoaches.length === 0" class="flex-1 flex items-center justify-center p-4">
          <p class="text-gray-600 text-xs text-center">Aucun coach</p>
        </div>
        <div v-else class="flex-1 overflow-y-auto">
          <button
            v-for="group in filteredCoaches"
            :key="group.coach?.id ?? 'unknown'"
            class="w-full text-left px-3 py-3 border-b border-gray-800/40 hover:bg-gray-800/50 transition-colors"
            :class="selectedCoach?.coach?.id === group.coach?.id ? 'bg-gray-800 border-l-2 border-l-yellow-400' : ''"
            @click="selectCoach(group)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                  {{ group.coach?.name?.charAt(0).toUpperCase() ?? '?' }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-white truncate">{{ group.coach?.name ?? '—' }}</p>
                  <p class="text-[10px] text-gray-500">{{ group.threads.length }} client{{ group.threads.length !== 1 ? 's' : '' }}</p>
                </div>
              </div>
              <span v-if="coachUnread(group) > 0" class="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-5 shrink-0">
                {{ coachUnread(group) }}
              </span>
            </div>
          </button>
        </div>
      </aside>

      <!-- Panel 2: Threads for selected coach -->
      <aside class="w-64 shrink-0 border-r border-gray-800 flex flex-col">
        <div v-if="!selectedCoach" class="flex-1 flex items-center justify-center p-4 text-center">
          <p class="text-gray-600 text-xs">Selectionnez un coach</p>
        </div>
        <template v-else>
          <div class="px-3 py-2.5 border-b border-gray-800 shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                {{ selectedCoach.coach?.name?.charAt(0).toUpperCase() ?? '?' }}
              </div>
              <div>
                <p class="text-xs font-semibold text-white">{{ selectedCoach.coach?.name }}</p>
                <p class="text-[10px] text-gray-500">{{ selectedCoach.threads.length }} conversation{{ selectedCoach.threads.length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
          </div>
          <div v-if="selectedCoach.threads.length === 0" class="flex-1 flex items-center justify-center p-4">
            <p class="text-gray-600 text-xs text-center">Aucune conversation</p>
          </div>
          <div v-else class="flex-1 overflow-y-auto">
            <button
              v-for="thread in selectedCoach.threads"
              :key="thread.clientId"
              class="w-full text-left p-3 border-b border-gray-800/40 hover:bg-gray-800/50 transition-colors"
              :class="selectedThread?.clientId === thread.clientId ? 'bg-gray-800 border-l-2 border-l-green-400' : ''"
              @click="selectThread(thread)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-[10px] font-bold text-green-400 shrink-0">
                    {{ thread.client?.name?.charAt(0).toUpperCase() ?? '?' }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-white truncate">{{ thread.client?.name ?? '—' }}</p>
                    <p class="text-[10px] text-gray-500 truncate">{{ thread.client?.email }}</p>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-[10px] text-gray-600">{{ thread.lastMessage ? relativeTime(thread.lastMessage.createdAt) : '' }}</p>
                  <span v-if="thread.unreadCount > 0" class="inline-block mt-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[16px] text-center leading-4">
                    {{ thread.unreadCount }}
                  </span>
                </div>
              </div>
              <p v-if="thread.lastMessage" class="text-[10px] text-gray-500 truncate mt-1.5 pl-8">
                <span class="font-medium text-gray-400">{{ thread.lastMessage.sender.name }}:</span>
                {{ thread.lastMessage.body }}
              </p>
              <p class="text-[10px] text-gray-700 mt-1 pl-8">{{ thread.messageCount }} msg</p>
            </button>
          </div>
        </template>
      </aside>

      <!-- Panel 3: Message viewer -->
      <main class="flex-1 flex flex-col min-w-0 bg-gray-950">
        <div v-if="!selectedThread" class="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <svg class="w-14 h-14 text-gray-800 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p class="text-gray-600 text-sm">Selectionnez une conversation</p>
          </div>
        </div>
        <template v-else>
          <!-- Thread header -->
          <div class="border-b border-gray-800 bg-gray-900/40 px-5 py-3 shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                    {{ selectedThread.coach?.name?.charAt(0).toUpperCase() ?? '?' }}
                  </div>
                  <div>
                    <p class="text-[10px] text-blue-400 font-semibold leading-tight">Coach</p>
                    <p class="text-sm font-medium text-white leading-tight">{{ selectedThread.coach?.name ?? '—' }}</p>
                  </div>
                </div>
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xs font-bold text-green-400">
                    {{ selectedThread.client?.name?.charAt(0).toUpperCase() ?? '?' }}
                  </div>
                  <div>
                    <p class="text-[10px] text-green-400 font-semibold leading-tight">Client</p>
                    <p class="text-sm font-medium text-white leading-tight">{{ selectedThread.client?.name ?? '—' }}</p>
                  </div>
                </div>
              </div>
              <p class="text-xs text-gray-500">{{ messages.length }} message{{ messages.length !== 1 ? 's' : '' }}</p>
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-5 space-y-3">
            <div v-if="loadingMessages" class="flex items-center justify-center h-32">
              <svg class="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
            <div v-else-if="messages.length === 0" class="flex items-center justify-center h-32">
              <p class="text-gray-600 text-sm">Aucun message.</p>
            </div>
            <template v-else>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-3"
                :class="msg.sender.role === 'COACH' ? 'flex-row-reverse' : ''"
              >
                <div
                  class="w-7 h-7 rounded-full flex-none flex items-center justify-center text-xs font-bold shrink-0"
                  :class="msg.sender.role === 'COACH' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'"
                >
                  {{ msg.sender.name.charAt(0).toUpperCase() }}
                </div>
                <div class="max-w-[70%]">
                  <div
                    class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    :class="msg.sender.role === 'COACH'
                      ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                      : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'"
                  >
                    {{ msg.body }}
                  </div>
                  <div class="flex items-center gap-2 mt-1 text-[10px] text-gray-600" :class="msg.sender.role === 'COACH' ? 'flex-row-reverse' : ''">
                    <span class="font-medium" :class="msg.sender.role === 'COACH' ? 'text-blue-500' : 'text-green-500'">{{ msg.sender.name }}</span>
                    <span>{{ formatTime(msg.createdAt) }}</span>
                    <span :class="msg.readAt ? 'text-gray-700' : 'text-orange-500/70'">{{ msg.readAt ? 'Lu' : 'Non lu' }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Read-only notice -->
          <div class="border-t border-gray-800 bg-gray-900/40 px-5 py-3 shrink-0">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Mode consultation — pour contacter un coach utilisez
              <NuxtLink to="/admin/messages" class="text-yellow-400 hover:underline">Messages coachs</NuxtLink>.
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>