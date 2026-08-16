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
  // Las credenciales de la puerta de entrada acaban en el bundle: el sitio es estático y no
  // hay servidor donde esconderlas. Son valores por defecto configurables, no secretos; se
  // cambian con NUXT_PUBLIC_AUTH_USER, NUXT_PUBLIC_AUTH_PASSWORD_HASH y
  // NUXT_PUBLIC_TURNSTILE_SITE_KEY.
  runtimeConfig: {
    public: {
      siteUrl: 'https://daloni.github.io/english-course',
      authUser: 'alumno',
      // SHA-256 de la contraseña por defecto, para no dejarla escrita en claro en el repo.
      authPasswordHash: '6bbd88e8c327bb10d12f274a514e1c87024f4971fa724bdcd752271f2873b953',
      // La sitekey de pruebas de Cloudflare: siempre pasa, así que dev y CI funcionan sin
      // cuenta. En producción se pone la real.
      turnstileSiteKey: '1x00000000000000000000AA'
    }
  },

  compatibilityDate: '2026-06-30',

  // El sitio se genera entero desde la home siguiendo los enlaces; si una página revienta,
  // `pnpm generate` falla en vez de publicar el sitio a medias.
  nitro: {
    prerender: {
      // A /login no le enlaza nadie, así que el crawler no llega solo: sin ponerla aquí no
      // se genera y en GitHub Pages daría un 404.
      routes: ['/', '/login'],
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
