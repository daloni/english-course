import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ClipsIndex from '../app/pages/clips/index.vue'
import ClipsPractice from '../app/pages/clips/practica.vue'
import { clipFiles, clips, levels, tenses } from '../app/utils/content'
import { normalize } from '../app/utils/check'
import { clipItemId, items, load, storageKey } from '../app/utils/progress'
import { loadUnavailable, unavailableKey } from '../app/utils/unavailable'

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
const stubs = { ClipPlayer: { name: 'ClipPlayer', template: '<div data-testid="player" />', emits: ['unavailable'] } }

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
})

describe('/clips', () => {
  it('lists every clip with its channel', async () => {
    const page = await mountSuspended(ClipsIndex)
    const text = page.text()

    for (const clip of clips) {
      expect(text).toContain(clip.text)
      expect(text).toContain(clip.channel)
    }
  })

  it('filters by level', async () => {
    const level = clips[0]!.level
    const page = await mountSuspended(ClipsIndex)

    await page.findAll('[role="radio"]').find(radio => radio.attributes('value') === level)!.trigger('click')
    await flushPromises()

    for (const clip of clips) {
      expect(page.text().includes(clip.text), `${clip.id} on level ${level}`).toBe(clip.level === level)
    }
  })
})

describe('/clips/practica', () => {
  beforeEach(() => {
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
