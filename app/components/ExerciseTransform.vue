<script setup lang="ts">
// Transformar la frase: se reescribe entera en la forma que pide el ejercicio.
defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      Pasa la frase a {{ formLabels[exercise.form ?? 'affirmative'].toLowerCase() }}
    </p>

    <p class="mt-1 text-xl">
      {{ exercise.prompt }}
    </p>

    <UInput
      v-model="answer"
      :disabled="disabled"
      autofocus
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
      placeholder="La frase entera"
      aria-label="La frase transformada"
      class="mt-4 w-full"
    />
  </div>
</template>
