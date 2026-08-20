<script setup lang="ts">
// The site is published under a subpath on GitHub Pages, so the icon hangs off the base.
const { app, public: { siteUrl, siteName, siteDescription: description } } = useRuntimeConfig()
const route = useRoute()

/** The public URL of the page being viewed, without a trailing slash: canonical and og:url. */
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
  ogImage: `${siteUrl.replace(/\/$/, '')}/og-image.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: description,
  ogSiteName: siteName,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <VitePwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
