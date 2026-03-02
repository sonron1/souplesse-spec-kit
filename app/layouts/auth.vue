<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo / Brand mark -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block">
          <span class="text-3xl font-extrabold tracking-tight text-white">
            Souplesse<span class="text-primary-500">&nbsp;·</span>
          </span>
        </NuxtLink>
        <p class="text-gray-400 text-sm mt-1">Centre de fitness & bien-être</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <slot />
      </div>

      <!-- Footer note -->
      <p class="text-center text-gray-500 text-xs mt-6">
        © {{ new Date().getFullYear() }} Souplesse. Tous droits réservés.
      </p>
    </div>
  </div>
</template>
