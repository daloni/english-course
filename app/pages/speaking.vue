<script setup lang="ts">
// Listen to the sentence, repeat it into the microphone and see word by word how it went.
const { record, attemptOf } = useProgress()
const { accent, rate, canSpeak, canListen, speaking, listening, transcript, error, speak, stopSpeaking, listen, stopListening, cancelListening } = useSpeech()

const SPEAKING_SCORE_THRESHOLD = 0.8
const size = 10

/** The sentences are the theory examples: already translated and sorted by level. */
const drill = tenses.flatMap(tense => tense.examples.map(example => ({ ...example, tense })))

const speeds = [
  { label: 'Lenta', value: 0.7 },
  { label: 'Normal', value: 0.9 },
  { label: 'Rápida', value: 1.1 }
]

const round = ref<typeof drill>([])
const index = ref(0)
const sentence = computed(() => round.value[index.value])
const done = computed(() => round.value.length > 0 && index.value >= round.value.length)
const results = ref<{ sentence: typeof drill[number], correct: boolean, missing: string[] }[]>([])

const diff = computed(() => sentence.value && transcript.value ? compare(sentence.value.en, transcript.value) : [])
const correct = computed(() => score(diff.value) >= SPEAKING_SCORE_THRESHOLD)
const hits = computed(() => diff.value.filter(word => word.status === 'ok').length)
const expected = computed(() => diff.value.filter(word => word.status !== 'extra').length)
const missing = computed(() => diff.value.filter(word => word.status === 'missing').map(word => word.word))
const extra = computed(() => diff.value.filter(word => word.status === 'extra').map(word => word.word))
const roundHits = computed(() => results.value.filter(result => result.correct).length)
const mistakes = computed(() => results.value.filter(result => !result.correct))

const styles: Record<WordStatus, string> = {
  ok: 'text-success',
  missing: 'text-error line-through decoration-2',
  extra: 'text-warning italic underline decoration-dotted'
}

// Switching sentences cuts off whatever was running: the audio of the previous one and the
// microphone, which would otherwise keep recording and compare what was said against the new
// sentence.
function next() {
  stopSpeaking()
  cancelListening()
  index.value += 1
}

function restart() {
  stopSpeaking()
  cancelListening()
  round.value = pickRound(drill, item => attemptOf(speakingItemId(item.tense, item)), size)
  index.value = 0
  results.value = []
}

watch(transcript, (value) => {
  if (!value.trim() || !sentence.value) {
    return
  }

  record(speakingItemId(sentence.value.tense, sentence.value), correct.value)
  results.value.push({ sentence: sentence.value, correct: correct.value, missing: missing.value })
})

// The round depends on localStorage and chance, so it is drawn in the browser: building it
// during prerender would ship a different sentence than the one the page hydrates with.
onMounted(restart)

