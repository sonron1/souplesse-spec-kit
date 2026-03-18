<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">

    <!-- ══════════════════════════════════════════════════════════
         HEADER — sticky, 64 px tall, black
    ══════════════════════════════════════════════════════════ -->
    <header class="bg-black text-white h-16 sticky top-0 z-40 shadow-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">

        <!-- Brand -->
        <NuxtLink to="/dashboard" class="flex items-center gap-2 shrink-0 group">
          <span class="text-xl font-extrabold tracking-tight text-white group-hover:text-gray-100 transition-colors">
            Souplesse<span class="text-primary-400">·</span>
          </span>
        </NuxtLink>

        <!-- ── Desktop nav (lg+) ─────────────────────────────── -->
        <nav class="hidden lg:flex items-center gap-0.5 flex-1 justify-center">

          <!-- Dashboard link — adapts to role -->
          <NuxtLink
            :to="isAdmin ? '/admin' : isCoach ? '/coach' : '/dashboard'"
            class="nav-pill"
            active-class="nav-pill-active"
            exact
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Tableau de bord
          </NuxtLink>

          <!-- CLIENT-only links (hidden from coaches and admins) -->
          <template v-if="isClient">
            <div class="relative" @mouseenter="sessionsDrop = true" @mouseleave="sessionsDrop = false">
              <button
                class="nav-pill"
                :class="isOnSessionsRoute ? 'nav-pill-active' : ''"
                @click="sessionsDrop = !sessionsDrop"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Séances
                <svg class="w-3 h-3 transition-transform" :class="sessionsDrop ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <Transition name="drop">
                <div v-if="sessionsDrop" class="dropdown-panel">
                  <NuxtLink to="/sessions" class="dropdown-item" @click="sessionsDrop = false">
                    <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Séances disponibles
                  </NuxtLink>
                  <NuxtLink to="/dashboard/programs" class="dropdown-item" @click="sessionsDrop = false">
                    <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                    Programmes
                  </NuxtLink>
                </div>
              </Transition>
            </div>
            <div class="relative" @mouseenter="bookingsDrop = true" @mouseleave="bookingsDrop = false">
              <button
                class="nav-pill"
                :class="isOnBookingsRoute ? 'nav-pill-active' : ''"
                @click="bookingsDrop = !bookingsDrop"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Réservations
                <svg class="w-3 h-3 transition-transform" :class="bookingsDrop ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <Transition name="drop">
                <div v-if="bookingsDrop" class="dropdown-panel">
                  <NuxtLink to="/dashboard/bookings" class="dropdown-item" @click="bookingsDrop = false">
                    <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Mes réservations
                  </NuxtLink>
                  <NuxtLink to="/dashboard/calendar" class="dropdown-item" @click="bookingsDrop = false">
                    <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Calendrier
                  </NuxtLink>
                </div>
              </Transition>
            </div>
            <NuxtLink to="/dashboard/subscriptions" class="nav-pill" active-class="nav-pill-active">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              Abonnement
            </NuxtLink>

            <NuxtLink to="/dashboard/messages" class="nav-pill relative" active-class="nav-pill-active">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              Messages
              <span v-if="unreadMessages > 0" class="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[16px] text-center leading-4">
                {{ unreadMessages > 99 ? '99+' : unreadMessages }}
              </span>
            </NuxtLink>

            <NuxtLink to="/dashboard/mon-coach" class="nav-pill" active-class="nav-pill-active">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Mon coach
            </NuxtLink>
          </template>

          <!-- COACH dropdown -->
          <div v-if="isCoach" class="relative" @mouseenter="coachDrop = true" @mouseleave="coachDrop = false">
            <button
              class="nav-pill"
              :class="isOnCoachRoute ? 'nav-pill-active' : ''"
              @click="coachDrop = !coachDrop"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Coach
              <svg class="w-3 h-3 transition-transform" :class="coachDrop ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <Transition name="drop">
              <div v-if="coachDrop" class="dropdown-panel">
                <NuxtLink to="/coach" class="dropdown-item" @click="coachDrop = false">
                  <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Vue d'ensemble
                </NuxtLink>
                <NuxtLink to="/coach/sessions" class="dropdown-item" @click="coachDrop = false">
                  <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Mes séances
                </NuxtLink>
                <NuxtLink to="/coach/programs" class="dropdown-item" @click="coachDrop = false">
                  <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                  Programmes
                </NuxtLink>
                <NuxtLink to="/coach/messages" class="dropdown-item" @click="coachDrop = false">
                  <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  Messages
                  <span v-if="unreadMessages > 0" class="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[16px] text-center leading-4">
                    {{ unreadMessages > 99 ? '99+' : unreadMessages }}
                  </span>
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- ADMIN dropdown -->
          <div v-if="isAdmin" class="relative" @mouseenter="adminDrop = true" @mouseleave="adminDrop = false">
            <button
              class="nav-pill nav-pill-admin"
              :class="isOnAdminRoute ? 'nav-pill-admin-active' : ''"
              @click="adminDrop = !adminDrop"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Administration
              <svg class="w-3 h-3 transition-transform" :class="adminDrop ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <Transition name="drop">
              <div v-if="adminDrop" class="dropdown-panel dropdown-panel-right">
                <div class="px-3 pt-2 pb-1">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</p>
                </div>
                <NuxtLink to="/admin" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Tableau de bord
                </NuxtLink>
                <NuxtLink to="/admin/users" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Utilisateurs
                </NuxtLink>
                <NuxtLink to="/admin/payments" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                  Paiements
                </NuxtLink>
                <NuxtLink to="/admin/assignments" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  Assignations
                </NuxtLink>
                <NuxtLink to="/admin/subscriptions" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                  Abonnements
                </NuxtLink>
                <NuxtLink to="/admin/analytics" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Analytique
                </NuxtLink>
                <NuxtLink to="/admin/logs" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Journaux
                </NuxtLink>
                <NuxtLink to="/admin/messages" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                  Messages coachs
                  <span v-if="isAdmin && unreadMessages > 0" class="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1 min-w-[16px] text-center leading-4">
                    {{ unreadMessages > 99 ? '99+' : unreadMessages }}
                  </span>
                </NuxtLink>
                <NuxtLink to="/admin/monitor" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  Surveillance
                </NuxtLink>
                <NuxtLink to="/admin/health" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                  Santé système
                </NuxtLink>
                <div class="border-t border-gray-800 my-1" />
                <NuxtLink to="/admin/settings" class="dropdown-item" @click="adminDrop = false">
                  <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Paramètres
                </NuxtLink>
              </div>
            </Transition>
          </div>
        </nav>

        <!-- ── Right side: user chip + logout + mobile toggle ─── -->
        <div class="flex items-center gap-2 shrink-0">

          <!-- Notification bell (clients + coaches, desktop) -->
          <NotificationBell v-if="isClient || isCoach" class="hidden lg:flex" />

          <!-- User chip (tablet lg+) — links to /profile -->
          <NuxtLink to="/profile" class="hidden lg:flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 transition-colors rounded-xl px-3 py-1.5 cursor-pointer group" title="Mon profil">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="isAdmin ? 'bg-yellow-400 text-black' : isCoach ? 'bg-blue-400 text-black' : 'bg-primary-500 text-black'"
            >
              {{ userInitial }}
            </div>
            <div class="leading-none">
              <p class="text-xs font-semibold text-white group-hover:text-primary-300 transition-colors">{{ user?.name?.split(' ')[0] }}</p>
              <p class="text-[10px] mt-0.5" :class="isAdmin ? 'text-yellow-400' : isCoach ? 'text-blue-400' : 'text-gray-400'">
                {{ roleLabel }}
              </p>
            </div>
          </NuxtLink>

          <button
            class="hidden lg:flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-900"
            @click="handleLogout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Déconnexion
          </button>

          <!-- Mobile & tablet hamburger -->
          <button
            class="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
            aria-label="Menu"
            @click="drawerOpen = true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- ══════════════════════════════════════════════════════════
         MOBILE / TABLET DRAWER  (visible < lg)
    ══════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="drawerOpen" class="fixed inset-0 z-50 lg:hidden" @click.self="drawerOpen = false">
          <!-- Scrim -->
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="drawerOpen = false" />

          <!-- Panel -->
          <Transition name="slide">
            <div v-if="drawerOpen" class="absolute inset-y-0 left-0 w-72 sm:w-80 bg-gray-950 flex flex-col shadow-2xl">

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
                <span class="text-lg font-extrabold text-white tracking-tight">
                  Souplesse<span class="text-primary-400">·</span>
                </span>
                <button class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" @click="drawerOpen = false">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <!-- User card -->
              <div class="px-4 py-4 border-b border-gray-800">
                <div class="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    :class="isAdmin ? 'bg-yellow-400 text-black' : isCoach ? 'bg-blue-400 text-black' : 'bg-primary-500 text-black'"
                  >
                    {{ userInitial }}
                  </div>
                  <div>
                    <p class="font-semibold text-white text-sm">{{ user?.name }}</p>
                    <span
                      class="text-xs font-bold px-2 py-0.5 rounded-full"
                      :class="isAdmin ? 'bg-yellow-400/20 text-yellow-300' : isCoach ? 'bg-blue-400/20 text-blue-300' : 'bg-primary-400/20 text-primary-300'"
                    >
                      {{ roleLabel }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Nav sections -->
              <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-1">

                <!-- Section: Espace Personnel — clients only -->
                <div v-if="isClient">
                  <p class="drawer-section-label">Espace personnel</p>
                  <NuxtLink to="/dashboard" class="drawer-link" active-class="drawer-link-active" exact @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    Tableau de bord
                  </NuxtLink>
                  <NuxtLink to="/sessions" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Séances disponibles
                  </NuxtLink>
                  <NuxtLink to="/dashboard/programs" class="drawer-link pl-10" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                    Programmes
                  </NuxtLink>
                  <NuxtLink to="/dashboard/bookings" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Mes réservations
                  </NuxtLink>
                  <NuxtLink to="/dashboard/calendar" class="drawer-link pl-10" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Calendrier
                  </NuxtLink>
                  <NuxtLink to="/dashboard/subscriptions" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    Mon abonnement
                  </NuxtLink>
                  <NuxtLink to="/dashboard/notifications" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    Notifications
                  </NuxtLink>

                  <NuxtLink to="/dashboard/messages" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Messages
                    <span v-if="unreadMessages > 0" class="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-4">
                      {{ unreadMessages > 99 ? '99+' : unreadMessages }}
                    </span>
                  </NuxtLink>
                  <NuxtLink to="/dashboard/mon-coach" class="drawer-link" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    Mon coach
                  </NuxtLink>
                </div>

                <!-- Section: Espace Coach -->
                <div v-if="isCoach" class="pt-1">
                  <p class="drawer-section-label">Espace coach</p>
                  <NuxtLink to="/coach" class="drawer-link drawer-link-coach" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Vue d'ensemble
                  </NuxtLink>
                  <NuxtLink to="/coach/sessions" class="drawer-link drawer-link-coach" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Mes séances
                  </NuxtLink>
                  <NuxtLink to="/coach/programs" class="drawer-link drawer-link-coach" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                    Programmes
                  </NuxtLink>
                  <NuxtLink to="/coach/messages" class="drawer-link drawer-link-coach" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Messages
                    <span v-if="unreadMessages > 0" class="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-4">
                      {{ unreadMessages > 99 ? '99+' : unreadMessages }}
                    </span>
                  </NuxtLink>
                </div>

                <!-- Section: Administration -->
                <div v-if="isAdmin" class="pt-1">
                  <p class="drawer-section-label">Administration</p>
                  <NuxtLink to="/admin" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Tableau de bord
                  </NuxtLink>
                  <NuxtLink to="/admin/users" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Utilisateurs
                  </NuxtLink>
                  <NuxtLink to="/admin/payments" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    Paiements
                  </NuxtLink>
                  <NuxtLink to="/admin/assignments" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    Assignations
                  </NuxtLink>
                  <NuxtLink to="/admin/subscriptions" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    Abonnements
                  </NuxtLink>
                  <NuxtLink to="/admin/analytics" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Analytique
                  </NuxtLink>
                  <NuxtLink to="/admin/logs" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Journaux
                  </NuxtLink>
                  <NuxtLink to="/admin/messages" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    Messages coachs
                    <span v-if="unreadMessages > 0" class="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-4">
                      {{ unreadMessages > 99 ? '99+' : unreadMessages }}
                    </span>
                  </NuxtLink>
                  <NuxtLink to="/admin/monitor" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Surveillance
                  </NuxtLink>
                  <NuxtLink to="/admin/health" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                    Santé système
                  </NuxtLink>
                  <NuxtLink to="/admin/settings" class="drawer-link drawer-link-admin" active-class="drawer-link-active" @click="drawerOpen = false">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Paramètres
                  </NuxtLink>
                </div>
              </nav>

              <!-- Footer: profile + logout -->
              <div class="px-3 py-4 border-t border-gray-800 space-y-1">
                <NuxtLink
                  to="/profile"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-gray-900 transition-colors"
                  active-class="bg-gray-900 text-white"
                  @click="drawerOpen = false"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Mon profil
                </NuxtLink>
                <button
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
                  @click="drawerOpen = false; handleLogout()"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  Se déconnecter
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════════════════════════
         PAGE CONTENT
    ══════════════════════════════════════════════════════════ -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-black text-gray-500 text-center text-xs py-4" :class="user && (isClient || isCoach) ? 'hidden lg:block' : ''">
      © {{ new Date().getFullYear() }} Souplesse — Centre de fitness &amp; bien-être
    </footer>

    <!-- ══════════════════════════════════════════════════════════
         MOBILE BOTTOM NAVIGATION (CLIENT + COACH, visible < lg)
    ══════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <nav
        v-if="user && (isClient || isCoach)"
        class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-gray-950/97 backdrop-blur-md border-t border-gray-800/70"
        style="padding-bottom: env(safe-area-inset-bottom, 0px)"
      >
        <div class="flex items-stretch h-14">

          <!-- ── CLIENT ─────────────────────────────────────────── -->
          <template v-if="isClient">
            <NuxtLink to="/dashboard" class="bottom-nav-item" active-class="bottom-nav-item-active" exact>
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Accueil</span>
            </NuxtLink>
            <NuxtLink to="/sessions" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>Séances</span>
            </NuxtLink>
            <NuxtLink to="/dashboard/subscriptions" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              <span>Abonnement</span>
            </NuxtLink>
            <NuxtLink to="/dashboard/messages" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <div class="relative">
                <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span v-if="unreadMessages > 0" class="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{{ unreadMessages > 9 ? '9+' : unreadMessages }}</span>
              </div>
              <span>Messages</span>
            </NuxtLink>
            <NuxtLink to="/profile" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span>Profil</span>
            </NuxtLink>
          </template>

          <!-- ── COACH ─────────────────────────────────────────── -->
          <template v-if="isCoach">
            <NuxtLink to="/coach" class="bottom-nav-item" active-class="bottom-nav-item-active" exact>
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Accueil</span>
            </NuxtLink>
            <NuxtLink to="/coach/sessions" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>Séances</span>
            </NuxtLink>
            <NuxtLink to="/coach/programs" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              <span>Programmes</span>
            </NuxtLink>
            <NuxtLink to="/coach/messages" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <div class="relative">
                <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span v-if="unreadMessages > 0" class="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{{ unreadMessages > 9 ? '9+' : unreadMessages }}</span>
              </div>
              <span>Messages</span>
            </NuxtLink>
            <NuxtLink to="/profile" class="bottom-nav-item" active-class="bottom-nav-item-active">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              <span>Profil</span>
            </NuxtLink>
          </template>

        </div>
      </nav>
    </Teleport>

    <!-- ── Idle warning modal (D003) ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showIdleWarning"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <svg class="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Déconnexion imminente</h3>
            <p class="text-sm text-gray-500 mb-6">
              Vous serez déconnecté dans <strong>2 minutes</strong> en raison d'inactivité.
            </p>
            <button
              class="btn-primary w-full"
              @click="resetIdle"
            >
              Rester connecté
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  const { user, isAdmin, isCoach, isClient, logout, accessToken, ensureFresh, handleSessionRevoked } = useAuth()
  const route = useRoute()

  // Unread messages badge (poll every 30s, only for coach/client)
  const unreadMessages = ref(0)
  async function refreshUnread() {
    if (!accessToken.value || isAdmin.value) return
    const ok = await ensureFresh()
    if (!ok || !accessToken.value) return
    const data = await $fetch<{ unreadTotal: number }>('/api/messages', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    }).catch(() => null)
    if (data) unreadMessages.value = data.unreadTotal
  }
  onMounted(() => { refreshUnread(); setInterval(refreshUnread, 30000) })

  // ── Single-session heartbeat: check every 3 s to detect when another device
  // logs in. Uses ensureFresh() first so an expired access token goes through
  // refreshToken(), which also validates the sessionToken — giving session_revoked
  // even when the access token has expired. Also fires immediately on mount so
  // a revoked session is caught the instant you open/reload the page.
  let sessionHeartbeatTimer: ReturnType<typeof setInterval> | null = null
  async function checkSession() {
    if (!accessToken.value) return
    // If token is expired, refresh it first.
    // refreshToken() now validates sessionToken → returns session_revoked if
    // another device has logged in, which handleSessionRevoked() catches.
    const fresh = await ensureFresh()
    if (!fresh) return // ensureFresh already redirected on session_revoked
    try {
      await $fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
    } catch (err: unknown) {
      const e = err as { data?: { data?: { code?: string } } }
      if (e?.data?.data?.code === 'session_revoked') {
        await handleSessionRevoked()
      }
    }
  }
  onMounted(() => {
    checkSession() // immediate check — catches revoked sessions on page load/reload
    sessionHeartbeatTimer = setInterval(checkSession, 3_000)
  })

  // ── Idle timeout: log out non-admins after 30 min of inactivity (D001/D003) ──
  const IDLE_MS = 30 * 60 * 1000          // 30 min total
  const WARN_MS = 28 * 60 * 1000          // warn at 28 min
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let warnTimer: ReturnType<typeof setTimeout> | null = null
  const showIdleWarning = ref(false)

  function resetIdle() {
    if (isAdmin.value) return
    if (idleTimer) clearTimeout(idleTimer)
    if (warnTimer) clearTimeout(warnTimer)
    showIdleWarning.value = false
    // Show warning 2 min before logout
    warnTimer = setTimeout(() => {
      showIdleWarning.value = true
    }, WARN_MS)
    idleTimer = setTimeout(async () => {
      showIdleWarning.value = false
      await logout()
    }, IDLE_MS)
  }
  const idleEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
  onMounted(() => {
    if (!isAdmin.value) {
      idleEvents.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
      resetIdle()
    }
  })
  onUnmounted(() => {
    if (idleTimer) clearTimeout(idleTimer)
    if (warnTimer) clearTimeout(warnTimer)
    if (sessionHeartbeatTimer) clearInterval(sessionHeartbeatTimer)
    idleEvents.forEach(e => window.removeEventListener(e, resetIdle))
  })

  const drawerOpen   = ref(false)
  const coachDrop    = ref(false)
  const adminDrop    = ref(false)
  const bookingsDrop = ref(false)
  const sessionsDrop = ref(false)

  // Close dropdowns on route change
  watch(() => route.path, () => {
    coachDrop.value    = false
    adminDrop.value    = false
    bookingsDrop.value = false
    sessionsDrop.value = false
    drawerOpen.value   = false
  })

  const isOnCoachRoute    = computed(() => route.path.startsWith('/coach'))
  const isOnAdminRoute    = computed(() => route.path.startsWith('/admin'))
  const isOnBookingsRoute = computed(() => route.path.startsWith('/dashboard/bookings') || route.path.startsWith('/dashboard/calendar'))
  const isOnSessionsRoute = computed(() => route.path === '/sessions' || route.path.startsWith('/dashboard/programs'))

  const userInitial = computed(() => (user.value?.name ?? '?')[0].toUpperCase())
  const roleLabel = computed(() => {
    if (isAdmin.value) return 'Administrateur'
    if (isCoach.value) return 'Coach'
    return 'Membre'
  })

  async function handleLogout() {
    await logout()
  }
