import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-01',
  ssr: true,

  // directory structure: UI under app/, server stays under server/
  srcDir: 'app',

  css: ['~/assets/css/main.css'],

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
