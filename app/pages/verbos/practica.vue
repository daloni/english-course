<script setup lang="ts">
useSeo({
  title: 'Practicar conjugación',
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

  const correct = isCorrect(answer.value, question.value.solution)

  record(question.value.id, correct)
  results.value.push({ question: question.value, answer: answer.value, correct })
  checked.value = { correct, solution: question.value.solution }
}
</script>

<template>
  <UPage>
    <UPageHero
      title="Practicar conjugación"
      :description="`Escribe la forma que se te pide. ${total} verbos, corrección al instante.`"
    />

    <UPageSection>
      <div class="mx-auto w-full max-w-xl">
        <ClientOnly>
          <template #fallback>
            <p class="text-sm text-muted">
              Cargando la práctica…
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
                    Escribiste «{{ mistake.answer }}», la forma correcta es
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

          <template v-else-if="question">
            <p class="text-sm text-muted">
              Pregunta {{ index + 1 }} de {{ quiz.length }} · {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
            </p>

            <h2 class="mt-2 text-xl font-semibold">
              {{ question.label }} de <em
                lang="en"
                class="italic"
              >{{ question.verb.infinitive }}</em>
            </h2>

            <p class="mt-1 text-muted">
              {{ question.verb.es }}
            </p>

            <form
              class="mt-6 flex items-start gap-3"
              @submit.prevent="submit"
            >
              <UInput
                :key="index"
                v-model="answer"
                :disabled="!!checked"
                lang="en"
                autofocus
                autocapitalize="off"
                autocomplete="off"
                spellcheck="false"
                placeholder="Tu respuesta"
                :aria-label="`${question.label} de ${question.verb.infinitive}`"
                class="flex-1"
              />

              <UButton
                type="submit"
                :label="checked ? 'Siguiente' : 'Comprobar'"
                :icon="checked ? 'i-lucide-arrow-right' : 'i-lucide-check'"
              />
            </form>

            <div
              class="mt-6"
              aria-live="polite"
            >
              <UAlert
                v-if="checked"
                :title="checked.correct ? '¡Correcto!' : 'No es esa'"
                :description="checked.correct ? `${question.verb.infinitive} → ${checked.solution}` : `La forma correcta es: ${checked.solution}`"
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
