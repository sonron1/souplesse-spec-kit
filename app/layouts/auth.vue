<template>
  <div class="min-h-screen flex">

    <!-- ── Left decorative panel (desktop only) ───────────── -->
    <div class="hidden lg:flex lg:w-[52%] bg-black relative overflow-hidden flex-col justify-between px-14 py-12">

      <!-- Decorative rings -->
      <div class="absolute top-0 right-0 w-[520px] h-[520px] rounded-full border border-primary-400/10 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div class="absolute top-0 right-0 w-[320px] h-[320px] rounded-full border border-primary-400/20 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary-400/5 translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div class="absolute bottom-24 right-8 w-32 h-32 rounded-full bg-primary-400/10 pointer-events-none" />

      <!-- Brand -->
      <NuxtLink to="/" class="relative z-10 inline-block">
        <span class="text-2xl font-extrabold tracking-tight text-white">
          Souplesse<span class="text-primary-400">·</span>
        </span>
      </NuxtLink>

      <!-- Main content -->
      <div class="relative z-10">
        <div class="w-12 h-1 bg-primary-400 rounded-full mb-6" />
        <h1 class="text-4xl font-extrabold text-white leading-tight mb-4">
          Transformez votre corps,<br>
          <span class="text-primary-400">élevez votre esprit.</span>
        </h1>
        <p class="text-gray-400 text-sm leading-relaxed max-w-sm mb-10">
          Séances de sport personnalisées, programmes sur-mesure et coachs certifiés — tout
          ce qu'il vous faut pour atteindre vos objectifs.
        </p>

        <!-- Feature list -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary-400/15 border border-primary-400/30 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-sm text-gray-300">Réservation de séances en quelques clics</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary-400/15 border border-primary-400/30 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <span class="text-sm text-gray-300">Coachs certifiés à votre disposition</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary-400/15 border border-primary-400/30 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span class="text-sm text-gray-300">Suivi de vos progressions en temps réel</span>
          </div>
        </div>
      </div>

      <!-- Footer left -->
      <p class="relative z-10 text-gray-600 text-xs">
        © {{ new Date().getFullYear() }} Souplesse. Tous droits réservés.
      </p>
    </div>

    <!-- ── Right form panel ────────────────────────────────── -->
    <div class="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50" style="color-scheme: light">
      <div class="w-full max-w-md">

        <!-- Mobile brand -->
        <div class="text-center mb-8 lg:hidden">
          <NuxtLink to="/" class="inline-block">
            <span class="text-3xl font-extrabold tracking-tight text-gray-900">
              Souplesse<span class="text-primary-500">·</span>
            </span>
          </NuxtLink>
          <p class="text-gray-500 text-sm mt-1">Centre de fitness &amp; bien-être</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-lg shadow-gray-200/80 border border-gray-100 p-8">
          <slot />
        </div>

        <p class="text-center text-gray-400 text-xs mt-6 lg:hidden">
          © {{ new Date().getFullYear() }} Souplesse. Tous droits réservés.
        </p>
      </div>
    </div>

  </div>
</template>
