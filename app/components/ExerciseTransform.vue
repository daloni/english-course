<script setup lang="ts">
// Transform the sentence: it is rewritten in full into the form the exercise asks for.
defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
const instructionId = useId()
const sentenceId = useId()
</script>

<template>
  <div>
    <p
      :id="instructionId"
      class="text-sm text-muted"
    >
      Pasa la frase a {{ formLabels[formOf(exercise)].toLowerCase() }}
    </p>

    <p
      :id="sentenceId"
      lang="en"
      class="mt-1 text-2xl font-medium leading-snug text-highlighted sm:text-3xl"
    >
      {{ exercise.prompt }}
    </p>

    <UInput
      v-model="answer"
      :disabled="disabled"
      data-focus-input
      lang="en"
      autofocus
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
      placeholder="La frase entera"
      aria-label="La frase transformada"
      :aria-describedby="`${instructionId} ${sentenceId}`"
      size="xl"
      class="mt-4 w-full"
    />
  </div>
</template>
