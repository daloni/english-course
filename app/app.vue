<script setup lang="ts">
const description = 'Plataforma personal para aprender inglés: teoría de los tiempos verbales, verbos, frases, reading y speaking.'

// El sitio se publica bajo una subruta en GitHub Pages, así que el icono cuelga de la base.
const { app, public: { siteUrl } } = useRuntimeConfig()
const route = useRoute()

/** La URL pública de la página que se está viendo, sin barra final: canonical y og:url. */
const url = computed(() => `${siteUrl.replace(/\/$/, '')}${route.path.replace(/\/$/, '')}`)

useHead({
  link: [
    { rel: 'icon', href: `${app.baseURL}favicon.ico` },
    { rel: 'canonical', href: url }
  ]
})

useSeoMeta({
  title: siteName,
  titleTemplate: `%s · ${siteName}`,
  description,
  ogTitle: siteName,
  ogDescription: description,
  ogType: 'website',
  ogLocale: 'es_ES',
  ogUrl: url,
  twitterCard: 'summary'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
