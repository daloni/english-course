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

// Aprende sits beside Practica on wide screens, and Tu avance runs below across all three
// columns, with Repaso taking two of them.
const groups = [
  { title: 'Aprende', class: 'lg:col-span-1', grid: 'sm:grid-cols-2 lg:grid-cols-1' },
  { title: 'Practica', class: 'lg:col-span-2', grid: 'sm:grid-cols-2' },
  { title: 'Tu avance', class: 'lg:col-span-3', grid: 'sm:grid-cols-3' }
].map(group => ({ ...group, sections: sections.filter(section => section.group === group.title) }))

// Also the prerendered action: the HTML cannot know what is due in this browser, and with
// nothing stored there is nothing to review yet.
const start = { to: '/teoria', label: 'Empezar por la teoría', icon: 'i-lucide-book-open' }
</script>

<template>
  <UPage>
    <!-- A dark island in both colour modes: the navy of the icon, with the dark tokens so the
         text, the button and its focus ring keep their contrast on it. -->
    <section class="brand-hero dark">
      <UContainer class="py-10 sm:py-14">
        <h1 class="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Aprender inglés
        </h1>

        <p class="mt-4 max-w-2xl text-lg text-pretty text-primary-100 sm:text-xl">
          Teoría de los tiempos verbales, conjugación, frases, reading y speaking. Todo en un sitio, sin cuentas ni instalaciones.
        </p>

        <div class="mt-8">
          <ClientOnly>
            <template #fallback>
              <UButton
                v-bind="start"
                size="xl"
              />
            </template>

            <UButton
              v-if="pending.length"
              to="/repaso"
              :label="`Repasar hoy (${pending.length})`"
              icon="i-lucide-rotate-ccw"
              size="xl"
            />
            <UButton
              v-else
              v-bind="start"
              size="xl"
            />
          </ClientOnly>
        </div>
      </UContainer>
    </section>

    <UContainer class="grid gap-x-6 gap-y-10 py-8 sm:py-12 lg:grid-cols-3">
      <section
        v-for="group in groups"
        :key="group.title"
        :class="group.class"
      >
        <h2 class="mb-4 text-xl font-semibold text-highlighted sm:text-2xl">
          {{ group.title }}
        </h2>

        <div
          class="grid gap-4"
          :class="group.grid"
        >
          <UPageCard
            v-for="section in group.sections"
            :key="section.to"
            :title="section.label"
            :description="section.to === '/repaso' ? undefined : section.description"
            :icon="section.icon"
            :to="section.to"
            spotlight
            :variant="section.to === '/repaso' ? 'subtle' : 'outline'"
            :highlight="section.to === '/repaso'"
            :class="{ 'sm:col-span-2': section.to === '/repaso' }"
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
        </div>
      </section>
    </UContainer>
  </UPage>
</template>

<style scoped>
/* The icon and the social card: navy, a blue circle top right and a teal one bottom left. */
.brand-hero {
  background:
    radial-gradient(circle 16rem at 92% 0, color-mix(in oklab, var(--ui-color-primary-600) 45%, transparent) 99%, transparent),
    radial-gradient(circle 18rem at 4% 110%, color-mix(in oklab, var(--ui-color-secondary-700) 45%, transparent) 99%, transparent),
    linear-gradient(135deg, var(--ui-color-primary-950), var(--ui-color-primary-900));
}
</style>
