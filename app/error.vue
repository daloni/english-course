<script setup lang="ts">
// The error page replaces app.vue entirely, so it renders itself inside the layout: without
// this Nuxt shows its default error, in English and with no header and no navigation.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

const title = computed(() => notFound.value ? 'Página no encontrada' : 'Algo ha fallado')

const description = computed(() => notFound.value
  ? 'Esta dirección no existe o el contenido ya no está publicado.'
  : 'Ha habido un error al cargar esta página. Vuelve a intentarlo o sigue desde el principio.')

/** The links are real links, but the error has to be cleared or there is no way out of here. */
const leave = (to: string) => clearError({ redirect: to })

useSeo({
  title: title.value,
  description: description.value
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <UPage>
        <UPageHero
          :title="title"
          :description="description"
        >
          <template #links>
            <UButton
              to="/"
              label="Volver a la home"
              icon="i-lucide-house"
              @click="leave('/')"
            />
          </template>
        </UPageHero>

        <UPageSection>
          <p
            v-if="error.message"
            class="text-muted"
          >
            Error {{ error.statusCode }}: {{ error.message }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              v-for="section in sections"
              :key="section.to"
              :to="section.to"
              :label="section.label"
              :icon="section.icon"
              color="neutral"
              variant="subtle"
              @click="leave(section.to)"
            />
          </div>
        </UPageSection>
      </UPage>
    </NuxtLayout>
  </UApp>
</template>
