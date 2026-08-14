<script setup lang="ts">
useSeoMeta({
  title: 'Frases',
  description: 'Ejercicios de tiempos verbales aplicados a frases: rellenar el hueco, transformar la frase y reconocer el tiempo, con corrección al instante.'
})

const route = useRoute()

// /teoria/<tiempo> enlaza aquí con ?tense=<tiempo>: si ese tiempo tiene frases, se va directo.
const requested = String(route.query.tense ?? '')

if (requested && exercisesOf(requested).length > 0) {
  await navigateTo(`/frases/${requested}`, { replace: true })
}

const level = ref<Level | 'all'>('all')

/** Tiempos con frases en content/exercises/, con el nivel que tiene el tiempo en teoría. */
const drills = tenses
  .map(tense => ({ tense, exercises: exercisesOf(tense.id) }))
  .filter(drill => drill.exercises.length > 0)

const levelItems = [
  { label: 'Todos', value: 'all' },
  ...levels.filter(value => drills.some(drill => drill.tense.level === value)).map(value => ({ label: value, value }))
]

const shown = computed(() => drills.filter(drill => level.value === 'all' || drill.tense.level === level.value))

/** «10 frases · hueco, transformar» para saber qué hay antes de entrar. */
function summary(exercises: Exercise[]) {
  const kinds = exerciseTypes.filter(type => exercises.some(exercise => typeOf(exercise) === type))

  return `${exercises.length} frases · ${kinds.map(kind => exerciseTypeLabels[kind]).join(', ')}`
}
</script>

<template>
  <UPage>
    <UPageHero
      title="Frases"
      description="Elige un tiempo verbal y practícalo en frases: rellena el hueco, transforma la frase o reconoce el tiempo."
    />

    <UPageSection>
      <URadioGroup
        v-model="level"
        :items="levelItems"
        legend="Nivel"
        orientation="horizontal"
        class="mb-8"
        :ui="{ fieldset: 'gap-x-4' }"
      />

      <UPageGrid>
        <UPageCard
          v-for="drill in shown"
          :key="drill.tense.id"
          :title="drill.tense.name"
          :description="summary(drill.exercises)"
          :to="`/frases/${drill.tense.id}`"
          icon="i-lucide-message-square-text"
          spotlight
        >
          <template #footer>
            <UBadge
              :label="`Nivel ${drill.tense.level}`"
              variant="subtle"
              color="neutral"
            />
          </template>
        </UPageCard>
      </UPageGrid>

      <p
        v-if="shown.length === 0"
        class="text-muted"
      >
        Todavía no hay frases de nivel {{ level }}.
      </p>
    </UPageSection>
  </UPage>
</template>
