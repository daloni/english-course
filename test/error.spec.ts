import { describe, expect, it } from 'vitest'
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
})
