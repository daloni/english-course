<script setup lang="ts">
import { clearUnavailable, unavailable } from '../utils/unavailable'

// What has been practised in this browser: what is mastered, what is missed and what is due
// for review today.
const { attempts, pending, failed, persistenceFailed, statsOf, exportFile, importFile, reset } = useProgress()
const { load } = useClips({ load: false })

const error = ref('')
const importMessage = ref('')
const resetModalOpen = ref(false)

const total = computed(() => statsOf(items()))

const byTense = computed(() => tenses
  .map(tense => ({ tense, stats: statsOf(itemsOfTense(tense.id)) }))
  .filter(row => row.stats.total > 0))

const byKind = computed(() => itemKinds.map(kind => ({ kind, stats: statsOf(itemsOfKind(kind)) })))

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  error.value = ''
  importMessage.value = ''

  try {
    const result = await importFile(file)

    importMessage.value = `Importados ${result.imported} intentos, ${result.added} nuevos`
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'No se ha podido leer el fichero'
  }

  // The input is cleared so the same file can be imported again.
  input.value = ''
}

function onReset() {
  resetModalOpen.value = true
}

function confirmReset(close: () => void) {
  reset()
  close()
}

onMounted(async () => {
  if (failed.value.some(failure => failure.item.kind === 'clips')) {
    await load()
  }
})

