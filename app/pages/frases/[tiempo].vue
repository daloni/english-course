<script setup lang="ts">
// Un componente por tipo de ejercicio; el de la frase actual se elige por su `type`.
import { ExerciseChoice, ExerciseGap, ExerciseTransform } from '#components'

const { record } = useProgress()

const route = useRoute()
const tense = tenseById(String(route.params.tiempo))
const drill = tense ? exercisesOf(tense.id) : []

if (!tense || drill.length === 0) {
  throw createError({ statusCode: 404, message: 'No hay frases de este tiempo verbal', fatal: true })
}

const components: Record<ExerciseType, Component> = {
  gap: ExerciseGap,
  transform: ExerciseTransform,
  choice: ExerciseChoice
}

const index = ref(0)
const answer = ref('')
const checked = ref<{ correct: boolean, exercise: Exercise } | null>(null)
const results = ref<{ exercise: Exercise, answer: string, correct: boolean }[]>([])

const exercise = computed(() => drill[index.value])
const hits = computed(() => results.value.filter(result => result.correct).length)
const mistakes = computed(() => results.value.filter(result => !result.correct))
const done = computed(() => index.value >= drill.length)

/**
 * De qué forma habla el ejercicio, para recordar su estructura tras un fallo: la que declara,
 * y si no la que se ve en la frase.
 * ponytail: heurística sobre el prompt; si alguna frase la despista, añade "form" al JSON.
 */
function formOf(exercise: Exercise): Form {
  if (exercise.form) {
    return exercise.form
  }

  if (/\bnot\s*\//.test(exercise.prompt)) {
    return 'negative'
  }

  return exercise.prompt.trim().endsWith('?') ? 'interrogative' : 'affirmative'
}

/** El porqué del fallo: la explicación de la frase o, si no la trae, la estructura del tiempo. */
function explain(exercise: Exercise): string {
  const form = formOf(exercise)

  return exercise.explanation ?? `${formLabels[form]}: ${tense!.structure[form]}`
}

function restart() {
  index.value = 0
  answer.value = ''
  checked.value = null
  results.value = []
}

/** El mismo botón hace las dos cosas: primero corrige, después pasa a la frase siguiente. */
function submit() {
  if (checked.value) {
    index.value += 1
    answer.value = ''
    checked.value = null
    return
  }

  if (!exercise.value || !answer.value.trim()) {
    return
  }

  const correct = isCorrect(answer.value, exercise.value.solution)

  record(frasesItemId(exercise.value), correct)
  results.value.push({ exercise: exercise.value, answer: answer.value, correct })
  checked.value = { correct, exercise: exercise.value }
}

useSeoMeta({
  title: `Frases de ${tense.name}`,
  description: `Ejercicios de ${tense.name} (${tense.nameEs}) en frases: rellena el hueco, transforma la frase y reconoce el tiempo, con corrección y explicación.`
})
</script>

<template>
  <UPage>
    <UPageHero
      :title="`Frases de ${tense!.name}`"
      :description="`${drill.length} frases de ${tense!.nameEs.toLowerCase()}, con corrección al instante.`"
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
                <p class="font-medium">
                  {{ mistake.exercise.prompt }}
                </p>
                <p class="text-muted">
                  Escribiste «{{ mistake.answer }}», la respuesta correcta es
                  <strong class="font-semibold">{{ mistake.exercise.solution }}</strong>.
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
            Frase {{ index + 1 }} de {{ drill.length }} · {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
          </p>

          <form
            class="mt-4"
            @submit.prevent="submit"
          >
            <component
              :is="components[typeOf(exercise)]"
              :key="exercise.id"
              v-model="answer"
              :exercise="exercise"
              :disabled="!!checked"
            />

            <UButton
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
              :description="checked.correct ? checked.exercise.solution : `La respuesta correcta es: ${checked.exercise.solution}. ${explain(checked.exercise)}`"
              :icon="checked.correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
              :color="checked.correct ? 'success' : 'error'"
              variant="subtle"
            />
          </div>
        </template>
      </div>
    </UPageSection>
  </UPage>
</template>
