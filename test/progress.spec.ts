import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import Progreso from '../app/pages/progreso.vue'
import Repaso from '../app/pages/repaso.vue'
import { exercisesOf, formLabels, tenseById } from '../app/utils/content'
import { formOf } from '../app/utils/explain'
import {
  addDays,
  frasesItemId,
  isDue,
  items,
  itemById,
  itemsOfTense,
  load,
  parse,
  review,
  save,
  serialize,
  storageKey,
  type Attempt
} from '../app/utils/progress'

const today = '2026-08-14'

describe('review', () => {
  it('starts a new item in box 2 when it is answered right', () => {
    const attempt = review(undefined, 'frases:present-simple-001', true, today)

    expect(attempt).toEqual({
      id: 'frases:present-simple-001',
      box: 2,
      hits: 1,
      misses: 0,
      last: today,
      due: '2026-08-16'
    })
  })

  it('promotes one box at a time and stops at the third', () => {
    const first = review(undefined, 'x', true, today)
    const second = review(first, 'x', true, addDays(today, 2))
    const third = review(second, 'x', true, addDays(today, 7))

    expect([first.box, second.box, third.box]).toEqual([2, 3, 3])
    expect(second.due).toBe(addDays(addDays(today, 2), 7))
    expect(third.hits).toBe(3)
  })

  it('promotes only once per day and keeps counting the hits', () => {
    const first = review(undefined, 'x', true, today)
    const second = review(first, 'x', true, today)
    const third = review(second, 'x', true, addDays(today, 1))

    expect(second).toMatchObject({ box: 2, hits: 2, due: addDays(today, 2) })
    expect(third).toMatchObject({ box: 3, hits: 3 })
  })

  it('sends a failed item back to the first box, due the same day', () => {
    const mastered = review(review(undefined, 'x', true, today), 'x', true, addDays(today, 2))
    const failed = review(mastered, 'x', false, today)

    expect(mastered.box).toBe(3)
    expect(failed.box).toBe(1)
    expect(failed.due).toBe(today)
    expect(failed.misses).toBe(1)
    // The right answers are not forgotten, only the box goes back.
    expect(failed.hits).toBe(mastered.hits)
  })

  it('keeps a failed item in the review queue and a right one out of it', () => {
    expect(isDue(review(undefined, 'x', false, today), today)).toBe(true)
    expect(isDue(review(undefined, 'x', true, today), today)).toBe(false)
  })

  it('brings an item back once its date arrives', () => {
    const attempt = review(undefined, 'x', true, today)

    expect(isDue(attempt, addDays(today, 1))).toBe(false)
    expect(isDue(attempt, addDays(today, 2))).toBe(true)
  })
})

describe('addDays', () => {
  it('counts calendar days across months and years', () => {
    expect(addDays('2026-08-14', 0)).toBe('2026-08-14')
    expect(addDays('2026-08-30', 7)).toBe('2026-09-06')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    // Spring forward in Europe: a day is still a day.
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29')
  })
})

