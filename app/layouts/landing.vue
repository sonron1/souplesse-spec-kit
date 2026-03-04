<template>
  <div class="min-h-screen bg-white text-gray-900 flex flex-col">
    <!-- Top bar -->
    <header class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="text-xl font-extrabold tracking-tight text-gray-900">
            Souplesse<span class="text-primary-500">·</span>Fitness
          </span>
        </NuxtLink>
        <div class="flex items-center gap-3">
          <template v-if="isLoggedIn">
            <NuxtLink
              :to="isAdmin ? '/admin' : isCoach ? '/coach' : '/dashboard'"
              class="text-sm font-semibold bg-primary-500 hover:bg-primary-400 text-black px-5 py-2 rounded-lg transition-colors"
            >Mon espace</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
            >Se connecter</NuxtLink>
            <NuxtLink
              to="/register"
              class="text-sm font-semibold bg-primary-500 hover:bg-primary-400 text-black px-5 py-2 rounded-lg transition-colors"
            >S'inscrire</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1 pt-16">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-black border-t border-white/10 py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <span class="text-xl font-extrabold tracking-tight text-white">
              Souplesse<span class="text-primary-400">·</span>Fitness
            </span>
            <p class="text-gray-400 text-sm mt-2 leading-relaxed">
              Stabilité – Progrès – Réussite.<br />
              Centre de fitness & musculation à Cotonou.
            </p>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-widest mb-3">Navigation</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a href="#formules" class="hover:text-primary-400 transition-colors">Nos formules</a></li>
              <li><a href="#horaires" class="hover:text-primary-400 transition-colors">Horaires</a></li>
              <li><a href="#contact" class="hover:text-primary-400 transition-colors">Contact</a></li>
              <li><NuxtLink to="/register" class="hover:text-primary-400 transition-colors">S'inscrire</NuxtLink></li>
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-widest mb-3">Contact</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li class="flex items-start gap-2">
                <span class="text-primary-400 mt-0.5">📍</span>
                <a href="https://maps.app.goo.gl/Py8YokJMMmGNKuVQ6" target="_blank" rel="noopener noreferrer" class="hover:text-primary-400 transition-colors">
                  Face clôture Lita au bord des pavés,<br />Carrefour Lita → Carrefour Tankpé
                </a>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-primary-400">📞</span>
                <a href="tel:+22996773509" class="hover:text-primary-400 transition-colors">+229 96 77 35 09</a>
              </li>
              <li class="flex items-center gap-2">
                <span class="text-primary-400">✉️</span>
                <a href="mailto:souplessefitness@hotmail.fr" class="hover:text-primary-400 transition-colors">souplessefitness@hotmail.fr</a>
              </li>
            </ul>
          </div>
        </div>
        <div class="border-t border-white/10 pt-6 text-center text-xs text-gray-600">
          © {{ new Date().getFullYear() }} Souplesse Fitness. Tous droits réservés.
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { isLoggedIn, isAdmin, isCoach } = useAuth()

// Redirect already-authenticated users away from the landing page
onMounted(() => {
  if (isLoggedIn.value) {
    const dest = isAdmin.value ? '/admin' : isCoach.value ? '/coach' : '/dashboard'
    navigateTo(dest)
  }
})
</script>
