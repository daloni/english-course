// Progress lives in the browser localStorage: there are no accounts and no backend, so what
// is stored here is all there is. One attempt per exercise, with its Leitner box.
import { thirdPerson } from './check'
import { clips, exercises, readings, verbs, type Clip, type Exercise, type Question, type Reading, type Verb } from './content'

export const storageKey = 'ingles:progress'

export const boxes = [1, 2, 3] as const

export type Box = typeof boxes[number]

// With `satisfies` instead of a leading type annotation, which is what the Nuxt autoimport
// scanner knows how to read: annotated, `boxLabels` never reaches the templates.
/** Days an item rests according to its box: box 1 comes back today, box 3 takes a week. */
export const boxDelays = { 1: 0, 2: 2, 3: 7 } satisfies Record<Box, number>

export const boxLabels = {
  1: 'Por aprender',
  2: 'En camino',
  3: 'Aprendido'
} satisfies Record<Box, string>

export interface Attempt {
  /** Item.id, repeated inside the attempt so the exported JSON reads on its own. */
  id: string
  box: Box
  hits: number
  misses: number
  /** ISO dates (YYYY-MM-DD): when it was practised and when it is due for review. */
  last: string
  due: string
}

/** What is stored, indexed by id: a plain object so it is JSON as is. */
export type Progress = Record<string, Attempt>

/** Today in the browser timezone, not in UTC: at eleven at night it is still today. */
export const day = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

