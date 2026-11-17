import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ErrorPage from '../app/error.vue'
import { sections } from '../app/utils/sections'

// The createError() calls of /teoria/<slug>, /frases/<tiempo> and /reading/<slug> land here:
// without this page the default Nuxt error showed up, in English and with no way back.

describe('app/error.vue', () => {
  it('explains a 404 in Spanish, with the way back and the sections', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: { statusCode: 404, message: 'Lectura no encontrada' } }
    })

    expect(page.text()).toContain('Página no encontrada')
    expect(page.text()).toContain('Error 404: Lectura no encontrada')
    expect(page.html()).toContain('href="/"')

    for (const section of sections) {
      expect(page.html()).toContain(`href="${section.to}"`)
    }
  })

  it('does not call every other error a missing page', async () => {
    const page = await mountSuspended(ErrorPage, {
      props: { error: { statusCode: 500, message: 'Boom' } }
    })

    expect(page.text()).toContain('Algo ha fallado')
    expect(page.text()).not.toContain('Página no encontrada')
    expect(page.text()).toContain('Error 500: Boom')
  })

  // @vite-pwa/nuxt 2 renamed VitePwaManifest: an unregistered component is only a Vue warning.
  it('only renders registered components', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    await mountSuspended(ErrorPage, {
      props: { error: { statusCode: 404, message: 'Lectura no encontrada' } }
    })

    expect(warn.mock.calls.flat().join('\n')).not.toContain('Failed to resolve component')
  })
})
