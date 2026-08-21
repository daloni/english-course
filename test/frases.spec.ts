import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import FrasesIndex from '../app/pages/frases/index.vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import ExerciseChoice from '../app/components/ExerciseChoice.vue'
import ExerciseGap from '../app/components/ExerciseGap.vue'
import ExerciseTransform from '../app/components/ExerciseTransform.vue'
import type { Exercise, ExerciseType } from '../app/utils/content'
import { exerciseFiles, exerciseTypes, exercisesOf, tenseById, typeOf } from '../app/utils/content'
import { correction, exerciseComponents, explain, formOf } from '../app/utils/explain'
import { addDays, day, frasesItemId, items, review, save, storageKey } from '../app/utils/progress'

/** Sentences per round on /frases/<tiempo>. */
const roundSize = 10

// Every file in content/exercises/ must be playable at /frases/<slug>, and every exercise type
// must be rendered by its own component: adding frases with /frases and forgetting the UI
// for a new type fails here.
const slugs = Object.keys(exerciseFiles).map(path => path.split('/').pop()!.replace('.json', ''))

const componentByType: Record<ExerciseType, unknown> = {
  gap: ExerciseGap,
  transform: ExerciseTransform,
  choice: ExerciseChoice
}

/** Answers the exercise on screen, right or wrong, the way its type is answered. */
async function answer(page: VueWrapper, exercise: Exercise, correct: boolean) {
  if (typeOf(exercise) === 'choice') {
    const options = exercise.options!
    const wanted = correct ? exercise.solution : options.find(option => option !== exercise.solution)!
    const radio = page.findAll('[role="radio"]').find(candidate => candidate.attributes('value') === wanted)

    expect(radio, `no radio for "${wanted}"`).toBeDefined()
    await radio!.trigger('click')
  } else {
    await page.find('input').setValue(correct ? exercise.solution : 'nope')
  }

  await flushPromises()
}

describe('/frases', () => {
  it('links to every tense that has exercises', async () => {
    const page = await mountSuspended(FrasesIndex)
    const html = page.html()

    for (const slug of slugs) {
      expect(html).toContain(`href="/frases/${slug}"`)
      expect(html).toContain(tenseById(slug)!.name)
    }
  })

  it('filters the tenses by level', async () => {
    const page = await mountSuspended(FrasesIndex)
    const levelOf = (slug: string) => tenseById(slug)!.level
    const level = levelOf(slugs[0]!)

    await page.findAll('[role="radio"]').find(radio => radio.attributes('value') === level)!.trigger('click')
    await flushPromises()

    for (const slug of slugs) {
      expect(page.html().includes(`href="/frases/${slug}"`), `/frases/${slug} on level ${level}`)
        .toBe(levelOf(slug) === level)
    }
  })
})

