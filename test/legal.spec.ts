import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import AvisoLegal from '../app/pages/aviso-legal.vue'
import Privacidad from '../app/pages/privacidad.vue'
import Cookies from '../app/pages/cookies.vue'
import TenseTheory from '../app/pages/teoria/[slug].vue'
import ReadingDetail from '../app/pages/reading/[slug].vue'
import TensePractice from '../app/pages/frases/[tiempo].vue'
import Home from '../app/pages/index.vue'
import TheoryIndex from '../app/pages/teoria/index.vue'
import ReadingIndex from '../app/pages/reading/index.vue'
import { readings } from '../app/utils/content'

describe('legal pages', () => {
  it('links every legal page and public section from the footer', async () => {
    const layout = await mountSuspended(DefaultLayout)

    for (const path of ['/aviso-legal', '/privacidad', '/cookies', '/teoria', '/verbos', '/frases', '/reading', '/clips', '/speaking']) {
      expect(layout.find(`footer a[href="${path}"]`).exists(), path).toBe(true)
    }
    expect(layout.find('footer a[href="/repaso"]').exists()).toBe(false)
    expect(layout.find('footer a[href="/progreso"]').exists()).toBe(false)
  })

  it('groups footer links under distinct section and legal headings', async () => {
    const layout = await mountSuspended(DefaultLayout)
    const nav = layout.find('nav[aria-label="Enlaces del sitio"]')
    const columns = nav.findAll('[data-slot="center"] > div')

    expect(columns.map(column => column.find('h3').text())).toEqual(['Secciones', 'Legal'])
    expect(columns[0]!.find('a[href="/teoria"]').exists()).toBe(true)
    expect(columns[0]!.find('a[href="/cookies"]').exists()).toBe(false)
    expect(columns[1]!.find('a[href="/cookies"]').exists()).toBe(true)
    expect(columns[1]!.find('a[href="/teoria"]').exists()).toBe(false)
  })

  it.each([
    ['/aviso-legal', AvisoLegal],
    ['/privacidad', Privacidad],
    ['/cookies', Cookies]
  ])('%s shows the configured owner and contact with one heading', async (path, component) => {
    const page = await mountSuspended(component, { route: path })
    const { legalOwner, legalEmail } = useRuntimeConfig().public

    expect(page.text()).toContain(legalOwner)
    expect(page.text()).toContain(legalEmail)
    expect(page.find(`a[href="mailto:${legalEmail}"]`).exists()).toBe(true)
    expect(page.findAll('h1')).toHaveLength(1)
    expect(page.find('article.prose').exists()).toBe(false)
  })

  it('keeps the cookie table caption and scoped headers', async () => {
    const page = await mountSuspended(Cookies, { route: '/cookies' })

    expect(page.find('table caption').exists()).toBe(true)
    expect(page.findAll('table th[scope="col"]')).toHaveLength(3)
    expect(page.findAll('table th[scope="row"]')).toHaveLength(4)
  })
})

describe('detail structured data', () => {
  it.each([
    ['/teoria/past-simple', TenseTheory],
    [`/reading/${readings[0]!.id}`, ReadingDetail],
    ['/frases/past-simple', TensePractice]
  ])('%s has a parseable BreadcrumbList with absolute canonical items', async (path, component) => {
    await mountSuspended(component, { route: path })
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve))

    const scripts = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
    const data = scripts.map(script => JSON.parse(script.textContent!))
    const breadcrumb = data.find(item => item['@type'] === 'BreadcrumbList' && item.itemListElement[2].item.includes(path + '/'))

    expect(breadcrumb).toBeDefined()
    expect(breadcrumb.itemListElement).toHaveLength(3)
    for (const item of breadcrumb.itemListElement) {
      expect(item['@type']).toBe('ListItem')
      expect(new URL(item.item).protocol).toMatch(/^https?:$/)
      expect(item.item).toMatch(/\/$/)
    }
    expect(breadcrumb.itemListElement[2].item).toContain(path + '/')
  })
})

describe('site structured data', () => {
  it('names the legal owner as the WebSite publisher', async () => {
    await mountSuspended(Home, { route: '/' })
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve))

    const data = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map(script => JSON.parse(script.textContent!))
      .find(item => item['@type'] === 'WebSite')

    expect(data.publisher.name).toBe(useRuntimeConfig().public.legalOwner)
    expect(data.publisher.url).toMatch(/\/aviso-legal\/$/)
  })

  it.each([
    ['/teoria', TheoryIndex],
    ['/reading', ReadingIndex]
  ])('%s lists its resources in a CollectionPage', async (path, component) => {
    await mountSuspended(component, { route: path })
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve))

    const data = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map(script => JSON.parse(script.textContent!))
      .find(item => item['@type'] === 'CollectionPage' && item.url.endsWith(path + '/'))

    expect(data.mainEntity['@type']).toBe('ItemList')
    expect(data.mainEntity.itemListElement.length).toBeGreaterThan(0)
    expect(data.mainEntity.itemListElement[0].url).toContain(path + '/')
  })
})
