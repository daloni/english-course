// https://nuxt.com/docs/api/configuration/nuxt-config

// Without its variables the site ships with no canonical and a login nobody can pass, so the
// build stops here naming what is missing instead of publishing something unusable.
const missing = ['SITE_URL', 'SITE_NAME', 'SITE_DESCRIPTION', 'AUTH_USER', 'AUTH_PASSWORD_HASH', 'TURNSTILE_SITE_KEY']
  .map(name => `NUXT_PUBLIC_${name}`).filter(key => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env.`)
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils/module'
  ],

  devtools: {
    enabled: true
  },

  // The site is in Spanish and is read on a phone, including the error page and the shell
  // GitHub Pages serves as 404.html, neither of which goes through app.vue.
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

  // Everything configurable lives in the .env, never written here: Nuxt fills these keys from
  // the matching NUXT_PUBLIC_* variables, so dev, build and generate all read the same source.
  // The login credentials end up in the bundle: the site is static and there is no server to
  // hide them in. They are configurable defaults, not secrets.
  runtimeConfig: {
    public: {
      siteUrl: '',
      siteName: '',
      siteDescription: '',
      authUser: '',
      authPasswordHash: '',
      turnstileSiteKey: ''
    }
  },

  compatibilityDate: '2026-06-30',

  // The whole site is generated from the home following its links; if a page blows up,
  // `pnpm generate` fails instead of publishing half a site.
  nitro: {
    prerender: {
      // Nothing links to /login, so the crawler never reaches it on its own: without listing
      // it here it would not be generated and GitHub Pages would answer a 404.
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
