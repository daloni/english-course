<script setup lang="ts">
useSeo({
  title: 'Practicar conjugación',
  noindex: true,
  description: 'Ejercicio de conjugación: escribe el pasado simple, el participio o la tercera persona del verbo y comprueba la respuesta al instante.'
})

const { record, attemptOf } = useProgress()

const total = 10

interface Question {
  /** Item.id, to record the attempt in the progress. */
  id: string
  verb: Verb
  label: string
  solution: string
}

/** Ten different verbs, prioritising forms that have never been practised or are due today. */
function newQuiz(): Question[] {
  const questions = verbs.flatMap(verb => verbForms.map(form => ({
    id: verbItemId(verb, form),
    verb,
    label: form.label,
    solution: form.of(verb)
  })))

  return pickRound(questions, question => attemptOf(question.id), total, question => question.verb.infinitive)
}

const quiz = ref<Question[]>([])
const index = ref(0)
const answer = ref('')
const checked = ref<{ correct: boolean, solution: string } | null>(null)
const results = ref<{ question: Question, answer: string, correct: boolean }[]>([])

const question = computed(() => quiz.value[index.value])
const hits = computed(() => results.value.filter(result => result.correct).length)
const mistakes = computed(() => results.value.filter(result => !result.correct))
const done = computed(() => quiz.value.length > 0 && index.value >= quiz.value.length)
useFocusOnChange(checked, done)

function restart() {
  quiz.value = newQuiz()
  index.value = 0
  answer.value = ''
  checked.value = null
  results.value = []
}

// The quiz is random, so it is built in the browser: generating it during SSR too would
// render a different question than the one the page hydrates with.
onMounted(restart)

/** Same action for both steps: correct the answer, then move on to the next question. */
function submit(skip = false) {
  if (checked.value) {
    index.value += 1
    answer.value = ''
    checked.value = null
    return
  }

  if (!question.value || (!skip && !answer.value.trim())) {
    return
  }

  const correct = !skip && isCorrect(answer.value, question.value.solution)

  record(question.value.id, correct)
  results.value.push({ question: question.value, answer: answer.value, correct })
  checked.value = { correct, solution: question.value.solution }
}
</script>

<template>
  <UPage>
    <UContainer>
      <UPageHeader
        title="Practicar conjugación"
        :description="`Escribe la forma que se te pide. ${total} verbos, corrección al instante.`"
      />
    </UContainer>

    <UPageSection>
      <div class="mx-auto w-full max-w-xl sm:max-w-2xl">
        <ClientOnly>
          <template #fallback>
            <p class="text-sm text-muted">
              Cargando la práctica…
            </p>
          </template>

          <template v-if="done">
            <h2
              data-focus-result
              tabindex="-1"
              class="text-xl font-semibold"
            >
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

              <ul class="space-y-3 text-sm">
                <li
                  v-for="mistake in mistakes"
                  :key="mistake.question.verb.infinitive"
                >
                  <p class="font-medium">
                    {{ mistake.question.label }} de <em
                      lang="en"
                      class="italic"
                    >{{ mistake.question.verb.infinitive }}</em>
                  </p>
                  <p class="text-muted">
                    <template v-if="mistake.answer">
                      Escribiste «{{ mistake.answer }}»,
                    </template>
                    la forma correcta es
                    <strong
                      lang="en"
                      class="font-semibold"
                    >{{ mistake.question.solution }}</strong>.
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

          <UCard v-else-if="question">
            <p class="text-sm text-muted">
              Pregunta {{ index + 1 }} de {{ quiz.length }} · {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
            </p>

            <!-- The line above already says where the quiz is: the bar is not read out again. -->
            <UProgress
              :model-value="results.length"
              :max="quiz.length"
              size="sm"
              aria-hidden="true"
              class="mt-2"
            />

            <h2 class="mt-4 text-2xl font-medium leading-snug text-highlighted sm:text-3xl">
              {{ question.label }} de <em
                lang="en"
                class="italic"
              >{{ question.verb.infinitive }}</em>
            </h2>

            <p class="mt-1 text-muted">
              {{ question.verb.es }}
            </p>

            <!-- On a phone the field takes the width of the card, with the actions under it. -->
            <form
              class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start"
              @submit.prevent="submit()"
            >
              <UInput
                :key="index"
                v-model="answer"
                :disabled="!!checked"
                data-focus-input
                lang="en"
                autofocus
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
                placeholder="Tu respuesta"
                :aria-label="`${question.label} de ${question.verb.infinitive}`"
                size="xl"
                class="sm:flex-1"
              />

              <div class="flex gap-3">
                <UButton
                  data-focus-target
                  type="submit"
                  :label="checked ? 'Siguiente' : 'Comprobar'"
                  :icon="checked ? 'i-lucide-arrow-right' : 'i-lucide-check'"
                  size="xl"
                  class="flex-1 justify-center sm:flex-none"
                />
                <UButton
                  v-if="!checked"
                  type="button"
                  label="No lo sé"
                  icon="i-lucide-circle-help"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  class="flex-1 justify-center sm:flex-none"
                  @click="submit(true)"
                />
              </div>
            </form>

            <div aria-live="polite">
              <UAlert
                v-if="checked"
                :title="checked.correct ? '¡Correcto!' : 'No es esa'"
                :description="checked.correct ? `${question.verb.infinitive} → ${checked.solution}` : `La forma correcta es: ${checked.solution}`"
                :icon="checked.correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                :color="checked.correct ? 'success' : 'error'"
                variant="subtle"
                :ui="feedbackUi(checked.correct)"
                class="mt-6"
              />
            </div>
          </UCard>
        </ClientOnly>
      </div>
    </UPageSection>
  </UPage>
</template>
