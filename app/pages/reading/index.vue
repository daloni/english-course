<script setup lang="ts">
useSeo({
  title: 'Reading',
  description: 'Lecturas cortas en inglés con glosario de vocabulario y preguntas de comprensión corregidas al instante.'
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Reading"
      description="Lee un texto en inglés, consulta el glosario si hace falta y responde a las preguntas de comprensión."
    />

    <UPageSection>
      <UPageGrid>
        <UPageCard
          v-for="reading in readings"
          :key="reading.id"
          :title="reading.title"
          :description="reading.topic"
          :to="`/reading/${reading.id}`"
          icon="i-lucide-newspaper"
          spotlight
        >
          <template #footer>
            <div class="flex flex-wrap gap-2">
              <UBadge
                :label="`Nivel ${reading.level}`"
                variant="subtle"
                color="neutral"
              />
              <UBadge
                :label="`${readingMinutes(reading)} min de lectura`"
                icon="i-lucide-clock"
                variant="subtle"
                color="neutral"
              />
              <UBadge
                :label="`${reading.questions.length} preguntas`"
                variant="subtle"
                color="neutral"
              />
            </div>
          </template>
        </UPageCard>
      </UPageGrid>
    </UPageSection>
  </UPage>
</template>
