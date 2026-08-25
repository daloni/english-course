<script setup lang="ts">
useSeo({
  title: 'Clips',
  description: 'Inglés real en trozos de vídeo: escucha una frase dicha a velocidad normal, rellena el hueco del verbo y aprende la expresión.'
})

const level = ref<Level | 'all'>('all')
const channel = ref('all')

const levelItems = [
  { label: 'Todos', value: 'all' },
  ...levels.filter(value => clips.some(clip => clip.level === value)).map(value => ({ label: value, value }))
]

const channelItems = [
  { label: 'Todos', value: 'all' },
  ...clipChannels.map(value => ({ label: value, value }))
]

const shown = computed(() => clips.filter(clip =>
  (level.value === 'all' || clip.level === level.value)
  && (channel.value === 'all' || clip.channel === channel.value)))

/** The tenses a clip drills, for its badges. An expression gap drills none. */
const tensesOf = (clip: Clip) => [...new Set(clip.exercises
  .map(exercise => tenseById(exercise.tenseId)?.name)
  .filter(name => name !== undefined))]
</script>

<template>
  <UPage>
    <UPageHero
      title="Clips"
      description="Frases sueltas de vídeos reales, con su hueco. El vídeo lo pone YouTube: aquí solo se guarda qué trozo mirar."
    >
      <template #links>
        <UButton
          to="/clips/practica"
          label="Practicar"
          icon="i-lucide-play"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <URadioGroup
        v-model="level"
        :items="levelItems"
        legend="Nivel"
        orientation="horizontal"
        class="mb-6"
        :ui="{ fieldset: 'gap-x-4' }"
      />

      <URadioGroup
        v-if="channelItems.length > 2"
        v-model="channel"
        :items="channelItems"
        legend="Canal"
        orientation="horizontal"
        class="mb-8"
        :ui="{ fieldset: 'gap-x-4' }"
      />

      <p
        v-if="shown.length === 0"
        class="text-muted"
      >
        No hay clips con ese filtro todavía.
      </p>

      <UPageGrid v-else>
        <UPageCard
          v-for="clip in shown"
          :key="clip.id"
          icon="i-lucide-clapperboard"
          spotlight
        >
          <template #title>
            <span lang="en">{{ clip.text }}</span>
          </template>

          <template #description>
            {{ clip.channel }} · {{ Math.round((clip.endMs - clipPlayStartMs(clip)) / 1000) }} s
          </template>

          <template #footer>
            <div class="flex flex-wrap gap-2">
              <UBadge
                :label="`Nivel ${clip.level}`"
                variant="subtle"
                color="neutral"
              />
              <UBadge
                v-for="tense in tensesOf(clip)"
                :key="tense"
                :label="tense"
                variant="subtle"
                color="neutral"
              />
              <UBadge
                :label="`${clip.exercises.length} ${clip.exercises.length === 1 ? 'hueco' : 'huecos'}`"
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
