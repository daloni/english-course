// Content lives as plain JSON under content/ and is bundled at build time by Vite.
// No CMS, no fetch: the files are part of the app, and test/content.spec.ts validates them.
import verbsJson from '../../content/verbs.json'

export const levels = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export const forms = ['affirmative', 'negative', 'interrogative'] as const

export type Level = typeof levels[number]
export type Form = typeof forms[number]

export const formLabels: Record<Form, string> = {
  affirmative: 'Afirmativa',
  negative: 'Negativa',
  interrogative: 'Interrogativa'
}

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

export const exerciseTypes = ['gap', 'transform', 'choice'] as const

export type ExerciseType = typeof exerciseTypes[number]

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  gap: 'rellenar el hueco',
  transform: 'transformar la frase',
  choice: 'elegir el tiempo'
}

export interface Exercise {
  id: string
  /** Tense.id this exercise drills */
  tenseId: string
  /** Defaults to 'gap', the only type the seed content had. */
  type?: ExerciseType
  /** 'gap': sentence with a ___ hole. 'transform' / 'choice': the whole sentence. */
  prompt: string
  solution: string
  /** 'transform' only: the form the sentence has to be turned into. */
  form?: Form
  /** 'choice' only: what to pick from; `solution` is one of them. */
  options?: string[]
  /** Shown after a wrong answer, instead of the tense structure. */
  explanation?: string
}

export interface Question {
  id: string
  question: string
  /** Answer choices; `answer` is one of them. Without options the answer is written. */
  options?: string[]
  /** A written answer may list alternatives separated by "/", as in the exercises. */
  answer: string
  /** Why that is the answer, shown when correcting. */
  explanation: string
}

export interface Reading {
  /** Slug, matches the file name: content/readings/<id>.json */
  id: string
  title: string
  /** Topic in Spanish: what the list shows next to the English title. */
  topic: string
  level: Level
  /** The English text to read, in Markdown */
  text: string
  /** Key vocabulary, shown in a collapsible glossary above the questions. */
  glossary?: { en: string, es: string }[]
  questions: Question[]
}

/**
 * A few seconds of a real video with what is said in them. No video is hosted here: only the
 * YouTube id and the window, which the official iframe plays. Anything that meant downloading,
 * cutting or serving video would be a different —and infringing— thing.
 */
export interface Clip {
  /** `${videoId}:${startMs}`: the natural key, so re-ingesting the source keeps the ids. */
  id: string
  videoId: string
  startMs: number
  endMs: number
  /** What is said in the clip, as the captions have it. */
  text: string
  level: Level
  /** Who published the video: shown next to the clip and used to filter the list. */
  channel: string
  /** Gaps over `text`: the verb of a tense, or an expression worth keeping. */
  exercises: Exercise[]
}

/** Path -> tense, so tests can check that the file name matches the id. */
export const tenseFiles = import.meta.glob<Tense>('../../content/tenses/*.json', { eager: true, import: 'default' })
export const exerciseFiles = import.meta.glob<Exercise[]>('../../content/exercises/*.json', { eager: true, import: 'default' })
export const readingFiles = import.meta.glob<Reading>('../../content/readings/*.json', { eager: true, import: 'default' })
export const clipFiles = import.meta.glob<Clip[]>('../../content/clips/*.json', { eager: true, import: 'default' })

export const tenses: Tense[] = Object.values(tenseFiles)
  .sort((a, b) => a.level.localeCompare(b.level) || a.name.localeCompare(b.name))

export const verbs = verbsJson as Verb[]

export const exercises: Exercise[] = Object.values(exerciseFiles).flat()

export const readings: Reading[] = Object.values(readingFiles)
  .sort((a, b) => a.level.localeCompare(b.level) || a.title.localeCompare(b.title))

/** In file order, which is the order the source was ingested in. */
export const clips: Clip[] = Object.values(clipFiles).flat()

export const tenseById = (id: string) => tenses.find(tense => tense.id === id)

export const readingById = (id: string) => readings.find(reading => reading.id === id)

export const clipById = (id: string) => clips.find(clip => clip.id === id)

/** The channels that have clips, for the filter of the list. */
export const clipChannels = [...new Set(clips.map(clip => clip.channel))].sort()

/** Estimated reading time at ~150 wpm, the pace of a learner reading in English. */
export const readingMinutes = (reading: Reading) =>
  Math.max(1, Math.round(reading.text.trim().split(/\s+/).length / 150))

/** Exercises of a tense, in file order: the round is drawn from them with `pickRound`. */
export const exercisesOf = (tenseId: string) => exercises.filter(exercise => exercise.tenseId === tenseId)

export const typeOf = (exercise: Exercise): ExerciseType => exercise.type ?? 'gap'
