import { describe, expect, it } from 'vitest'
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
import { items } from '../app/utils/progress'

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

  it('renders every exercise with the component of its type and scores the round', async () => {
    const page = await mountSuspended(TensePractice, { route: `/frases/${slug}` })
    await flushPromises()

    // Right on the even exercises, wrong on the odd ones.
    for (const [i, exercise] of drill.entries()) {
      expect(page.text()).toContain(`Frase ${i + 1} de ${drill.length}`)
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

    const hits = Math.ceil(drill.length / 2)
    expect(page.text()).toContain(`Resultado: ${hits} de ${drill.length}`)
    expect(page.findAll('ul li')).toHaveLength(drill.length - hits)
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

describe('/frases/[tiempo]', () => {
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
