<script setup lang="ts">
const { record, attemptOf } = useProgress()

const route = useRoute()
const tense = tenseById(String(route.params.tiempo))
const drill = tense ? exercisesOf(tense.id) : []

if (!tense || drill.length === 0) {
  throw createError({ statusCode: 404, message: 'No hay frases de este tiempo verbal', fatal: true })
}

/** Sentences per round, or the whole tense when it has fewer. */
const size = 10

const round = ref<Exercise[]>([])
const index = ref(0)
const answer = ref('')
const checked = ref<{ correct: boolean, exercise: Exercise } | null>(null)
useFocusOnChange(checked)
const results = ref<{ exercise: Exercise, answer: string, correct: boolean }[]>([])

const exercise = computed(() => round.value[index.value])
const hits = computed(() => results.value.filter(result => result.correct).length)
const mistakes = computed(() => results.value.filter(result => !result.correct))
const done = computed(() => round.value.length > 0 && index.value >= round.value.length)

/** Another round means another draw: what is due today first, and never the same list twice. */
function restart() {
  round.value = pickRound(drill, item => attemptOf(frasesItemId(item)), size)
  index.value = 0
  answer.value = ''
  checked.value = null
  results.value = []
}

// The round depends on the progress and on chance, so it is drawn in the browser: building it
// during the prerender too would ship a different sentence than the one the page hydrates with.
onMounted(restart)

/** The same button does both things: it corrects first, then moves on to the next sentence. */
function submit(skip = false) {
  if (checked.value) {
    index.value += 1
    answer.value = ''
    checked.value = null
    return
  }

  if (!exercise.value || (!skip && !answer.value.trim())) {
    return
  }

  const correct = !skip && checkExercise(answer.value, exercise.value)

  record(frasesItemId(exercise.value), correct)
  results.value.push({ exercise: exercise.value, answer: answer.value, correct })
  checked.value = { correct, exercise: exercise.value }
}

useSeo({
  title: `Frases de ${tense.name}`,
  description: `Ejercicios de ${tense.name} (${tense.nameEs}) en frases: rellena el hueco, transforma la frase y reconoce el tiempo, con corrección y explicación.`
})
</script>

<template>
  <UPage>
    <UPageHero
      :title="`Frases de ${tense!.name}`"
      :description="`${drill.length} frases de ${tense!.nameEs.toLowerCase()}: cada ronda saca ${Math.min(size, drill.length)}, con corrección al instante.`"
    >
      <template #links>
        <UButton
          :to="`/teoria/${tense!.id}`"
          label="Repasar la teoría"
          icon="i-lucide-book-open"
          color="neutral"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <div class="mx-auto w-full max-w-xl">
        <ClientOnly>
          <template #fallback>
            <p class="text-sm text-muted">
              Cargando la ronda…
            </p>
          </template>

          <template v-if="done">
            <h2 class="text-xl font-semibold">
              Resultado: {{ hits }} de {{ results.length }}
            </h2>

            <p class="mt-2 text-muted">
              {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }} y
              {{ mistakes.length }} {{ mistakes.length === 1 ? 'error' : 'errores' }}.
            </p>

            <div
              v-if="mistakes.length > 0"
              class="mt-8"
            >
              <h3 class="mb-3 font-medium">
                Para repasar
              </h3>

              <ul class="space-y-4 text-sm">
                <li
                  v-for="mistake in mistakes"
                  :key="mistake.exercise.id"
                >
                  <p
                    lang="en"
                    class="font-medium"
                  >
                    {{ mistake.exercise.prompt }}
                  </p>
                  <p class="text-muted">
                    <template v-if="mistake.answer">
                      Escribiste «{{ mistake.answer }}»,
                    </template>
                    la respuesta correcta es
                    <strong
                      lang="en"
                      class="font-semibold"
                    >{{ mistake.exercise.solution }}</strong>.
                  </p>
                  <p class="text-muted">
                    {{ explain(mistake.exercise) }}
                  </p>
                </li>
              </ul>
            </div>

            <UButton
              label="Otra ronda"
              icon="i-lucide-rotate-ccw"
              class="mt-8"
              @click="restart"
            />
          </template>

          <template v-else-if="exercise">
            <p class="text-sm text-muted">
              Frase {{ index + 1 }} de {{ round.length }} · {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
            </p>

            <form
              class="mt-4"
              @submit.prevent="submit()"
            >
              <component
                :is="exerciseComponents[typeOf(exercise)]"
                :key="exercise.id"
                v-model="answer"
                :exercise="exercise"
                :disabled="!!checked"
              />

              <div class="mt-6 flex flex-wrap gap-3">
                <UButton
                  data-focus-target
                  type="submit"
                  :label="checked ? 'Siguiente' : 'Comprobar'"
                  :icon="checked ? 'i-lucide-arrow-right' : 'i-lucide-check'"
                />
                <UButton
                  v-if="!checked"
                  type="button"
                  label="No lo sé"
                  icon="i-lucide-circle-help"
                  color="neutral"
                  variant="outline"
                  @click="submit(true)"
                />
              </div>
            </form>

            <div
              class="mt-6"
              aria-live="polite"
            >
              <UAlert
                v-if="checked"
                :title="checked.correct ? '¡Correcto!' : 'No es esa'"
                :description="checked.correct ? checked.exercise.solution : correction(checked.exercise)"
                :icon="checked.correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                :color="checked.correct ? 'success' : 'error'"
                variant="subtle"
              />
            </div>
          </template>
        </ClientOnly>
      </div>
    </UPageSection>
  </UPage>
</template>
