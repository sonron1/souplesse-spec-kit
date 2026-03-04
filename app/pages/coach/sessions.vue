<template>
  <div>

    <!-- ── Page header ─────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 leading-none">Mes séances</h1>
          <p class="text-sm text-gray-500 mt-0.5">Gérez et planifiez vos séances</p>
        </div>
      </div>
      <button class="btn-primary flex items-center gap-2" @click="showModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="hidden sm:inline">Créer une séance</span>
        <span class="sm:hidden">Créer</span>
      </button>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────── -->
    <div class="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="tab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="tab = 'upcoming'; upcomingPage = 1"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
        </svg>
        À venir
        <span v-if="!pending" class="ml-1 bg-black text-primary-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">{{ upcoming.length }}</span>
      </button>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="tab === 'past' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="tab = 'past'; pastPage = 1"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Passées
        <span v-if="!pending" class="ml-1 bg-gray-200 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">{{ past.length }}</span>
      </button>
    </div>

    <SkeletonLoader v-if="pending" :count="4" :height="80" />

    <!-- Error -->
    <div v-else-if="error" class="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-medium">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Erreur lors du chargement des séances.
    </div>

    <template v-else>

      <!-- ─────────────── UPCOMING TAB ─────────────────────── -->
      <div v-if="tab === 'upcoming'">
        <!-- Empty -->
        <div v-if="!upcoming.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
          <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p class="text-base font-semibold text-gray-800 mb-1">Aucune séance à venir</p>
          <p class="text-sm text-gray-500 mb-5">Créez votre prochaine séance.</p>
          <button class="btn-primary inline-flex items-center gap-2" @click="showModal = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Créer une séance
          </button>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <div
            v-for="session in pagedUpcoming"
            :key="session.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-black flex flex-col items-center justify-center shrink-0 leading-none">
                <span class="text-[10px] font-bold text-primary-400 uppercase tracking-wide">{{ sessionMonth(session.dateTime) }}</span>
                <span class="text-xl font-extrabold text-white leading-tight">{{ sessionDay(session.dateTime) }}</span>
              </div>
              <div>
                <p class="font-bold text-gray-900 text-sm leading-snug capitalize">{{ sessionLabel(session.dateTime) }}</p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ session.duration }} min
                  </span>
                  <span class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ session.capacity }} places
                  </span>
                  <span v-if="session.location" class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ session.location }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button class="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg" @click="openAttendeesModal(session.id)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Inscrits
              </button>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-400/15 text-primary-700">Planifiée</span>
            </div>
          </div>
        </div>

        <!-- Pagination upcoming -->
        <div v-if="upcomingTotalPages > 1" class="mt-6 flex items-center justify-center gap-3">
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="upcomingPage === 1"
            @click="upcomingPage--"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Précédent
          </button>
          <span class="text-sm text-gray-500 font-medium">
            {{ upcomingPage }} / {{ upcomingTotalPages }}
            <span class="text-gray-400 font-normal">({{ upcoming.length }} séance{{ upcoming.length > 1 ? 's' : '' }})</span>
          </span>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="upcomingPage >= upcomingTotalPages"
            @click="upcomingPage++"
          >
            Suivant
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- ─────────────── PAST TAB ──────────────────────────── -->
      <div v-if="tab === 'past'">
        <!-- Empty -->
        <div v-if="!past.length" class="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-6">
          <div class="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-base font-semibold text-gray-800 mb-1">Aucune séance passée</p>
          <p class="text-sm text-gray-500">Vos séances terminées apparaîtront ici.</p>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <div
            v-for="session in pagedPast"
            :key="session.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 opacity-75 transition-all"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gray-100 flex flex-col items-center justify-center shrink-0 leading-none">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{{ sessionMonth(session.dateTime) }}</span>
                <span class="text-xl font-extrabold text-gray-400 leading-tight">{{ sessionDay(session.dateTime) }}</span>
              </div>
              <div>
                <p class="font-bold text-gray-900 text-sm leading-snug capitalize">{{ sessionLabel(session.dateTime) }}</p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ session.duration }} min
                  </span>
                  <span class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ session.capacity }} places
                  </span>
                  <span v-if="session.location" class="flex items-center gap-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    {{ session.location }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button class="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg" @click="openAttendeesModal(session.id)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Inscrits
              </button>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">Terminée</span>
            </div>
          </div>
        </div>

        <!-- Pagination past -->
        <div v-if="pastTotalPages > 1" class="mt-6 flex items-center justify-center gap-3">
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="pastPage === 1"
            @click="pastPage--"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Précédent
          </button>
          <span class="text-sm text-gray-500 font-medium">
            {{ pastPage }} / {{ pastTotalPages }}
            <span class="text-gray-400 font-normal">({{ past.length }} séance{{ past.length > 1 ? 's' : '' }})</span>
          </span>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            :disabled="pastPage >= pastTotalPages"
            @click="pastPage++"
          >
            Suivant
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

    </template>

    <!-- ── Attendees modal ─────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="attendeesModal.open" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" @click.self="attendeesModal.open = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <h2 class="text-base font-bold text-gray-900">Inscrits à la séance</h2>
            </div>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" @click="attendeesModal.open = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div v-if="attendeesModal.loading" class="py-12 text-center text-gray-400 text-sm">
            <svg class="w-6 h-6 mx-auto mb-2 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Chargement…
          </div>
          <div v-else-if="attendeesModal.error" class="mx-6 my-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {{ attendeesModal.error }}
          </div>
          <div v-else-if="!attendeesModal.bookings.length" class="py-12 text-center text-gray-400 text-sm">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Aucun inscrit pour le moment.
          </div>
          <div v-else class="overflow-y-auto flex-1">
            <div v-for="b in attendeesModal.bookings" :key="b.id" class="flex items-center justify-between px-6 py-3 border-b border-gray-50 last:border-0">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {{ (b.user?.name ?? '?')[0].toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ b.user?.name ?? '—' }}</p>
                  <p class="text-xs text-gray-400">{{ b.user?.email ?? '—' }}</p>
                </div>
              </div>
              <span
                :class="b.status === 'CONFIRMED' ? 'bg-primary-400/15 text-primary-700' : 'bg-gray-100 text-gray-500'"
                class="text-xs font-bold px-2.5 py-1 rounded-lg"
              >
                {{ b.status === 'CONFIRMED' ? 'Confirmé' : b.status }}
              </span>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button class="btn-secondary" @click="attendeesModal.open = false">Fermer</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Create session modal ────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" @click.self="closeModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                </svg>
              </div>
              <h2 class="text-base font-bold text-gray-900">Nouvelle séance</h2>
            </div>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" @click="closeModal">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="label flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Date et heure
              </label>
              <input v-model="form.dateTime" type="datetime-local" class="input" :min="minDateTime" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Durée (min)
                </label>
                <input v-model.number="form.duration" type="number" min="15" max="240" step="15" class="input" placeholder="60" />
              </div>
              <div>
                <label class="label flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Capacité
                </label>
                <input v-model.number="form.capacity" type="number" min="1" max="200" class="input" placeholder="10" />
              </div>
            </div>
            <div v-if="formError" class="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ formError }}
            </div>
          </div>
          <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
            <button class="btn-secondary" @click="closeModal">Annuler</button>
            <button class="btn-primary flex items-center gap-2" :disabled="saving" @click="submitCreate">
              <svg v-if="!saving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ saving ? 'Création…' : 'Créer la séance' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'coach'] })
