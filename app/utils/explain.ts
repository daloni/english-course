// What the two screens that correct sentences share, /frases/<tiempo> and /repaso: which
// component asks each type of exercise and what is read out after a miss.
import type { Component } from 'vue'
import { ExerciseChoice, ExerciseGap, ExerciseTransform } from '#components'
import { formLabels, tenseById, type Exercise, type ExerciseType, type Form } from './content'

/** One component per exercise type; the one for the current sentence is picked by its `type`. */
export const exerciseComponents: Record<ExerciseType, Component> = {
  gap: ExerciseGap,
  transform: ExerciseTransform,
  choice: ExerciseChoice
}

/**
 * Which form the exercise speaks in, to recall its structure after a miss: the one it
 * declares, and failing that the one the sentence shows.
 * ponytail: heuristic over the prompt; if some sentence throws it off, add "form" to the JSON.
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
 * The why behind the miss: the explanation of the exercise or, when it carries none, the
 * structure of its tense. Reading questions drill no tense, so they go without one.
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

/** What is read out after a miss: the solution and the why, when there is one. */
export const correction = (exercise: Exercise) =>
  `La respuesta correcta es: ${exercise.solution}. ${explain(exercise)}`.trim()
