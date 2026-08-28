import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, onUnmounted } from 'vue'
import ClipsIndex from '../app/pages/clips/index.vue'
import ClipsPractice from '../app/pages/clips/practica.vue'
import { clipFiles, clips, levels, tenses } from '../app/utils/content'
import { gapCount, normalize } from '../app/utils/check'
import { clipItemId, day, items, load, review, save, storageKey } from '../app/utils/progress'
import { loadUnavailable, saveUnavailable, unavailableKey } from '../app/utils/unavailable'
import { useProgress } from '../app/composables/useProgress'

// Guards content/clips/ and the pages that play it: a window that does not last, a gap that
// does not fill back into the sentence, or a tense nobody teaches fails here.

/** Clips per round on /clips/practica. */
const roundSize = 10

const duplicates = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i)

function expectText(value: unknown, label: string) {
  expect(typeof value, `${label} must be a string`).toBe('string')
  expect((value as string).trim(), `${label} must not be empty`).not.toBe('')
}

// The iframe is never mounted in the tests: the API script only loads in a real browser, and
// what matters here is what the page does around it, including when it reports a dead video.
let playerMounts = 0
let playerUnmounts = 0

const stubs = {
  ClipPlayer: defineComponent({
    name: 'ClipPlayer',
    emits: ['unavailable'],
    setup() {
      playerMounts += 1
      onUnmounted(() => playerUnmounts += 1)
    },
    template: '<div data-testid="player" />'
  })
}

describe('content/clips', () => {
  it('has unique ids across every file', () => {
    expect(clips).toHaveLength(Object.values(clipFiles).flat().length)
    expect(duplicates(clips.map(clip => clip.id))).toEqual([])
  })

  describe.each(clips.map(clip => [clip.id, clip] as const))('%s', (_id, clip) => {
    // The id is derived, not assigned: ingesting the same source again has to produce the same
    // ids, or the attempts stored in localStorage would point at the wrong clips.
    it('is named after its video and its start', () => {
      expect(clip.videoId, 'videoId must be a YouTube id').toMatch(/^[\w-]{11}$/)
      expect(clip.id).toBe(`${clip.videoId}:${clip.startMs}`)
    })

    it('plays a window that lasts', () => {
      expect(Number.isInteger(clip.startMs) && clip.startMs >= 0, 'startMs').toBe(true)
      expect(clip.endMs).toBeGreaterThan(clip.startMs)
      // A whole scene is not a clip: one sentence, a few seconds of it.
      expect(clip.endMs - clip.startMs).toBeLessThanOrEqual(15_000)
    })

    it('has the required fields', () => {
      expectText(clip.text, 'text')
      expectText(clip.channel, 'channel')
      expect(levels).toContain(clip.level)
      expect(clip.exercises.length, 'a clip with no exercise cannot be studied').toBeGreaterThan(0)
      expect(duplicates(clip.exercises.map(exercise => exercise.id))).toEqual([])
    })

    // The invariant the whole section rests on: what the gap asks is what is said in the clip.
    // Compared after `normalize`, the same way an answer is corrected, so a contraction in the
    // captions ("We're") does not fight the full form in the solution ("are").
    it('fills every gap back into the sentence', () => {
      for (const exercise of clip.exercises) {
        expectText(exercise.solution, `${exercise.id}.solution`)
        expect(exercise.prompt, `${exercise.id}.prompt needs a ___ gap`).toContain('___')
        expect(normalize(exercise.prompt.replace('___', exercise.solution))).toBe(normalize(clip.text))
      }
    })

    // An expression gap drills no particular tense and says so with an empty tenseId, like the
    // reading questions. Anything else has to be a tense the site actually teaches.
    it('drills a tense that exists, or none at all', () => {
      for (const exercise of clip.exercises) {
        if (exercise.tenseId !== '') {
          expect(tenses.map(tense => tense.id), `${exercise.id}.tenseId`).toContain(exercise.tenseId)
        }
      }
    })

    // #94: a prompt with two ___ needs a solution with two slash-separated parts, or checkExercise
    // grades against the wrong gap count and a half-right answer is marked correct.
    it('has as many solution parts as gaps in its prompt', () => {
      for (const exercise of clip.exercises) {
        const gaps = gapCount(exercise.prompt)
        const parts = gaps > 1 ? exercise.solution.split(/\s*\/\s*/) : [exercise.solution]

        expect(parts.length, `${exercise.id}: ${gaps} gap(s) but solution "${exercise.solution}"`).toBe(gaps)
      }
    })
  })
})

