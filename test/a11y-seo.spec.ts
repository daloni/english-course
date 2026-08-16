import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import TenseTheory from '../app/pages/teoria/[slug].vue'
import VerbPractice from '../app/pages/verbos/practica.vue'
import { exerciseFiles, exercisesOf, tenseById, typeOf } from '../app/utils/content'

const slug = Object.keys(exerciseFiles)[0]!.split('/').pop()!.replace('.json', '')

// Vitest runs from the root of the repo.
const pagesDir = 'app/pages'
const pages = readdirSync(pagesDir, { recursive: true }).map(String).filter(name => name.endsWith('.vue'))

/**
 * The accessible name of a control: what a screen reader announces on reaching it. Without a
 * name, the field is read out as "edit box" and there is no telling what to type in it.
 */
function accessibleName(page: VueWrapper, input: Element): string {
  const label = input.getAttribute('aria-label')

  if (label) {
    return label
  }

  const id = input.getAttribute('id')
  const tag = id ? page.find(`label[for="${id}"]`) : undefined

  return tag?.exists() ? tag.text() : ''
}

// Every page introduces itself with its own title and its own description: adding a new one
// and forgetting the useSeo fails here.
describe('SEO', () => {
  it.each(pages)('/%s declares its own title and description', (name) => {
    const source = readFileSync(`${pagesDir}/${name}`, 'utf8')
    const meta = source.match(/\buseSeo\(\{[\s\S]*?\n\}\)/)?.[0] ?? ''

    expect(meta, 'no useSeo').not.toBe('')
    expect(meta).toMatch(/\btitle:/)
    expect(meta).toMatch(/\bdescription:/)
  })

  // What shows up when the link is shared belongs to the page, not to the home: without this
  // WhatsApp, Slack or Twitter always show the card of the whole site.
  it('gives the page its own social card, not the one of the home', async () => {
    const tense = tenseById('past-simple')!

    await mountSuspended(TenseTheory, { route: `/teoria/${tense.id}` })
    await flushPromises()
    // The head is applied to the DOM on a tick of its own, apart from the mount.
    await new Promise(resolve => setTimeout(resolve))

    const content = (property: string) =>
      document.head.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.getAttribute('content')

    // The <title> carries the titleTemplate from app.vue, which does not mount in a page
    // test; the social card has to show that same title, site name included. The name comes
    // from the .env, like everywhere else.
    const { siteName } = useRuntimeConfig().public

    expect(siteName, 'NUXT_PUBLIC_SITE_NAME sin valor').not.toBe('')
    expect(document.title).toBe(tense.name)
    expect(content('og:title')).toBe(`${tense.name} · ${siteName}`)
    expect(content('og:description')).toBe(content('description'))
    expect(content('og:description')).toContain(tense.nameEs)
    expect(content('og:type')).toBe('website')
    expect(content('og:locale')).toBe('es_ES')
    expect(content('twitter:card')).toBe('summary')
  })
})

describe('accesibilidad', () => {
  it('the layout starts with a skip link to the main content', async () => {
    const layout = await mountSuspended(DefaultLayout)

    expect(layout.find('a[href="#contenido"]').exists()).toBe(true)
    expect(layout.find('main#contenido').exists()).toBe(true)
  })

  it(`/frases/${slug} can be played without a mouse`, async () => {
    const page = await mountSuspended(TensePractice, { route: `/frases/${slug}` })

    for (const exercise of exercisesOf(slug)) {
      if (typeOf(exercise) === 'choice') {
        // The group takes a tab stop and every option announces itself by name; once inside,
        // the space bar fires the click of the <button role="radio">, which is this one.
        const radio = page.findAll('[role="radio"]').find(candidate => candidate.attributes('value') === exercise.solution)!

        expect(page.find('[role="radiogroup"]').attributes('tabindex')).toBe('0')
        expect(accessibleName(page, radio.element), 'opción sin nombre accesible').not.toBe('')
        await radio.trigger('click')
      } else {
        const input = page.find('input')

        expect(accessibleName(page, input.element), 'input sin nombre accesible').not.toBe('')
        await input.setValue(exercise.solution)
      }

      // Submitting the form is what Enter does from the field or from the button.
      await page.find('form').trigger('submit')
      await flushPromises()
      expect(page.text()).toMatch(/¡Correcto!|No es esa/)

      await page.find('form').trigger('submit')
      await flushPromises()
    }

    expect(page.text()).toContain('Resultado:')
  })

  it('/verbos/practica can be played without a mouse', async () => {
    const page = await mountSuspended(VerbPractice)
    await flushPromises()

    const input = page.find('input')

    expect(accessibleName(page, input.element), 'input sin nombre accesible').not.toBe('')
    await input.setValue('whatever')

    await page.find('form').trigger('submit')
    await flushPromises()
    expect(page.text()).toMatch(/¡Correcto!|No es esa/)

    await page.find('form').trigger('submit')
    await flushPromises()
    expect(page.text()).toContain('Pregunta 2 de')
  })
})
