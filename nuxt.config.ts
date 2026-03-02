import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-01',
  ssr: true,

  // directory structure: UI under app/, server stays under server/
  srcDir: 'app',

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap',
        },
      ],
    },
  },

  modules: ['@nuxtjs/tailwindcss'],

  tailwindcss: {
    configPath: '~/../../tailwind.config.cjs',
    exposeConfig: false,
  },

  nitro: {
    compressPublicAssets: true,
  },

  alias: {
    '~types': '<rootDir>/types',
    '~server': '<rootDir>/server',
  },

  runtimeConfig: {
    // Private (server-only) keys
    jwtSecret: process.env.JWT_SECRET ?? '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    kkiapayApiKey: process.env.KKIAPAY_API_KEY ?? '',
    kkiapaySecretKey: process.env.KKIAPAY_SECRET_KEY ?? '',
    kkiapayWebhookSecret: process.env.KKIAPAY_WEBHOOK_SECRET ?? '',
    databaseUrl: process.env.DATABASE_URL ?? '',
    // Public (exposed to client)
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME ?? 'Souplesse Fitness',
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api',
      kkiapayPublicKey: process.env.NUXT_PUBLIC_KKIAPAY_PUBLIC_KEY ?? '',
      kkiapayIsSandbox: process.env.NUXT_PUBLIC_KKIAPAY_IS_SANDBOX !== 'false',
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },

  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },

  devtools: {
    enabled: true,
  },
})