describe('the review queue', () => {
  it('carries every clip gap, with its clip', () => {
    const clipItems = items.filter(item => item.kind === 'clips')

    expect(clipItems).toHaveLength(clips.flatMap(clip => clip.exercises).length)

    for (const item of clipItems) {
      // /repaso plays the video before asking, so the item has to know where it came from.
      expect(item.clip, `${item.id} must carry its clip`).toBeDefined()
      expect(item.id, 'the id has to name the clip it belongs to').toContain(`clips:${item.clip!.id}:`)
    }
  })

  // A dead video cannot be replayed, so its due gap must not promise a review /repaso can't ask.
  it('drops a due exercise from the queue once its clip is marked unavailable', async () => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(unavailableKey)
    onTestFinished(() => {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(unavailableKey)
    })

    const clip = clips[0]!
    const exercise = clip.exercises[0]!
    const id = clipItemId(clip, exercise)

    save({ [id]: review(undefined, id, false, day()) })
    saveUnavailable([clip.videoId])

    let session!: ReturnType<typeof useProgress>
    const Harness = defineComponent({
      setup() {
        session = useProgress()
        return () => null
      }
    })

    await mountSuspended(Harness)
    await flushPromises()

    expect(session.pending.value.some(item => item.id === id)).toBe(false)
  })
})

describe('/clips', () => {
  it('renders the initial batch and reports the filtered total', async () => {
    const page = await mountSuspended(ClipsIndex)
    const cards = page.findAll('[data-testid="clip-card"]')

    expect(cards).toHaveLength(30)
    expect(page.text()).toContain(`Mostrando 30 de ${clips.length} clips`)
    expect(cards[0]!.text()).toContain(clips[0]!.text)
    expect(page.text()).not.toContain(clips[30]!.text)
  })

  it('filters by level', async () => {
    const level = clips[0]!.level
    const page = await mountSuspended(ClipsIndex)
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    onTestFinished(() => focus.mockRestore())

    await page.findAll('[role="radio"]').find(radio => radio.attributes('value') === level)!.trigger('click')
    await flushPromises()

    const matching = clips.filter(clip => clip.level === level)
    const cards = page.findAll('[data-testid="clip-card"]')

    expect(cards).toHaveLength(Math.min(30, matching.length))
    expect(page.text()).toContain(`Mostrando ${Math.min(30, matching.length)} de ${matching.length} clips`)
    expect(cards.every((card, i) => card.text().includes(matching[i]!.text))).toBe(true)

    const status = page.find('[role="status"]')
    expect(status.attributes('tabindex')).toBe('-1')
    expect(focus.mock.instances.at(-1)).toBe(status.element)
  })

  it('loads another batch without duplicating cards and resets after filtering', async () => {
    const page = await mountSuspended(ClipsIndex)
    const loadMore = () => page.findAll('button').find(button => button.text() === 'Mostrar más')!

    await loadMore().trigger('click')
    await flushPromises()

    expect(page.findAll('[data-testid="clip-card"]')).toHaveLength(60)
    expect(page.text()).toContain(`Mostrando 60 de ${clips.length} clips`)

    const level = clips[0]!.level
    await page.findAll('[role="radio"]').find(radio => radio.attributes('value') === level)!.trigger('click')
    await flushPromises()

    const matching = clips.filter(clip => clip.level === level)
    expect(page.findAll('[data-testid="clip-card"]')).toHaveLength(Math.min(30, matching.length))
    expect(page.text()).toContain(`Mostrando ${Math.min(30, matching.length)} de ${matching.length} clips`)

    const channel = clips[0]!.channel
    await page.findAll('[role="radio"]').find(radio => radio.attributes('value') === channel)!.trigger('click')
    await flushPromises()

    const matchingChannel = matching.filter(clip => clip.channel === channel)
    expect(page.findAll('[data-testid="clip-card"]')).toHaveLength(Math.min(30, matchingChannel.length))
    expect(page.text()).toContain(`Mostrando ${Math.min(30, matchingChannel.length)} de ${matchingChannel.length} clips`)
  })
})

