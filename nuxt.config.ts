// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils/module'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  // El sitio se genera entero desde la home siguiendo los enlaces; si una página revienta,
  // `pnpm generate` falla en vez de publicar el sitio a medias.
  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      failOnError: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
