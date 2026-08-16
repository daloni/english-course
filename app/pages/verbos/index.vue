<script setup lang="ts">
useSeo({
  title: 'Verbos',
  description: 'Tabla de verbos en inglés con su pasado simple, participio y traducción, con buscador y filtro de regulares e irregulares.'
})

const query = ref('')
const kind = ref<'all' | 'regular' | 'irregular'>('all')

const kinds = [
  { label: 'Todos', value: 'all' },
  { label: 'Regulares', value: 'regular' },
  { label: 'Irregulares', value: 'irregular' }
]

const filtered = computed(() => {
  // Búsqueda literal: `normalize` corrige respuestas del alumno (expande contracciones,
  // se come el punto final) y aquí solo haría que «can't» no encontrara nada.
  const term = query.value.trim().toLowerCase()

  return verbs.filter(verb =>
    (kind.value === 'all' || (kind.value === 'regular') === verb.regular)
    && `${verb.infinitive} ${verb.past} ${verb.participle} ${verb.es}`.toLowerCase().includes(term))
})
</script>

<template>
  <UPage>
    <UPageHero
      title="Verbos"
      description="Conjugación de verbos regulares e irregulares: infinitivo, pasado simple y participio."
    >
      <template #links>
        <UButton
          to="/verbos/practica"
          label="Practicar conjugación"
          icon="i-lucide-pencil"
        />
      </template>
    </UPageHero>

    <UPageSection>
      <div class="mb-8 flex flex-wrap items-center gap-6">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Buscar un verbo"
          aria-label="Buscar un verbo"
          class="w-full max-w-sm"
        />

        <URadioGroup
          v-model="kind"
          :items="kinds"
          legend="Tipo de verbo"
          orientation="horizontal"
          :ui="{ fieldset: 'gap-x-4' }"
        />
      </div>

      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Verbos con su pasado simple, participio y traducción
        </caption>
        <thead>
          <tr class="border-b border-default">
            <th
              scope="col"
              class="py-2 pe-4 font-semibold"
            >
              Infinitivo
            </th>
            <th
              scope="col"
              class="py-2 pe-4 font-semibold"
            >
              Pasado simple
            </th>
            <th
              scope="col"
              class="py-2 pe-4 font-semibold"
            >
              Participio
            </th>
            <th
              scope="col"
              class="py-2 font-semibold"
            >
              Español
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="verb in filtered"
            :key="verb.infinitive"
          >
            <th
              scope="row"
              lang="en"
              class="py-2 pe-4 font-medium whitespace-nowrap"
            >
              {{ verb.infinitive }}
              <UBadge
                v-if="!verb.regular"
                label="irregular"
                variant="subtle"
                color="neutral"
                size="sm"
                class="ms-2"
              />
            </th>
            <td
              lang="en"
              class="py-2 pe-4"
            >
              {{ verb.past }}
            </td>
            <td
              lang="en"
              class="py-2 pe-4"
            >
              {{ verb.participle }}
            </td>
            <td class="py-2 text-muted">
              {{ verb.es }}
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="filtered.length === 0"
        class="mt-6 text-muted"
      >
        Ningún verbo coincide con la búsqueda.
      </p>
    </UPageSection>
  </UPage>
</template>
