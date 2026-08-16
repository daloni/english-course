import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import TenseTheory from '../app/pages/teoria/[slug].vue'
import VerbPractice from '../app/pages/verbos/practica.vue'
import { siteName } from '../app/composables/useSeo'
import { exerciseFiles, exercisesOf, tenseById, typeOf } from '../app/utils/content'

const slug = Object.keys(exerciseFiles)[0]!.split('/').pop()!.replace('.json', '')

// Vitest corre desde la raíz del repo.
const pagesDir = 'app/pages'
const pages = readdirSync(pagesDir, { recursive: true }).map(String).filter(name => name.endsWith('.vue'))

/**
 * El nombre accesible de un control: lo que anuncia un lector de pantalla al llegar a él. Sin
 * nombre, el campo se lee como «cuadro de edición» y no se sabe qué hay que escribir.
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

// Cada página se presenta con su propio título y su propia descripción: añadir una nueva y
// olvidarse del useSeo falla aquí.
describe('SEO', () => {
  it.each(pages)('/%s declares its own title and description', (name) => {
    const source = readFileSync(`${pagesDir}/${name}`, 'utf8')
    const meta = source.match(/\buseSeo\(\{[\s\S]*?\n\}\)/)?.[0] ?? ''

    expect(meta, 'no useSeo').not.toBe('')
    expect(meta).toMatch(/\btitle:/)
    expect(meta).toMatch(/\bdescription:/)
  })

  // Lo que se ve al compartir el enlace es lo de la página, no lo de la home: sin esto
  // WhatsApp, Slack o Twitter enseñan siempre la tarjeta del sitio entero.
  it('gives the page its own social card, not the one of the home', async () => {
    const tense = tenseById('past-simple')!

    await mountSuspended(TenseTheory, { route: `/teoria/${tense.id}` })
    await flushPromises()
    // El head se aplica al DOM en un tick aparte del montaje.
    await new Promise(resolve => setTimeout(resolve))

    const content = (property: string) =>
      document.head.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.getAttribute('content')

    // El <title> lleva el titleTemplate de app.vue, que no monta en un test de página; la
    // tarjeta social tiene que enseñar ese mismo título, con el nombre del sitio incluido.
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
        // El grupo entra en el tabulador y cada opción se anuncia con su nombre; ya dentro,
        // la barra espaciadora dispara el click del <button role="radio">, que es este.
        const radio = page.findAll('[role="radio"]').find(candidate => candidate.attributes('value') === exercise.solution)!

        expect(page.find('[role="radiogroup"]').attributes('tabindex')).toBe('0')
        expect(accessibleName(page, radio.element), 'opción sin nombre accesible').not.toBe('')
        await radio.trigger('click')
      } else {
        const input = page.find('input')

        expect(accessibleName(page, input.element), 'input sin nombre accesible').not.toBe('')
        await input.setValue(exercise.solution)
      }

      // Enviar el formulario es lo que hace Enter desde el campo o desde el botón.
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
