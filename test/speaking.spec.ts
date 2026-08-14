import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpeakingPage from '../app/pages/speaking.vue'
import { tenses } from '../app/utils/content'

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
})
