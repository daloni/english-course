// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { generateSitemap } from '../scripts/generate-sitemap.mjs'

it('lists the indexable pages and points robots.txt at the sitemap', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sitemap-'))
  const page = (path: string, head = '') => {
    mkdirSync(join(dir, path), { recursive: true })
    writeFileSync(join(dir, path, 'index.html'), `<head>${head}</head>`)
  }

  try {
    page('.')
    page('teoria/past-simple')
    page('progreso', '<meta name="robots" content="noindex, follow">')
    writeFileSync(join(dir, '404.html'), '')
    writeFileSync(join(dir, '200.html'), '')

    expect(generateSitemap(dir, 'https://x.io/course/')).toEqual([
      'https://x.io/course/',
      'https://x.io/course/teoria/past-simple/'
    ])
    const xml = readFileSync(join(dir, 'sitemap.xml'), 'utf8')
    expect(xml).toContain('<loc>https://x.io/course/teoria/past-simple/</loc>')
    expect(xml).not.toContain('progreso')
    expect(xml).not.toContain('404')
    expect(readFileSync(join(dir, 'robots.txt'), 'utf8')).toContain('Sitemap: https://x.io/course/sitemap.xml')
    expect(() => generateSitemap(dir, '')).toThrow('NUXT_PUBLIC_SITE_URL')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
