<script setup lang="ts">
defineProps<{ loading?: boolean }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    role="alert"
    class="space-y-4"
  >
    <UAlert
      title="No se han podido cargar los clips"
      description="Parece un fallo de conexión. Comprueba la red y vuelve a intentarlo: tu progreso y tus filtros siguen como estaban."
      icon="i-lucide-wifi-off"
      color="error"
      variant="subtle"
    />

    <UButton
      type="button"
      label="Reintentar"
      icon="i-lucide-rotate-ccw"
      :loading="loading"
      @click="$emit('retry')"
    />
  </div>
</template>
