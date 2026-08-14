<script setup lang="ts">
// ponytail: placeholder for the sections not implemented yet. Static routes win over this
// catch-all, so each phase that adds app/pages/<section>.vue replaces it; delete this file
// once every section exists.
const route = useRoute()
const section = computed(() => sections.find(s => s.to === route.path))

if (!section.value) {
  throw createError({ statusCode: 404, message: 'Página no encontrada', fatal: true })
}

useSeoMeta({ title: () => section.value?.label })
</script>

<template>
  <UPage>
    <UPageHero
      :title="section?.label"
      :description="section?.description"
    />

    <UPageSection>
      <UAlert
        icon="i-lucide-hammer"
        title="En construcción"
        description="Esta sección todavía no está disponible."
        variant="subtle"
      />
    </UPageSection>
  </UPage>
</template>