</script>

<style scoped>
  /* ── Desktop nav pills ─────────────────────────────────── */
  .nav-pill {
    @apply flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-300
           hover:text-white hover:bg-gray-900 transition-all;
  }
  .nav-pill-active {
    @apply text-white bg-gray-900;
  }
  .nav-pill-admin {
    @apply text-yellow-300 hover:text-yellow-100 hover:bg-yellow-400/10;
  }
  .nav-pill-admin-active {
    @apply text-yellow-200 bg-yellow-400/10;
  }

  /* ── Dropdown panels ───────────────────────────────────── */
  .dropdown-panel {
    @apply absolute top-full left-0 mt-1.5 w-52 bg-gray-900 border border-gray-800
           rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden;
  }
  .dropdown-panel-right {
    @apply left-auto right-0;
  }
  .dropdown-item {
    @apply flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300
           hover:text-white hover:bg-gray-800 transition-colors;
  }

  /* ── Drawer links ──────────────────────────────────────── */
  .drawer-section-label {
    @apply text-[10px] font-bold uppercase tracking-widest text-gray-600 px-4 pt-3 pb-1.5;
  }
  .drawer-link {
    @apply flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400
           hover:text-white hover:bg-gray-900 transition-colors;
  }
  .drawer-link-coach {
    @apply hover:bg-blue-950/60 hover:text-blue-100;
  }
  .drawer-link-admin {
    @apply hover:bg-yellow-950/60 hover:text-yellow-100;
  }
  .drawer-link-active {
    @apply text-white bg-gray-800 !important;
  }

  /* ── Transitions ───────────────────────────────────────── */
  .drop-enter-active, .drop-leave-active { transition: opacity .15s ease, transform .15s ease; }
  .drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-6px); }

  .fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  .slide-enter-active, .slide-leave-active { transition: transform .25s cubic-bezier(.4,0,.2,1); }
  .slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

  /* ── Mobile bottom navigation ──────────────────────────── */
  .bottom-nav-item {
    @apply flex-1 flex flex-col items-center justify-center gap-[3px] py-2
           text-[10px] font-semibold text-gray-500 transition-colors cursor-pointer
           select-none;
    -webkit-tap-highlight-color: transparent;
  }
  .bottom-nav-item:active {
    @apply scale-95;
  }
  .bottom-nav-item-active {
    @apply text-primary-400;
  }
</style>

