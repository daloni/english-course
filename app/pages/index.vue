<script setup lang="ts">
const { pending } = useProgress()
const { siteName, siteUrl, legalOwner } = useRuntimeConfig().public
const homeTitle = 'Aprender inglés: tiempos verbales, verbos, frases y reading'
const homeDescription = 'Plataforma personal para aprender inglés: teoría, conjugación de verbos, frases, reading con preguntas y speaking, sin cuentas ni instalaciones.'

useSeo({
  title: homeTitle,
  description: homeDescription,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': siteName,
    'url': `${siteUrl.replace(/\/$/, '')}/`,
    'inLanguage': 'es',
    'description': homeDescription,
    'publisher': { '@type': 'Person', 'name': legalOwner, 'url': `${siteUrl.replace(/\/$/, '')}/aviso-legal/` },
    'about': { '@type': 'Thing', 'name': 'Aprendizaje del inglés' },
    'educationalUse': 'Aprendizaje autónomo'
  }
})

// The home title already says what the site is: no "· site name" after it.
useSeoMeta({ titleTemplate: '%s', ogTitle: homeTitle })
</script>

<template>
  <UPage>
    <UPageHero
      title="Aprender inglés"
      description="Teoría de los tiempos verbales, conjugación, frases, reading y speaking. Todo en un sitio, sin cuentas ni instalaciones."
    />

    <UPageSection>
      <UPageGrid>
        <UPageCard
          v-for="section in sections"
          :key="section.to"
          :title="section.label"
          :description="section.to === '/repaso' ? undefined : section.description"
          :icon="section.icon"
          :to="section.to"
          spotlight
        >
          <template
            v-if="section.to === '/repaso'"
            #description
          >
            <ClientOnly>
              <template #fallback>
                Nada pendiente por ahora
              </template>

              {{ pending.length ? `${pending.length} ejercicios te tocan hoy` : 'Nada pendiente por ahora' }}
            </ClientOnly>
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>
  </UPage>
</template>
