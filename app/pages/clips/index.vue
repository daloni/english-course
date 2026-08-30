<script setup lang="ts">
useSeo({
  title: 'Clips',
  description: 'Inglés real en trozos de vídeo: escucha una frase dicha a velocidad normal, rellena el hueco del verbo y aprende la expresión.'
})

const level = ref<Level | 'all'>('all')
const channel = ref('all')
const { playable, loading } = useClips()

const levelItems = computed(() => [
  { label: 'Todos', value: 'all' },
  ...levels.filter(value => playable.value.some(clip => clip.level === value)).map(value => ({ label: value, value }))
])

const channelItems = computed(() => [
  { label: 'Todos', value: 'all' },
  ...[...new Set(playable.value.map(clip => clip.channel))].sort().map(value => ({ label: value, value }))
])

const pageSize = 30
const visibleCount = ref(pageSize)
const resultsSummary = ref<HTMLElement>()

const shown = computed(() => playable.value.filter(clip =>
  (level.value === 'all' || clip.level === level.value)
  && (channel.value === 'all' || clip.channel === channel.value)))

const visibleClips = computed(() => shown.value.slice(0, visibleCount.value))

watch([level, channel], async () => {
  visibleCount.value = pageSize
  await nextTick()
  resultsSummary.value?.focus()
})

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
          :to="{ path: '/clips/practica', query: { ...(level !== 'all' && { nivel: level }), ...(channel !== 'all' && { canal: channel }) } }"
          label="Practicar"
          icon="i-lucide-play"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <p
        v-if="loading"
        role="status"
        aria-live="polite"
        class="text-muted"
      >
        Cargando clips…
      </p>

      <template v-else>
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
          ref="resultsSummary"
          role="status"
          tabindex="-1"
          class="mb-6 text-muted"
        >
          Mostrando {{ visibleClips.length }} de {{ shown.length }} clips
        </p>

        <p
          v-if="shown.length === 0"
          class="text-muted"
        >
          No hay clips con ese filtro todavía.
        </p>

        <UPageGrid v-else>
          <UPageCard
            v-for="clip in visibleClips"
            :key="clip.id"
            data-testid="clip-card"
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

        <div
          v-if="visibleClips.length < shown.length"
          class="mt-8 flex justify-center"
        >
          <UButton
            type="button"
            label="Mostrar más"
            @click="visibleCount += pageSize"
          />
        </div>
      </template>
    </UPageSection>
  </UPage>
</template>