describe.each(slugs)('/frases/%s', (slug) => {
  const drill = exercisesOf(slug)
  /** Rounds are 10 sentences long, or the whole file when it has fewer. */
  const chunks = Array.from(
    { length: Math.ceil(drill.length / roundSize) },
    (_, chunk) => drill.slice(chunk * roundSize, (chunk + 1) * roundSize)
  )

  beforeEach(() => {
    localStorage.removeItem(storageKey)
    // Pinned at the top of its range, `Math.random` makes every swap of the shuffle a swap
    // with itself: the round then comes out in file order, which is what these tests walk.
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    onTestFinished(() => vi.restoreAllMocks())
  })

  it('renders every exercise with the component of its type and scores the round', async () => {
    const size = Math.min(roundSize, drill.length)

    // A round only takes ten sentences, so the file is played in chunks: everything outside
    // the chunk is stored as reviewed and not due, which leaves the chunk as the pending part
    // and, with the shuffle pinned, as the head of the round.
    for (const chunk of chunks) {
      const future = addDays(day(), 1)

      save(Object.fromEntries(drill
        .filter(exercise => !chunk.includes(exercise))
        .map((exercise) => {
          const id = frasesItemId(exercise)

          return [id, review(undefined, id, true, future)]
        })))

      const page = await mountSuspended(TensePractice, { route: `/frases/${slug}` })
      await flushPromises()

      // Right on the even exercises, wrong on the odd ones.
      for (const [i, exercise] of chunk.entries()) {
        expect(page.text()).toContain(`Frase ${i + 1} de ${size}`)
        expect(page.text()).toContain(exercise.prompt)

        for (const type of exerciseTypes) {
          expect(page.findComponent(componentByType[type] as never).exists(), `${exercise.id} is a ${typeOf(exercise)}`)
            .toBe(type === typeOf(exercise))
        }

        const correct = i % 2 === 0
        await answer(page, exercise, correct)
        await page.find('form').trigger('submit')
        await flushPromises()

        expect(page.text()).toContain(correct ? '¡Correcto!' : 'No es esa')

        // A mistake shows the solution and a short explanation: the one of the exercise, or
        // the structure of the tense when it does not carry one.
        if (!correct) {
          expect(page.text()).toContain(exercise.solution)

          if (exercise.explanation) {
            expect(page.text()).toContain(exercise.explanation)
          } else {
            const structures = Object.values(tenseById(slug)!.structure)
            expect(structures.some(structure => page.text().includes(structure)), `${exercise.id} explained`).toBe(true)
          }
        }

        await page.find('form').trigger('submit')
        await flushPromises()
      }

      // A chunk shorter than a round is filled up with sentences already learnt: they are
      // answered right, so they do not change the mistakes of the round.
      for (let i = chunk.length; i < size; i++) {
        const filler = drill.find(candidate => page.text().includes(candidate.prompt))!

        await answer(page, filler, true)
        await page.find('form').trigger('submit')
        await flushPromises()
        await page.find('form').trigger('submit')
        await flushPromises()
      }

      const mistakes = Math.floor(chunk.length / 2)

      expect(page.text()).toContain(`Resultado: ${size - mistakes} de ${size}`)
      expect(page.findAll('ul li')).toHaveLength(mistakes)
    }
  })

  it('draws a round of at most ten sentences of the tense, without repeats', async () => {
    // No pinned shuffle here: the round is the real random draw.
    vi.restoreAllMocks()

    const page = await mountSuspended(TensePractice, { route: `/frases/${slug}` })
    await flushPromises()

    const shown: string[] = []
    const size = Math.min(roundSize, drill.length)

    for (let i = 0; i < size; i++) {
      expect(page.text()).toContain(`Frase ${i + 1} de ${size}`)

      const exercise = drill.find(candidate => page.text().includes(candidate.prompt))!

      expect(exercise, 'no se reconoce la frase en pantalla').toBeDefined()
      shown.push(exercise.id)

      await answer(page, exercise, true)
      await page.find('form').trigger('submit')
      await flushPromises()
      await page.find('form').trigger('submit')
      await flushPromises()
    }

    expect(page.text()).toContain(`Resultado: ${size} de ${size}`)
    expect(new Set(shown).size).toBe(size)
    // The hero counts the whole tense, the round counter only the round.
    expect(page.text()).toContain(`${drill.length} frases`)
  })
})

// formOf, explain and the component map live in app/utils/explain.ts once and only once: the
// two screens that correct sentences use them, /frases/<tiempo> and /repaso.
describe('explain', () => {
  const gap = (prompt: string): Exercise => ({ id: 'x', tenseId: 'present-simple', prompt, solution: 'works' })

  it('renders every type of exercise with its own component', () => {
    expect(exerciseComponents).toEqual(componentByType)
  })

  it('reads the form of the sentence when the exercise does not declare one', () => {
    expect(formOf(gap('She ___ (work) here.'))).toBe('affirmative')
    expect(formOf(gap('They ___ (not / work) here.'))).toBe('negative')
    expect(formOf(gap('___ (you / work) here?'))).toBe('interrogative')
    expect(formOf({ ...gap('She works here.'), form: 'negative' })).toBe('negative')
  })

  it('uses the same inferred form in the transform exercise', async () => {
    const page = await mountSuspended(ExerciseTransform, {
      props: {
        exercise: { ...gap('___ (you / work) here?'), type: 'transform' },
        modelValue: ''
      }
    })

    expect(page.text()).toContain('interrogativa')
  })

  it('falls back to the structure of the tense when the exercise has no explanation', () => {
    const structure = tenseById('present-simple')!.structure

    expect(explain(gap('She ___ (work) here.'))).toBe(`Afirmativa: ${structure.affirmative}`)
    expect(explain({ ...gap('She ___ (work) here.'), explanation: 'Tercera persona: -s.' })).toBe('Tercera persona: -s.')
  })

  it('leaves no dangling dot when there is nothing to explain', () => {
    // Reading questions drill no tense at all, so there is no structure to fall back on.
    const question = items.find(item => item.kind === 'reading')!

    expect(explain({ ...question, explanation: undefined })).toBe('')
    expect(correction({ ...question, explanation: undefined }))
      .toBe(`La respuesta correcta es: ${question.solution}.`)
  })
})