useSeo({
  title: 'Speaking',
  description: 'Escucha la frase en inglés, repítela en voz alta y comprueba palabra a palabra qué has pronunciado bien, con el reconocimiento de voz del navegador.'
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Speaking"
      description="Escucha la frase, repítela en voz alta y compara lo que has dicho con lo que tocaba decir."
    />

    <UPageSection>
      <ClientOnly>
        <template #fallback>
          <p class="text-muted">
            Preparando la ronda…
          </p>
        </template>

        <div class="mx-auto w-full max-w-xl space-y-8">
          <UAlert
            v-if="!canListen"
            title="Este navegador no reconoce la voz"
            description="El reconocimiento de voz solo funciona en Chrome o Edge. Puedes seguir escuchando las frases y repetirlas en voz alta, pero no se puede corregir tu pronunciación."
            icon="i-lucide-mic-off"
            color="warning"
            variant="subtle"
          />

          <div class="flex flex-wrap items-end gap-4">
            <UFormField
              label="Acento"
              class="w-44"
            >
              <USelect
                v-model="accent"
                :items="[...accents]"
                icon="i-lucide-globe"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Velocidad"
              class="w-44"
            >
              <USelect
                v-model="rate"
                :items="speeds"
                icon="i-lucide-gauge"
                class="w-full"
              />
            </UFormField>
          </div>

          <template v-if="done">
            <section>
              <h2 class="text-xl font-semibold">
                Resultado: {{ roundHits }} de {{ results.length }}
              </h2>

              <p class="mt-2 text-muted">
                {{ roundHits }} {{ roundHits === 1 ? 'acierto' : 'aciertos' }} y
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
                    :key="speakingItemId(mistake.sentence.tense, mistake.sentence)"
                  >
                    <p
                      lang="en"
                      class="font-medium"
                    >
                      {{ mistake.sentence.en }}
                    </p>

                    <p
                      v-if="mistake.missing.length > 0"
                      class="text-muted"
                    >
                      No se te ha oído: {{ mistake.missing.join(', ') }}.
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
            </section>
          </template>

          <template v-else-if="sentence">
            <section>
              <p class="text-sm text-muted">
                Frase {{ index + 1 }} de {{ round.length }} ·
                {{ sentence.tense.name }} · {{ formLabels[sentence.form].toLowerCase() }}
              </p>

              <p
                lang="en"
                class="mt-2 text-2xl font-semibold"
              >
                {{ sentence.en }}
              </p>

              <p class="mt-1 text-muted">
                {{ sentence.es }}
              </p>

              <UAlert
                id="speaking-privacy-notice"
                class="mt-6"
                title="Privacidad del reconocimiento de voz"
                description="El curso no recibe ni guarda tu voz. Para reconocerla, el navegador o su proveedor pueden procesarla de forma remota, fuera de este dispositivo. El comportamiento exacto depende del navegador."
                icon="i-lucide-shield-alert"
                color="neutral"
                variant="subtle"
              />

              <div class="mt-6 flex flex-wrap gap-3">
                <UButton
                  :label="speaking ? 'Sonando…' : 'Escuchar'"
                  icon="i-lucide-volume-2"
                  :loading="speaking"
                  :disabled="!canSpeak"
                  aria-label="Escuchar la frase en inglés"
                  @click="speak(sentence.en)"
                />

                <UButton
                  :label="listening ? 'Escuchando… (pulsa para parar)' : 'Repetir yo'"
                  :icon="listening ? 'i-lucide-square' : 'i-lucide-mic'"
                  :color="listening ? 'error' : 'primary'"
                  variant="subtle"
                  :disabled="!canListen"
                  aria-describedby="speaking-privacy-notice"
                  :aria-pressed="listening"
                  aria-label="Repetir la frase al micrófono"
                  @click="listening ? stopListening() : listen()"
                />

                <UButton
                  label="Otra frase"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  @click="next"
                />
              </div>
            </section>

            <div
              class="space-y-4"
              aria-live="polite"
            >
              <UAlert
                v-if="error"
                :title="error"
                icon="i-lucide-alert-triangle"
                color="error"
                variant="subtle"
              />

              <section v-if="diff.length > 0">
                <h2 class="text-xl font-semibold">
                  {{ hits }} de {{ expected }} {{ expected === 1 ? 'palabra' : 'palabras' }}
                </h2>

                <p
                  lang="en"
                  class="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xl"
                >
                  <span
                    v-for="(word, i) in diff"
                    :key="`${i}-${word.word}`"
                    :class="styles[word.status]"
                  >{{ word.word }}</span>
                </p>

                <p
                  v-if="missing.length > 0"
                  class="mt-3 text-sm text-muted"
                >
                  No se te ha oído: {{ missing.join(', ') }}.
                </p>

                <p
                  v-if="extra.length > 0"
                  class="mt-1 text-sm text-muted"
                >
                  Has dicho de más: {{ extra.join(', ') }}.
                </p>

                <p
                  v-if="missing.length === 0 && extra.length === 0"
                  class="mt-3 text-sm text-muted"
                >
                  Frase completa, palabra por palabra.
                </p>
              </section>
            </div>
          </template>
        </div>
      </ClientOnly>
    </UPageSection>
  </UPage>
</template>
