import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import SpeakingPage from '../app/pages/speaking.vue'
import { tenses } from '../app/utils/content'

/** El reconocedor del navegador, lo justo para saber si sigue grabando y qué se ha dicho. */
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

  constructor() {
    FakeRecognition.last = this
  }

  start() {
    this.running = true
  }

  stop() {
    this.running = false
    this.onend?.()
  }

  abort() {
    this.stop()
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

/** Como el navegador: cancelar despacha el `end` de lo que sonaba, y lo hace asíncrono. */
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
    const first = tenses[0]!.examples[0]!

    expect(page.text()).toContain(first.en)
    expect(page.text()).toContain(first.es)
    expect(page.text()).toContain(tenses[0]!.name)
  })

  it('cuts the microphone and the comparison when it changes sentence', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    await page.find('[aria-label="Repetir la frase al micrófono"]').trigger('click')

    const recognition = FakeRecognition.last!

    expect(recognition.running).toBe(true)

    recognition.say(tenses[0]!.examples[0]!.en)
    await flushPromises()

    expect(page.text()).toContain('Frase completa, palabra por palabra.')

    const next = page.findAll('button').find(button => button.text().includes('Otra frase'))!

    await next.trigger('click')
    await flushPromises()

    // Lo dicho para la frase anterior no se arrastra, y el micrófono deja de grabar: si no,
    // lo que se diga ahora se compararía contra la frase nueva.
    expect(page.text()).not.toContain('Frase completa, palabra por palabra.')
    expect(recognition.running).toBe(false)
  })

  it('keeps the button sounding when a sentence is played right after another', async () => {
    supportSpeech()

    const page = await mountSuspended(SpeakingPage)
    await flushPromises()

    const listen = page.find('[aria-label="Escuchar la frase en inglés"]').element
    const next = page.findAll('button').find(button => button.text().includes('Otra frase'))!.element

    // Sin esperar entre clics, que es lo que pasa al pulsar seguido: el `end` de la primera
    // locución llega cuando la segunda ya ha empezado, y no puede apagarle el flag.
    listen.dispatchEvent(new MouseEvent('click'))
    next.dispatchEvent(new MouseEvent('click'))
    listen.dispatchEvent(new MouseEvent('click'))
    await flushPromises()

    expect(fakeSynthesis.spoken).toHaveLength(1)
    expect(page.text()).toContain('Sonando…')
  })
})
