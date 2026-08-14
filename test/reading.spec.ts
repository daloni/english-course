import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ReadingIndex from '../app/pages/reading/index.vue'
import ReadingDetail from '../app/pages/reading/[slug].vue'
import type { Question, Reading } from '../app/utils/content'
import { levels, readingFiles, readingMinutes, readings } from '../app/utils/content'

// Guards content/readings/ and the pages that play it: a reading with too few questions, a
// question without a correct answer, or a text that never reaches /reading/<slug> fails here.

const fileName = (path: string) => path.split('/').pop()!

function expectText(value: unknown, label: string) {
  expect(typeof value, `${label} must be a string`).toBe('string')
  expect((value as string).trim(), `${label} must not be empty`).not.toBe('')
}

const duplicates = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i)

/** What the page shows as the answer: the first of the "a / b" alternatives. */
const shownAnswer = (question: Question) => question.answer.split('/')[0]!.trim()

describe('content/readings', () => {
  it('has unique ids', () => {
    expect(readings).toHaveLength(Object.keys(readingFiles).length)
    expect(duplicates(readings.map(reading => reading.id))).toEqual([])
  })

  describe.each(Object.entries(readingFiles))('%s', (path, reading) => {
    it('is named after its id', () => {
      expectText(reading.id, 'id')
      expect(reading.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(fileName(path)).toBe(`${reading.id}.json`)
    })

    it('has the required fields', () => {
      expectText(reading.title, 'title')
      expectText(reading.topic, 'topic')
      expectText(reading.text, 'text')
      expect(levels).toContain(reading.level)
    })

    it('translates every word of its glossary', () => {
      for (const [i, word] of (reading.glossary ?? []).entries()) {
        expectText(word.en, `glossary[${i}].en`)
        expectText(word.es, `glossary[${i}].es`)
      }
    })

    // The point of a reading: at least three questions, each one with its correct answer
    // declared in the content, so the page can correct without guessing.
    it('has at least three questions with a declared answer', () => {
      expect(reading.questions?.length, 'questions').toBeGreaterThanOrEqual(3)
      expect(duplicates(reading.questions.map(question => question.id))).toEqual([])

      for (const question of reading.questions) {
        expectText(question.id, 'question id')
        expectText(question.question, `${question.id}.question`)
        expectText(question.answer, `${question.id}.answer`)
        expectText(question.explanation, `${question.id}.explanation`)

        // Multiple choice: the answer is copied from the options. Short answer: no options.
        if (question.options !== undefined) {
          expect(question.options.length, `${question.id}.options`).toBeGreaterThan(1)
          question.options.forEach((option, i) => expectText(option, `${question.id}.options[${i}]`))
          expect(question.options, `${question.id}.answer must be one of the options`).toContain(question.answer)
        }
      }
    })
  })
})

/** Answers every question of the reading, right or wrong, the way each type is answered. */
async function answerAll(page: VueWrapper, reading: Reading, correct: boolean) {
  const items = page.findAll('form ol > li')
  expect(items).toHaveLength(reading.questions.length)

  for (const [i, question] of reading.questions.entries()) {
    const item = items[i]!

    if (question.options) {
      const wanted = correct ? question.answer : question.options.find(option => option !== question.answer)!
      const radio = item.findAll('[role="radio"]').find(candidate => candidate.attributes('value') === wanted)

      expect(radio, `no radio for "${wanted}"`).toBeDefined()
      await radio!.trigger('click')
    } else {
      await item.find('input').setValue(correct ? shownAnswer(question) : 'nope')
    }
  }

  await flushPromises()
}

describe('/reading', () => {
  it('lists every reading with its topic, level and reading time', async () => {
    const page = await mountSuspended(ReadingIndex)
    const html = page.html()

    for (const reading of readings) {
      expect(html).toContain(`href="/reading/${reading.id}"`)
      expect(html).toContain(reading.title)
      expect(html).toContain(reading.topic)
      expect(html).toContain(`Nivel ${reading.level}`)
      expect(html).toContain(`${readingMinutes(reading)} min de lectura`)
    }
  })
})

describe.each(readings.map(reading => reading.id))('/reading/%s', (slug) => {
  const reading = readings.find(candidate => candidate.id === slug)!

  it('shows the text and its glossary', async () => {
    const page = await mountSuspended(ReadingDetail, { route: `/reading/${slug}` })
    await flushPromises()

    // The first paragraph is enough: the markdown is rendered, not printed raw.
    expect(page.text()).toContain(reading.text.split('\n\n')[0])
    expect(page.text()).not.toContain('\\n')

    if (!reading.glossary?.length) {
      return
    }

    // The glossary is collapsed: the words only show up after opening it.
    const trigger = page.findAll('button').find(button => button.text().includes('Glosario'))

    expect(trigger, 'no glossary trigger').toBeDefined()
    expect(trigger!.attributes('aria-expanded')).toBe('false')

    await trigger!.trigger('click')
    await flushPromises()

    for (const word of reading.glossary) {
      expect(page.text()).toContain(word.en)
      expect(page.text()).toContain(word.es)
    }
  })

  it('scores every question right and explains why', async () => {
    const page = await mountSuspended(ReadingDetail, { route: `/reading/${slug}` })
    await flushPromises()

    for (const question of reading.questions) {
      expect(page.text()).toContain(question.question)
    }

    await answerAll(page, reading, true)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain(`Puntuación: ${reading.questions.length} de ${reading.questions.length}`)

    for (const question of reading.questions) {
      expect(page.text()).toContain(question.explanation)
    }
  })

  it('marks the wrong answers and shows the right one', async () => {
    const page = await mountSuspended(ReadingDetail, { route: `/reading/${slug}` })
    await flushPromises()

    await answerAll(page, reading, false)
    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain(`Puntuación: 0 de ${reading.questions.length}`)

    for (const question of reading.questions) {
      expect(page.text()).toContain(`La respuesta correcta es: ${shownAnswer(question)}`)
    }
  })
})

describe('/reading/[slug]', () => {
  it('counts an unanswered question as a mistake', async () => {
    const page = await mountSuspended(ReadingDetail, { route: '/reading/travel' })
    await flushPromises()

    await page.find('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('Puntuación: 0 de')
  })

  it('404s on a reading that does not exist', async () => {
    await expect(mountSuspended(ReadingDetail, { route: '/reading/no-existe' })).rejects.toThrow()
  })
})
