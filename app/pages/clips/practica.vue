<script setup lang="ts">
useSeo({
  title: 'Practicar con clips',
  description: 'Escucha un trozo de vídeo real, escribe lo que falta en la frase y comprueba la respuesta al instante.'
})

const { record, attemptOf } = useProgress()
const { playable, markUnavailable } = useClips()

const size = 10

interface Question {
  /** Item.id, to record the attempt in the progress. */
  id: string
  clip: Clip
  exercise: Exercise
}

/** Ten gaps, never two from the same clip: hearing the same line twice teaches nothing new. */
function newRound(): Question[] {
  const questions = playable.value.flatMap(clip => clip.exercises.map(exercise => ({
    id: clipItemId(clip, exercise),
    clip,
    exercise
  })))

  return pickRound(questions, question => attemptOf(question.id), size, question => question.clip.id)
}

const round = ref<Question[]>([])
const index = ref(0)
const answer = ref('')
const checked = ref<{ correct: boolean, question: Question } | null>(null)
useFocusOnChange(checked)
const results = ref<{ question: Question, answer: string, correct: boolean }[]>([])

const question = computed(() => round.value[index.value])
const hits = computed(() => results.value.filter(result => result.correct).length)
const mistakes = computed(() => results.value.filter(result => !result.correct))
const done = computed(() => round.value.length > 0 && index.value >= round.value.length)

function restart() {
  round.value = newRound()
  index.value = 0
  answer.value = ''
  checked.value = null
  results.value = []
}

// The round depends on the progress and on chance, so it is drawn in the browser: building it
// during the prerender too would ship a different clip than the one the page hydrates with.
onMounted(restart)

/** The same button corrects first and moves on to the next clip afterwards. */
function submit() {
  if (checked.value) {
    index.value += 1
    answer.value = ''
    checked.value = null
    return
  }

  if (!question.value || !answer.value.trim()) {
    return
  }

  const correct = checkExercise(answer.value, question.value.exercise)

  record(question.value.id, correct)
  results.value.push({ question: question.value, answer: answer.value, correct })
  checked.value = { correct, question: question.value }
}

/**
 * The embed is dead. Flag the video and take what is left of it out of this round, current
 * question included: a clip nobody can watch must not stall the session waiting for an answer.
 */
function onUnavailable(videoId: string) {
  markUnavailable(videoId)

  round.value = [
    ...round.value.slice(0, index.value),
    ...round.value.slice(index.value).filter(pending => pending.clip.videoId !== videoId)
  ]
  answer.value = ''
  checked.value = null
}
</script>

<template>
  <UPage>
    <UPageHero
      title="Practicar con clips"
      :description="`Escucha la frase y escribe lo que falta. ${size} clips por ronda, corrección al instante.`"
    >
      <template #links>
        <UButton
          to="/clips"
          label="Ver los clips"
          icon="i-lucide-clapperboard"
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

          <template v-if="round.length === 0">
            <h2 class="text-xl font-semibold">
              No hay clips que practicar
            </h2>

            <p class="mt-2 text-muted">
              Todavía no hay material, o los vídeos que había ya no se pueden reproducir.
            </p>
          </template>

          <template v-else-if="done">
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
                  :key="mistake.question.id"
                >
                  <p
                    lang="en"
                    class="font-medium"
                  >
                    {{ mistake.question.clip.text }}
                  </p>
                  <p class="text-muted">
                    Escribiste «{{ mistake.answer }}», la respuesta correcta es
                    <strong
                      lang="en"
                      class="font-semibold"
                    >{{ mistake.question.exercise.solution }}</strong>.
                  </p>
                  <p class="text-muted">
                    {{ explain(mistake.question.exercise) }}
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

          <template v-else-if="question">
            <p class="text-sm text-muted">
              Clip {{ index + 1 }} de {{ round.length }} · {{ question.clip.channel }} ·
              {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
            </p>

            <ClipPlayer
              :video-id="question.clip.videoId"
              :start-ms="clipPlayStartMs(question.clip)"
              :end-ms="question.clip.endMs"
              class="mt-4"
              @unavailable="onUnavailable"
            />

            <form
              class="mt-6"
              @submit.prevent="submit"
            >
              <ExerciseGap
                :key="question.id"
                v-model="answer"
                :exercise="question.exercise"
                :disabled="!!checked"
              />

              <UButton
                data-focus-target
                type="submit"
                :label="checked ? 'Siguiente' : 'Comprobar'"
                :icon="checked ? 'i-lucide-arrow-right' : 'i-lucide-check'"
                class="mt-6"
              />
            </form>

            <div
              class="mt-6"
              aria-live="polite"
            >
              <UAlert
                v-if="checked"
                :title="checked.correct ? '¡Correcto!' : 'No es esa'"
                :description="checked.correct ? checked.question.clip.text : correction(checked.question.exercise)"
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
