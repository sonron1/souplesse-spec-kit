<template>
  <div class="flex flex-col" style="height: calc(100vh - 9rem)">

    <!-- ── Page header ───────────────────────────────────────── -->
    <div class="flex items-center gap-3 mb-5 shrink-0">
      <div class="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Messages</h1>
        <p class="text-sm text-gray-500 mt-0.5">Échangez avec votre coach personnel</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <svg class="w-8 h-8 mx-auto mb-3 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p class="text-sm text-gray-400">Chargement…</p>
      </div>
    </div>

    <SubscriptionGate v-else :active="subActive" class="flex-1 flex flex-col min-h-0" message="Souscrivez à une formule et choisissez un coach pour accéder à la messagerie.">

      <!-- Assignment: PENDING -->
      <div v-if="assignmentStatus === 'PENDING'" class="flex-1 flex items-center justify-center">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-8 w-full max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="font-bold text-gray-800 mb-1">En attente de validation</p>
          <p class="text-sm text-gray-400 mb-5">Votre demande de coach est en cours de traitement par un administrateur.</p>
          <NuxtLink to="/dashboard/mon-coach" class="btn-primary inline-flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Gérer mon coach
          </NuxtLink>
        </div>
      </div>

      <!-- Assignment: REJECTED -->
      <div v-else-if="assignmentStatus === 'REJECTED'" class="flex-1 flex items-center justify-center">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-8 w-full max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
          </div>
          <p class="font-bold text-gray-800 mb-1">Proposition refusée</p>
          <p class="text-sm text-gray-400 mb-5">Le coach proposé a été refusé. Vous pouvez en choisir un autre.</p>
          <NuxtLink to="/dashboard/mon-coach" class="btn-primary inline-flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Choisir un coach
          </NuxtLink>
        </div>
      </div>

      <!-- No coach assigned -->
      <div v-else-if="!coach" class="flex-1 flex items-center justify-center">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-14 px-8 w-full max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <p class="font-bold text-gray-800 mb-1">Aucun coach assigné</p>
          <p class="text-sm text-gray-400 mb-5">Choisissez un coach pour commencer à échanger avec lui.</p>
          <NuxtLink to="/dashboard/mon-coach" class="btn-primary inline-flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Choisir un coach
          </NuxtLink>
        </div>
      </div>

      <!-- ── Conversation ────────────────────────────────────── -->
      <div v-else class="flex flex-col flex-1 overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm" style="min-height: 380px">

        <!-- Coach header bar -->
        <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0 bg-white">
          <div class="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-sm font-black text-primary-400 shrink-0">
            {{ coach.name?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1">
            <p class="font-bold text-gray-900 text-sm leading-none">{{ coach.name }}</p>
            <p class="text-xs text-primary-600 font-medium mt-0.5">Votre coach personnel</p>
          </div>
          <span class="w-2 h-2 rounded-full bg-green-400 ring-2 ring-white shrink-0" title="En ligne" />
        </div>

        <!-- Messages area -->
        <div ref="scrollEl" class="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-gray-50/50">

          <!-- Empty chat -->
          <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-center py-10">
            <div>
              <div class="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto mb-3">
                <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p class="text-sm font-semibold text-gray-600">La conversation commence ici</p>
              <p class="text-xs text-gray-400 mt-1">Votre coach va initier la conversation.</p>
            </div>
          </div>

          <!-- Bubbles -->
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex"
            :class="msg.sender.id === me?.id ? 'justify-end' : 'justify-start'"
          >
            <!-- Received: coach initials avatar -->
            <div v-if="msg.sender.id !== me?.id" class="w-7 h-7 rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-primary-400 shrink-0 mr-2 mt-1">
              {{ msg.sender.name?.[0]?.toUpperCase() }}
            </div>

            <div
              class="max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm"
              :class="msg.sender.id === me?.id
                ? 'bg-black text-primary-400 rounded-br-sm'
                : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'"
            >
              <p>{{ msg.body }}</p>
              <p
                class="text-[10px] mt-1 text-right"
                :class="msg.sender.id === me?.id ? 'text-gray-500' : 'text-gray-400'"
              >
                {{ formatTime(msg.createdAt) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Input bar -->
        <div class="border-t border-gray-100 px-4 py-3 flex gap-2 items-end shrink-0 bg-white">
          <textarea
            v-model="draft"
            rows="1"
            placeholder="Votre message…"
            class="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:bg-white transition"
            :class="sending ? 'opacity-50 cursor-not-allowed' : ''"
            :disabled="!canReply || sending"
            @keydown.enter.exact.prevent="send"
          />
          <button
            class="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0 hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canReply || !draft.trim() || sending"
            @click="send"
          >
            <svg v-if="sending" class="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
      </div>

    </SubscriptionGate>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({ middleware: ['auth', 'client-only'] })

  const { user: me, accessToken, ensureFresh } = useAuth()

  interface ConversationRow {
    coach?: { id: string; name: string; email: string }
    coachId?: string
    lastMessage: { body: string; createdAt: string; senderId: string } | null
    unreadCount: number
  }
  interface AssignmentData {
    assignment: { status: string; coach?: { id: string; name: string } } | null
  }
  interface Message {
    id: string
    body: string
    createdAt: string
    readAt: string | null
    sender: { id: string; name: string; role: string }
  }

  const pending = ref(true)
  const subActive = ref(false)
  const coach = ref<{ id: string; name: string; email: string } | null>(null)
  const coachId = ref<string | null>(null)
  const assignmentStatus = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const scrollEl = ref<HTMLElement | null>(null)

  function authHeader() {
    return { Authorization: `Bearer ${accessToken.value}` }
  }

  async function loadInitial() {
    if (!accessToken.value) return
    try {
      const [convoData, assignData, subData] = await Promise.all([
        $fetch<{ conversations: ConversationRow[] }>('/api/messages', { headers: authHeader() }),
        $fetch<AssignmentData>('/api/me/assignment', { headers: authHeader() }),
        $fetch<{ active: boolean }>('/api/me/subscription', { headers: authHeader() }).catch(() => ({ active: false })),
      ])
      subActive.value = subData.active
      const first = convoData.conversations?.[0]
      coach.value = first?.coach ?? null
      coachId.value = first?.coachId ?? null
      assignmentStatus.value = assignData.assignment?.status ?? null
    } catch {
      // 401 handled silently — auth middleware will redirect if needed
    } finally {
      pending.value = false
    }
  }

  async function loadMessages(scrollToBottom = false) {
    if (!coachId.value || !accessToken.value) return
    const data = await $fetch<{ messages: Message[] }>(
      `/api/messages/${coachId.value}`,
      { headers: authHeader() }
    ).catch(() => null)
    if (data) {
      const hadNew = data.messages.length > messages.value.length
      messages.value = data.messages
      if (scrollToBottom || hadNew) {
        nextTick(() => {
          if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
        })
      }
    }
  }

  // Load once coach is known
  watch(coachId, (id) => { if (id) loadMessages(true) })

  // Poll every 5s — only scroll when new messages arrive
  let pollTimer: ReturnType<typeof setInterval> | null = null
  onMounted(async () => {
    await ensureFresh()
    await loadInitial()
    if (coachId.value) loadMessages(true)
    pollTimer = setInterval(async () => {
      await ensureFresh()
      loadMessages()
    }, 5000)
  })
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

  const canReply = computed(() => !!coachId.value)
  const draft = ref('')
  const sending = ref(false)

  async function send() {
    if (!draft.value.trim() || !coachId.value || sending.value) return
    sending.value = true
    try {
      const res = await $fetch<{ message: Message }>('/api/messages', {
        method: 'POST',
        headers: authHeader(),
        body: { toUserId: coachId.value, body: draft.value.trim() },
      })
      messages.value.push(res.message)
      draft.value = ''
      nextTick(() => {
        if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
      })
    } catch {
      // silent
    } finally {
      sending.value = false
    }
  }

  function formatTime(str: string) {
    return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
</script>
