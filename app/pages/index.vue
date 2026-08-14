<script setup lang="ts">
useSeoMeta({ title: 'Inicio' })
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
          :description="section.description"
          :icon="section.icon"
          :to="section.to"
          spotlight
        />
      </UPageGrid>
    </UPageSection>
  </UPage>
</template>
