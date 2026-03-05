<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Messages — Coachs</h1>
          <p class="text-sm text-gray-400 mt-0.5">Messagerie directe avec les coachs.</p>
        </div>
      </div>
      <!-- Start new thread button -->
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-primary-400 font-semibold text-sm hover:bg-gray-900 transition-colors"
        @click="showNewThread = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Nouveau message
      </button>
    </div>

    <!-- New thread modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showNewThread" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </div>
              <h2 class="font-bold text-gray-900">Choisir un coach</h2>
            </div>
            <select v-model="newThreadCoachId" class="input mb-5">
              <option value="" disabled>Sélectionner un coach…</option>
              <option v-for="c in allCoaches" :key="c.id" :value="c.id">{{ c.name }} — {{ c.email }}</option>
            </select>
            <div class="flex gap-3 justify-end">
              <button class="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" @click="showNewThread = false">Annuler</button>
              <button class="px-4 py-2 rounded-xl text-sm font-semibold bg-black text-primary-400 hover:bg-gray-900 disabled:opacity-40 transition-colors" :disabled="!newThreadCoachId" @click="openNewThread">Ouvrir la conversation →</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="flex gap-4 h-[calc(100vh-14rem)]">

      <!-- Left: coach list -->
      <div class="w-72 shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-0.5">
        <SkeletonLoader v-if="pendingConvos" :count="4" :height="64" />

        <div v-else-if="conversations.length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-10">
          <div class="w-10 h-10 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <p class="text-sm font-medium text-gray-500">Aucune conversation</p>
          <p class="text-xs text-gray-400 mt-0.5">Démarrez-en une →</p>
        </div>

        <button
          v-for="conv in conversations"
          :key="conv.coachId"
          class="w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors border"
          :class="selected?.coachId === conv.coachId
            ? 'bg-primary-400/5 border-primary-400 shadow-sm'
            : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'"
          @click="selectConv(conv)"
        >
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            :class="selected?.coachId === conv.coachId ? 'bg-black text-primary-400' : 'bg-gray-100 text-gray-500'"
          >
            {{ conv.coach?.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <p class="font-semibold text-gray-900 text-sm truncate">{{ conv.coach?.name }}</p>
              <span
                v-if="conv.unreadCount > 0"
                class="shrink-0 bg-primary-400 text-black text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center"
              >{{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}</span>
            </div>
            <p v-if="conv.lastMessage" class="text-xs text-gray-400 truncate mt-0.5">{{ conv.lastMessage.body }}</p>
            <p v-else class="text-xs text-gray-300 italic mt-0.5">Aucun message</p>
          </div>
        </button>
      </div>

      <!-- Right: thread -->
      <div class="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <!-- Placeholder when nothing selected -->
        <div v-if="!selected" class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-gray-500">Sélectionnez un coach</p>
            <p class="text-xs text-gray-400 mt-0.5">ou démarrez une nouvelle conversation</p>
          </div>
          <button
            class="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-black text-primary-400 hover:bg-gray-900 transition-colors"
            @click="showNewThread = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nouveau message
          </button>
        </div>

        <template v-else>
          <!-- Coach header bar -->
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0 bg-gray-50/60">
            <div class="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-sm font-bold text-primary-400 shrink-0">
              {{ selected.coach?.name?.[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-gray-900 text-sm">{{ selected.coach?.name }}</p>
              <p class="text-xs text-gray-400">{{ selected.coach?.email }}</p>
            </div>
          </div>

          <!-- Messages area -->
          <div ref="scrollEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
            <SkeletonLoader v-if="loadingMessages" :count="3" :height="48" />
            <div v-else-if="messages.length === 0" class="text-center text-sm text-gray-400 mt-10">
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
                  ? 'bg-black text-primary-400 rounded-br-sm'
                  : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'"
              >
                <p>{{ msg.body }}</p>
                <p
                  class="text-[10px] mt-1 text-right"
                  :class="msg.sender.role === 'ADMIN' ? 'text-primary-400/60' : 'text-gray-400'"
                >{{ formatTime(msg.createdAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Input bar -->
          <div class="border-t border-gray-100 px-4 py-3 flex gap-2 items-end shrink-0 bg-white">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Votre message…"
              class="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 focus:bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 transition-colors"
              @keydown.enter.exact.prevent="send"
            />
            <button
              class="w-10 h-10 rounded-full bg-black text-primary-400 flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-gray-800 transition-colors"
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

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

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
