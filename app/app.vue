<script setup lang="ts">
const title = 'Aprender inglés'
const description = 'Plataforma personal para aprender inglés: teoría de los tiempos verbales, verbos, frases, reading y speaking.'

// El sitio se publica bajo una subruta en GitHub Pages, así que el icono cuelga de la base.
const { app } = useRuntimeConfig()

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: `${app.baseURL}favicon.ico` }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

useSeoMeta({
  title,
  titleTemplate: `%s · ${title}`,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
