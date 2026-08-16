<script setup lang="ts">
useSeo({
  title: 'Teoría',
  description: 'Los tiempos verbales del inglés explicados en español: cuándo se usa cada uno, cómo se forma y ejemplos.'
})

const query = ref('')

/** Tenses matching the search, grouped by level; empty levels disappear. */
const groups = computed(() => {
  const term = query.value.trim().toLowerCase()
  const matches = tenses.filter(tense => `${tense.name} ${tense.nameEs}`.toLowerCase().includes(term))

  return levels
    .map(level => ({ level, tenses: matches.filter(tense => tense.level === level) }))
    .filter(group => group.tenses.length > 0)
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Teoría"
      description="Los tiempos verbales explicados: cuándo se usa cada uno y cómo se forma."
    />

    <UPageSection>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        placeholder="Buscar un tiempo verbal"
        aria-label="Buscar un tiempo verbal"
        class="mb-8 w-full max-w-sm"
      />

      <div class="space-y-10">
        <section
          v-for="group in groups"
          :key="group.level"
        >
          <h2 class="mb-4 text-lg font-semibold">
            Nivel {{ group.level }}
          </h2>

          <UPageGrid>
            <UPageCard
              v-for="tense in group.tenses"
              :key="tense.id"
              :title="tense.name"
              :description="tense.nameEs"
              :to="`/teoria/${tense.id}`"
              icon="i-lucide-book-open"
              spotlight
            />
          </UPageGrid>
        </section>

        <p
          v-if="groups.length === 0"
          class="text-muted"
        >
          Ningún tiempo verbal coincide con «{{ query }}».
        </p>
      </div>
    </UPageSection>
  </UPage>
</template>