const { accessToken } = useAuth()

interface Session {
  id: string
  dateTime: string
  duration: number
  capacity: number
  location?: string | null
}
interface SessionsResponse { success: boolean; sessions: Session[] }

const { data, pending, error, refresh } = await useLazyFetch<SessionsResponse>('/api/sessions', {
  default: () => ({ success: true, sessions: [] }),
})

const sessions = computed(() => data.value?.sessions ?? [])

const now = new Date()
const upcoming = computed(() =>
  sessions.value
    .filter(s => new Date(s.dateTime) >= now)
    .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
)
const past = computed(() =>
  sessions.value
    .filter(s => new Date(s.dateTime) < now)
    .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime))
)

// Tabs
const tab = ref<'upcoming' | 'past'>('upcoming')

// Pagination
const PAGE_SIZE = 5
const upcomingPage = ref(1)
const pastPage = ref(1)
const upcomingTotalPages = computed(() => Math.max(1, Math.ceil(upcoming.value.length / PAGE_SIZE)))
const pastTotalPages = computed(() => Math.max(1, Math.ceil(past.value.length / PAGE_SIZE)))
const pagedUpcoming = computed(() =>
  upcoming.value.slice((upcomingPage.value - 1) * PAGE_SIZE, upcomingPage.value * PAGE_SIZE)
)
const pagedPast = computed(() =>
  past.value.slice((pastPage.value - 1) * PAGE_SIZE, pastPage.value * PAGE_SIZE)
)

// Date helpers
function sessionMonth(dt: string) {
  return new Date(dt).toLocaleString('fr-FR', { month: 'short' }).replace('.', '')
}
function sessionDay(dt: string) {
  return new Date(dt).getDate()
}
function sessionLabel(dt: string) {
  return new Date(dt).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

// Create modal
const showModal = ref(false)
const minDateTime = computed(() => {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  return d.toISOString().slice(0, 16)
})
const form = reactive({ dateTime: '', duration: 60, capacity: 10 })
const formError = ref('')
const saving = ref(false)

function closeModal() {
  showModal.value = false
  formError.value = ''
}

async function submitCreate() {
  formError.value = ''
  if (!form.dateTime) { formError.value = 'Veuillez sélectionner une date et heure.'; return }
  if (new Date(form.dateTime) <= new Date()) { formError.value = 'La date doit être dans le futur.'; return }
  saving.value = true
  try {
    await $fetch('/api/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        dateTime: new Date(form.dateTime).toISOString(),
        duration: form.duration,
        capacity: form.capacity,
      },
    })
    closeModal()
    await refresh()
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    formError.value = err?.data?.statusMessage ?? err?.statusMessage ?? 'Erreur inconnue'
  } finally {
    saving.value = false
  }
}

// Attendees modal
interface Booking {
  id: string
  status: string
  user?: { id: string; name: string; email: string } | null
}
const attendeesModal = reactive({
  open: false,
  loading: false,
  error: '',
  bookings: [] as Booking[],
})

async function openAttendeesModal(sessionId: string) {
  attendeesModal.open = true
  attendeesModal.loading = true
  attendeesModal.error = ''
  attendeesModal.bookings = []
  try {
    const res = await $fetch<{ success: boolean; bookings: Booking[] }>(
      `/api/sessions/${sessionId}/bookings`,
      { headers: { Authorization: `Bearer ${accessToken.value}` } }
    )
    attendeesModal.bookings = res.bookings ?? []
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    attendeesModal.error = err?.data?.statusMessage ?? 'Erreur lors du chargement.'
  } finally {
    attendeesModal.loading = false
  }
}
</script>

