<script setup lang="ts">
// Elegir el tiempo correcto: la frase ya está bien escrita, hay que reconocer en qué tiempo está.
const props = defineProps<{ exercise: Exercise, disabled?: boolean }>()

const answer = defineModel<string>({ required: true })

const items = computed(() => (props.exercise.options ?? []).map(option => ({ label: option, value: option })))
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      ¿En qué tiempo verbal está esta frase?
    </p>

    <p class="mt-1 text-xl">
      {{ exercise.prompt }}
    </p>

    <URadioGroup
      v-model="answer"
      :items="items"
      :disabled="disabled"
      legend="Elige el tiempo verbal"
      :ui="{ fieldset: 'gap-y-2' }"
      class="mt-4"
    />
  </div>
</template>
