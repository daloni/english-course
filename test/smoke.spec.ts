import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import IndexPage from '../app/pages/index.vue'
import { day, items, review, save, speakingItemId, storageKey } from '../app/utils/progress'
import { sections } from '../app/utils/sections'
import { tenses } from '../app/utils/content'

describe('home', () => {
  beforeEach(() => localStorage.removeItem(storageKey))

  it('renders a card per section', async () => {
    const page = await mountSuspended(IndexPage)
    const html = page.html()

    for (const section of sections) {
      expect(html).toContain(section.label)
      expect(html).toContain(`href="${section.to}"`)
    }
  })

  it('describes the review card only with the current pending count', async () => {
    const empty = await mountSuspended(IndexPage)

    expect(empty.text()).toContain('Nada pendiente por ahora')
    expect(empty.text()).not.toContain('ejercicios te tocan hoy')

    save({ [items[0]!.id]: review(undefined, items[0]!.id, false, day()) })
    const pending = await mountSuspended(IndexPage)

    expect(pending.text()).toContain('1 ejercicios te tocan hoy')
  })

  // Speaking has no written exercise for the shared queue, so a due speaking attempt cannot
  // promise a review that /repaso will not have.
  it('says nothing is pending when only a speaking attempt is due', async () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!
    const id = speakingItemId(tense, example)

    save({ [id]: review(undefined, id, false, day()) })
    const page = await mountSuspended(IndexPage)

    expect(page.text()).toContain('Nada pendiente por ahora')
    expect(page.text()).not.toContain('ejercicios te tocan hoy')
  })
})

describe('review navigation', () => {
  beforeEach(() => localStorage.removeItem(storageKey))

  it('keeps the review link visible without a badge when nothing is pending', async () => {
    const layout = await mountSuspended(DefaultLayout)
    await layout.find('button[aria-label="Open menu"]').trigger('click')
    await flushPromises()

    expect(layout.findAll('a[href="/repaso"]')).toHaveLength(1)
    expect(layout.findAll('[aria-label="ejercicios pendientes"]')).toHaveLength(0)
  })

  it('shows the pending count in the navigation', async () => {
    const item = items[0]!
    save({ [item.id]: review(undefined, item.id, false, day()) })
    const layout = await mountSuspended(DefaultLayout)
    await layout.find('button[aria-label="Open menu"]').trigger('click')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve))

    expect(layout.findAll('a[href="/repaso"]')).toHaveLength(1)
    expect(layout.findAll('[aria-label="ejercicios pendientes"]')).toHaveLength(1)
    expect(layout.find('[aria-label="ejercicios pendientes"]').text()).toBe('1')
  })

  it('keeps the badge hidden when only a speaking attempt is due', async () => {
    const tense = tenses[0]!
    const example = tense.examples[0]!
    const id = speakingItemId(tense, example)

    save({ [id]: review(undefined, id, false, day()) })
    const layout = await mountSuspended(DefaultLayout)
    await layout.find('button[aria-label="Open menu"]').trigger('click')
    await flushPromises()

    expect(layout.findAll('[aria-label="ejercicios pendientes"]')).toHaveLength(0)
  })
})
