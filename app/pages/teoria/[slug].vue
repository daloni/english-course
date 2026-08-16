<script setup lang="ts">
import { marked } from 'marked'

const route = useRoute()
const tense = tenseById(String(route.params.slug))

if (!tense) {
  throw createError({ statusCode: 404, message: 'Tiempo verbal no encontrado', fatal: true })
}

// The markdown comes from content/tenses/*.json, versioned in this repo, so it is trusted.
const theory = marked.parse(tense.theory, { async: false })

const examplesByForm = forms
  .map(form => ({ form, examples: tense.examples.filter(example => example.form === form) }))
  .filter(group => group.examples.length > 0)

const hasExercises = exercises.some(exercise => exercise.tenseId === tense.id)

useSeo({
  title: tense.name,
  description: `${tense.name} (${tense.nameEs}), nivel ${tense.level}: cuándo se usa, cómo se forma, marcadores temporales y ejemplos.`
})
</script>

<template>
  <UPage>
    <UPageHero
      :title="tense.name"
      :description="tense.nameEs"
    >
      <template #links>
        <UBadge
          :label="`Nivel ${tense.level}`"
          variant="subtle"
        />
        <UButton
          v-if="hasExercises"
          :to="`/frases/${tense.id}`"
          label="Practicar con frases"
          icon="i-lucide-message-square-text"
          color="neutral"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <div class="space-y-12">
        <!-- eslint-disable vue/no-v-html -- markdown from content/, versioned here, never user input -->
        <div
          class="space-y-4 [&_em]:italic [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:my-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ps-6"
          v-html="theory"
        />
        <!-- eslint-enable vue/no-v-html -->

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            Estructura
          </h2>

          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-default">
                <th
                  scope="col"
                  class="py-2 pe-4 font-semibold"
                >
                  Forma
                </th>
                <th
                  scope="col"
                  class="py-2 font-semibold"
                >
                  Cómo se construye
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="form in forms"
                :key="form"
              >
                <th
                  scope="row"
                  class="py-2 pe-4 font-medium whitespace-nowrap"
                >
                  {{ formLabels[form] }}
                </th>
                <td
                  lang="en"
                  class="py-2"
                >
                  {{ tense.structure[form] }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            Marcadores temporales
          </h2>

          <div
            lang="en"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="marker in tense.timeMarkers"
              :key="marker"
              :label="marker"
              variant="subtle"
              color="neutral"
            />
          </div>
        </section>

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            Ejemplos
          </h2>

          <div class="space-y-6">
            <div
              v-for="group in examplesByForm"
              :key="group.form"
            >
              <h3 class="mb-2 font-medium text-muted">
                {{ formLabels[group.form] }}
              </h3>

              <ul class="space-y-2">
                <li
                  v-for="example in group.examples"
                  :key="example.en"
                >
                  <p lang="en">
                    {{ example.en }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ example.es }}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </UPageSection>
  </UPage>
</template>