describe('/clips/practica', () => {
  beforeEach(() => {
    playerMounts = 0
    playerUnmounts = 0
    localStorage.removeItem(storageKey)
    localStorage.removeItem(unavailableKey)
    // Pinned at the top of its range, `Math.random` makes every swap of the shuffle a swap with
    // itself: the round then comes out in file order, which is what these tests walk.
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    onTestFinished(() => vi.restoreAllMocks())
  })

  it('asks a gap per clip and records the attempt under its clip id', async () => {
    const round = clips.slice(0, roundSize)
    const page = await mountSuspended(ClipsPractice, { global: { stubs } })
    await flushPromises()

    for (const [i, clip] of round.entries()) {
      const exercise = clip.exercises[0]!

      expect(page.text()).toContain(`Clip ${i + 1} de ${round.length}`)
      expect(page.text()).toContain(exercise.prompt)
      expect(page.find('[data-testid="player"]').exists(), 'the clip has to be playable').toBe(true)

      await page.find('input').setValue(exercise.solution)
      await page.find('form').trigger('submit')
      await flushPromises()

      expect(page.text()).toContain('¡Correcto!')

      await page.find('form').trigger('submit')
      await flushPromises()
    }

    const progress = load()

    for (const clip of round) {
      const id = clipItemId(clip, clip.exercises[0]!)

      expect(progress[id], `${id} must be recorded`).toBeDefined()
      expect(progress[id]!.hits).toBe(1)
    }
  })

  it('reuses the player while moving to the next question', async () => {
    const page = await mountSuspended(ClipsPractice, { global: { stubs } })
    await flushPromises()

    expect(playerMounts).toBe(1)

    const first = clips[0]!.exercises[0]!
    await page.find('input').setValue(first.solution)
    await page.find('form').trigger('submit')
    await flushPromises()
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Clip 2 de')
    expect(playerMounts).toBe(1)
    expect(playerUnmounts).toBe(0)
  })

  it('never asks the same clip twice in a round', async () => {
    const page = await mountSuspended(ClipsPractice, { global: { stubs } })
    await flushPromises()

    const asked: string[] = []

    while (!page.text().includes('Resultado:') && asked.length <= roundSize) {
      const shown = clips.find(clip => page.text().includes(clip.exercises[0]!.prompt))!

      asked.push(shown.id)

      await page.find('input').setValue('nope')
      await page.find('form').trigger('submit')
      await flushPromises()
      await page.find('form').trigger('submit')
      await flushPromises()
    }

    expect(duplicates(asked)).toEqual([])
  })

  it('drops a dead video from the round and remembers it', async () => {
    const dead = clips[0]!
    const page = await mountSuspended(ClipsPractice, { global: { stubs } })
    await flushPromises()

    page.findComponent({ name: 'ClipPlayer' }).vm.$emit('unavailable', dead.videoId)
    await flushPromises()

    expect(loadUnavailable()).toContain(dead.videoId)

    // Not just the current clip: everything left from the same video goes with it.
    const survivors = clips.filter(clip => clip.videoId !== dead.videoId)

    if (survivors.length === 0) {
      expect(page.text()).toContain('No hay clips que practicar')
    } else {
      expect(page.text()).not.toContain(dead.exercises[0]!.prompt)
    }
  })
})
