<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Top navigation bar -->
    <header class="bg-black text-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Brand -->
        <NuxtLink to="/dashboard" class="flex items-center gap-2">
          <span class="text-xl font-extrabold tracking-tight text-white">
            Souplesse<span class="text-primary-500">&nbsp;·</span>
          </span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
          <NuxtLink
            to="/dashboard"
            class="nav-link"
            active-class="nav-link-active"
          >Tableau de bord</NuxtLink>

          <NuxtLink
            to="/dashboard/bookings"
            class="nav-link"
            active-class="nav-link-active"
          >Mes réservations</NuxtLink>

          <NuxtLink
            to="/dashboard/subscriptions"
            class="nav-link"
            active-class="nav-link-active"
          >Mon abonnement</NuxtLink>

          <NuxtLink
            to="/sessions"
            class="nav-link"
            active-class="nav-link-active"
          >Séances</NuxtLink>

          <!-- Coach section -->
          <template v-if="isCoach">
            <span class="text-gray-600">|</span>
            <NuxtLink
              to="/coach"
              class="nav-link"
              active-class="nav-link-active"
            >Coach</NuxtLink>
            <NuxtLink
              to="/coach/programs"
              class="nav-link"
              active-class="nav-link-active"
            >Programmes</NuxtLink>
            <NuxtLink
              to="/coach/sessions"
              class="nav-link"
              active-class="nav-link-active"
            >Mes séances</NuxtLink>
          </template>

          <!-- Admin section -->
          <template v-if="isAdmin">
            <span class="text-gray-600">|</span>
            <NuxtLink to="/admin" class="nav-link" active-class="nav-link-active">Admin</NuxtLink>
            <NuxtLink to="/admin/users" class="nav-link" active-class="nav-link-active">Utilisateurs</NuxtLink>
            <NuxtLink to="/admin/payments" class="nav-link" active-class="nav-link-active">Paiements</NuxtLink>
            <NuxtLink to="/admin/assignments" class="nav-link" active-class="nav-link-active">Assignations</NuxtLink>
            <NuxtLink to="/admin/settings" class="nav-link" active-class="nav-link-active">Paramètres</NuxtLink>
          </template>
        </nav>

        <!-- User info + logout -->
        <div class="flex items-center gap-4">
          <span v-if="user" class="hidden sm:inline text-sm text-gray-300">
            {{ user.name }}
          </span>
          <button
            class="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
            @click="handleLogout"
          >
            Déconnexion
          </button>

          <!-- Mobile menu button -->
          <button
            class="md:hidden text-gray-300 hover:text-white"
            aria-label="Menu"
            @click="mobileOpen = !mobileOpen"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div v-if="mobileOpen" class="md:hidden border-t border-gray-800 px-4 pb-4 pt-2 space-y-1">
        <NuxtLink to="/dashboard" class="mobile-nav-link" @click="mobileOpen = false">Tableau de bord</NuxtLink>
        <NuxtLink to="/dashboard/bookings" class="mobile-nav-link" @click="mobileOpen = false">Mes réservations</NuxtLink>
        <NuxtLink to="/dashboard/subscriptions" class="mobile-nav-link" @click="mobileOpen = false">Mon abonnement</NuxtLink>
        <NuxtLink to="/sessions" class="mobile-nav-link" @click="mobileOpen = false">Séances</NuxtLink>
        <template v-if="isCoach">
          <NuxtLink to="/coach" class="mobile-nav-link" @click="mobileOpen = false">Coach</NuxtLink>
          <NuxtLink to="/coach/programs" class="mobile-nav-link" @click="mobileOpen = false">Programmes</NuxtLink>
          <NuxtLink to="/coach/sessions" class="mobile-nav-link" @click="mobileOpen = false">Mes séances</NuxtLink>
        </template>
        <template v-if="isAdmin">
          <NuxtLink to="/admin" class="mobile-nav-link" @click="mobileOpen = false">Admin</NuxtLink>
          <NuxtLink to="/admin/users" class="mobile-nav-link" @click="mobileOpen = false">Utilisateurs</NuxtLink>
          <NuxtLink to="/admin/payments" class="mobile-nav-link" @click="mobileOpen = false">Paiements</NuxtLink>
          <NuxtLink to="/admin/assignments" class="mobile-nav-link" @click="mobileOpen = false">Assignations</NuxtLink>
          <NuxtLink to="/admin/settings" class="mobile-nav-link" @click="mobileOpen = false">Paramètres</NuxtLink>
        </template>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-black text-gray-500 text-center text-xs py-4">
      © {{ new Date().getFullYear() }} Souplesse — Centre de fitness & bien-être
    </footer>
  </div>
</template>

<script setup lang="ts">
  const { user, isAdmin, isCoach, logout } = useAuth()
  const mobileOpen = ref(false)

  async function handleLogout() {
    await logout()
  }
</script>

<style scoped>
  .nav-link {
    @apply text-gray-300 hover:text-white transition-colors;
  }
  .nav-link-active {
    @apply text-primary-400 font-semibold;
  }
  .mobile-nav-link {
    @apply block py-2 text-gray-300 hover:text-white transition-colors text-sm;
  }
</style>
