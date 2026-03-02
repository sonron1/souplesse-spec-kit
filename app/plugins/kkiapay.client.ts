// plugins/kkiapay.client.ts
// Official KKiaPay Nuxt integration — runs on client only (*.client.ts convention)
import { defineNuxtPlugin } from '#app'
import * as kkiapayModule from 'kkiapay'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      kkiapay: kkiapayModule,
    },
  }
})
