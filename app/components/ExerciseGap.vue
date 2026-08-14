<script setup lang="ts">
// Rellenar el hueco: la frase lleva un ___ y solo se escribe lo que va dentro.
defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <p class="text-xl">
      {{ exercise.prompt }}
    </p>

    <UInput
      v-model="answer"
      :disabled="disabled"
      autofocus
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
      placeholder="Lo que va en el hueco"
      aria-label="Lo que va en el hueco"
      class="mt-4 w-full max-w-sm"
    />
  </div>
</template>
