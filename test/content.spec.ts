import { describe, expect, it } from 'vitest'
import { exerciseFiles, exerciseTypes, exercises, forms, levels, tenseFiles, tenses, typeOf, verbs } from '../app/utils/content'

// Guards every JSON file under content/: a missing field, a duplicate id or a file name that
// no longer matches its slug fails here instead of at runtime in the browser.

const fileName = (path: string) => path.split('/').pop()!

/** A required text field: present, a string and not blank. */
function expectText(value: unknown, label: string) {
  expect(typeof value, `${label} must be a string`).toBe('string')
  expect((value as string).trim(), `${label} must not be empty`).not.toBe('')
}

const rawHtmlTag = /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*)?\s*\/?>/

function expectNoRawHtml(value: unknown, label: string) {
  expect(value as string, `${label} must not contain raw HTML tags; use Markdown instead`).not.toMatch(rawHtmlTag)
}

const duplicates = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i)

describe('tenses', () => {
  it('loads every file in content/tenses', () => {
    expect(tenses).toHaveLength(Object.keys(tenseFiles).length)
    // The seed tenses always ship; /teoria may add more.
    expect(tenses.map(tense => tense.id)).toEqual(expect.arrayContaining(['past-simple', 'present-perfect', 'present-simple']))
  })

  it('has unique ids', () => {
    expect(duplicates(tenses.map(tense => tense.id))).toEqual([])
  })

  describe.each(Object.entries(tenseFiles))('%s', (path, tense) => {
    it('is named after its id', () => {
      expectText(tense.id, 'id')
      expect(tense.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(fileName(path)).toBe(`${tense.id}.json`)
    })

    it('has the required fields', () => {
      expectText(tense.name, 'name')
      expectText(tense.nameEs, 'nameEs')
      expectText(tense.theory, 'theory')
      expectNoRawHtml(tense.theory, `${path}.theory`)
      expect(levels).toContain(tense.level)
    })

    it('describes the three structures', () => {
      for (const form of forms) {
        expectText(tense.structure?.[form], `structure.${form}`)
      }
    })

    it('has time markers', () => {
      expect(Array.isArray(tense.timeMarkers)).toBe(true)
      expect(tense.timeMarkers.length).toBeGreaterThan(0)
      tense.timeMarkers.forEach((marker, i) => expectText(marker, `timeMarkers[${i}]`))
    })

    it('has examples in both languages', () => {
      expect(tense.examples?.length).toBeGreaterThan(0)
      tense.examples.forEach((example, i) => {
        expect(forms, `examples[${i}].form`).toContain(example.form)
        expectText(example.en, `examples[${i}].en`)
        expectText(example.es, `examples[${i}].es`)
      })
    })

    // Two per form is the floor /teoria asks for: without this, a tense written with a single
    // affirmative example would still ship green.
    it('has at least two examples of every form', () => {
      for (const form of forms) {
        expect(tense.examples.filter(example => example.form === form).length, `examples of ${form}`)
          .toBeGreaterThanOrEqual(2)
      }
    })

    // /teoria/<slug> keys the list by `en`: a repeat is a duplicate key warning in Vue.
    it('has no repeated English example', () => {
      expect(duplicates(tense.examples.map(example => example.en))).toEqual([])
    })
  })
})

describe('Markdown content', () => {
  it.each(['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<b>bold</b>'])('rejects raw HTML: %s', (value) => {
    expect(value).toMatch(rawHtmlTag)
  })

  it('allows less-than comparisons', () => {
    expect('5 < 10').not.toMatch(rawHtmlTag)
  })
})

describe('verbs', () => {
  it('loads the seed list', () => {
    expect(verbs.length).toBeGreaterThanOrEqual(20)
  })

  it('has unique infinitives', () => {
    expect(duplicates(verbs.map(verb => verb.infinitive))).toEqual([])
  })

  it.each(verbs.map(verb => [verb.infinitive ?? '(missing)', verb] as const))('%s', (_infinitive, verb) => {
    expectText(verb.infinitive, 'infinitive')
    expectText(verb.past, 'past')
    expectText(verb.participle, 'participle')
    expectText(verb.es, 'es')
    expect(typeof verb.regular, 'regular must be a boolean').toBe('boolean')

    // A regular verb is exactly the one whose past and participle are the same -ed form.
    if (verb.regular) {
      expect(verb.past).toBe(verb.participle)
      expect(verb.past).toMatch(/ed$/)
    }
  })
})

describe('exercises', () => {
  it('is named after its file and has unique ids', () => {
    for (const [path, fileExercises] of Object.entries(exerciseFiles)) {
      expect(Array.isArray(fileExercises), `${path} must contain an array`).toBe(true)
    }

    expect(duplicates(exercises.map(exercise => exercise.id))).toEqual([])
  })

  // A tense with theory but no sentences is not listed on /frases and hides the practice
  // button on /teoria/<slug>: the seed tenses have to ship their own.
  it('drills every seed tense', () => {
    expect([...new Set(exercises.map(exercise => exercise.tenseId))])
      .toEqual(expect.arrayContaining(['past-simple', 'present-perfect', 'present-simple']))
  })

  it('always has a solution and a known tense', () => {
    const ids = tenses.map(tense => tense.id)

    for (const exercise of exercises) {
      expectText(exercise.id, 'id')
      expectText(exercise.prompt, `${exercise.id}.prompt`)
      expectText(exercise.solution, `${exercise.id}.solution`)
      expect(ids, `${exercise.id}.tenseId`).toContain(exercise.tenseId)
      expect(exerciseTypes, `${exercise.id}.type`).toContain(typeOf(exercise))

      if (exercise.explanation !== undefined) {
        expectText(exercise.explanation, `${exercise.id}.explanation`)
      }
    }
  })

  // Each type is answered differently, so each one needs its own fields to be usable.
  it('has the fields its type needs', () => {
    for (const exercise of exercises) {
      if (typeOf(exercise) === 'gap') {
        // A gap-fill sentence: the prompt is where the solution goes.
        expect(exercise.prompt, `${exercise.id}.prompt needs a ___ gap`).toContain('___')
      }

      if (typeOf(exercise) === 'transform') {
        expect(forms, `${exercise.id}.form`).toContain(exercise.form)
      }

      if (typeOf(exercise) === 'choice') {
        expect(exercise.options?.length, `${exercise.id}.options`).toBeGreaterThan(1)
        exercise.options!.forEach((option, i) => expectText(option, `${exercise.id}.options[${i}]`))
        expect(exercise.options, `${exercise.id}.solution must be one of the options`).toContain(exercise.solution)
      }
    }
  })
})

// The readings of content/readings/ are validated in test/reading.spec.ts, next to the pages
// that play them.
