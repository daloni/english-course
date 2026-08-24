import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SpeakingPage from '../app/pages/speaking.vue'
import { tenses } from '../app/utils/content'
import { load, speakingItemId, storageKey } from '../app/utils/progress'

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
