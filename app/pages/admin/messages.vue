<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Messages — Coachs</h1>
        <p class="text-sm text-gray-500 mt-0.5">Messagerie directe avec les coachs.</p>
      </div>
      <!-- Start new thread button -->
      <button class="btn-primary gap-1.5" @click="showNewThread = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Nouveau message
      </button>
    </div>

    <!-- New thread modal -->
    <div v-if="showNewThread" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 class="font-semibold text-gray-800 mb-4">Choisir un coach</h2>
        <select v-model="newThreadCoachId" class="input mb-4">
          <option value="" disabled>Sélectionner un coach</option>
          <option v-for="c in allCoaches" :key="c.id" :value="c.id">{{ c.name }} — {{ c.email }}</option>
        </select>
        <div class="flex gap-3 justify-end">
          <button class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900" @click="showNewThread = false">Annuler</button>
          <button class="btn-primary" :disabled="!newThreadCoachId" @click="openNewThread">Ouvrir →</button>
        </div>
      </div>
    </div>

    <div class="flex gap-4 h-[calc(100vh-13rem)]">

      <!-- Left: coach list -->
      <div class="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto">
        <SkeletonLoader v-if="pendingConvos" :count="4" :height="64" />

        <div v-else-if="conversations.length === 0" class="card text-center py-10 text-gray-400 text-sm">
          Aucune conversation — démarrez-en une.
        </div>

        <button
          v-for="conv in conversations"
          :key="conv.coachId"
          class="w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors border"
          :class="selected?.coachId === conv.coachId
            ? 'bg-primary-50 border-primary-200'
            : 'bg-white border-gray-100 hover:bg-gray-50'"
          @click="selectConv(conv)"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            :class="selected?.coachId === conv.coachId ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'"
          >
            {{ conv.coach?.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-gray-900 text-sm truncate">{{ conv.coach?.name }}</p>
              <span
                v-if="conv.unreadCount > 0"
                class="shrink-0 ml-1 bg-primary-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >{{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}</span>
            </div>
            <p v-if="conv.lastMessage" class="text-xs text-gray-400 truncate mt-0.5">{{ conv.lastMessage.body }}</p>
            <p v-else class="text-xs text-gray-300 italic mt-0.5">Aucun message</p>
          </div>
        </button>
      </div>

      <!-- Right: thread -->
      <div class="flex-1 card flex flex-col overflow-hidden p-0">
        <div v-if="!selected" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Sélectionnez un coach ou démarrez une conversation
        </div>

        <template v-else>
          <!-- Coach header -->
          <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
            <div class="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
              {{ selected.coach?.name?.[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-gray-900 text-sm">{{ selected.coach?.name }}</p>
              <p class="text-xs text-gray-400">{{ selected.coach?.email }}</p>
            </div>
          </div>

          <!-- Messages -->
          <div ref="scrollEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <SkeletonLoader v-if="loadingMessages" :count="3" :height="48" />
            <div v-else-if="messages.length === 0" class="text-center text-sm text-gray-400 mt-8">
              Commencez la conversation — envoyez le premier message.
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex"
              :class="msg.sender.role === 'ADMIN' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                :class="msg.sender.role === 'ADMIN'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'"
              >
                <p>{{ msg.body }}</p>
                <p
                  class="text-[10px] mt-1 text-right"
                  :class="msg.sender.role === 'ADMIN' ? 'text-primary-200' : 'text-gray-400'"
                >{{ formatTime(msg.createdAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="border-t border-gray-100 px-4 py-3 flex gap-3 items-end shrink-0">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Votre message…"
              class="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              @keydown.enter.exact.prevent="send"
            />
            <button
              class="btn-primary px-4 py-2.5 text-sm shrink-0 disabled:opacity-50"
              :disabled="!draft.trim() || sending"
              @click="send"
            >
              <svg v-if="sending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'admin'] })

  const { user: me, accessToken, ensureFresh } = useAuth()
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface Coach { id: string; name: string; email: string }
  interface ConvRow {
    coachId: string
    coach: Coach | null
    lastMessage: { body: string; createdAt: string; senderId: string } | null
    unreadCount: number
  }
  interface Message {
    id: string; body: string; createdAt: string
    sender: { id: string; name: string; role: string }
  }

  // All conversations
  const { data: convoData, pending: pendingConvos, refresh: refreshConvos } =
    await useLazyFetch<{ conversations: ConvRow[] }>('/api/messages', {
      headers,
      default: () => ({ conversations: [] }),
    })
  const conversations = computed(() => convoData.value?.conversations ?? [])

  // All coaches (for new thread modal)
  const { data: coachData } = await useLazyFetch<{ coaches: Coach[] }>('/api/coaches', {
    headers,
    default: () => ({ coaches: [] }),
  })
  const allCoaches = computed(() => coachData.value?.coaches ?? [])

  // Selected conversation
  const selected = ref<ConvRow | null>(null)
  const messages = ref<Message[]>([])
  const loadingMessages = ref(false)
  const scrollEl = ref<HTMLElement | null>(null)

  async function selectConv(conv: ConvRow) {
    selected.value = conv
    await loadMessages()
  }

  async function loadMessages() {
    if (!selected.value) return
    loadingMessages.value = true
    try {
      const data = await $fetch<{ messages: Message[] }>(
        `/api/messages/${selected.value.coachId}`,
        { headers: { Authorization: `Bearer ${accessToken.value}` } }
      )
      messages.value = data.messages
      nextTick(() => { if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight })
    } catch { /* silent */ } finally {
      loadingMessages.value = false
    }
  }

  // Poll every 10s
  let pollTimer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    pollTimer = setInterval(async () => {
      await ensureFresh()
      await refreshConvos()
      if (selected.value) await loadMessages()
    }, 10000)
  })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  // New thread modal
  const showNewThread = ref(false)
  const newThreadCoachId = ref('')

  function openNewThread() {
    const coachId = newThreadCoachId.value
    showNewThread.value = false
    newThreadCoachId.value = ''
    const existing = conversations.value.find((c) => c.coachId === coachId)
    if (existing) {
      selectConv(existing)
    } else {
      const coach = allCoaches.value.find((c) => c.id === coachId) ?? null
      const newConv: ConvRow = { coachId, coach, lastMessage: null, unreadCount: 0 }
      selected.value = newConv
      messages.value = []
    }
  }

  // Send message
  const draft = ref('')
  const sending = ref(false)

  async function send() {
    if (!draft.value.trim() || !selected.value || sending.value) return
    sending.value = true
    const body = draft.value.trim()
    draft.value = ''
    try {
      const res = await $fetch<{ message: Message }>('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { toUserId: selected.value.coachId, body },
      })
      messages.value.push(res.message)
      nextTick(() => { if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight })
      await refreshConvos()
    } catch { /* silent */ } finally {
      sending.value = false
    }
  }

  function formatTime(str: string) {
    return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
</script>
