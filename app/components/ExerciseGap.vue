<script setup lang="ts">
// Fill in the gap: the sentence carries a ___ and only what goes inside it is typed.
const props = defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })
const gaps = computed(() => gapCount(props.exercise.prompt))
const gapLabel = computed(() => gaps.value === 2 ? 'dos' : String(gaps.value))
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
      :placeholder="gaps > 1 ? `Las ${gapLabel} respuestas separadas por /` : 'Lo que va en el hueco'"
      :aria-label="gaps > 1 ? `Las ${gapLabel} respuestas separadas por /` : 'Lo que va en el hueco'"
      class="mt-4 w-full max-w-sm"
    />

    <p
      v-if="gaps > 1"
      class="text-sm text-muted"
    >
      Hay {{ gapLabel }} huecos: escribe las respuestas separadas por / (por ejemplo Are / waiting).
    </p>
  </div>
</template>
