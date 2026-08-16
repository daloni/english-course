<script setup lang="ts">
// Listen to the sentence, repeat it into the microphone and see word by word how it went.
const { accent, rate, canSpeak, canListen, speaking, listening, transcript, error, speak, stopSpeaking, listen, stopListening } = useSpeech()

/** The sentences are the theory examples: already translated and sorted by level. */
const drill = tenses.flatMap(tense => tense.examples.map(example => ({ ...example, tense })))

const speeds = [
  { label: 'Lenta', value: 0.7 },
  { label: 'Normal', value: 0.9 },
  { label: 'Rápida', value: 1.1 }
]

const index = ref(0)
const sentence = computed(() => drill[index.value % drill.length]!)

const diff = computed(() => transcript.value ? compare(sentence.value.en, transcript.value) : [])
const hits = computed(() => diff.value.filter(word => word.status === 'ok').length)
const expected = computed(() => diff.value.filter(word => word.status !== 'extra').length)
const missing = computed(() => diff.value.filter(word => word.status === 'missing').map(word => word.word))
const extra = computed(() => diff.value.filter(word => word.status === 'extra').map(word => word.word))

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
  stopListening()
  index.value += 1
  transcript.value = ''
  error.value = ''
}

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

        <section>
          <p class="text-sm text-muted">
            Frase {{ (index % drill.length) + 1 }} de {{ drill.length }} ·
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
      </div>
    </UPageSection>
  </UPage>
</template>
