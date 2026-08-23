<script setup lang="ts">
const { pending } = useProgress()

useSeo({
  title: 'Inicio',
  description: 'Plataforma personal para aprender inglés por tiempos verbales: teoría, conjugación de verbos, frases, reading con preguntas y speaking, sin cuentas ni instalaciones.'
})
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
