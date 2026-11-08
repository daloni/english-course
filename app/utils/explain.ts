// What the screens that correct sentences share, /frases/<tiempo>, /repaso and /clips/practica:
// which component asks each type of exercise, the completed sentence and what is read out after
// a miss.
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
export function correction(exercise: Exercise): string {
  // The transform solutions are whole sentences and already carry their own full stop.
  const stop = /[.?!]$/.test(exercise.solution) ? '' : '.'

  return `La respuesta correcta es: ${exercise.solution}${stop} ${explain(exercise)}`.trim()
}

/** A piece of the completed sentence; `filled` marks the words that went into a gap. */
export interface Segment {
  text: string
  filled?: boolean
}

/** The first of the alternatives a solution may list: "He is not… / He's not…" gives the first. */
const firstAlternative = (solution: string) => solution.split(/\s+\/\s+/)[0]!.trim()

/**
 * The sentence the exercise is about, completed with its solution, in pieces so the template
 * can highlight the filled-in words without v-html. Each ___ of a gap, and the (hint) after
 * it, takes its part of the solution in order: the first alternative for a single gap, one
 * part of "Is / going to start" per gap otherwise. A transform shows its first alternative and
 * a choice its sentence as is.
 */
export function completed(exercise: Exercise): Segment[] {
  const type = typeOf(exercise)

  if (type !== 'gap') {
    return [{ text: type === 'transform' ? firstAlternative(exercise.solution) : exercise.prompt }]
  }

  const parts = gapCount(exercise.prompt) > 1
    ? exercise.solution.split(/\s*\/\s*/)
    : [firstAlternative(exercise.solution)]

  return exercise.prompt.split(/___(?:\s*\([^)]*\))?/).flatMap((text, i) => i === 0
    ? [{ text }]
    : [{ text: parts[i - 1] ?? '', filled: true }, { text }])
}

/**
 * reka-ui swallows Enter on a radio, so a choice could only be corrected from the button:
 * handed to the form, Enter on the selected option corrects, as it does in a text field.
 */
export const submitOnEnter = (event: KeyboardEvent) =>
  (event.target as HTMLElement).closest('form')?.requestSubmit()
