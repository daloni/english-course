// Lo que comparten las dos pantallas que corrigen frases, /frases/<tiempo> y /repaso: con qué
// componente se pregunta cada tipo de ejercicio y qué se lee al fallar.
import type { Component } from 'vue'
import { ExerciseChoice, ExerciseGap, ExerciseTransform } from '#components'
import { formLabels, tenseById, type Exercise, type ExerciseType, type Form } from './content'

/** Un componente por tipo de ejercicio; el de la frase actual se elige por su `type`. */
export const exerciseComponents: Record<ExerciseType, Component> = {
  gap: ExerciseGap,
  transform: ExerciseTransform,
  choice: ExerciseChoice
}

/**
 * De qué forma habla el ejercicio, para recordar su estructura tras un fallo: la que declara,
 * y si no la que se ve en la frase.
 * ponytail: heurística sobre el prompt; si alguna frase la despista, añade "form" al JSON.
 */
export function formOf(exercise: Exercise): Form {
  if (exercise.form) {
    return exercise.form
  }

  if (/\bnot\s*\//.test(exercise.prompt)) {
    return 'negative'
  }

  return exercise.prompt.trim().endsWith('?') ? 'interrogative' : 'affirmative'
}

/**
 * El porqué del fallo: la explicación del ejercicio o, si no la trae, la estructura de su
 * tiempo verbal. Las preguntas de reading no drillan ningún tiempo, así que se quedan sin ella.
 */
export function explain(exercise: Exercise): string {
  if (exercise.explanation) {
    return exercise.explanation
  }

  const tense = tenseById(exercise.tenseId)

  if (!tense) {
    return ''
  }

  const form = formOf(exercise)

  return `${formLabels[form]}: ${tense.structure[form]}`
}

/** Lo que se lee al fallar: la solución y el porqué, cuando lo hay. */
export const correction = (exercise: Exercise) =>
  `La respuesta correcta es: ${exercise.solution}. ${explain(exercise)}`.trim()
