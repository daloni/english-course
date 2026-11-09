<script setup lang="ts">
// The correction of /frases/<tiempo>, /repaso and /clips/practica: the English sentence with
// the answer in it, then the why. A miss explains with explain(), falling back to the tense
// structure; a hit only shows the explanation the exercise carries, if any.
defineProps<{ correct: boolean, exercise: Exercise, sentence: Segment[] }>()
</script>

<template>
  <UAlert
    :title="correct ? '¡Correcto!' : 'No es esa'"
    :icon="correct ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
    :color="correct ? 'success' : 'error'"
    variant="subtle"
    :ui="feedbackUi(correct)"
  >
    <template #description>
      <p
        v-if="sentence.length > 0"
        lang="en"
        class="text-base text-highlighted"
      >
        <!-- The text goes inline in its tag: written on its own lines it would gain spaces. -->
        <template
          v-for="(segment, i) in sentence"
          :key="i"
        >
          <strong
            v-if="segment.filled"
            class="font-semibold"
          >{{ segment.text }}</strong>
          <span v-else>{{ segment.text }}</span>
        </template>
      </p>
      <p v-if="!correct">
        {{ correction(exercise) }}
      </p>
      <p v-else-if="exercise.explanation">
        {{ exercise.explanation }}
      </p>
    </template>
  </UAlert>
</template>
