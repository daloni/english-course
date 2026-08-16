<script setup lang="ts">
// Fill in the gap: the sentence carries a ___ and only what goes inside it is typed.
defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
</script>

<template>
  <div>
    <p
      lang="en"
      class="text-xl"
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
      placeholder="Lo que va en el hueco"
      aria-label="Lo que va en el hueco"
      class="mt-4 w-full max-w-sm"
    />
  </div>
</template>
