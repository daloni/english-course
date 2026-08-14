import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '../app/pages/index.vue'
import { sections } from '../app/utils/sections'

describe('home', () => {
  it('renders a card per section', async () => {
    const page = await mountSuspended(IndexPage)
    const html = page.html()

    for (const section of sections) {
      expect(html).toContain(section.label)
      expect(html).toContain(`href="${section.to}"`)
    }
  })
})