describe('ExerciseGap', () => {
  it('shows the slash-separated format for multiple gaps', async () => {
    const page = await mountSuspended(ExerciseGap, {
      props: {
        exercise: {
          id: 'multiple-gaps',
          tenseId: 'present-continuous',
          prompt: '___ they ___ (wait) for the doctor now?',
          solution: 'Are / waiting'
        },
        modelValue: ''
      }
    })

    const input = page.find('input')

    expect(input.attributes('placeholder')).toBe('Las dos respuestas separadas por /')
    expect(input.attributes('aria-label')).toBe('Las dos respuestas separadas por /')
    expect(page.text()).toContain('Hay dos huecos: escribe las respuestas separadas por / (por ejemplo Are / waiting).')
  })

  it('keeps the original label for a single gap', async () => {
    const page = await mountSuspended(ExerciseGap, {
      props: {
        exercise: {
          id: 'single-gap',
          tenseId: 'present-simple',
          prompt: 'She ___ (work) here.',
          solution: 'works'
        },
        modelValue: ''
      }
    })

    const input = page.find('input')

    expect(input.attributes('placeholder')).toBe('Lo que va en el hueco')
    expect(input.attributes('aria-label')).toBe('Lo que va en el hueco')
    expect(page.text()).not.toContain('separadas por /')
  })
})

describe('/frases/[tiempo]', () => {
  beforeEach(() => localStorage.removeItem(storageKey))

  // The round depends on the progress and on chance: rendering it in the prerender too would
  // ship a different sentence than the one the page hydrates with.
  it('declares loading content for the prerender before the round is drawn', () => {
    const source = readFileSync('app/pages/frases/[tiempo].vue', 'utf8')

    expect(source).toMatch(/<ClientOnly>[\s\S]*<template #fallback>[\s\S]*Cargando la ronda…[\s\S]*<\/ClientOnly>/)
    expect(source).toMatch(/onMounted\(restart\)/)
  })

  it('draws again on another round instead of repeating the same list', async () => {
    const drill = exercisesOf('present-simple')

    expect(drill.length, 'present simple ya no tiene más frases que una ronda').toBeGreaterThan(10)

    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    const first: string[] = []

    // A whole round answered right: every sentence of it moves up a box and stops being due.
    for (let i = 0; i < 10; i++) {
      const exercise = drill.find(candidate => page.text().includes(candidate.prompt))!

      first.push(exercise.id)
      await answer(page, exercise, true)
      await page.find('form').trigger('submit')
      await flushPromises()
      await page.find('form').trigger('submit')
      await flushPromises()
    }

    await page.findAll('button').find(button => button.text().includes('Otra ronda'))!.trigger('click')
    await flushPromises()

    const opener = drill.find(candidate => page.text().includes(candidate.prompt))!

    expect(page.text()).toContain('Frase 1 de 10')
    expect(first, 'la segunda ronda repite lo recién aprendido').not.toContain(opener.id)
  })

  // What was missed comes back to box 1, which is due the same day: it opens the next round,
  // ahead of everything already learnt and not due yet.
  it('brings a sentence missed today back into the next round', async () => {
    const drill = exercisesOf('present-simple')
    const missed = drill[5]!
    const future = addDays(day(), 1)

    save(Object.fromEntries(drill.map((exercise) => {
      const id = frasesItemId(exercise)

      return [id, exercise === missed ? review(undefined, id, false, day()) : review(undefined, id, true, future)]
    })))

    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    expect(page.text()).toContain('Frase 1 de 10')
    expect(page.text()).toContain(missed.prompt)
  })

  it('does not accept an empty answer', async () => {
    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Frase 1 de')
    expect(page.text()).not.toContain('No es esa')
  })

  it('404s on a tense without exercises', async () => {
    await expect(mountSuspended(TensePractice, { route: '/frases/no-existe' })).rejects.toThrow()
  })
})