useSeo({
  title: 'Progreso',
  description: 'Tu avance por tiempo verbal y sección, con lo que has fallado y lo que toca repasar hoy. Se guarda en este navegador y puedes exportarlo a JSON.'
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Progreso"
      description="Lo que has practicado se guarda en este navegador. Cada acierto sube el ejercicio de caja y lo aleja en el tiempo; cada fallo lo devuelve al montón de hoy."
    />

    <UPageSection>
      <div class="mx-auto w-full max-w-3xl space-y-12">
        <ClientOnly>
          <template #fallback>
            <p class="text-muted">
              Cargando tu progreso…
            </p>
          </template>

          <aside
            v-if="persistenceFailed"
            role="status"
            aria-live="polite"
            class="rounded-lg border border-warning p-4"
          >
            <h2 class="font-semibold">
              El progreso solo se conserva en esta sesión
            </h2>
            <p class="mt-1 text-sm text-muted">
              El navegador no permite guardarlo: no se guardará al recargar o cerrar la página.
              <ULink href="#exportar-progreso">
                Exporta una copia JSON
              </ULink>
              antes de salir.
            </p>
          </aside>

          <section>
            <div class="flex flex-wrap items-center gap-4">
              <UButton
                to="/repaso"
                :label="pending.length > 0 ? `Repasar hoy (${pending.length}) · tandas de 10` : 'Nada que repasar hoy'"
                icon="i-lucide-repeat"
                size="lg"
                :disabled="pending.length === 0"
              />

              <p class="text-muted">
                {{ total.practiced }} de {{ total.total }} ejercicios practicados ·
                {{ total.mastered }} aprendidos
              </p>
            </div>

            <p
              v-if="attempts.length === 0"
              class="mt-4 text-muted"
            >
              Todavía no has practicado nada. Empieza por
              <ULink to="/frases">
                las frases
              </ULink>
              o por
              <ULink to="/verbos/practica">
                la conjugación
              </ULink>.
            </p>
          </section>

          <section v-if="attempts.length > 0">
            <h2 class="text-xl font-semibold">
              Por tiempo verbal
            </h2>

            <div
              data-table-scroll
              role="region"
              tabindex="0"
              aria-label="Progreso por tiempo verbal. Desplázate horizontalmente si es necesario."
              class="mt-4 overflow-x-auto"
            >
              <table class="w-full min-w-max text-left text-sm">
                <caption class="sr-only">
                  Progreso por tiempo verbal
                </caption>
                <thead class="text-muted">
                  <tr class="border-b border-default">
                    <th
                      scope="col"
                      class="py-2 pr-4 font-medium"
                    >
                      Tiempo
                    </th>
                    <th
                      scope="col"
                      class="py-2 pr-4 font-medium"
                    >
                      Practicados
                    </th>
                    <th
                      scope="col"
                      class="py-2 pr-4 font-medium"
                    >
                      Aciertos
                    </th>
                    <th
                      scope="col"
                      class="py-2 pr-4 font-medium"
                    >
                      Fallos
                    </th>
                    <th
                      scope="col"
                      class="py-2 pr-4 font-medium"
                    >
                      Aprendidos
                    </th>
                    <th
                      scope="col"
                      class="py-2 font-medium"
                    >
                      Para hoy
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="row in byTense"
                    :key="row.tense.id"
                    class="border-b border-default"
                  >
                    <th
                      scope="row"
                      class="py-2 pr-4 font-medium"
                    >
                      <ULink :to="`/teoria/${row.tense.id}`">
                        {{ row.tense.name }}
                      </ULink>
                    </th>
                    <td class="py-2 pr-4">
                      {{ row.stats.practiced }} / {{ row.stats.total }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ row.stats.hits }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ row.stats.misses }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ row.stats.mastered }}
                    </td>
                    <td class="py-2">
                      {{ row.stats.due }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="attempts.length > 0">
            <h2 class="text-xl font-semibold">
              Por sección
            </h2>

            <dl class="mt-4 grid gap-4 sm:grid-cols-3">
              <div
                v-for="row in byKind"
                :key="row.kind"
                class="rounded-lg border border-default p-4"
              >
                <dt class="font-medium">
                  {{ itemKindLabels[row.kind] }}
                </dt>
                <dd class="mt-1 text-sm text-muted">
                  {{ row.stats.practiced }} de {{ row.stats.total }} practicados ·
                  {{ row.stats.hits }} aciertos y {{ row.stats.misses }} fallos ·
                  {{ row.stats.due }} para repasar
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="failed.length > 0">
            <h2 class="text-xl font-semibold">
              Lo que se te ha atragantado
            </h2>

            <ul class="mt-4 space-y-4 text-sm">
              <li
                v-for="failure in failed"
                :key="failure.attempt.id"
              >
                <p class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :label="itemKindLabels[failure.item.kind]"
                    variant="subtle"
                    color="neutral"
                  />
                  <!-- The prompt of a verb is Spanish ("Participio de «go»"); the sentences
                       and the reading questions are English, and so is every solution. -->
                  <span
                    :lang="failure.item.kind === 'verbos' ? undefined : 'en'"
                    class="font-medium"
                  >{{ failure.item.prompt }}</span>
                </p>
                <p class="mt-1 text-muted">
                  Respuesta: <strong
                    lang="en"
                    class="font-semibold"
                  >{{ failure.item.solution }}</strong> ·
                  {{ failure.attempt.hits }} aciertos y {{ failure.attempt.misses }} fallos ·
                  {{ boxLabels[failure.attempt.box] }} ·
                  {{ isDue(failure.attempt) ? 'toca hoy' : `vuelve el ${failure.attempt.due}` }}
                </p>
              </li>
            </ul>
          </section>

          <section id="exportar-progreso">
            <h2 class="text-xl font-semibold">
              Tus datos
            </h2>

            <p class="mt-2 text-muted">
              El progreso solo existe en este navegador. Expórtalo para guardarlo o llevártelo a otro.
            </p>

            <aside
              v-if="unavailable.length > 0"
              role="status"
              aria-live="polite"
              class="mt-4 rounded-lg border border-warning p-4"
            >
              <p>
                {{ unavailable.length }} clip{{ unavailable.length === 1 ? '' : 's' }} oculto{{ unavailable.length === 1 ? '' : 's' }} porque el vídeo no se pudo reproducir.
              </p>
              <UButton
                label="Recuperar clips ocultos"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="subtle"
                class="mt-3"
                @click="clearUnavailable"
              />
            </aside>

            <div class="mt-4 flex flex-wrap items-end gap-4">
              <UButton
                label="Exportar JSON"
                icon="i-lucide-download"
                color="neutral"
                :disabled="attempts.length === 0"
                @click="exportFile"
              />

              <!-- A native file input, with its <label>: nothing else is needed. -->
              <div>
                <label
                  for="importar-progreso"
                  class="block text-sm font-medium"
                >
                  Importar JSON
                </label>

                <input
                  id="importar-progreso"
                  type="file"
                  accept="application/json,.json"
                  :aria-invalid="error ? true : undefined"
                  :aria-describedby="error ? 'importar-progreso-error' : importMessage ? 'importar-progreso-message' : undefined"
                  class="mt-1 block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-default"
                  @change="onImport"
                >

                <p
                  v-if="error"
                  id="importar-progreso-error"
                  role="alert"
                  class="mt-1 text-sm text-error"
                >
                  {{ error }}
                </p>

                <p
                  v-if="importMessage"
                  id="importar-progreso-message"
                  role="status"
                  class="mt-1 text-sm text-muted"
                >
                  {{ importMessage }}
                </p>
              </div>

              <UModal
                v-model:open="resetModalOpen"
                :portal="false"
                title="¿Reiniciar progreso?"
                description="Se borrará todo el progreso guardado en este navegador y se recuperarán los vídeos ocultos. Esta acción no se puede deshacer."
              >
                <UButton
                  label="Reiniciar"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="subtle"
                  :disabled="attempts.length === 0 && unavailable.length === 0"
                  @click="onReset"
                />

                <template #footer="{ close }">
                  <UButton
                    label="Cancelar"
                    color="neutral"
                    variant="outline"
                    @click="close"
                  />
                  <UButton
                    label="Sí, reiniciar"
                    color="error"
                    @click="confirmReset(close)"
                  />
                </template>
              </UModal>
            </div>
          </section>
        </ClientOnly>
      </div>
    </UPageSection>
  </UPage>
</template>
