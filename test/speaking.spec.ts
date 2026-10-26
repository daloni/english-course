import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SpeakingPage from '../app/pages/speaking.vue'
import { tenseById, tenses } from '../app/utils/content'
import { addDays, day, load, review, save, speakingItemId, storageKey } from '../app/utils/progress'

/** The browser recogniser, just enough to know whether it is still recording and what was said. */
class FakeRecognition {
  static last: FakeRecognition | null = null

  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((event: { results: { 0: { transcript: string } }[] }) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  running = false
  pendingTranscript = ''

  constructor() {
    FakeRecognition.last = this
  }

  start() {
    this.running = true
  }

  stop() {
    this.running = false
    queueMicrotask(() => {
      if (this.pendingTranscript) {
        this.say(this.pendingTranscript)
      }

      this.onend?.()
    })
  }

  abort() {
    this.running = false
    queueMicrotask(() => this.onend?.())
  }

  say(transcript: string) {
    this.onresult?.({ results: [{ 0: { transcript } }] })
  }
}

class FakeUtterance {
  lang = ''
  rate = 1
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(public text: string) {}
}

/** Like the browser: cancelling dispatches the `end` of whatever was playing, asynchronously. */
const fakeSynthesis = {
  spoken: [] as FakeUtterance[],
  getVoices: () => [],
  speak(utterance: FakeUtterance) {
    fakeSynthesis.spoken.push(utterance)
  },
  cancel() {
    const sounding = fakeSynthesis.spoken.splice(0)

    for (const utterance of sounding) {
      queueMicrotask(() => utterance.onend?.())
    }
  }
}

function supportSpeech() {
  FakeRecognition.last = null
  fakeSynthesis.spoken = []

  Object.assign(globalThis, {
    SpeechRecognition: FakeRecognition,
    speechSynthesis: fakeSynthesis,
    SpeechSynthesisUtterance: FakeUtterance
  })
}

afterEach(() => {
  for (const key of ['SpeechRecognition', 'speechSynthesis', 'SpeechSynthesisUtterance']) {
    Reflect.deleteProperty(globalThis, key)
  }
})

beforeEach(() => {
  localStorage.removeItem(storageKey)
})

function sentenceOn(page: VueWrapper) {
  const text = page.find('p.text-2xl').text()

  for (const tense of tenses) {
    const example = tense.examples.find(candidate => candidate.en === text)

    if (example) {
      return { tense, example }
    }
  }

  throw new Error(`No se reconoce la frase en pantalla: ${text}`)
}

/** Stores every other example as reviewed and not due, so `en` is the only pending one and opens the round. */
function pin(en: string) {
  const future = addDays(day(), 1)

  save(Object.fromEntries(tenses.flatMap(tense => tense.examples
    .filter(example => example.en !== en)
    .map((example) => {
      const id = speakingItemId(tense, example)

      return [id, review(undefined, id, true, future)]
    }))))
}

// happy-dom has neither SpeechRecognition nor speechSynthesis, so mounting the page here is
// the browser without support: it has to warn and still show the sentence to listen to.
describe('/speaking', () => {
  it('warns when the browser does not recognize speech', async () => {
    const page = await mountSuspended(SpeakingPage)

    expect(page.text()).toContain('Este navegador no reconoce la voz')

    const mic = page.findAll('button').find(button => button.text().includes('Repetir yo'))

    expect(mic, 'no mic button').toBeDefined()
    expect(mic!.attributes('disabled')).toBeDefined()
  })

  it('shows the first sentence with its translation and tense', async () => {
    const page = await mountSuspended(SpeakingPage)
    const current = sentenceOn(page)

    expect(page.text()).toContain(current.example.en)
    expect(page.text()).toContain(current.example.es)
    expect(page.text()).toContain(current.tense.name)
  })

  it('labels a relabelled sentence with its form and keeps the attempt stored under the old one', async () => {
    supportSpeech()

    const tense = tenseById('be-going-to')!
    const example = tense.examples.find(candidate => candidate.en === 'They are going to move in two weeks.')!
    const id = speakingItemId(tense, example)
    const legacy = speakingItemId(tense, { ...example, form: 'negative' })
    // Everything else was practised and is not due, so the missed sentence opens the round.
    const others = tenses.flatMap(other => other.examples.map(sentence => speakingItemId(other, sentence)))
      .filter(other => other !== id)

    save({
      ...Object.fromEntries(others.map(other => [other, review(undefined, other, true)])),
      [legacy]: review(undefined, legacy, false)
    })

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    expect(sentenceOn(page).example).toBe(example)
    expect(page.text()).toContain('Be going to · afirmativa')

    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
    FakeRecognition.last!.say(example.en)
    await flushPromises()

    expect(load()[id]).toMatchObject({ hits: 1, misses: 1 })
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKey)!))).not.toContain(legacy)
  })

  it('explains that speech recognition may process audio remotely before recording', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const notice = page.find('#speaking-privacy-notice')
    const mic = page.find('[aria-label="Repetir la frase al micrófono"]')

    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('El curso no recibe ni guarda tu voz')
    expect(notice.text()).toContain('pueden procesarla de forma remota')
    expect(mic.attributes('aria-describedby')).toBe('speaking-privacy-notice')
    expect(FakeRecognition.last).toBeNull()
  })

  it('cuts the microphone and the comparison when it changes sentence', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

    const recognition = FakeRecognition.last!

    expect(recognition.running).toBe(true)

    recognition.pendingTranscript = tenses[0]!.examples[0]!.en

    const next = page.findAll('button').find(button => button.text().includes('Otra frase'))!

    await next.trigger('click')
    await flushPromises()

    // What was said for the previous sentence does not carry over, and the microphone stops
    // recording: otherwise whatever is said now would be compared against the new sentence.
    expect(page.text()).not.toContain('Frase completa, palabra por palabra.')
    expect(recognition.running).toBe(false)
  })

  it('keeps the new microphone session on when the mic is pressed again quickly', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const mic = page.find('[aria-label="Repetir la frase al micrófono"]')

    await mic.trigger('click')
    const first = FakeRecognition.last!

    // Simulate the stale end event that made the old UI look idle while recognition was alive.
    first.onend?.()
    await mic.trigger('click')
    const second = FakeRecognition.last!

    expect(first.running).toBe(false)
    expect(second).not.toBe(first)
    expect(second.running).toBe(true)
    expect(page.text()).toContain('Escuchando…')
  })

  it('keeps the button sounding when a sentence is played right after another', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const listen = page.find('[aria-label="Escuchar la frase en inglés"]').element
    const next = page.findAll('button').find(button => button.text().includes('Otra frase'))!.element

    // Without waiting between clicks, which is what happens when pressing repeatedly: the
    // `end` of the first utterance arrives once the second has already started, and it must
    // not turn its flag off.
    listen.dispatchEvent(new MouseEvent('click'))
    next.dispatchEvent(new MouseEvent('click'))
    listen.dispatchEvent(new MouseEvent('click'))
    await flushPromises()

    expect(fakeSynthesis.spoken).toHaveLength(1)
    expect(page.text()).toContain('Sonando…')
  })

  it('records a correct and a clearly incorrect transcription separately', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const first = sentenceOn(page)
    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
    FakeRecognition.last!.say(first.example.en)
    await flushPromises()

    expect(load()[speakingItemId(first.tense, first.example)]).toMatchObject({ hits: 1, misses: 0 })

    await page.findAll('button').find(button => button.text().includes('Otra frase'))!.trigger('click')
    await flushPromises()

    const second = sentenceOn(page)
    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
    FakeRecognition.last!.say('this is clearly not the requested sentence')
    await flushPromises()

    expect(load()[speakingItemId(second.tense, second.example)]).toMatchObject({ hits: 0, misses: 1 })
  })

  it.each([
    ['I have been studying English for three years.', 'I have been studying English for 3 years'],
    ['She will be twenty next month.', 'She will be 20 next month'],
    ['The shop opens at nine on Saturdays.', 'the shop opens at 9 on Saturdays'],
    ['He will be teaching from nine to five.', 'he will be teaching from 9 to 5'],
    ['We will not be driving in two hours’ time.', 'we will not be driving in 2 hours time'],
    ['By noon, I will not have read all three hundred pages.', 'by noon I will not have read all 300 pages'],
    ['My neighbour waters the plants every morning.', 'my neighbor waters the plants every morning']
  ])('records "%s" as a word-perfect hit with a canonical transcript', async (sentence, transcript) => {
    supportSpeech()
    pin(sentence)

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const current = sentenceOn(page)
    expect(current.example.en).toBe(sentence)

    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
    expect(FakeRecognition.last!.lang).toBe('en-US')

    FakeRecognition.last!.say(transcript)
    await flushPromises()

    const feedback = page.find('[aria-live="polite"]').text()
    expect(feedback).toContain('Frase completa, palabra por palabra.')
    expect(feedback).toContain('Cuenta como acierto en esta ronda.')
    expect(load()[speakingItemId(current.tense, current.example)]).toMatchObject({ hits: 1, misses: 0 })
  })

  it('records a repetition that flips the negation as a miss', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const current = sentenceOn(page)
    const id = speakingItemId(current.tense, current.example)
    const negated = /\b(not|never)\b|n't/i.test(current.example.en)
    const flipped = negated
      ? current.example.en.replace(/\s*\b(not|never)\b|n't/i, '')
      : `${current.example.en.split(' ')[0]} do not ${current.example.en.split(' ').slice(1).join(' ')}`

    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
    FakeRecognition.last!.say(flipped)
    await flushPromises()

    expect(load()[id]).toMatchObject({ hits: 0, misses: 1, box: 1 })
    expect(page.text()).toContain('La negación no coincide')
  })

  it('records repetitions without their auxiliary as misses, in the progress and the summary', async () => {
    supportSpeech()

    // Sentence, what the recogniser heard and the auxiliary it left out.
    const omissions = [
      ['We are going to move to Valencia in June.', 'we going to move to valencia in june', 'are'],
      ['I am working from home this week.', 'I working from home this week', 'am'],
      ['They have just arrived at the airport.', 'they just arrived at the airport', 'have']
    ]
    const omissionOf = (sentence: string) => omissions.find(([en]) => en === sentence)
    const future = addDays(day(), 1)

    // Everything else is stored as reviewed and not due, so these three are the pending part
    // of the round and, with the shuffle pinned, its first sentences.
    save(Object.fromEntries(tenses.flatMap(tense => tense.examples
      .filter(example => !omissionOf(example.en))
      .map((example) => {
        const id = speakingItemId(tense, example)

        return [id, review(undefined, id, true, future)]
      }))))
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    onTestFinished(() => vi.restoreAllMocks())

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const roundSize = 10

    for (let i = 0; i < roundSize; i++) {
      const current = sentenceOn(page)
      const omission = omissionOf(current.example.en)

      expect(omission !== undefined).toBe(i < omissions.length)

      await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')
      FakeRecognition.last!.say(omission?.[1] ?? current.example.en)
      await flushPromises()

      if (omission) {
        expect(load()[speakingItemId(current.tense, current.example)]).toMatchObject({ hits: 0, misses: 1, box: 1 })
      }

      await page.findAll('button').find(button => button.text().includes('Otra frase'))!.trigger('click')
      await flushPromises()
    }

    expect(page.text()).toContain(`Resultado: ${roundSize - omissions.length} de ${roundSize}`)
    expect(page.text()).toContain(`${omissions.length} errores`)

    const toReview = page.text().slice(page.text().indexOf('Para repasar'))

    for (const [sentence, , auxiliary] of omissions) {
      expect(toReview).toContain(`${sentence} No se te ha oído: ${auxiliary}.`)
    }
  })

  it('records only the first transcription when the retry is incorrect', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const current = sentenceOn(page)
    const id = speakingItemId(current.tense, current.example)
    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

    FakeRecognition.last!.say(current.example.en)
    await flushPromises()
    FakeRecognition.last!.say('this is clearly not the requested sentence')
    await flushPromises()

    const attempt = load()[id]!

    expect(attempt).toMatchObject({ hits: 1, misses: 0, box: 2 })
    expect(attempt.hits + attempt.misses).toBe(1)
    expect(page.text()).toContain('No se te ha oído')
  })

  it('records only the first transcription when the retry is correct', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const current = sentenceOn(page)
    const id = speakingItemId(current.tense, current.example)
    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

    FakeRecognition.last!.say('this is clearly not the requested sentence')
    await flushPromises()
    FakeRecognition.last!.say(current.example.en)
    await flushPromises()

    const attempt = load()[id]!

    expect(attempt).toMatchObject({ hits: 0, misses: 1, box: 1 })
    expect(attempt.hits + attempt.misses).toBe(1)
    expect(page.text()).toContain('Frase completa, palabra por palabra.')
  })

  describe('verdict of the round', () => {
    const sentence = 'They are going to move in two weeks.'

    /** Opens the round on `sentence` and says each transcript in turn into the same microphone session. */
    async function repeat(...transcripts: string[]) {
      supportSpeech()
      pin(sentence)

      const page = await mountSuspended(SpeakingPage)
      await flushPromises()

      const current = sentenceOn(page)

      expect(current.example.en).toBe(sentence)

      await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

      for (const transcript of transcripts) {
        FakeRecognition.last!.say(transcript)
        await flushPromises()
      }

      return {
        page,
        attempt: () => load()[speakingItemId(current.tense, current.example)],
        live: () => page.find('[aria-live="polite"]').text()
      }
    }

    it('calls a repetition without its auxiliary a miss and names the auxiliary', async () => {
      const { attempt, live } = await repeat('they going to move in two weeks')

      expect(live()).toContain('7 de 8 palabras')
      expect(live()).toContain('Cuenta como fallo en esta ronda.')
      expect(live()).toContain('Falta el auxiliar: are.')
      expect(attempt()).toMatchObject({ hits: 0, misses: 1 })
    })

    it('calls a word-perfect repetition a hit', async () => {
      const { attempt, live } = await repeat(sentence)

      expect(live()).toContain('Cuenta como acierto en esta ronda.')
      expect(live()).not.toContain('fallo')
      expect(attempt()).toMatchObject({ hits: 1, misses: 0 })
    })

    it('calls a repetition below the threshold a miss and gives the threshold', async () => {
      const { attempt, live } = await repeat('they are going to move')

      expect(live()).toContain('Cuenta como fallo en esta ronda.')
      expect(live()).toContain('Coincide el 63 % de las palabras y hace falta al menos el 80 %.')
      expect(live()).not.toContain('auxiliar')
      expect(live()).not.toContain('negación')
      expect(attempt()).toMatchObject({ hits: 0, misses: 1 })
    })

    it('labels a correct retry after a miss as practice that keeps the miss', async () => {
      const { page, attempt, live } = await repeat('they going to move in two weeks', sentence)

      expect(live()).toContain('Frase completa, palabra por palabra.')
      expect(live()).toContain('Tu primer intento ya ha contado como fallo en esta ronda.')
      expect(live()).toContain('Falta el auxiliar: are.')
      expect(live()).toContain('Esta repetición es solo práctica')
      expect(attempt()).toMatchObject({ hits: 0, misses: 1 })

      const roundSize = 10

      for (let i = 0; i < roundSize; i++) {
        await page.findAll('button').find(button => button.text().includes('Otra frase'))!.trigger('click')
        await flushPromises()
      }

      expect(page.text()).toContain('Resultado: 0 de 1')
      expect(page.text().slice(page.text().indexOf('Para repasar'))).toContain(sentence)
    })
  })

  it('shows a summary after the last sentence and restarts on a fresh round', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const roundSize = 10

    for (let i = 0; i < roundSize; i++) {
      const current = sentenceOn(page)

      await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

      // Fail the first sentence on purpose, get the rest right: one mistake among the hits.
      FakeRecognition.last!.say(i === 0 ? 'this is clearly not the requested sentence' : current.example.en)
      await flushPromises()

      // The counter must climb steadily to the end of the round, never back to 1.
      expect(page.text()).toContain(`Frase ${i + 1} de ${roundSize}`)

      await page.findAll('button').find(button => button.text().includes('Otra frase'))!.trigger('click')
      await flushPromises()
    }

    expect(page.text()).toContain(`Resultado: ${roundSize - 1} de ${roundSize}`)
    expect(page.text()).toContain(`1 error`)
    expect(page.text()).toContain('Para repasar')
    expect(page.findAll('button').some(button => button.text().includes('Otra frase'))).toBe(false)

    const restart = page.findAll('button').find(button => button.text().includes('Otra ronda'))!

    await restart.trigger('click')
    await flushPromises()

    expect(page.text()).toContain(`Frase 1 de ${roundSize}`)
    expect(page.findAll('button').some(button => button.text().includes('Otra frase'))).toBe(true)
  })

  it('does not record listening without a transcription or after microphone errors', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    await page.find('[aria-label="Escuchar la frase en inglés"]').trigger('click')
    expect(load()).toEqual({})

    const mic = page.find('[aria-label="Repetir la frase al micrófono"]')
    await mic.trigger('click')
    FakeRecognition.last!.onerror?.({ error: 'no-speech' })
    await flushPromises()
    expect(load()).toEqual({})

    await mic.trigger('click')
    FakeRecognition.last!.onerror?.({ error: 'not-allowed' })
    await flushPromises()
    expect(load()).toEqual({})
  })
})
