import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import Progreso from '../app/pages/progreso.vue'
import Repaso from '../app/pages/repaso.vue'
import { useProgress } from '../app/composables/useProgress'
import { exercisesOf, formLabels, tenseById, tenses } from '../app/utils/content'
import { formOf } from '../app/utils/explain'
import {
  addDays,
  clear,
  clipItemId,
  day,
  frasesItemId,
  isDue,
  items,
  itemById,
  itemsOfTense,
  load,
  merge,
  parse,
  pickRound,
  review,
  save,
  serialize,
  speakingItemId,
  storageKey,
  type Attempt,
  type Progress
} from '../app/utils/progress'
import { clips } from './fixtures/clips'

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

describe('pickRound', () => {
  const numbers = Array.from({ length: 18 }, (_, index) => index)
  /** Practised today and not due again until the day after tomorrow. */
  const reviewed = (id: number) => review(undefined, String(id), true, day())

  it('cuts the round to the size asked for, with no repeats inside it', () => {
    const round = pickRound(numbers, () => undefined, 10)

    expect(round).toHaveLength(10)
    expect(new Set(round).size).toBe(10)
    expect(round.every(number => numbers.includes(number))).toBe(true)
  })

  it('takes everything when there is less than a round', () => {
    expect(pickRound([1, 2, 3], () => undefined, 10).sort()).toEqual([1, 2, 3])
  })

  it('puts what is due today before what is not, and fills up with the rest', () => {
    // Everything is reviewed except number 7, which is the only pending one.
    const round = pickRound(numbers, number => (number === 7 ? undefined : reviewed(number)), 10)

    expect(round[0]).toBe(7)
    expect(round).toHaveLength(10)
    expect(new Set(round).size).toBe(10)
  })

  it('brings back today what was missed today', () => {
    const missed = review(undefined, '3', false, day())

    expect(isDue(missed)).toBe(true)
    expect(pickRound(numbers, number => (number === 3 ? missed : reviewed(number)), 10)[0]).toBe(3)
  })

  it('draws a different round each time', () => {
    const rounds = Array.from({ length: 10 }, () => pickRound(numbers, () => undefined, 10).join())

    expect(new Set(rounds).size, 'diez rondas idénticas').toBeGreaterThan(1)
  })

  it('keeps one item per key when asked to', () => {
    const round = pickRound(numbers, () => undefined, 10, number => String(number % 4))

    expect(round).toHaveLength(4)
    expect(new Set(round.map(number => number % 4)).size).toBe(4)
  })
})

