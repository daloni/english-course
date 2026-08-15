// El progreso vive en el localStorage del navegador: no hay cuentas ni backend, así que lo
// que se guarda aquí es todo lo que hay. Un intento por ejercicio, con su caja Leitner.
import { thirdPerson } from './check'
import { exercises, readings, verbs, type Exercise, type Question, type Reading, type Verb } from './content'

export const storageKey = 'ingles:progress'

export const boxes = [1, 2, 3] as const

export type Box = typeof boxes[number]

// Con `satisfies` en vez de anotar el tipo delante, que es lo que el escáner de
// autoimports de Nuxt sabe leer: anotado, `boxLabels` no llega a las plantillas.
/** Días que descansa un ítem según su caja: la 1 vuelve hoy mismo, la 3 tarda una semana. */
export const boxDelays = { 1: 0, 2: 2, 3: 7 } satisfies Record<Box, number>

export const boxLabels = {
  1: 'Por aprender',
  2: 'En camino',
  3: 'Aprendido'
} satisfies Record<Box, string>

export interface Attempt {
  /** Item.id, repetido dentro del intento para que el JSON exportado se lea solo. */
  id: string
  box: Box
  hits: number
  misses: number
  /** Fechas ISO (YYYY-MM-DD): cuándo se practicó y cuándo toca repasarlo. */
  last: string
  due: string
}

/** Lo guardado, indexado por id: un objeto plano para que sea JSON directo. */
export type Progress = Record<string, Attempt>

/** Hoy en la zona del navegador, no en UTC: a las once de la noche sigue siendo hoy. */
export const day = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

/** Suma días a una fecha ISO en UTC, que es aritmética exacta de días sin horarios de verano. */
export function addDays(from: string, days: number): string {
  const date = new Date(`${from}T00:00:00Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

/**
 * Un intento corregido, según Leitner: acertar sube de caja y aleja el repaso, fallar
 * devuelve siempre a la caja 1, que vence el mismo día. Un ítem nuevo entra en la caja 1,
 * así que la primera respuesta buena lo deja en la 2.
 */
export function review(attempt: Attempt | undefined, id: string, correct: boolean, on = day()): Attempt {
  const box = (correct ? Math.min(boxes.length, (attempt?.box ?? 1) + 1) : 1) as Box

  return {
    id,
    box,
    hits: (attempt?.hits ?? 0) + (correct ? 1 : 0),
    misses: (attempt?.misses ?? 0) + (correct ? 0 : 1),
    last: on,
    due: addDays(on, boxDelays[box])
  }
}

/** Toca repasarlo: su fecha ya ha llegado. Las fechas ISO se comparan como texto. */
export const isDue = (attempt: Attempt, on = day()) => attempt.due <= on

export const serialize = (progress: Progress) => JSON.stringify(progress, null, 2)

/** Una fecha ISO que además existe: «2026-13-45» tiene la forma pero no es ningún día. */
const isDate = (value: unknown) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

function isAttempt(value: unknown): value is Attempt {
  const attempt = value as Attempt

  return typeof value === 'object' && value !== null
    && typeof attempt.id === 'string'
    && (boxes as readonly unknown[]).includes(attempt.box)
    && Number.isFinite(attempt.hits) && Number.isFinite(attempt.misses)
    && isDate(attempt.last) && isDate(attempt.due)
}

/**
 * Lee un progreso guardado o importado. El fichero lo elige la persona que usa la web, así
 * que se comprueba entero: si no es un objeto de intentos, se rechaza; los intentos sueltos
 * que estén corruptos se descartan en vez de tumbar la importación.
 */
export function parse(json: string): Progress {
  const data: unknown = JSON.parse(json)

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('El fichero no es un progreso exportado')
  }

  const entries = Object.entries(data).filter(([id, attempt]) => isAttempt(attempt) && attempt.id === id)

  if (entries.length === 0 && Object.keys(data).length > 0) {
    throw new Error('El fichero no tiene ningún intento válido')
  }

  return Object.fromEntries(entries) as Progress
}

/** Sin localStorage (SSR o un test sin DOM) el progreso está simplemente vacío. */
export function load(): Progress {
  if (typeof localStorage === 'undefined') {
    return {}
  }

  const stored = localStorage.getItem(storageKey)

  try {
    return stored ? parse(stored) : {}
  } catch {
    // Un progreso ilegible no puede dejar la web bloqueada: se empieza de cero.
    return {}
  }
}

export function save(progress: Progress) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, serialize(progress))
  }
}

export const itemKinds = ['frases', 'verbos', 'reading'] as const

export type ItemKind = typeof itemKinds[number]

export const itemKindLabels: Record<ItemKind, string> = {
  frases: 'Frases',
  verbos: 'Verbos',
  reading: 'Reading'
}

/** Lo repasable: un ejercicio de cualquier sección, con la sección de la que viene. */
export interface Item extends Exercise {
  kind: ItemKind
}

/** Lo que se puede preguntar de un verbo, y el tiempo verbal al que cuenta. */
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

// Los ids llevan delante la sección para que no choquen entre ellas y para poder volver del
// localStorage al ejercicio. Se construyen aquí, que es donde se leen de vuelta.
export const frasesItemId = (exercise: Exercise) => `frases:${exercise.id}`
export const verbItemId = (verb: Verb, form: VerbForm) => `verbos:${verb.infinitive}:${form.key}`
export const readingItemId = (reading: Reading, question: Question) => `reading:${reading.id}:${question.id}`

/** Todo lo repasable de la web, que es contenido versionado: se arma una vez al cargar. */
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
    // Las preguntas de lectura no drillan un tiempo concreto: cuentan solo por sección.
    tenseId: '',
    prompt: question.question,
    options: question.options,
    solution: question.answer,
    explanation: question.explanation
  })))
]

const byId = new Map(items.map(item => [item.id, item]))

/** El ejercicio de un intento guardado, o nada si el contenido ya no existe. */
export const itemById = (id: string) => byId.get(id)

export const itemsOfKind = (kind: ItemKind) => items.filter(item => item.kind === kind)

export const itemsOfTense = (tenseId: string) => items.filter(item => item.tenseId === tenseId)
