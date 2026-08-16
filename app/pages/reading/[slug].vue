<script setup lang="ts">
import { marked } from 'marked'

const { record } = useProgress()

const route = useRoute()
const reading = readingById(String(route.params.slug))

if (!reading) {
  throw createError({ statusCode: 404, message: 'Lectura no encontrada', fatal: true })
}

// The markdown comes from content/readings/*.json, versioned in this repo, so it is trusted.
const text = marked.parse(reading.text, { async: false })

const answers = ref<Record<string, string>>({})
const submitted = ref(false)
const recorded = ref(false)

/**
 * The whole set is corrected at once, when the form is sent. A written answer goes through
 * the same normalization as the frases, so capitals or contractions are not mistakes; an
 * unanswered question counts as wrong.
 */
const results = computed(() => reading!.questions.map(question => ({
  question,
  given: answers.value[question.id] ?? '',
  correct: isCorrect(answers.value[question.id] ?? '', question.answer)
})))

const hits = computed(() => results.value.filter(result => result.correct).length)

/** "Lisbon / Lisboa" accepts either one, but only the first is shown as the answer. */
const shownAnswer = (question: Question) => question.answer.split(/\s+\/\s+/)[0]!.trim()

/**
 * Correcting the whole set also records one attempt per question in the progress, but only
 * the first time it is corrected in this visit: doing the reading again right away would
 * count twice and move the Leitner box twice on the same day. A question left blank is a
 * mistake of the round, not an attempt: it is not recorded at all.
 */
function submit() {
  submitted.value = true

  const answered = results.value.filter(result => result.given.trim() !== '')

  if (recorded.value || answered.length === 0) {
    return
  }

  recorded.value = true

  for (const result of answered) {
    record(readingItemId(reading!, result.question), result.correct)
  }
}

function retry() {
  answers.value = {}
  submitted.value = false
}

useSeo({
  title: reading.title,
  description: `${reading.title}: lectura de nivel ${reading.level} sobre ${reading.topic.toLowerCase()}, con glosario y ${reading.questions.length} preguntas de comprensión.`
})
</script>

<template>
  <UPage>
    <UPageHero
      :title="reading!.title"
      :description="reading!.topic"
    >
      <template #links>
        <UBadge
          :label="`Nivel ${reading!.level}`"
          variant="subtle"
        />
        <UBadge
          :label="`${readingMinutes(reading!)} min de lectura`"
          icon="i-lucide-clock"
          variant="subtle"
          color="neutral"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <div class="mx-auto w-full max-w-2xl space-y-10">
        <!-- eslint-disable vue/no-v-html -- markdown from content/, versioned here, never user input -->
        <div
          lang="en"
          class="space-y-4 text-lg [&_em]:italic [&_strong]:font-semibold"
          v-html="text"
        />
        <!-- eslint-enable vue/no-v-html -->

        <UCollapsible v-if="reading!.glossary?.length">
          <UButton
            label="Glosario"
            icon="i-lucide-book-a"
            trailing-icon="i-lucide-chevron-down"
            color="neutral"
            variant="subtle"
          />

          <template #content>
            <dl class="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div
                v-for="word in reading!.glossary"
                :key="word.en"
                class="flex gap-2"
              >
                <dt
                  lang="en"
                  class="font-medium"
                >
                  {{ word.en }}
                </dt>
                <dd class="text-muted">
                  {{ word.es }}
                </dd>
              </div>
            </dl>
          </template>
        </UCollapsible>

        <section>
          <h2 class="mb-6 text-xl font-semibold">
            Preguntas
          </h2>

          <form @submit.prevent="submit">
            <ol class="space-y-8">
              <li
                v-for="(result, i) in results"
                :key="result.question.id"
              >
                <URadioGroup
                  v-if="result.question.options"
                  v-model="answers[result.question.id]"
                  :items="result.question.options.map(option => ({ label: option, value: option }))"
                  :legend="`${i + 1}. ${result.question.question}`"
                  :disabled="submitted"
                  lang="en"
                  :ui="{ fieldset: 'gap-y-2' }"
                />

                <UFormField
                  v-else
                  :label="`${i + 1}. ${result.question.question}`"
                  lang="en"
                >
                  <UInput
                    v-model="answers[result.question.id]"
                    :disabled="submitted"
                    lang="en"
                    autocapitalize="off"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Responde en inglés"
                    class="mt-2 w-full max-w-sm"
                  />
                </UFormField>

                <UAlert
                  v-if="submitted"
                  :title="result.correct ? '¡Correcto!' : `La respuesta correcta es: ${shownAnswer(result.question)}`"
                  :description="result.question.explanation"
                  :icon="result.correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                  :color="result.correct ? 'success' : 'error'"
                  variant="subtle"
                  class="mt-4"
                />
              </li>
            </ol>

            <UButton
              v-if="!submitted"
              type="submit"
              label="Corregir"
              icon="i-lucide-check"
              class="mt-8"
            />
          </form>

          <div
            class="mt-8"
            aria-live="polite"
          >
            <template v-if="submitted">
              <h3 class="text-xl font-semibold">
                Puntuación: {{ hits }} de {{ results.length }}
              </h3>

              <p class="mt-2 text-muted">
                {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }} y
                {{ results.length - hits }} {{ results.length - hits === 1 ? 'error' : 'errores' }}.
              </p>

              <UButton
                label="Volver a intentarlo"
                icon="i-lucide-rotate-ccw"
                class="mt-6"
                @click="retry"
              />
            </template>
          </div>
        </section>
      </div>
    </UPageSection>
  </UPage>
</template>
