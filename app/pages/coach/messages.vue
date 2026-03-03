<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Messages</h1>

    <!-- Loading -->
    <SkeletonLoader v-if="pending" :count="4" :height="64" />

    <!-- Empty -->
    <div v-else-if="conversations.length === 0" class="card text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucune conversation</p>
      <p class="text-sm text-gray-400">Vos clients assignés apparaîtront ici.</p>
    </div>

    <!-- Split panel -->
    <div v-else class="flex gap-4 h-[calc(100vh-13rem)]">

      <!-- Left sidebar: conversation list -->
      <div class="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto">
        <button
          v-for="conv in conversations"
          :key="conv.client.id"
          class="w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors border"
          :class="selected?.client.id === conv.client.id
            ? 'bg-primary-50 border-primary-200'
            : 'bg-white border-gray-100 hover:bg-gray-50'"
          @click="selectConversation(conv)"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            :class="selected?.client.id === conv.client.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'"
          >
            {{ conv.client.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-gray-900 text-sm truncate">{{ conv.client.name }}</p>
              <span
                v-if="conv.unreadCount > 0"
                class="shrink-0 ml-1 bg-primary-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {{ conv.unreadCount > 9 ? '9+' : conv.unreadCount }}
              </span>
            </div>
            <p v-if="conv.lastMessage" class="text-xs text-gray-400 truncate mt-0.5">
              {{ conv.lastMessage.body }}
            </p>
            <p v-else class="text-xs text-gray-300 italic mt-0.5">Aucun message</p>
          </div>
        </button>
      </div>

      <!-- Right: conversation thread -->
      <div class="flex-1 card flex flex-col overflow-hidden p-0">
        <!-- Placeholder when nothing selected -->
        <div v-if="!selected" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Sélectionnez une conversation
        </div>

        <template v-else>
          <!-- Client header -->
          <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
            <div class="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
              {{ selected.client.name?.[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-semibold text-gray-900 text-sm">{{ selected.client.name }}</p>
              <p class="text-xs text-gray-400">{{ selected.client.email }}</p>
            </div>
          </div>

          <!-- Messages -->
          <div ref="scrollEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div v-if="messages.length === 0" class="text-center text-sm text-gray-400 mt-8">
              Commencez la conversation — envoyez le premier message.
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex"
              :class="msg.sender.id === me?.id ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                :class="msg.sender.id === me?.id
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'"
              >
                <p>{{ msg.body }}</p>
                <p
                  class="text-[10px] mt-1 text-right"
                  :class="msg.sender.id === me?.id ? 'text-primary-200' : 'text-gray-400'"
                >
                  {{ formatTime(msg.createdAt) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="border-t border-gray-100 px-4 py-3 flex gap-3 items-end shrink-0">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Votre message…"
              class="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              :disabled="sending"
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
  definePageMeta({ middleware: ['auth', 'coach'] })

  const { user: me, accessToken } = useAuth()
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface ConversationRow {
    client: { id: string; name: string; email: string }
    lastMessage: { body: string; createdAt: string; senderId: string } | null
    unreadCount: number
  }

  const { data: convoData, pending, refresh: refreshConvos } = await useLazyFetch<{
    conversations: ConversationRow[]
  }>('/api/messages', { headers, default: () => ({ conversations: [] }) })

  const conversations = computed(() => convoData.value?.conversations ?? [])

  interface Message {
    id: string
    body: string
    createdAt: string
    readAt: string | null
    sender: { id: string; name: string; role: string }
  }

  const selected = ref<ConversationRow | null>(null)
  const messages = ref<Message[]>([])
  const scrollEl = ref<HTMLElement | null>(null)
  const draft = ref('')
  const sending = ref(false)

  async function selectConversation(conv: ConversationRow) {
    selected.value = conv
    await loadMessages()
    // Reset unread badge locally
    conv.unreadCount = 0
  }

  async function loadMessages() {
    if (!selected.value) return
    const data = await $fetch<{ messages: Message[] }>(
      `/api/messages/${selected.value.client.id}`,
      { headers: { Authorization: `Bearer ${accessToken.value}` } }
    ).catch(() => null)
    if (data) {
      messages.value = data.messages
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
    }
  }

  async function send() {
    if (!draft.value.trim() || !selected.value || sending.value) return
    sending.value = true
    try {
      const res = await $fetch<{ message: Message }>('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { toUserId: selected.value.client.id, body: draft.value.trim() },
      })
      messages.value.push(res.message)
      draft.value = ''
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
      // Refresh conversation list to update last message
      await refreshConvos()
    } catch {
      // silent
    } finally {
      sending.value = false
    }
  }

  // Poll every 5s
  let pollTimer: ReturnType<typeof setInterval> | null = null
  onMounted(() => {
    pollTimer = setInterval(async () => {
      await refreshConvos()
      if (selected.value) await loadMessages()
    }, 5000)
  })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  function formatTime(str: string) {
    return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
</script>
