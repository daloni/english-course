// Content lives as plain JSON under content/ and is bundled at build time by Vite.
// No CMS, no fetch: the files are part of the app, and test/content.spec.ts validates them.
import verbsJson from '../../content/verbs.json'

export const levels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export const forms = ['affirmative', 'negative', 'interrogative'] as const

export type Level = typeof levels[number]
export type Form = typeof forms[number]

export interface Example {
  form: Form
  en: string
  es: string
}

export interface Tense {
  /** Slug, matches the file name: content/tenses/<id>.json */
  id: string
  name: string
  nameEs: string
  level: Level
  /** Markdown */
  theory: string
  structure: Record<Form, string>
  timeMarkers: string[]
  examples: Example[]
}

export interface Verb {
  infinitive: string
  past: string
  participle: string
  regular: boolean
  es: string
}

export interface Exercise {
  id: string
  /** Tense.id this exercise drills */
  tenseId: string
  prompt: string
  solution: string
}

export interface Question {
  id: string
  question: string
  /** Answer choices; `answer` is one of them. */
  options: string[]
  answer: string
}

export interface Reading {
  /** Slug, matches the file name: content/readings/<id>.json */
  id: string
  title: string
  level: Level
  /** The English text to read, in Markdown */
  text: string
  questions: Question[]
}

/** Path -> tense, so tests can check that the file name matches the id. */
export const tenseFiles = import.meta.glob<Tense>('../../content/tenses/*.json', { eager: true, import: 'default' })
export const exerciseFiles = import.meta.glob<Exercise[]>('../../content/exercises/*.json', { eager: true, import: 'default' })
export const readingFiles = import.meta.glob<Reading>('../../content/readings/*.json', { eager: true, import: 'default' })

export const tenses: Tense[] = Object.values(tenseFiles)
  .sort((a, b) => a.level.localeCompare(b.level) || a.name.localeCompare(b.name))

export const verbs = verbsJson as Verb[]

export const exercises: Exercise[] = Object.values(exerciseFiles).flat()

export const readings: Reading[] = Object.values(readingFiles)
  .sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title))

export const tenseById = (id: string) => tenses.find(tense => tense.id === id)
