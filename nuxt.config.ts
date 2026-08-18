// https://nuxt.com/docs/api/configuration/nuxt-config

// Without its variables the site ships with no canonical, so the build stops here naming what
// is missing instead of publishing something unusable.
const missing = ['SITE_URL', 'SITE_NAME', 'SITE_DESCRIPTION']
  .map(name => `NUXT_PUBLIC_${name}`).filter(key => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env.`)
}

// On GitHub Pages the site hangs off /<repo>/, and the workflow passes that in. The manifest
// has to say the same: a service worker scoped to / would not control the site, and the install
// would never be offered — silently, because on localhost the base is / and it all looks fine.
const base = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils/module',
    '@vite-pwa/nuxt'
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
  runtimeConfig: {
    public: {
      siteUrl: '',
      siteName: '',
      siteDescription: ''
    }
  },

  compatibilityDate: '2026-06-30',

  // The whole site is generated from the home following its links; if a page blows up,
  // `pnpm generate` fails instead of publishing half a site.
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
  },

  // Installable and usable without a connection. What survives offline is everything the bundle
  // already carries — theory, verbs, sentences, reading, /progreso and /repaso — because
  // content/ is compiled in, not fetched. The clips need the YouTube iframe and the speaking
  // needs the Web Speech API, so those two say so instead of pretending.
  pwa: {
    registerType: 'autoUpdate',
    base,
    scope: base,

    manifest: {
      id: base,
      name: process.env.NUXT_PUBLIC_SITE_NAME,
      short_name: 'Inglés',
      description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
      lang: 'es',
      display: 'standalone',
      start_url: base,
      scope: base,
      theme_color: '#172554',
      background_color: '#172554',
      // Relative to the manifest, which lives under the base: no leading slash here.
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },

    workbox: {
      // `json` are the _payload.json Nuxt writes for every prerendered route, and `woff2` the
      // fonts @nuxt/fonts leaves in _fonts/. Without either, an offline start renders unstyled
      // pages with no data.
      globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2}'],
      // No navigateFallback on purpose: every route is prerendered with its own index.html and
      // precached, so each URL opens offline with its own page. An SPA fallback to / would
      // replace all of them with the home.
      navigateFallback: undefined
    }
  }
})
