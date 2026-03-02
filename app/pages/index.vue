<template>
  <div class="text-gray-900 bg-white">

    <!-- ═══════════════════════════════════════════════════════ HERO -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      <!-- Subtle yellow gradient blobs -->
      <div class="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-primary-100/60 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary-50/80 blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div class="reveal relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p class="text-primary-600 uppercase tracking-[0.3em] text-xs font-bold mb-6">
          Centre de Fitness &amp; Musculation — Cotonou, Bénin
        </p>
        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-none mb-6">
          Souplesse<br />
          <span class="text-primary-500">Fitness</span>
        </h1>
        <p class="text-2xl font-light text-gray-500 mb-4 tracking-wide">
          Stabilité &mdash; Progrès &mdash; Réussite
        </p>
        <p class="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Rejoignez notre salle de fitness moderne à Cotonou. Coachs certifiés,
          équipements professionnels et suivi personnalisé pour atteindre vos objectifs.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/register"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-base transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-200"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Commencer maintenant
          </NuxtLink>
          <a
            href="#formules"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-gray-200 hover:border-primary-400 text-gray-700 hover:text-primary-600 font-semibold text-base transition-all duration-300"
          >
            Voir les formules
          </a>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ CHIFFRES -->
    <section class="bg-primary-500 py-12">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-black">
          <div v-for="(s, i) in stats" :key="s.label" class="reveal" :style="`--delay: ${i * 80}ms`">
            <div class="text-4xl font-extrabold">{{ s.value }}</div>
            <div class="text-sm font-semibold mt-1 opacity-75">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ POURQUOI NOUS -->
    <section class="bg-white py-24 px-6">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-14 reveal">
          <p class="text-primary-500 uppercase tracking-widest text-xs font-bold mb-3">Nos atouts</p>
          <h2 class="text-4xl sm:text-5xl font-extrabold text-gray-900">
            Pourquoi choisir<br /><span class="text-primary-500">Souplesse Fitness&nbsp;?</span>
          </h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="(f, i) in features"
            :key="f.title"
            class="reveal bg-gray-50 border border-gray-100 rounded-2xl p-7 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-50 transition-all duration-300 hover:-translate-y-1"
            :style="`--delay: ${i * 80}ms`"
          >
            <div class="text-4xl mb-4">{{ f.icon }}</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ f.title }}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ ACTIVITÉS -->
    <section class="bg-gray-50 py-24 px-6 border-t border-gray-100">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-14 reveal">
          <p class="text-primary-500 uppercase tracking-widest text-xs font-bold mb-3">Ce que nous proposons</p>
          <h2 class="text-4xl sm:text-5xl font-extrabold text-gray-900">Nos activités</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <div
            v-for="(a, i) in activities"
            :key="a.name"
            class="reveal relative rounded-2xl overflow-hidden bg-white border border-gray-100 aspect-square flex items-end p-5 hover:border-primary-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            :style="`--delay: ${i * 50}ms`"
          >
            <div class="absolute inset-0 flex items-center justify-center text-7xl opacity-10 group-hover:opacity-20 transition-opacity duration-300">{{ a.icon }}</div>
            <span class="relative z-10 text-gray-900 font-bold text-sm leading-tight">{{ a.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ FORMULES -->
    <section id="formules" class="bg-white py-24 px-6 border-t border-gray-100">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-14 reveal">
          <p class="text-primary-500 uppercase tracking-widest text-xs font-bold mb-3">Abonnements</p>
          <h2 class="text-4xl sm:text-5xl font-extrabold text-gray-900">Nos formules</h2>
          <p class="text-gray-500 mt-4 max-w-lg mx-auto">
            Choisissez la formule adaptée à votre rythme.
            <strong>Connectez-vous pour accéder aux tarifs et souscrire.</strong>
          </p>
        </div>

        <!-- Loading -->
        <div v-if="plansLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="h-44 bg-gray-100 rounded-2xl animate-pulse" />
        </div>

        <template v-else>
          <div v-for="cat in planCategories" :key="cat.label" class="mb-12">
            <h3 class="text-base font-bold text-primary-600 uppercase tracking-widest mb-5 flex items-center gap-2 reveal">
              <span>{{ cat.icon }}</span> {{ cat.label }}
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                v-for="(plan, i) in cat.plans"
                :key="plan.id"
                class="reveal"
                :style="`--delay: ${i * 70}ms`"
              >
                <div
                  :class="[
                    'relative rounded-2xl border p-6 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                    plan.highlighted
                      ? 'bg-primary-50 border-primary-300 shadow-md shadow-primary-100'
                      : 'bg-gray-50 border-gray-100 hover:border-primary-200',
                  ]"
                >
                  <div v-if="plan.highlighted" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    ⭐ Le plus populaire
                  </div>
                  <h4 class="font-bold text-gray-900 text-base mb-1">{{ plan.name }}</h4>
                  <p class="text-gray-400 text-xs mb-3">
                    Valable {{ plan.validityDays }} jour{{ plan.validityDays > 1 ? 's' : '' }}
                  </p>
                  <div v-if="plan.maxReports" class="text-xs text-primary-600 font-semibold mb-3">
                    + {{ plan.maxReports }} bilan{{ plan.maxReports > 1 ? 's' : '' }} physique{{ plan.maxReports > 1 ? 's' : '' }} inclus
                  </div>
                  <div v-if="plan.priceCouple" class="text-xs text-gray-400 mb-3">
                    Disponible en formule Duo
                  </div>
                  <div class="mt-auto">
                    <NuxtLink
                      to="/login"
                      class="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors"
                    >
                      Voir le tarif →
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="text-center mt-10 reveal">
          <NuxtLink
            to="/register"
            class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-500 hover:bg-primary-400 text-black font-bold text-base transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-200"
          >
            S'inscrire pour accéder aux tarifs
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ HORAIRES -->
    <section id="horaires" class="bg-gray-50 py-24 px-6 border-t border-gray-100">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-12 reveal">
          <p class="text-primary-500 uppercase tracking-widest text-xs font-bold mb-3">Planning</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Horaires d'ouverture</h2>
        </div>
        <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm reveal">
          <div
            v-for="(h, i) in horaires"
            :key="h.days"
            :class="[
              'flex items-center justify-between px-7 py-5 transition-colors',
              i < horaires.length - 1 ? 'border-b border-gray-100' : '',
              h.isToday ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'hover:bg-gray-50',
            ]"
          >
            <span :class="['font-semibold text-sm', h.isToday ? 'text-primary-600' : 'text-gray-700']">
              {{ h.days }}
              <span v-if="h.isToday" class="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-bold">Aujourd'hui</span>
            </span>
            <span :class="['font-bold tabular-nums', h.isToday ? 'text-primary-600' : 'text-gray-900']">{{ h.hours }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ CONTACT -->
    <section id="contact" class="bg-white py-24 px-6 border-t border-gray-100">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14 reveal">
          <p class="text-primary-500 uppercase tracking-widest text-xs font-bold mb-3">Localisation</p>
          <h2 class="text-4xl font-extrabold text-gray-900">Nous trouver</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div class="space-y-6 reveal">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 text-lg font-bold">📍</div>
              <div>
                <p class="font-bold text-gray-900 text-sm mb-1">Adresse</p>
                <p class="text-gray-500 text-sm leading-relaxed">
                  Face clôture Lita au bord des pavés.<br />
                  En quittant le Carrefour Lita pour le Carrefour Tankpé,<br />
                  Cotonou, Bénin
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 text-lg">📞</div>
              <div>
                <p class="font-bold text-gray-900 text-sm mb-1">Téléphone / WhatsApp</p>
                <a href="tel:+22996773509" class="text-primary-600 hover:text-primary-500 font-bold text-xl transition-colors">
                  +229 96 77 35 09
                </a>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 text-lg">✉️</div>
              <div>
                <p class="font-bold text-gray-900 text-sm mb-1">Email</p>
                <a href="mailto:souplessefitness@hotmail.fr" class="text-primary-600 hover:text-primary-500 transition-colors text-sm font-medium">
                  souplessefitness@hotmail.fr
                </a>
              </div>
            </div>
            <div class="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
              <p class="text-gray-700 text-sm font-bold mb-2">🏋️ Code vestimentaire</p>
              <ul class="text-gray-500 text-sm space-y-1 list-disc list-inside">
                <li>Tenue de sport obligatoire</li>
                <li>Chaussures de sport obligatoires</li>
                <li>Serviette obligatoire</li>
              </ul>
            </div>
          </div>

          <div class="reveal bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden h-80 flex items-center justify-center shadow-sm">
            <div class="text-center p-6">
              <div class="text-5xl mb-3">🗺️</div>
              <p class="text-gray-600 text-sm font-semibold">Carrefour Lita → Carrefour Tankpé</p>
              <p class="text-gray-400 text-xs mt-1">Cotonou, Bénin</p>
              <a
                href="https://maps.google.com/?q=Carrefour+Lita+Cotonou+Benin"
                target="_blank"
                rel="noopener"
                class="mt-5 inline-flex items-center gap-2 text-xs text-primary-600 hover:text-primary-500 border border-primary-200 hover:border-primary-400 px-4 py-2 rounded-lg transition-all"
              >
                Ouvrir dans Google Maps ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════ CTA FINAL -->
    <section class="bg-primary-500 py-20 px-6">
      <div class="max-w-3xl mx-auto text-center text-black reveal">
        <h2 class="text-4xl font-extrabold mb-4">Prêt(e) à transformer votre corps&nbsp;?</h2>
        <p class="text-black/70 mb-8 text-lg">
          Inscrivez-vous dès aujourd'hui et rejoignez la communauté Souplesse Fitness.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/register"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-black text-white font-bold text-base hover:bg-gray-900 transition-all duration-300 hover:scale-105"
          >
            Créer un compte gratuit
          </NuxtLink>
          <a
            href="tel:+22996773509"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-black/20 hover:border-black text-black font-semibold text-base transition-all duration-300"
          >
            📞 Nous appeler
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
  definePageMeta({ layout: 'landing' })

  // ── Plans ──────────────────────────────────────────────────────────────────
  interface Plan {
    id: string; name: string; planType: string
    priceSingle: number; priceCouple: number | null
    validityDays: number; maxReports: number; isActive: boolean
    highlighted?: boolean
  }
  interface PlansResponse { statusCode?: number; body?: Plan[] }

  const plansLoading = ref(true)
  const rawPlans = ref<Plan[]>([])

  const { data } = await useFetch<PlansResponse | Plan[]>('/api/subscription-plans')
  if (data.value) {
    const r = data.value
    rawPlans.value = Array.isArray(r) ? r : ((r as PlansResponse).body ?? [])
  }
  plansLoading.value = false

  const planCategories = computed(() => {
    const mark = (plans: Plan[], highlightName: string) =>
      plans.map(p => ({ ...p, highlighted: p.name === highlightName }))
    return [
      { label: 'Séances & Carnets', icon: '🎟️', plans: mark(
        rawPlans.value.filter(p => ['Séance', 'Carnet 10 séances', 'Carnet 15 séances', 'Autres activités'].includes(p.name)),
        'Carnet 10 séances'
      )},
      { label: 'Abonnements', icon: '📅', plans: mark(
        rawPlans.value.filter(p => p.name.startsWith('Abonnement')),
        'Abonnement 3 mois'
      )},
      { label: 'Accompagnement personnalisé', icon: '🏆', plans: mark(
        rawPlans.value.filter(p => p.name === 'Suivi personnel'), ''
      )},
    ].filter(c => c.plans.length > 0)
  })

  // ── Static data ────────────────────────────────────────────────────────────
  const stats = [
    { value: '7h', label: 'Ouverture dès 7h du matin' },
    { value: '5', label: 'Coachs certifiés' },
    { value: '9', label: "Formules d'abonnement" },
    { value: '7j/7', label: 'Ouvert toute la semaine' },
  ]

  const features = [
    { icon: '🏋️', title: 'Équipements professionnels', desc: "Matériel de musculation et cardio de qualité professionnelle, entretenu régulièrement pour votre sécurité et vos performances." },
    { icon: '👨‍🏫', title: 'Coachs certifiés', desc: "Nos coachs diplômés vous accompagnent avec des programmes adaptés à votre morphologie, vos objectifs et votre niveau." },
    { icon: '⏰', title: 'Horaires flexibles', desc: "Ouverts 7j/7 dès 7h du matin. Vous choisissez le créneau qui s'adapte à votre emploi du temps." },
    { icon: '📊', title: 'Suivi personnalisé', desc: "Bilans physiques réguliers, programmes nutritionnels et plans d'entraînement pour mesurer votre progression réelle." },
    { icon: '👥', title: 'Ambiance motivante', desc: "Une communauté bienveillante et dynamique. Séances en groupe et entraînements duo disponibles." },
    { icon: '💳', title: 'Paiement facile', desc: "Réglez vos abonnements en toute sécurité via Mobile Money (KKiaPay). Formules souples, sans engagement obligatoire." },
  ]

  const activities = [
    { name: 'Musculation', icon: '💪' },
    { name: 'Cardio-training', icon: '🏃' },
    { name: 'Crossfit', icon: '🔥' },
    { name: 'Stretching & Souplesse', icon: '🧘' },
    { name: 'Cours collectifs', icon: '👯' },
    { name: 'Renforcement musculaire', icon: '⚡' },
    { name: 'Perte de poids', icon: '🎯' },
    { name: 'Prise de masse', icon: '📈' },
  ]

  const today = new Date().getDay()
  const horaires = [
    { days: 'Lundi – Vendredi', hours: '07:00 – 22:00', isToday: today >= 1 && today <= 5 },
    { days: 'Samedi', hours: '07:00 – 20:00', isToday: today === 6 },
    { days: 'Dimanche & Jours fériés', hours: '07:00 – 14:00', isToday: today === 0 },
  ]

  // ── Scroll-reveal animations ───────────────────────────────────────────────
  onMounted(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            const delay = el.style.getPropertyValue('--delay') || '0ms'
            setTimeout(() => el.classList.add('revealed'), parseInt(delay))
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
  })
</script>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.revealed {
  opacity: 1;
  transform: translateY(0);
}
</style>
