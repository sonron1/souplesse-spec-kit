<template>
  <div class="flex flex-col h-[calc(100vh-8rem)]">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 shrink-0">Messages</h1>

    <!-- Loading -->
    <div v-if="pending" class="flex-1 flex items-center justify-center">
      <SkeletonLoader :count="4" :height="56" />
    </div>

    <!-- No coach assigned -->
    <div v-else-if="!coach" class="card flex-1 flex flex-col items-center justify-center text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
      <p class="font-semibold text-gray-700 mb-1">Aucun coach assigné</p>
      <p class="text-sm text-gray-400">Un coach vous sera attribué prochainement.</p>
    </div>

    <!-- Conversation -->
    <div v-else class="card flex flex-col flex-1 overflow-hidden p-0">
      <!-- Coach header -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
          {{ coach.name?.[0]?.toUpperCase() }}
        </div>
        <div>
          <p class="font-semibold text-gray-900 text-sm">{{ coach.name }}</p>
          <p class="text-xs text-blue-500">Votre coach</p>
        </div>
      </div>

      <!-- Messages area -->
      <div ref="scrollEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <!-- Coach hasn't written yet -->
        <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-center">
          <div>
            <svg class="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <p class="text-sm font-medium text-gray-500">En attente d'un message de votre coach</p>
            <p class="text-xs text-gray-400 mt-1">Votre coach initiera la conversation.</p>
          </div>
        </div>

        <!-- Message bubbles -->
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
          :class="canReply ? '' : 'opacity-50 cursor-not-allowed'"
          :disabled="!canReply || sending"
          @keydown.enter.exact.prevent="send"
        />
        <button
          class="btn-primary px-4 py-2.5 text-sm shrink-0 disabled:opacity-50"
          :disabled="!canReply || !draft.trim() || sending"
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
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { user: me, accessToken } = useAuth()
  const headers = computed(() => ({ Authorization: `Bearer ${accessToken.value}` }))

  interface ConversationRow {
    coach?: { id: string; name: string; email: string }
    coachId?: string
    lastMessage: { body: string; createdAt: string; senderId: string } | null
    unreadCount: number
  }

  // Conversations list (to find assigned coach)
  const { data: convoData, pending } = await useLazyFetch<{ conversations: ConversationRow[] }>(
    '/api/messages',
    { headers, default: () => ({ conversations: [] }) }
  )

  const coach = computed(() => convoData.value?.conversations?.[0]?.coach ?? null)
  const coachId = computed(() => convoData.value?.conversations?.[0]?.coachId ?? null)

  interface Message {
    id: string
    body: string
    createdAt: string
    readAt: string | null
    sender: { id: string; name: string; role: string }
  }

  const messages = ref<Message[]>([])
  const scrollEl = ref<HTMLElement | null>(null)

  async function loadMessages() {
    if (!coachId.value) return
    const data = await $fetch<{ messages: Message[] }>(
      `/api/messages/${coachId.value}`,
      { headers: { Authorization: `Bearer ${accessToken.value}` } }
    ).catch(() => null)
    if (data) {
      messages.value = data.messages
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
    }
  }

  // Load messages when coach resolves
  watch(coachId, (id) => { if (id) loadMessages() }, { immediate: true })

  // Poll every 5s
  let pollTimer: ReturnType<typeof setInterval> | null = null
  onMounted(() => { pollTimer = setInterval(loadMessages, 5000) })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  // Whether client can reply (coach has sent at least one message)
  const canReply = computed(() =>
    messages.value.some((m) => m.sender.id === coachId.value)
  )

  const draft = ref('')
  const sending = ref(false)

  async function send() {
    if (!draft.value.trim() || !coachId.value || sending.value) return
    sending.value = true
    try {
      const res = await $fetch<{ message: Message }>('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: { toUserId: coachId.value, body: draft.value.trim() },
      })
      messages.value.push(res.message)
      draft.value = ''
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
    } catch {
      // silent — could show toast
    } finally {
      sending.value = false
    }
  }

  function formatTime(str: string) {
    return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
</script>
