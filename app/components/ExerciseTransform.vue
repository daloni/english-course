<script setup lang="ts">
// Transform the sentence: it is rewritten in full into the form the exercise asks for.
defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      Pasa la frase a {{ formLabels[exercise.form ?? 'affirmative'].toLowerCase() }}
    </p>

    <p
      lang="en"
      class="mt-1 text-xl"
    >
      {{ exercise.prompt }}
    </p>

    <UInput
      v-model="answer"
      :disabled="disabled"
      lang="en"
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
