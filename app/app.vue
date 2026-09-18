<script setup lang="ts">
// The site is published under a subpath on GitHub Pages, so the icon hangs off the base.
const { app, public: { siteUrl, siteName, siteDescription: description, googleSiteVerification } } = useRuntimeConfig()
const route = useRoute()

/**
 * The public URL of the page being viewed, with a trailing slash: GitHub Pages serves every
 * route as `route/index.html` and redirects the slashless URL, and a canonical must not redirect.
 */
const url = computed(() => `${siteUrl.replace(/\/$/, '')}${route.path.replace(/\/?$/, '/')}`)

useHead({
  link: [
    { rel: 'icon', href: `${app.baseURL}favicon.ico` },
    { rel: 'canonical', href: url }
  ]
})

if (googleSiteVerification) {
  useHead({ meta: [{ name: 'google-site-verification', content: googleSiteVerification }] })
}

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