/** Adds days to an ISO date in UTC, which is exact day arithmetic with no daylight saving. */
export function addDays(from: string, days: number): string {
  const date = new Date(`${from}T00:00:00Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

/**
 * A corrected attempt, the Leitner way: a hit moves up at most one box per day and pushes the
 * review further away, a miss always sends it back to box 1, which is due the same day. A new
 * item starts in box 1, so the first good answer leaves it in box 2.
 */
export function review(attempt: Attempt | undefined, id: string, correct: boolean, on = day()): Attempt {
  const box = (correct
    ? Math.min(Math.max(...boxes), attempt?.last === on ? attempt.box : (attempt?.box ?? 1) + 1)
    : 1) as Box

  return {
    id,
    box,
    hits: (attempt?.hits ?? 0) + (correct ? 1 : 0),
    misses: (attempt?.misses ?? 0) + (correct ? 0 : 1),
    last: on,
    due: addDays(on, boxDelays[box])
  }
}

/** Due for review: its date has arrived. ISO dates compare as plain text. */
export const isDue = (attempt: Attempt, on = day()) => attempt.due <= on

/** A shuffled copy, Fisher-Yates: the content keeps its file order, the round does not. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }

  return copy
}

/**
 * A round of at most `size` items, the spaced repetition way: what has never been practised or
 * is due today goes first, the rest only fills what is left, and each group is shuffled so two
 * rounds are not the same list. `keyOf` drops repeats inside the round, which is how a verb is
 * asked at most once even though it has three forms.
 */
export function pickRound<T>(
  items: T[],
  attemptOf: (item: T) => Attempt | undefined,
  size: number,
  keyOf?: (item: T) => string
): T[] {
  const pending: T[] = []
  const later: T[] = []

  for (const item of items) {
    const attempt = attemptOf(item)

    ;(attempt && !isDue(attempt) ? later : pending).push(item)
  }

  const round = [...shuffle(pending), ...shuffle(later)]

  if (!keyOf) {
    return round.slice(0, size)
  }

  const seen = new Set<string>()

  return round.filter((item) => {
    const key = keyOf(item)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  }).slice(0, size)
}

export const serialize = (progress: Progress) => JSON.stringify(progress, null, 2)

/**
 * An ISO date that also exists: "2026-13-45" has the shape but is not any day at all.
 * `Date` accepting it is not enough, because extra days overflow into the next month
 * ("2026-02-30" becomes March 2nd); it only counts if the day that comes out is the one
 * that went in.
 */
const isDate = (value: unknown) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && new Date(`${value}T00:00:00Z`).toJSON()?.slice(0, 10) === value

/** Answers that were counted: a whole number of them, and never below zero. */
const isCount = (value: unknown) => Number.isInteger(value) && (value as number) >= 0

function isAttempt(value: unknown): value is Attempt {
  const attempt = value as Attempt

  return typeof value === 'object' && value !== null
    // An empty id names no exercise: it could never be found back.
    && typeof attempt.id === 'string' && attempt.id !== ''
    && (boxes as readonly unknown[]).includes(attempt.box)
    && isCount(attempt.hits) && isCount(attempt.misses)
    && isDate(attempt.last) && isDate(attempt.due)
    // The review always comes after the practice, so no attempt exported here can be due
    // before the day it was last answered. ISO dates compare as plain text.
    && attempt.due >= attempt.last
    // A device with a different timezone can be one local day behind the exporter.
    && attempt.last <= addDays(day(), 1)
}

/** Combines progress without adding answer counters from the same attempt twice. */
export function merge(current: Progress, imported: Progress): Progress {
  const merged = { ...current }

  for (const [id, attempt] of Object.entries(imported)) {
    const existing = merged[id]
    const answers = attempt.hits + attempt.misses
    const existingAnswers = existing ? existing.hits + existing.misses : -1

    if (!existing || attempt.last > existing.last || (attempt.last === existing.last && answers > existingAnswers)) {
      merged[id] = attempt
    }
  }

  return merged
}

/**
 * Reads a stored or imported progress. The file is chosen by whoever uses the site, so it is
 * checked in full: if it is not an object of attempts it is rejected; individual corrupt
 * attempts are dropped instead of bringing the whole import down.
 */
export function parse(json: string): Progress {
  const data: unknown = JSON.parse(json)

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('El fichero no es un progreso exportado')
  }

  const entries = Object.entries(data).filter(([id, attempt]) => isAttempt(attempt) && attempt.id === id)

  if (entries.length === 0) {
    throw new Error('El fichero no tiene ningún intento válido')
  }

  return Object.fromEntries(entries) as Progress
}

/** Without a readable localStorage (SSR, blocked storage, a test with no DOM) progress is empty. */
export function load(): Progress {
  try {
    // Reading the storage is what throws when the browser blocks it (SecurityError), so it
    // goes inside the try along with the parsing: this runs in `onMounted` on every page
    // that shows progress, and an exception here would leave them all blank.
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)

    return stored ? parse(stored) : {}
  } catch {
    // An unreadable progress cannot leave the site stuck: start from scratch.
    return {}
  }
}

/**
 * Saving is the only thing that can fail for outside reasons: full storage, Safari private
 * mode or a browser blocking the storage make it throw. It runs on every answer, so letting
 * the exception bubble up would bring the correction down; the session stays in memory and
 * does not persist.
 */
export function save(progress: Progress) {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(storageKey, serialize(progress))
  } catch {
    // With nowhere to store it, the progress of this session is lost on reload.
  }
}

export const itemKinds = ['frases', 'verbos', 'reading', 'clips'] as const

export type ItemKind = typeof itemKinds[number]

export const itemKindLabels: Record<ItemKind, string> = {
  frases: 'Frases',
  verbos: 'Verbos',
  reading: 'Reading',
  clips: 'Clips'
}

/** What can be reviewed: an exercise of any section, tagged with the section it comes from. */
export interface Item extends Exercise {
  kind: ItemKind
  /** Clips only: the video the sentence comes from, so the review can play it back. */
  clip?: Clip
}

/** What a verb can be asked about, and the tense each question counts towards. */
export const verbForms = [
  { key: 'past', label: 'Pasado simple', tenseId: 'past-simple', of: (verb: Verb) => verb.past },
  { key: 'participle', label: 'Participio', tenseId: 'present-perfect', of: (verb: Verb) => verb.participle },
  {
    key: 'third',
    label: 'Present Simple, 3.ª persona (he / she / it)',
    tenseId: 'present-simple',
    of: (verb: Verb) => thirdPerson(verb.infinitive)
  }
] as const

export type VerbForm = typeof verbForms[number]

// Ids carry the section in front so they do not clash across sections and so the exercise
// can be found back from localStorage. They are built here, which is where they are read back.
export const frasesItemId = (exercise: Exercise) => `frases:${exercise.id}`
export const verbItemId = (verb: Verb, form: VerbForm) => `verbos:${verb.infinitive}:${form.key}`
export const readingItemId = (reading: Reading, question: Question) => `reading:${reading.id}:${question.id}`
export const clipItemId = (clip: Clip, exercise: Exercise) => `clips:${clip.id}:${exercise.id}`

/** Everything reviewable in the site, which is versioned content: built once on load. */
export const items: Item[] = [
  ...exercises.map(exercise => ({ ...exercise, id: frasesItemId(exercise), kind: 'frases' as const })),
  ...verbs.flatMap(verb => verbForms.map(form => ({
    id: verbItemId(verb, form),
    kind: 'verbos' as const,
    tenseId: form.tenseId,
    prompt: `${form.label} de «${verb.infinitive}» (${verb.es})`,
    solution: form.of(verb)
  }))),
  ...readings.flatMap(reading => reading.questions.map(question => ({
    id: readingItemId(reading, question),
    kind: 'reading' as const,
    // Reading questions do not drill any particular tense: they only count by section.
    tenseId: '',
    prompt: question.question,
    options: question.options,
    solution: question.answer,
    explanation: question.explanation
  }))),
  // A clip carries its own tenses in its exercises, and the clip travels with them: the
  // review has to play the video back, not just show the sentence.
  ...clips.flatMap(clip => clip.exercises.map(exercise => ({
    ...exercise,
    id: clipItemId(clip, exercise),
    kind: 'clips' as const,
    clip
  })))
]

const byId = new Map(items.map(item => [item.id, item]))

/** The exercise of a stored attempt, or nothing if that content no longer exists. */
export const itemById = (id: string) => byId.get(id)

export const itemsOfKind = (kind: ItemKind) => items.filter(item => item.kind === kind)

export const itemsOfTense = (tenseId: string) => items.filter(item => item.tenseId === tenseId)
