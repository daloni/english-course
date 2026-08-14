import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TeoriaIndex from '../app/pages/teoria/index.vue'
import TensePage from '../app/pages/teoria/[slug].vue'
import { forms, tenseById, tenseFiles } from '../app/utils/content'

// Every file in content/tenses/ must be reachable: listed on /teoria and rendered
// at /teoria/<slug>. Adding a tense with /teoria and forgetting to ship it fails here.
const slugs = Object.keys(tenseFiles).map(path => path.split('/').pop()!.replace('.json', ''))

describe('/teoria', () => {
  it('links to every tense file', async () => {
    const page = await mountSuspended(TeoriaIndex)
    const html = page.html()

    for (const slug of slugs) {
      expect(html).toContain(`href="/teoria/${slug}"`)
      expect(html).toContain(tenseById(slug)!.name)
    }
  })

  it.each(slugs)('/teoria/%s renders theory, structure and examples', async (slug) => {
    const page = await mountSuspended(TensePage, { route: `/teoria/${slug}` })
    const html = page.html()
    const tense = tenseById(slug)!

    expect(html).toContain(tense.name)
    // The markdown theory is rendered as HTML, not printed raw.
    expect(html).not.toContain('## ')
    expect(html).toContain('<h2')

    for (const form of forms) {
      expect(html).toContain(tense.structure[form])
    }

    for (const marker of tense.timeMarkers) {
      expect(html).toContain(marker)
    }

    for (const example of tense.examples) {
      expect(html).toContain(example.en)
    }
  })
})