describe('parse', () => {
  const attempt: Attempt = { id: 'x', box: 2, hits: 1, misses: 0, last: today, due: '2026-08-16' }

  it('reads back what serialize wrote', () => {
    expect(parse(serialize({ x: attempt }))).toEqual({ x: attempt })
  })

  it('reads back every attempt produced by review', () => {
    const box1 = review(undefined, 'box-1', false, today)
    const box2 = review(undefined, 'box-2', true, today)
    const box3 = review(box2, 'box-3', true, addDays(today, 2))

    const progress = { [box1.id]: box1, [box2.id]: box2, [box3.id]: box3 }

    expect(parse(serialize(progress))).toEqual(progress)
  })

  it('rejects an empty progress', () => {
    expect(() => parse('{}')).toThrow('El fichero no tiene ningún intento válido')
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

  it('drops unsafe counters and due dates that do not match the Leitner box', () => {
    const json = JSON.stringify({
      valid: { ...attempt, id: 'valid' },
      unsafeHits: { ...attempt, id: 'unsafeHits', hits: Number.MAX_SAFE_INTEGER + 1 },
      unsafeMisses: { ...attempt, id: 'unsafeMisses', misses: Number.MAX_SAFE_INTEGER + 1 },
      box1: { ...attempt, id: 'box1', box: 1, due: addDays(today, 1) },
      box2: { ...attempt, id: 'box2', box: 2, due: addDays(today, 1) },
      box3: { ...attempt, id: 'box3', box: 3, due: addDays(today, 2) }
    })

    expect(Object.keys(parse(json))).toEqual(['valid'])
  })

  it('rejects a file containing only impossible Leitner states', () => {
    const json = JSON.stringify({
      unsafe: { ...attempt, id: 'unsafe', hits: Number.MAX_SAFE_INTEGER + 1 },
      wrongDue: { ...attempt, id: 'wrongDue', box: 3, due: addDays(today, 2) }
    })

    expect(() => parse(json)).toThrow('El fichero no tiene ningún intento válido')
  })

  it('keeps zeroed counters and a review due the same day', () => {
    const json = JSON.stringify({
      x: { ...attempt, box: 1, hits: 0, misses: 0, due: attempt.last }
    })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  it('keeps a leap day, which does exist', () => {
    const json = JSON.stringify({ x: { ...attempt, box: 1, last: '2024-02-29', due: '2024-02-29' } })

    expect(Object.keys(parse(json))).toEqual(['x'])
  })

  it('keeps attempts up to tomorrow and drops later dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${today}T12:00:00Z`))
    onTestFinished(() => vi.useRealTimers())

    const json = JSON.stringify({
      today: { ...attempt, id: 'today', last: today, due: addDays(today, 2) },
      yesterday: { ...attempt, id: 'yesterday', last: addDays(today, -1), due: addDays(today, 1) },
      tomorrow: { ...attempt, id: 'tomorrow', last: addDays(today, 1), due: addDays(today, 3) },
      future: { ...attempt, id: 'future', last: addDays(today, 2), due: addDays(today, 4) }
    })

    expect(Object.keys(parse(json))).toEqual(['today', 'yesterday', 'tomorrow'])
  })

  it('rejects a file containing only attempts dated after tomorrow', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${today}T12:00:00Z`))
    onTestFinished(() => vi.useRealTimers())

    const future = { ...attempt, last: addDays(today, 2), due: addDays(today, 3) }

    expect(() => parse(JSON.stringify({ x: future }))).toThrow('El fichero no tiene ningún intento válido')
  })

  it('rejects what is not an exported progress', () => {
    expect(() => parse('[]')).toThrow()
    expect(() => parse('null')).toThrow()
    expect(() => parse(JSON.stringify({ x: 'nope' }))).toThrow()
    expect(() => parse('not json')).toThrow()
  })
})

describe('merge', () => {
  const current: Attempt = { id: 'x', box: 1, hits: 1, misses: 0, last: today, due: today }

  it('keeps current attempts and adds imported ids', () => {
    const imported: Attempt = { id: 'y', box: 2, hits: 1, misses: 0, last: today, due: '2026-08-16' }

    expect(merge({ x: current }, { y: imported })).toEqual({ x: current, y: imported })
  })

  it('chooses the latest attempt and breaks equal dates by total answers', () => {
    const newer: Attempt = { ...current, box: 2, hits: 2, last: '2026-08-15', due: '2026-08-17' }
    const moreAnswers: Attempt = { ...current, hits: 2, misses: 1 }

    expect(merge({ x: current }, { x: newer }).x).toEqual(newer)
    expect(merge({ x: current }, { x: moreAnswers }).x).toEqual(moreAnswers)
  })

  it('is idempotent when importing the same progress twice', () => {
    const imported = { x: { ...current, hits: 2, last: '2026-08-15', due: '2026-08-17' } }

    expect(merge(merge({}, imported), imported)).toEqual(imported)
  })
})

describe('load and save', () => {
  // Only the progress key: clearing the whole localStorage would wipe unrelated state
  // (the colour mode, for one) that other tests in this run rely on.
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

    expect(save({ x: attempt })).toBe(true)

    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ x: attempt })
  })

  it('starts from scratch when what is stored is not readable', () => {
    localStorage.setItem(storageKey, '{ broken')

    expect(load()).toEqual({})
  })

  // With full storage, or in Safari private mode, setItem throws. It saves on every answer,
  // so letting the exception bubble up would leave the round dead halfway through.
  it('reports when the browser refuses to store the progress', () => {
    const setItem = refuseToStore()

    expect(save({ x: review(undefined, 'x', true, today) })).toBe(false)
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

async function progressSession() {
  let session!: ReturnType<typeof useProgress>
  const Harness = defineComponent({
    setup() {
      session = useProgress()
      return () => null
    }
  })
  const page = await mountSuspended(Harness)

  await flushPromises()
  onTestFinished(() => {
    session.reset()
    page.unmount()
  })

  return session
}

describe('volatile progress', () => {
  beforeEach(async () => {
    localStorage.removeItem(storageKey)

    // The composable is a session singleton, so also clear memory left by the preceding test.
    const session = await progressSession()

    session.reset()
  })

  it('keeps consecutive answers in memory and includes them in the session export', async () => {
    const session = await progressSession()

    refuseToStore()
    session.record('x', true)
    session.record('y', false)

    expect(session.attemptOf('x')).toMatchObject({ hits: 1, misses: 0 })
    expect(session.attemptOf('y')).toMatchObject({ hits: 0, misses: 1 })

    let exported!: Blob

    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exported = blob
      return 'blob:progress'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    session.exportFile()

    expect(Object.keys(parse(await exported.text()))).toEqual(['x', 'y'])
  })

  it('keeps accumulating answers to the same exercise while writes fail', async () => {
    const session = await progressSession()

    refuseToStore()
    session.record('x', true)
    session.record('x', false)

    expect(session.attemptOf('x')).toMatchObject({ hits: 1, misses: 1 })
  })

  it('keeps an imported attempt when the import and next answer cannot be stored', async () => {
    const session = await progressSession()
    const imported = review(undefined, 'x', false, today)

    refuseToStore()
    await session.importFile(new File([serialize({ x: imported })], 'progress.json'))
    session.record('y', true)

    expect(session.attemptOf('x')).toEqual(imported)
    expect(session.attemptOf('y')).toMatchObject({ hits: 1, misses: 0 })
  })

  it('does not change existing progress when an import has no valid attempts', async () => {
    const session = await progressSession()

    session.record('x', false)
    const existing = session.attemptOf('x')!
    const invalid = { ...existing, hits: Number.MAX_SAFE_INTEGER + 1 }

    await expect(session.importFile(new File([serialize({ x: invalid })], 'progress.json')))
      .rejects.toThrow('El fichero no tiene ningún intento válido')

    expect(session.attemptOf('x')).toEqual(existing)
    expect(load()).toEqual({ x: existing })
  })

  it('persists volatile progress with newer stored attempts when storage recovers', async () => {
    const session = await progressSession()
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('exceeded the quota', 'QuotaExceededError')
    })

    onTestFinished(() => setItem.mockRestore())
    session.record('x', true)
    expect(session.persistenceFailed.value).toBe(true)

    const elsewhere = review(undefined, 'y', false, today)

    localStorage.setItem(storageKey, serialize({ y: elsewhere }))
    session.record('z', true)

    expect(load()).toEqual({ x: session.attemptOf('x')!, y: elsewhere, z: session.attemptOf('z')! })
    expect(session.persistenceFailed.value).toBe(false)
  })

  it('does not resurrect volatile attempts after another tab resets progress', async () => {
    const session = await progressSession()
    const setItem = refuseToStore()

    session.record('x', true)
    setItem.mockRestore()
    localStorage.removeItem(storageKey)
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: null }))
    session.record('y', true)

    expect(Object.keys(load())).toEqual(['y'])
  })

  it('shows an accessible warning with a link to the JSON export', async () => {
    const session = await progressSession()

    refuseToStore()
    session.record('x', true)

    const page = await mountSuspended(Progreso)

    await flushPromises()
    onTestFinished(() => page.unmount())

    const warning = page.find('[role="status"]')

    expect(warning.text()).toContain('no se guardará al recargar')
    expect(warning.find('a').attributes('href')).toBe('#exportar-progreso')
  })
})

describe('several tabs', () => {
  const exercise = exercisesOf('present-simple')[0]!
  const id = frasesItemId(exercise)

  beforeEach(() => {
    localStorage.removeItem(storageKey)
    // The round comes out in file order, so the sentence on screen is the one answered here.
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    onTestFinished(() => vi.restoreAllMocks())
  })

  it('listens once for the whole app and stops when the last page goes away', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')

    const first = await mountSuspended(Progreso)
    const second = await practise()
    await flushPromises()

    const storageListeners = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'storage').length

    expect(storageListeners(add)).toBe(1)
    expect(storageListeners(remove)).toBe(0)

    first.unmount()
    expect(storageListeners(remove)).toBe(0)

    second.unmount()
    expect(storageListeners(remove)).toBe(1)

    // And it is registered again by the next page, not left deaf for the rest of the session.
    const back = await mountSuspended(Progreso)
    await flushPromises()

    expect(storageListeners(add)).toBe(2)

    otherTabSaves({ [id]: review(undefined, id, false, today) })
    await flushPromises()

    expect(back.text()).toContain(`1 de ${items().length} ejercicios practicados`)
  })

  /** What another tab writing progress looks like from this one: the storage and its event. */
  function otherTabSaves(progress: Progress | null) {
    if (progress) {
      save(progress)
    } else {
      clear()
    }

    window.dispatchEvent(new StorageEvent('storage', {
      key: storageKey,
      newValue: progress && serialize(progress),
      storageArea: localStorage
    }))
  }

  /** Answers the first sentence of /frases/present-simple right, as the learner would. */
  async function practise() {
    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()

    return page
  }

  // The bug: each answer saved the whole progress from the snapshot loaded on mount, so the
  // last tab to answer wiped whatever the other one had stored in the meantime.
  it('keeps what another tab saved while this one was open', async () => {
    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    // The other tab answers a different exercise, and this one is not told about it.
    const elsewhere = review(undefined, 'verbos:go:past', true, today)

    save({ [elsewhere.id]: elsewhere })

    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(load()).toEqual({ [elsewhere.id]: elsewhere, [id]: load()[id] })
    expect(load()[id]).toMatchObject({ box: 2, hits: 1 })
  })

  it('updates the stats and the review queue when another tab saves', async () => {
    const page = await mountSuspended(Progreso)
    await flushPromises()

    expect(page.text()).toContain(`0 de ${items().length} ejercicios practicados`)

    otherTabSaves({ [id]: review(undefined, id, false, today) })
    await flushPromises()

    expect(page.text()).toContain(`1 de ${items().length} ejercicios practicados`)
    expect(page.text()).toContain('Repasar hoy (1)')
    expect(page.text()).toContain(exercise.prompt)
  })

  it('ignores what other keys of the storage do', async () => {
    const attempt = review(undefined, id, false, today)

    save({ [id]: attempt })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    localStorage.setItem('ingles:otra-cosa', 'x')
    window.dispatchEvent(new StorageEvent('storage', { key: 'ingles:otra-cosa', newValue: 'x' }))
    await flushPromises()

    expect(page.text()).toContain(`1 de ${items().length} ejercicios practicados`)
  })

  it('imports without dropping what another tab saved in the meantime', async () => {
    const imported = review(undefined, 'y', true, today)

    const page = await mountSuspended(Progreso)
    await flushPromises()

    // Answered in the other tab after this one loaded: importing must not undo it.
    const elsewhere = review(undefined, 'x', false, today)

    save({ x: elsewhere })

    const input = page.find<HTMLInputElement>('input[type="file"]')
    const file = new File([serialize({ y: imported })], 'progress.json', { type: 'application/json' })

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(page.text()).toContain('Importados 1 intentos, 1 nuevos')
    expect(load()).toEqual({ x: elsewhere, y: imported })
  })

  it('empties the open tabs when one of them resets', async () => {
    save({ [id]: review(undefined, id, false, today) })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    expect(page.text()).toContain(`1 de ${items().length} ejercicios practicados`)

    otherTabSaves(null)
    await flushPromises()

    expect(load()).toEqual({})
    expect(page.text()).toContain(`0 de ${items().length} ejercicios practicados`)
    expect(page.text()).not.toContain('Repasar hoy (1)')
  })

  // Even if this tab never hears about the reset, answering rebuilds the progress from what
  // is stored: it saves its own attempt without restoring the ones that were wiped.
  it('does not bring back the wiped attempts when a stale tab answers after a reset', async () => {
    save({ x: review(undefined, 'x', false, today) })

    const page = await mountSuspended(TensePractice, { route: '/frases/present-simple' })
    await flushPromises()

    // The other tab resets and the notification never arrives here.
    clear()

    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(Object.keys(load())).toEqual([id])
  })
})

describe('practising', () => {
  const exercise = exercisesOf('present-simple')[0]!

  beforeEach(async () => {
    localStorage.removeItem(storageKey)
    const session = await progressSession()

    session.reset()
    // The round is drawn at random. Pinned at the top of its range, `Math.random` makes every
    // swap of the shuffle a swap with itself, so the round comes out in file order and the
    // first sentence on screen is the first of the file, which is the one these tests answer.
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    onTestFinished(() => vi.restoreAllMocks())
  })

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
    expect(page.text()).toContain('Para repasar')
    expect(page.text()).toContain(exercise.prompt)
    expect(page.text()).toContain(exercise.solution)
    expect(page.find('a[href="/teoria/present-simple"]').attributes('lang')).toBe('en')

    const again = page.findAll('button').find(button => button.text().includes('Otra ronda'))

    expect(again, 'no hay botón de otra ronda').toBeDefined()
    await again!.trigger('click')
    await flushPromises()

    expect(page.text()).toContain('Ejercicio 1 de 1')
    expect(page.text()).toContain(exercise.prompt)

    // A right answer on the same day keeps the item in box 1, so another round remains useful.
    await play(true)

    expect(page.text()).toContain('Repaso terminado: 1 de 1')
    expect(page.text()).not.toContain('Para repasar')
    expect(page.findAll('button').some(button => button.text().includes('Otra ronda'))).toBe(true)
  })

  // A speaking attempt due today cannot fill another round: it never enters the shared queue.
  it('does not offer another round when only speaking is left pending', async () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!
    const speaking = speakingItemId(tense, example)
    const frasesId = frasesItemId(exercise)

    // A miss from yesterday: today's hit is the first one, so it clears the box for good
    // instead of the same-day cap that keeps a same-day correction still due.
    save({
      [frasesId]: review(undefined, frasesId, false, addDays(today, -1)),
      [speaking]: review(undefined, speaking, false, today)
    })

    const page = await mountSuspended(Repaso)
    await flushPromises()

    expect(page.text()).toContain('Ejercicio 1 de 1')

    await page.find('input').setValue(exercise.solution)
    await page.find('form').trigger('submit')
    await flushPromises()
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Repaso terminado: 1 de 1')
    expect(page.findAll('button').some(button => button.text().includes('Otra ronda'))).toBe(false)
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

    expect(page.text()).toContain(`1 de ${items().length} ejercicios practicados`)
    expect(page.text()).toContain('Repasar hoy (1)')
    expect(page.text()).toContain(exercise.prompt)
    expect(page.text()).toContain(exercise.solution)
    // Practised / hits / misses / mastered / due: one exercise, one miss, and it is due today.
    const row = page.findAll('tbody tr').find(candidate => candidate.text().startsWith('Present Simple'))!

    expect(row.text()).toBe(`Present Simple1 / ${itemsOfTense('present-simple').length}0101`)
  })

  it('loads clip content before showing failed clips', async () => {
    const clip = clips[0]!
    const exercise = clip.exercises[0]!
    const id = clipItemId(clip, exercise)

    save({ [id]: review(undefined, id, false, today) })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    await vi.waitFor(() => {
      expect(page.text()).toContain(exercise.prompt)
      expect(page.text()).toContain(exercise.solution)
    })
  })

  it('reports imported attempts and keeps existing progress', async () => {
    const existing = review(undefined, 'x', false, today)
    const imported = review(undefined, 'y', true, today)

    save({ x: existing })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    const input = page.find<HTMLInputElement>('input[type="file"]')
    const file = new File([serialize({ y: imported })], 'progress.json', { type: 'application/json' })

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(page.text()).toContain('Importados 1 intentos, 1 nuevos')
    expect(load()).toEqual({ x: existing, y: imported })
  })

  it('ignores a future import and keeps the exercise in /repaso', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${today}T12:00:00Z`))
    onTestFinished(() => vi.useRealTimers())

    const id = frasesItemId(exercise)
    const existing = review(undefined, id, false, today)
    const future = { ...existing, last: addDays(today, 2), due: addDays(today, 2) }

    save({ [id]: existing })

    const progress = await mountSuspended(Progreso)
    await flushPromises()

    const input = progress.find<HTMLInputElement>('input[type="file"]')
    const file = new File([serialize({ [id]: future })], 'future.json', { type: 'application/json' })

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(load()).toEqual({ [id]: existing })

    const reviewPage = await mountSuspended(Repaso)
    await flushPromises()

    expect(reviewPage.text()).toContain(exercise.prompt)
  })

  it('keeps speaking attempts out of the shared review queue', async () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!
    const id = speakingItemId(tense, example)

    save({ [id]: review(undefined, id, false, today) })

    const page = await mountSuspended(Repaso)
    await flushPromises()

    expect(page.text()).toContain('Hoy no toca repasar nada')
    expect(page.text()).not.toContain('Ejercicio 1 de 1')
  })

  it('shows nothing to review on /progreso when only speaking is due', async () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!
    const id = speakingItemId(tense, example)

    save({ [id]: review(undefined, id, false, today) })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    expect(page.text()).toContain('Nada que repasar hoy')

    const link = page.findAll('a').find(a => a.text().includes('Nada que repasar hoy'))

    expect(link?.attributes('aria-disabled')).toBe('true')
  })

  it('rejects an empty import without changing saved progress', async () => {
    const existing = review(undefined, 'x', false, today)

    save({ x: existing })

    const page = await mountSuspended(Progreso)
    await flushPromises()

    const input = page.find<HTMLInputElement>('input[type="file"]')
    const file = new File(['{}'], 'empty.json', { type: 'application/json' })

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await flushPromises()

    expect(page.text()).toContain('El fichero no tiene ningún intento válido')
    expect(load()).toEqual({ x: existing })
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
    const ids = items().map(item => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(items().map(item => item.kind))).toEqual(new Set(['frases', 'verbos', 'reading', 'clips', 'speaking']))
    expect(items().filter(item => item.kind === 'speaking')).toHaveLength(312)
    expect(items().filter(item => item.kind === 'speaking').every(item => item.tenseId !== '')).toBe(true)
  })

  it('finds back the exercise of a stored attempt', () => {
    const attempt = review(undefined, 'verbos:go:past', false, today)

    expect(itemById(attempt.id)?.solution).toBe('went')
    expect(itemById('verbos:go:third')?.solution).toBe('goes')
    expect(itemById('frases:does-not-exist')).toBeUndefined()
  })

  it('finds a speaking example by its tense and sentence', () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!

    expect(itemById(speakingItemId(tense, example))).toMatchObject({
      kind: 'speaking',
      tenseId: tense.id,
      solution: example.en
    })
  })
})
