import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // set compatibilityDate to current date to satisfy Nitro/Vite warnings
  compatibilityDate: '2026-03-01',
  ssr: true,
  nitro: {
    compressPublicAssets: true,
  },
})
