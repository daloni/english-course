<script setup lang="ts">
// The review session: only what is due today, mixing sentences, verbs, reading and clips.
const { pending, record } = useProgress()
const { isPlayable, markUnavailable } = useClips()

// The queue is frozen when the session starts: correcting moves the boxes, and without the
// snapshot the session would shrink underfoot as you answer.
const session = ref<Item[]>([])
const index = ref(0)
const answer = ref('')
const checked = ref<{ correct: boolean, item: Item } | null>(null)
const results = ref<{ item: Item, answer: string, correct: boolean }[]>([])

const item = computed(() => session.value[index.value])
const hits = computed(() => results.value.filter(result => result.correct).length)
const done = computed(() => session.value.length > 0 && index.value >= session.value.length)

/** Another round: the queue is snapshotted again, already bringing back what was missed. */
function restart() {
  // Speaking needs the Web Speech API and has no written exercise for this shared queue. It is
  // practised from /speaking instead, so unsupported browsers can never get stuck here.
  session.value = pending.value.filter(item => item.kind !== 'speaking' && (!item.clip || isPlayable(item.clip)))
  index.value = 0
  answer.value = ''
  checked.value = null
  results.value = []
}

onMounted(restart)

/** The same button corrects first and moves on to the next exercise afterwards. */
function submit() {
  if (checked.value) {
    index.value += 1
    answer.value = ''
    checked.value = null
    return
  }

  if (!item.value || !answer.value.trim()) {
    return
  }

  const correct = isCorrect(answer.value, item.value.solution, gapCount(item.value.prompt))

  record(item.value.id, correct)
  results.value.push({ item: item.value, answer: answer.value, correct })
  checked.value = { correct, item: item.value }
}

/** A dead embed takes what is left of its video out of the session instead of blocking it. */
function onUnavailable(videoId: string) {
  markUnavailable(videoId)

  session.value = [
    ...session.value.slice(0, index.value),
    ...session.value.slice(index.value).filter(item => item.clip?.videoId !== videoId)
  ]
  answer.value = ''
  checked.value = null
}

useSeo({
  title: 'Repaso de hoy',
  description: 'Sesión de repaso espaciado con los ejercicios de frases, verbos y reading que hoy te toca volver a ver.'
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Repaso de hoy"
      description="Los ejercicios que ya has practicado y hoy vuelven a tocar, de todas las secciones."
    >
      <template #links>
        <UButton
          to="/progreso"
          label="Ver el progreso"
          icon="i-lucide-trending-up"
          color="neutral"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <div class="mx-auto w-full max-w-xl">
        <ClientOnly>
          <template #fallback>
            <p class="text-muted">
              Preparando el repaso…
            </p>
          </template>

          <template v-if="session.length === 0">
            <h2 class="text-xl font-semibold">
              Hoy no toca repasar nada
            </h2>

            <p class="mt-2 text-muted">
              Lo que has acertado vuelve solo cuando toque. Mientras tanto puedes practicar
              <ULink to="/frases">
                frases
              </ULink>,
              <ULink to="/verbos/practica">
                conjugación
              </ULink>
              o
              <ULink to="/reading">
                reading
              </ULink>.
            </p>
          </template>

          <template v-else-if="done">
            <h2 class="text-xl font-semibold">
              Repaso terminado: {{ hits }} de {{ results.length }}
            </h2>

            <p class="mt-2 text-muted">
              Lo acertado sube de caja y tardará más en volver; lo fallado sigue en la cola de hoy.
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <UButton
                v-if="pending.length > 0"
                label="Otra ronda"
                icon="i-lucide-rotate-ccw"
                @click="restart"
              />

              <UButton
                to="/progreso"
                label="Ver el progreso"
                icon="i-lucide-trending-up"
                :color="pending.length > 0 ? 'neutral' : 'primary'"
              />
            </div>
          </template>

          <template v-else-if="item">
            <p class="text-sm text-muted">
              Ejercicio {{ index + 1 }} de {{ session.length }} ·
              {{ itemKindLabels[item.kind] }} ·
              {{ hits }} {{ hits === 1 ? 'acierto' : 'aciertos' }}
            </p>

            <!-- A clip is heard before it is answered: the line is only in the video. -->
            <ClipPlayer
              v-if="item.clip"
              :video-id="item.clip.videoId"
              :start-ms="item.clip.startMs"
              :end-ms="item.clip.endMs"
              class="mt-4"
              @unavailable="onUnavailable"
            />

            <form
              class="mt-4"
              @submit.prevent="submit"
            >
              <!-- Sentences and clips carry their own exercise type; the rest is asked plainly. -->
              <component
                :is="exerciseComponents[typeOf(item)]"
                v-if="item.kind === 'frases' || item.kind === 'clips'"
                :key="item.id"
                v-model="answer"
                :exercise="item"
                :disabled="!!checked"
              />

              <URadioGroup
                v-else-if="item.options"
                :key="item.id"
                v-model="answer"
                :items="item.options.map(option => ({ label: option, value: option }))"
                :legend="item.prompt"
                :disabled="!!checked"
                lang="en"
                :ui="{ fieldset: 'gap-y-2' }"
              />

              <!-- The label is the prompt, and only the verbs ask it in Spanish ("Pasado
                   simple de…"): the answer typed in is English either way. -->
              <UFormField
                v-else
                :key="item.id"
                :label="item.prompt"
                :lang="item.kind === 'verbos' ? undefined : 'en'"
                size="xl"
              >
                <UInput
                  v-model="answer"
                  :disabled="!!checked"
                  lang="en"
                  autofocus
                  autocapitalize="off"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Tu respuesta"
                  class="mt-2 w-full"
                />
              </UFormField>

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
                :description="checked.correct ? checked.item.solution : correction(checked.item)"
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
