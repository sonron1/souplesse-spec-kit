<template>
  <div>

    <!-- ── Hero banner ─────────────────────────────────────── -->
    <div class="relative overflow-hidden rounded-2xl bg-black mb-8 px-6 py-7 sm:px-10 sm:py-9">
      <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, #eab308 0, #eab308 1px, transparent 0, transparent 50%); background-size: 20px 20px;"/>
      <div class="absolute -top-10 -left-10 w-48 h-48 bg-primary-400/20 rounded-full blur-3xl"/>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <!-- Avatar in banner -->
          <div class="relative group shrink-0">
            <div
              v-if="form.avatarUrl"
              class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary-400/40"
            >
              <img :src="form.avatarUrl" alt="avatar" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold ring-2"
              :class="isAdmin ? 'bg-yellow-400 text-black ring-yellow-400/40' : isCoach ? 'bg-blue-400 text-black ring-blue-400/40' : 'bg-primary-400 text-black ring-primary-400/40'"
            >{{ initials }}</div>
            <label
              class="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              title="Changer l'avatar"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <input type="file" accept="image/*" class="sr-only" @change="onAvatarChange" />
            </label>
            <div v-if="avatarUploading" class="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/70">
              <svg class="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-widest text-primary-400">Mon profil</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-bold" :class="isAdmin ? 'bg-yellow-400/20 text-yellow-300' : isCoach ? 'bg-blue-400/20 text-blue-300' : 'bg-primary-400/20 text-primary-300'">
                {{ roleLabel }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-extrabold text-white leading-tight">{{ fullName || user?.name }}</h1>
            <p class="text-sm text-gray-400 mt-0.5">{{ profile?.email }}</p>
          </div>
        </div>
        <!-- Stats chips -->
        <div v-if="isClient" class="flex gap-3 shrink-0">
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p class="text-xl font-extrabold text-primary-400">{{ clientStats.bookingCount }}</p>
            <p class="text-[10px] text-gray-400 leading-tight mt-0.5">Réservations</p>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p class="text-xl font-extrabold text-green-400">{{ clientStats.upcomingCount }}</p>
            <p class="text-[10px] text-gray-400 leading-tight mt-0.5">À venir</p>
          </div>
        </div>
        <div v-else-if="isCoach && !isAdmin" class="flex gap-3 shrink-0">
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p class="text-xl font-extrabold text-primary-400">{{ coachStats.sessionCount }}</p>
            <p class="text-[10px] text-gray-400 leading-tight mt-0.5">Séances</p>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p class="text-xl font-extrabold text-blue-400">{{ coachStats.clientCount }}</p>
            <p class="text-[10px] text-gray-400 leading-tight mt-0.5">Clients</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Save feedback banner ────────────────────────────── -->
    <Transition name="fade-up">
      <div v-if="saved" class="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
        <svg class="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <p class="text-sm font-semibold text-green-800">{{ savedMessage }}</p>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ── LEFT sidebar ────────────────────────────────── -->
      <div class="lg:col-span-1 space-y-5">

        <!-- Identity card -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="h-1" :class="isAdmin ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : isCoach ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-primary-400 to-yellow-500'"/>
          <div class="px-5 pt-4 pb-5">
            <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Informations</p>
            <div class="space-y-0 divide-y divide-gray-50">
              <!-- Nom -->
              <div class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Nom</span>
                <span class="text-sm font-semibold text-gray-800">{{ form.lastName || '—' }}</span>
              </div>
              <!-- Prénom -->
              <div class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Prénom</span>
                <span class="text-sm font-semibold text-gray-800">{{ form.firstName || '—' }}</span>
              </div>
              <!-- Email -->
              <div class="flex items-center justify-between py-2.5 gap-2">
                <span class="text-xs text-gray-400 font-medium shrink-0">E-mail</span>
                <span class="text-sm font-medium text-gray-700 truncate">{{ profile?.email }}</span>
              </div>
              <!-- Phone -->
              <div v-if="form.phone" class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Téléphone</span>
                <span class="text-sm font-semibold text-gray-800">{{ form.phone }}</span>
              </div>
              <!-- Genre -->
              <div v-if="form.gender" class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Genre</span>
                <span
                  class="text-xs font-bold px-2.5 py-1 rounded-full"
                  :class="form.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'"
                >{{ form.gender === 'MALE' ? '♂ Homme' : '♀ Femme' }}</span>
              </div>
              <!-- Birthday -->
              <div v-if="form.birthDay && form.birthMonth" class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Naissance</span>
                <span class="text-sm font-semibold text-gray-800">{{ form.birthDay }} {{ MONTHS[(form.birthMonth ?? 1) - 1] }}</span>
              </div>
              <!-- Member since -->
              <div v-if="profile?.createdAt" class="flex items-center justify-between py-2.5">
                <span class="text-xs text-gray-400 font-medium">Membre depuis</span>
                <span class="text-sm text-gray-500">{{ formatDate(profile.createdAt as unknown as string) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CLIENT: subscription card -->
        <div v-if="isClient" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="h-1" :class="clientStats.activeSub ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-200'"/>
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mon abonnement</p>
              <!-- Status badge -->
              <span v-if="clientStats.activeSub" class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Actif
              </span>
              <span v-else class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                Inactif
              </span>
            </div>

            <!-- Active sub details -->
            <div v-if="clientStats.activeSub">
              <p class="font-extrabold text-gray-900 text-base leading-tight">{{ clientStats.activeSub.planName ?? 'Abonnement' }}</p>
              <!-- Type badges -->
              <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span v-if="clientStats.activeSub.isCouple" class="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Couple
                </span>
                <span v-else class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  Solo
                </span>
                <span v-if="clientStats.activeSub.daysLeft !== null && clientStats.activeSub.daysLeft <= 3" class="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  ⚠ Expire bientôt
                </span>
              </div>
              <!-- Partner -->
              <p v-if="clientStats.activeSub.partnerName" class="text-xs text-purple-500 mt-1.5">Avec {{ clientStats.activeSub.partnerName }}</p>
              <!-- Expiry row -->
              <div class="mt-3 flex items-center justify-between text-xs">
                <span class="text-gray-400">Expire le</span>
                <span class="font-semibold text-gray-700">{{ formatDate(clientStats.activeSub.expiresAt ?? '') }}</span>
              </div>
              <!-- Days left pill -->
              <div class="mt-2 flex items-center justify-between">
                <span class="text-xs text-gray-400">Jours restants</span>
                <span
                  class="text-sm font-extrabold px-2.5 py-0.5 rounded-full"
                  :class="(clientStats.activeSub.daysLeft ?? 0) <= 3 ? 'bg-red-100 text-red-700' : (clientStats.activeSub.daysLeft ?? 0) <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
                >{{ clientStats.activeSub.daysLeft }}j</span>
              </div>
            </div>

            <!-- No sub -->
            <div v-else class="py-2">
              <p class="text-sm text-gray-400">Aucun abonnement actif</p>
              <p class="text-xs text-gray-300 mt-0.5">Souscrivez pour accéder aux séances</p>
            </div>

            <NuxtLink
              to="/dashboard/subscriptions"
              class="mt-4 flex items-center justify-center gap-1.5 w-full text-xs font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 transition-all"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              Gérer mon abonnement
            </NuxtLink>
          </div>
        </div>

        <!-- COACH: quick link -->
        <div v-if="isCoach && !isAdmin" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coach</p>
          <NuxtLink to="/coach/sessions" class="btn-secondary w-full text-center text-sm block">
            Mes séances
          </NuxtLink>
        </div>

        <!-- ADMIN: quick links -->
        <div v-if="isAdmin" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Administration</p>
          <div class="space-y-1">
            <NuxtLink to="/admin" class="drawer-link text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Tableau de bord admin
            </NuxtLink>
            <NuxtLink to="/admin/users" class="drawer-link text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Utilisateurs
            </NuxtLink>
          </div>
        </div>

      </div>

      <!-- ── RIGHT — Tabbed forms ───────────────────────────── -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Tab switcher -->
        <div class="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            class="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'info' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'info'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Informations
          </button>
          <button
            class="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="activeTab === 'security' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'security'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Sécurité
          </button>
        </div>

        <!-- ── TAB: Informations personnelles ──── -->
        <div v-if="activeTab === 'info'" class="space-y-4">

          <form @submit.prevent="saveProfile">

            <!-- ─ Section : Identité ─ -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-gray-900 leading-none">Identité</h3>
                  <p class="text-xs text-gray-400 mt-0.5">Prénom et nom affichés dans l'application</p>
                </div>
              </div>
              <div class="p-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">Prénom</label>
                    <input
                      v-model="form.firstName"
                      type="text"
                      class="form-input"
                      :class="{ 'border-red-400': errors.firstName }"
                      placeholder="Votre prénom"
                      autocomplete="given-name"
                    />
                    <p v-if="errors.firstName" class="form-error">{{ errors.firstName }}</p>
                  </div>
                  <div>
                    <label class="form-label">Nom</label>
                    <input
                      v-model="form.lastName"
                      type="text"
                      class="form-input"
                      :class="{ 'border-red-400': errors.lastName }"
                      placeholder="Votre nom"
                      autocomplete="family-name"
                    />
                    <p v-if="errors.lastName" class="form-error">{{ errors.lastName }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─ Section : Contact ─ -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                <div class="w-8 h-8 rounded-lg bg-primary-400/10 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-gray-900 leading-none">Contact</h3>
                  <p class="text-xs text-gray-400 mt-0.5">E-mail de connexion et téléphone</p>
                </div>
              </div>
              <div class="p-6 space-y-4">
                <!-- Email (read-only) -->
                <div>
                  <label class="form-label">Adresse e-mail</label>
                  <div class="relative">
                    <input
                      :value="profile?.email ?? ''"
                      type="email"
                      class="form-input bg-gray-50 text-gray-500 cursor-not-allowed pr-10"
                      disabled
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </span>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">L'adresse e-mail ne peut pas être modifiée.</p>
                </div>
                <!-- Phone -->
                <div>
                  <label class="form-label">Téléphone</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="form-input"
                    :class="{ 'border-red-400': errors.phone }"
                    placeholder="+229 00 00 00 00"
                    autocomplete="tel"
                  />
                  <p v-if="errors.phone" class="form-error">{{ errors.phone }}</p>
                </div>
              </div>
            </div>

            <!-- ─ Section : Profil ─ -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                <div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-gray-900 leading-none">Profil</h3>
                  <p class="text-xs text-gray-400 mt-0.5">Genre et date de naissance</p>
                </div>
              </div>
              <div class="p-6 space-y-5">
                <!-- Gender -->
                <div>
                  <label class="form-label">Genre</label>
                  <div class="flex gap-3">
                    <label
                      class="flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all"
                      :class="form.gender === 'MALE' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
                    >
                      <input v-model="form.gender" type="radio" value="MALE" class="sr-only" />
                      <span class="text-xl">👨</span>
                      <div>
                        <p class="text-sm font-semibold text-gray-700">Homme</p>
                        <p class="text-[10px] text-gray-400">♂ Masculin</p>
                      </div>
                    </label>
                    <label
                      class="flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all"
                      :class="form.gender === 'FEMALE' ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-gray-300'"
                    >
                      <input v-model="form.gender" type="radio" value="FEMALE" class="sr-only" />
                      <span class="text-xl">👩</span>
                      <div>
                        <p class="text-sm font-semibold text-gray-700">Femme</p>
                        <p class="text-[10px] text-gray-400">♀ Féminin</p>
                      </div>
                    </label>
                  </div>
                </div>
                <!-- Birthday -->
                <div>
                  <label class="form-label">Date de naissance <span class="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                  <div class="flex gap-3">
                    <div class="flex-1">
                      <select v-model="form.birthDay" class="form-input">
                        <option :value="null">Jour</option>
                        <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
                      </select>
                    </div>
                    <div class="flex-1">
                      <select v-model="form.birthMonth" class="form-input">
                        <option :value="null">Mois</option>
                        <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error banner -->
            <p v-if="apiError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {{ apiError }}
            </p>

            <!-- Save button -->
            <div class="flex justify-end">
              <button
                type="submit"
                class="btn-primary flex items-center gap-2 min-w-[160px] justify-center"
                :disabled="saving"
              >
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                {{ saving ? 'Enregistrement…' : 'Enregistrer les modifications' }}
              </button>
            </div>

          </form>
        </div>

        <!-- ── TAB: Sécurité ─────────────────────────────────── -->
        <div v-if="activeTab === 'security'" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900 leading-none">Changer le mot de passe</h2>
              <p class="text-xs text-gray-500 mt-0.5">Choisissez un mot de passe fort et unique.</p>
            </div>
          </div>

          <form class="space-y-5" @submit.prevent="changePassword">

            <!-- Current password -->
            <div>
              <label class="form-label">Mot de passe actuel</label>
              <div class="relative">
                <input
                  v-model="pwForm.currentPassword"
                  :type="showCurrentPw ? 'text' : 'password'"
                  class="form-input pr-10"
                  :class="{ 'border-red-400': pwErrors.currentPassword }"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showCurrentPw = !showCurrentPw">
                  <svg v-if="showCurrentPw" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
              </div>
              <p v-if="pwErrors.currentPassword" class="form-error">{{ pwErrors.currentPassword }}</p>
            </div>

            <!-- New password -->
            <div>
              <label class="form-label">Nouveau mot de passe</label>
              <div class="relative">
                <input
                  v-model="pwForm.newPassword"
                  :type="showNewPw ? 'text' : 'password'"
                  class="form-input pr-10"
                  :class="{ 'border-red-400': pwErrors.newPassword }"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showNewPw = !showNewPw">
                  <svg v-if="showNewPw" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
              </div>
              <!-- Password strength criteria -->
              <div v-if="pwForm.newPassword" class="mt-2.5 grid grid-cols-2 gap-1.5">
                <div v-for="c in pwCriteria" :key="c.label" class="flex items-center gap-1.5 text-xs" :class="c.met ? 'text-green-600' : 'text-gray-400'">
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="c.met" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    <circle v-else cx="12" cy="12" r="9" stroke-width="2"/>
                  </svg>
                  {{ c.label }}
                </div>
              </div>
              <p v-if="pwErrors.newPassword" class="form-error">{{ pwErrors.newPassword }}</p>
            </div>

            <!-- Confirm new password -->
            <div>
              <label class="form-label">Confirmer le nouveau mot de passe</label>
              <div class="relative">
                <input
                  v-model="pwForm.confirmPassword"
                  :type="showConfirmPw ? 'text' : 'password'"
                  class="form-input pr-10"
                  :class="{ 'border-red-400': pwErrors.confirmPassword }"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showConfirmPw = !showConfirmPw">
                  <svg v-if="showConfirmPw" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </button>
              </div>
              <p v-if="pwErrors.confirmPassword" class="form-error">{{ pwErrors.confirmPassword }}</p>
            </div>

            <!-- Error banner -->
            <p v-if="pwApiError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {{ pwApiError }}
            </p>

            <!-- Save button -->
            <div class="flex justify-end pt-2">
              <button
                type="submit"
                class="btn-primary flex items-center gap-2 min-w-[180px] justify-center"
                :disabled="changingPw || !isPwFormValid"
              >
                <svg v-if="changingPw" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                {{ changingPw ? 'Mise à jour…' : 'Mettre à jour' }}
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user, isAdmin, isCoach, isClient, accessToken } = useAuth()

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ── Active tab ─────────────────────────────────────────────
const activeTab = ref<'info' | 'security'>('info')

// ── State ──────────────────────────────────────────────────
const saving = ref(false)
const saved = ref(false)
const savedMessage = ref('Profil mis à jour avec succès')
const apiError = ref('')
const avatarUploading = ref(false)

// ── Password change state ──────────────────────────────────
const pwForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const changingPw = ref(false)
const pwApiError = ref('')
const showCurrentPw = ref(false)
const showNewPw = ref(false)
const showConfirmPw = ref(false)

const pwCriteria = computed(() => [
  { label: '8 caractères min.', met: pwForm.newPassword.length >= 8 },
  { label: 'Majuscule (A–Z)', met: /[A-Z]/.test(pwForm.newPassword) },
  { label: 'Chiffre (0–9)', met: /\d/.test(pwForm.newPassword) },
  { label: 'Caractère spécial', met: /[^A-Za-z0-9]/.test(pwForm.newPassword) },
])

const pwErrors = computed(() => {
  const e: Record<string, string> = {}
  if (!pwForm.currentPassword) e.currentPassword = 'Requis'
  if (pwForm.newPassword && !pwCriteria.value.every(c => c.met)) e.newPassword = 'Le mot de passe ne satisfait pas tous les critères'
  if (pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword) e.confirmPassword = 'Les mots de passe ne correspondent pas'
  return e
})

const isPwFormValid = computed(() =>
  pwForm.currentPassword.length > 0 &&
  pwForm.newPassword.length >= 8 &&
  pwCriteria.value.every(c => c.met) &&
  pwForm.confirmPassword === pwForm.newPassword
)

// ── Profile data (fetch from /api/auth/me) ─────────────────
const { data: profile, refresh: refreshProfile } = await useAsyncData('profile', () =>
  $fetch<{
    id: string; name: string; firstName: string | null; lastName: string | null
    email: string; phone: string | null; gender: string | null
    birthDay: number | null; birthMonth: number | null; avatarUrl: string | null
    role: string; createdAt?: string | null
  }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken.value}` },
  })
)

// Form state — initialised from profile
const form = reactive({
  firstName: profile.value?.firstName ?? '',
  lastName: profile.value?.lastName ?? '',
  phone: profile.value?.phone ?? '',
  gender: profile.value?.gender ?? '' as string,
  birthDay: profile.value?.birthDay ?? null as number | null,
  birthMonth: profile.value?.birthMonth ?? null as number | null,
  avatarUrl: profile.value?.avatarUrl ?? null as string | null,
})

// Sync when profile loads (SSR / re-fetch)
watch(profile, (p) => {
  if (!p) return
  form.firstName = p.firstName ?? ''
  form.lastName = p.lastName ?? ''
  form.phone = p.phone ?? ''
  form.gender = p.gender ?? ''
  form.birthDay = p.birthDay ?? null
  form.birthMonth = p.birthMonth ?? null
  form.avatarUrl = p.avatarUrl ?? null
})

// ── Computed ───────────────────────────────────────────────
const fullName = computed(() => [form.firstName, form.lastName].filter(Boolean).join(' '))
const initials = computed(() => {
  const f = (form.firstName || user.value?.name || '?')[0]?.toUpperCase() ?? '?'
  const l = (form.lastName || '')[0]?.toUpperCase() ?? ''
  return l ? f + l : f
})
const roleLabel = computed(() => {
  if (isAdmin.value) return 'Admin'
  if (isCoach.value) return 'Coach'
  return 'Client'
})

// Form validation
const errors = computed(() => {
  const e: Record<string, string> = {}
  if (!form.firstName.trim() || form.firstName.trim().length < 2) e.firstName = 'Minimum 2 caractères'
  if (!form.lastName.trim() || form.lastName.trim().length < 2) e.lastName = 'Minimum 2 caractères'
  if (form.phone && !/^[+\d\s\-(). ]{8,}$/.test(form.phone)) e.phone = 'Numéro invalide'
  return e
})

const isFormValid = computed(() => Object.keys(errors.value).length === 0)

// ── Role-specific stats ────────────────────────────────────
const clientStats = reactive({
  activeSub: null as { planName: string | null; expiresAt: string | null; daysLeft: number | null; isCouple: boolean; partnerName: string | null } | null,
  bookingCount: 0,
  upcomingCount: 0,
})

const coachStats = reactive({ sessionCount: 0, clientCount: 0 })

if (isClient.value) {
  try {
    const [subData, bkData] = await Promise.all([
      $fetch<{ active: boolean; planName: string | null; expiresAt: string | null; daysLeft: number | null; isCouple: boolean; partnerName: string | null }>('/api/me/subscription', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      }),
      $fetch<Array<{ status: string; session: { dateTime: string } }>>('/api/bookings', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      }),
    ])
    clientStats.activeSub = subData.active ? subData : null
    clientStats.bookingCount = bkData.length
    clientStats.upcomingCount = bkData.filter(
      b => b.status === 'CONFIRMED' && new Date(b.session.dateTime) > new Date()
    ).length
  } catch { /* no stats */ }
}

if (isCoach.value && !isAdmin.value) {
  try {
    const sData = await $fetch<{ sessions: unknown[]; total?: number }>('/api/coach/sessions', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    coachStats.sessionCount = sData.total ?? sData.sessions?.length ?? 0
    const aData = await $fetch<{ assignments: unknown[] }>('/api/coach/assignments', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    }).catch(() => ({ assignments: [] }))
    coachStats.clientCount = aData.assignments.length
  } catch { /* no stats */ }
}

// ── Actions ────────────────────────────────────────────────
async function saveProfile() {
  if (!isFormValid.value) return
  saving.value = true
  apiError.value = ''
  try {
    await $fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        birthDay: form.birthDay ?? undefined,
        birthMonth: form.birthMonth ?? undefined,
      },
    })
    await refreshProfile()
    savedMessage.value = 'Profil mis à jour avec succès'
    saved.value = true
    setTimeout(() => { saved.value = false }, 4000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    apiError.value = e?.data?.message ?? e?.statusMessage ?? 'Une erreur est survenue'
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (!isPwFormValid.value) return
  changingPw.value = true
  pwApiError.value = ''
  try {
    await $fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword, confirmPassword: pwForm.confirmPassword },
    })
    pwForm.currentPassword = ''
    pwForm.newPassword = ''
    pwForm.confirmPassword = ''
    savedMessage.value = 'Mot de passe mis à jour avec succès'
    saved.value = true
    setTimeout(() => { saved.value = false }, 4000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; statusMessage?: string }
    pwApiError.value = e?.data?.message ?? e?.statusMessage ?? 'Une erreur est survenue'
  } finally {
    changingPw.value = false
  }
}

async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    apiError.value = 'Image trop volumineuse (max 2 Mo)'
    return
  }
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await $fetch<{ avatarUrl: string }>('/api/auth/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: formData,
    })
    form.avatarUrl = res.avatarUrl
    saved.value = true
    setTimeout(() => { saved.value = false }, 4000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    apiError.value = e?.data?.message ?? 'Erreur lors de l\'envoi de l\'image'
  } finally {
    avatarUploading.value = false
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>