describe('parse', () => {
  const attempt: Attempt = { id: 'x', box: 2, hits: 1, misses: 0, last: today, due: '2026-08-16' }

  it('reads back what serialize wrote', () => {
    expect(parse(serialize({ x: attempt }))).toEqual({ x: attempt })
  })

  it('accepts an empty progress', () => {
    expect(parse('{}')).toEqual({})
  })

  it('drops the entries that are not attempts', () => {
    const json = JSON.stringify({
      x: attempt,
      y: { id: 'y', box: 9, hits: 1, misses: 0, last: today, due: today },
      z: { id: 'z', box: 1, hits: 1, misses: 0, last: 'ayer', due: today },
      w: 'nope',
      // The date has the right shape but does not exist: it would keep the item out of the
      // queue forever, because dates are compared as text.
      u: { id: 'u', box: 1, hits: 1, misses: 0, last: today, due: '2026-13-45' },
      // February 30th does not exist either, and `Date` does not reject it: it overflows to
      // March 2nd, so the stored date would not be the one that was imported.
      t: { id: 't', box: 1, hits: 1, misses: 0, last: today, due: '2026-02-30' },
      // The key has to match the id inside, or the item could never be found again.
      v: { ...attempt }
    })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  // No progress exported by the site can hold these, and they would show up on /progreso as
  // negative or fractional statistics, or as an item due before it was ever practised.
  it('drops impossible counters, empty ids and a review due before the practice', () => {
    const json = JSON.stringify({
      'x': attempt,
      'a': { ...attempt, id: 'a', hits: -4 },
      'b': { ...attempt, id: 'b', misses: -1 },
      'c': { ...attempt, id: 'c', hits: 1.5 },
      'd': { ...attempt, id: 'd', misses: Number.NaN },
      'e': { ...attempt, id: 'e', hits: Number.POSITIVE_INFINITY },
      'f': { ...attempt, id: 'f', due: '2026-08-13' },
      '': { ...attempt, id: '' }
    })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  it('keeps zeroed counters and a review due the same day', () => {
    const json = JSON.stringify({
      x: { ...attempt, hits: 0, misses: 0, due: attempt.last }
    })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  it('keeps a leap day, which does exist', () => {
    const json = JSON.stringify({ x: { ...attempt, last: '2024-02-29', due: '2024-02-29' } })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  it('rejects what is not an exported progress', () => {
    expect(() => parse('[]')).toThrow()
    expect(() => parse('null')).toThrow()
    expect(() => parse(JSON.stringify({ x: 'nope' }))).toThrow()
    expect(() => parse('not json')).toThrow()
  })
})

describe('load and save', () => {
  // Progress only: localStorage also holds the session, and without it the global middleware
  // would send you to /login instead of mounting the page.
  beforeEach(() => localStorage.removeItem(storageKey))

  it('survives a reload: what was failed is still due', () => {
    const failed = review(undefined, 'frases:present-simple-001', false, today)

    save({ [failed.id]: failed })

    const stored = load()

    expect(stored).toEqual({ [failed.id]: failed })
    expect(Object.values(stored).filter(attempt => isDue(attempt, today)).map(attempt => attempt.id))
      .toEqual(['frases:present-simple-001'])
  })

  it('serializes the progress as plain JSON under a single key', () => {
    const attempt = review(undefined, 'x', true, today)

    save({ x: attempt })

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ x: attempt })
  })

  it('starts from scratch when what is stored is not readable', () => {
    localStorage.setItem(storageKey, '{ broken')

    expect(load()).toEqual({})
  })

  // With full storage, or in Safari private mode, setItem throws. It saves on every answer,
  // so letting the exception bubble up would leave the round dead halfway through.
  it('does not throw when the browser refuses to store the progress', () => {
    const setItem = refuseToStore()

    expect(() => save({ x: review(undefined, 'x', true, today) })).not.toThrow()
    expect(setItem).toHaveBeenCalled()
  })

  // A browser that blocks the storage of the site throws on reading too, and `load` runs in
  // the `onMounted` of every page that shows progress: it degrades to an empty progress
  // instead of leaving them all blank.
  it('starts empty when the browser blocks reading the storage', () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('the storage of this site is blocked', 'SecurityError')
    })

    onTestFinished(() => getItem.mockRestore())

    expect(load()).toEqual({})
    expect(getItem).toHaveBeenCalled()
  })
})

/**
 * Full storage, or Safari private mode: setItem throws on every answer. It is undone when the
 * test ends, whatever happens, or the rest would be left unable to save.
 */
function refuseToStore() {
  const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('exceeded the quota', 'QuotaExceededError')
  })

  onTestFinished(() => setItem.mockRestore())

  return setItem
}

describe('practising', () => {
  const exercise = exercisesOf('present-simple')[0]!

  beforeEach(() => localStorage.removeItem(storageKey))

  /** Answers the first sentence of /frases/present-simple wrong, as the learner would. */
  async function fail() {
    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    await page.find('input').setValue('nope')
    await page.find('form').trigger('submit')
    await flushPromises()
  }

  it('leaves a failed exercise in the review queue, reload included', async () => {
    await fail()

    // What survives the reload is the localStorage, so that is what is checked.
    const stored = load()[frasesItemId(exercise)]!

    expect(stored).toMatchObject({ box: 1, hits: 0, misses: 1 })
    expect(isDue(stored)).toBe(true)
  })

  it('keeps a correctly reviewed item pending on the same day', async () => {
    await fail()

    const page = await mountSuspended(Repaso)
    await flushPromises()

    expect(page.text()).toContain('Ejercicio 1 de 1')
    expect(page.text()).toContain(exercise.prompt)

    // Getting it right now empties the queue: the item moves to the second box.
    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(load()[frasesItemId(exercise)]!.box).toBe(1)

    const stillPending = await mountSuspended(Repaso)
    await flushPromises()

    expect(stillPending.text()).toContain('Ejercicio 1 de 1')
  })

  // A miss sends the exercise back to today's queue, and until now the only way to get back
  // to it was reloading the page by hand.
  it('starts another round with what is still pending, and only then', async () => {
    await fail()

    const page = await mountSuspended(Repaso)
    await flushPromises()

    /** Answers the exercise on screen right or wrong and moves on to the next one. */
    async function play(correct: boolean) {
      await page.find('input').setValue(correct ? exercise.solution : 'nope')
      await page.find('form').trigger('submit')
      await flushPromises()
      await page.find('form').trigger('submit')
      await flushPromises()
    }

    await play(false)

    expect(page.text()).toContain('Repaso terminado: 0 de 1')

    const again = page.findAll('button').find(button => button.text().includes('Otra ronda'))

    expect(again, 'no hay botón de otra ronda').toBeDefined()
    await again!.trigger('click')
    await flushPromises()

    expect(page.text()).toContain('Ejercicio 1 de 1')
    expect(page.text()).toContain(exercise.prompt)

    // A right answer on the same day keeps the item in box 1, so another round remains useful.
    await play(true)

    expect(page.text()).toContain('Repaso terminado: 1 de 1')
    expect(page.findAll('button').some(button => button.text().includes('Otra ronda'))).toBe(true)
  })

  // Saving is the only thing that can fail for outside reasons, and it saves on every answer.
  it('corrects and carries on when the progress cannot be stored', async () => {
    refuseToStore()

    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('¡Correcto!')

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Frase 2 de')
  })

  // The same correction as /frases: with no explanation, the structure of the tense.
  it('explains a mistake the way /frases does', async () => {
    await fail()

    const page = await mountSuspended(Repaso)
    await flushPromises()

    await page.find('input').setValue('nope')
    await page.find('form').trigger('submit')
    await flushPromises()

    const structure = tenseById('present-simple')!.structure[formOf(exercise)]

    expect(exercise.explanation, 'la frase de prueba ya trae explicación').toBeUndefined()
    expect(page.text()).toContain(`La respuesta correcta es: ${exercise.solution}. ${formLabels[formOf(exercise)]}: ${structure}`)
    // With no explanation, the solution showed up with a stray period trailing behind.
    expect(page.text()).not.toContain(`${exercise.solution}. .`)
  })

  it('shows on /progreso what has been practised', async () => {
    await fail()

    const page = await mountSuspended(Progreso)
    await flushPromises()

    expect(page.text()).toContain(`1 de ${items.length} ejercicios practicados`)
    expect(page.text()).toContain('Repasar hoy (1)')
    expect(page.text()).toContain(exercise.prompt)
    expect(page.text()).toContain(exercise.solution)
    // Practised / hits / misses / mastered / due: one exercise, one miss, and it is due today.
    const row = page.findAll('tbody tr').find(candidate => candidate.text().startsWith('Present Simple'))!

    expect(row.text()).toBe(`Present Simple1 / ${itemsOfTense('present-simple').length}0101`)
  })

  it('only resets progress after confirmation', async () => {
    const attempt = review(undefined, 'x', false, today)

    save({ x: attempt })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    const resetButton = page.findAll('button').find(button => button.text().trim() === 'Reiniciar')!

    await resetButton.trigger('click')
    await flushPromises()

    expect(page.text()).toContain('¿Reiniciar progreso?')

    const cancel = page.findAll('button').find(button => button.text().trim() === 'Cancelar')!

    await cancel.trigger('click')
    await flushPromises()
    expect(load()).toEqual({ x: attempt })

    await resetButton.trigger('click')
    await flushPromises()

    const confirm = page.findAll('button').find(button => button.text().trim() === 'Sí, reiniciar')!

    await confirm.trigger('click')
    expect(load()).toEqual({})
  })
})

describe('items', () => {
  it('gives every exercise of every section a unique id', () => {
    const ids = items.map(item => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(items.map(item => item.kind))).toEqual(new Set(['frases', 'verbos', 'reading']))
  })

  it('finds back the exercise of a stored attempt', () => {
    const attempt = review(undefined, 'verbos:go:past', false, today)

    expect(itemById(attempt.id)?.solution).toBe('went')
    expect(itemById('verbos:go:third')?.solution).toBe('goes')
    expect(itemById('frases:does-not-exist')).toBeUndefined()
  })
})
