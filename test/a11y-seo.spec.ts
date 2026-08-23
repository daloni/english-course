import { readFileSync, readdirSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import Progreso from '../app/pages/progreso.vue'
import Repaso from '../app/pages/repaso.vue'
import TenseTheory from '../app/pages/teoria/[slug].vue'
import VerbosIndex from '../app/pages/verbos/index.vue'
import VerbPractice from '../app/pages/verbos/practica.vue'
import { exerciseFiles, exercisesOf, tenseById, typeOf } from '../app/utils/content'
import { day, items, review, save, storageKey } from '../app/utils/progress'

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
    expect(content('twitter:card')).toBe('summary_large_image')
  })

  it('ships the default social image', () => {
    const app = readFileSync('app/app.vue', 'utf8')
    const image = readFileSync('public/og-image.png')

    expect(app).toContain('ogImage:')
    expect(app).toContain('siteUrl.replace')
    expect(app).toContain('og-image.png')
    expect(app).toContain('ogImageWidth: 1200')
    expect(app).toContain('ogImageHeight: 630')
    expect(app).toContain('ogImageAlt: description')
    expect(app).toContain('ogSiteName: siteName')
    expect(app).toContain('twitterCard: \'summary_large_image\'')
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(image.readUInt32BE(16)).toBe(1200)
    expect(image.readUInt32BE(20)).toBe(630)
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
    await flushPromises()

    // The round is drawn at random out of the file, so it is played sentence by sentence:
    // whichever is on screen, until the score shows up.
    for (let i = 0; i < exercisesOf(slug).length && !page.text().includes('Resultado:'); i++) {
      const exercise = exercisesOf(slug).find(candidate => page.text().includes(candidate.prompt))!

      expect(exercise, 'no se reconoce la frase en pantalla').toBeDefined()

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

  it('/verbos/practica keeps the keyboard cycle focused after correcting', async () => {
    const page = await mountSuspended(VerbPractice, { attachTo: document.body })
    await flushPromises()

    const input = page.find('input')
    const form = page.find('form').element as HTMLFormElement

    await input.setValue('whatever')
    input.element.focus()
    form.requestSubmit()
    await flushPromises()

    expect(document.activeElement).toBe(page.find('button[type="submit"]').element)

    form.requestSubmit()
    await flushPromises()

    expect(page.text()).toContain('Pregunta 2 de')
    expect(document.activeElement).toBe(page.find('input').element)
  })

  it('contains table overflow in a keyboard-accessible region', async () => {
    const tense = tenseById('past-simple')!
    const verbos = await mountSuspended(VerbosIndex)

    const verb = items.find(item => item.kind === 'verbos')!
    save({ [verb.id]: review(undefined, verb.id, false, day()) })
    const progreso = await mountSuspended(Progreso)
    const teoria = await mountSuspended(TenseTheory, { route: `/teoria/${tense.id}` })

    for (const page of [verbos, progreso, teoria]) {
      const region = page.find('[data-table-scroll]')
      const table = region.find('table')

      expect(region.attributes('tabindex')).toBe('0')
      expect(region.attributes('aria-label')).not.toBe('')
      expect(region.classes()).toContain('overflow-x-auto')
      expect(table.classes()).toContain('min-w-max')
      expect(table.find('caption').exists()).toBe(true)
      expect(table.findAll('th[scope="col"]').length).toBeGreaterThan(0)
      expect(table.findAll('th[scope="row"]').length).toBeGreaterThan(0)
    }
  })
})

// The document is Spanish, so `lang="en"` is what tells a screen reader to switch voices.
// Marking Spanish text with it makes the reader pronounce it as if it were English.
describe('el idioma del contenido', () => {
  const verb = items.find(item => item.kind === 'verbos')!
  // Reading questions with options are asked in a radio group; the rest, in a plain field.
  const reading = items.find(item => item.kind === 'reading' && !item.options)!

  /** What the page announces as English: the text of every element marked with `lang="en"`. */
  const inEnglish = (page: VueWrapper) => page.findAll('[lang="en"]').map(node => node.text())

  /** Leaves a single item pending for today, which is what /repaso and /progreso show. */
  const pend = (id: string) => save({ [id]: review(undefined, id, false, day()) })

  beforeEach(() => localStorage.removeItem(storageKey))

  it('deja en español la estructura de /teoria y en inglés sus marcadores', async () => {
    const tense = tenseById('past-simple')!
    const page = await mountSuspended(TenseTheory, { route: `/teoria/${tense.id}` })
    await flushPromises()

    expect(page.text()).toContain(tense.structure.affirmative)
    expect(inEnglish(page).some(text => text.includes(tense.structure.affirmative))).toBe(false)
    expect(inEnglish(page).some(text => text.includes(tense.timeMarkers[0]!))).toBe(true)
  })

  it('deja en español el enunciado de un verbo en /repaso y en inglés el de un reading', async () => {
    pend(verb.id)

    const verbs = await mountSuspended(Repaso)
    await flushPromises()

    expect(verbs.text()).toContain(verb.prompt)
    expect(inEnglish(verbs).some(text => text.includes(verb.prompt))).toBe(false)

    pend(reading.id)

    const questions = await mountSuspended(Repaso)
    await flushPromises()

    expect(inEnglish(questions).some(text => text.includes(reading.prompt))).toBe(true)
  })

  it('deja en español el enunciado fallado de un verbo en /progreso, y su respuesta en inglés', async () => {
    pend(verb.id)

    const page = await mountSuspended(Progreso)
    await flushPromises()

    expect(page.text()).toContain(verb.prompt)
    expect(inEnglish(page).some(text => text.includes(verb.prompt))).toBe(false)
    expect(inEnglish(page)).toContain(verb.solution)
  })
})
