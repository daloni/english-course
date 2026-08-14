import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import VerbosIndex from '../app/pages/verbos/index.vue'
import Practica from '../app/pages/verbos/practica.vue'
import { thirdPerson } from '../app/utils/check'
import { verbs } from '../app/utils/content'

describe('/verbos', () => {
  it('lists every verb with its forms', async () => {
    const page = await mountSuspended(VerbosIndex)
    const rows = page.findAll('tbody tr')

    expect(rows).toHaveLength(verbs.length)

    for (const verb of verbs) {
      const row = rows.find(candidate => candidate.text().startsWith(verb.infinitive))!
      expect(row.text()).toContain(verb.past)
      expect(row.text()).toContain(verb.participle)
      expect(row.text()).toContain(verb.es)
    }
  })

  it('filters by search term and by regular / irregular', async () => {
    const page = await mountSuspended(VerbosIndex)

    await page.find('input[type="text"]').setValue('  GO ')
    expect(page.findAll('tbody tr').map(row => row.text().split(/\s+/)[0])).toContain('go')
    expect(page.text()).not.toContain('tried')

    await page.find('input[type="text"]').setValue('')
    await page.find('[role="radio"][value="irregular"]').trigger('click')
    await flushPromises()

    const shown = page.findAll('tbody tr').length
    expect(shown).toBe(verbs.filter(verb => !verb.regular).length)
    expect(shown).toBeLessThan(verbs.length)
  })
})

/** The answer the page is waiting for, read from the question it is showing. */
function solutionOf(heading: string) {
  const [label, infinitive] = heading.split(' de ')
  const verb = verbs.find(candidate => candidate.infinitive === infinitive?.trim())!

  expect(verb, `unknown verb in "${heading}"`).toBeDefined()

  if (label === 'Pasado simple') return verb.past
  if (label === 'Participio') return verb.participle
  return thirdPerson(verb.infinitive)
}

describe('/verbos/practica', () => {
  it('corrects ten conjugations and shows the final score', async () => {
    const page = await mountSuspended(Practica)
    await flushPromises()

    // Answer right on the even questions and wrong on the odd ones: 5 and 5.
    for (let i = 0; i < 10; i++) {
      expect(page.text()).toContain(`Pregunta ${i + 1} de 10`)

      const correct = i % 2 === 0
      await page.find('input').setValue(correct ? solutionOf(page.find('h2').text()) : 'nope')
      await page.find('form').trigger('submit')
      await flushPromises()

      // Instant correction: right or wrong, with the correct form.
      expect(page.text()).toContain(correct ? '¡Correcto!' : 'No es esa')
      if (!correct) {
        expect(page.text()).toContain(solutionOf(page.find('h2').text()))
      }

      await page.find('form').trigger('submit')
      await flushPromises()
    }

    expect(page.text()).toContain('Resultado: 5 de 10')
    expect(page.text()).toContain('5 aciertos')
    expect(page.text()).toContain('5 errores')
    expect(page.findAll('ul li')).toHaveLength(5)
  })

  it('does not accept an empty answer', async () => {
    const page = await mountSuspended(Practica)
    await flushPromises()

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Pregunta 1 de 10')
    expect(page.text()).not.toContain('No es esa')
  })
})
