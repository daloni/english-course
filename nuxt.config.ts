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

  // La web está en español y se ve en el móvil, también cuando lo que se pinta es la página
  // de error o el cascarón que GitHub Pages sirve como 404.html, que no pasan por app.vue.
  app: {
    head: {
      htmlAttrs: {
        lang: 'es'
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  // La URL pública del sitio, para el canonical y el og:url. En GitHub Pages cuelga de una
  // subruta; el workflow la pasa en NUXT_PUBLIC_SITE_URL.
  runtimeConfig: {
    public: {
      siteUrl: 'https://daloni.github.io/english-course'
    }
  },

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
