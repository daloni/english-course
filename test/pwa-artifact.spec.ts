// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateArtifact } from '../scripts/check-pwa.mjs'

const temporary = [] as string[]

afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
})

function fixture() {
  const artifact = mkdtempSync(join(tmpdir(), 'pwa-artifact-'))
  temporary.push(artifact)
  mkdirSync(join(artifact, '_nuxt'))
  writeFileSync(join(artifact, 'manifest.webmanifest'), JSON.stringify({
    name: 'Course',
    description: 'Offline course',
    lang: 'es',
    display: 'standalone',
    theme_color: '#172554',
    background_color: '#172554',
    id: '/english-course/',
    start_url: '/english-course/',
    scope: '/english-course/',
    icons: [
      { src: 'icon-192.png', sizes: '192x192' },
      { src: 'icon-512.png', sizes: '512x512' },
      { src: 'icon-maskable-512.png', sizes: '512x512', purpose: 'maskable' }
    ]
  }))
  for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) writeFileSync(join(artifact, icon), 'png')
  writeFileSync(join(artifact, 'index.html'), '<link rel="manifest" href="/english-course/manifest.webmanifest"><script src="/english-course/_nuxt/app.js"></script>')
  writeFileSync(join(artifact, '_nuxt', 'app.js'), 'navigator.serviceWorker.register("/english-course/sw.js")')
  writeFileSync(join(artifact, 'workbox-test.js'), '')
  writeFileSync(join(artifact, 'sw.js'), 'define(["./workbox-test.js"],function(){precacheAndRoute([{url:"/english-course/"},{url:"icon-192.png"}])})')
  return artifact
}

describe('PWA artifact validation', () => {
  it('accepts a complete artifact under the Pages base', () => {
    expect(validateArtifact(fixture(), '/english-course/')).toEqual([])
  })

  it('reports missing precached resources and out-of-base links', () => {
    const artifact = fixture()
    writeFileSync(join(artifact, 'index.html'), '<link rel="manifest" href="/manifest.webmanifest"><script src="/app.js"></script>')
    writeFileSync(join(artifact, 'sw.js'), 'define(["./workbox-test.js"],function(){precacheAndRoute([{url:"missing.js"}])})')

    expect(validateArtifact(artifact, '/english-course/')).toEqual(expect.arrayContaining([
      'service worker precache entry missing.js is missing from the artifact',
      'manifest link /manifest.webmanifest is outside /english-course/'
    ]))
    expect(validateArtifact(artifact, '/english-course/').some(error => error.includes('outside /english-course/'))).toBe(true)
  })
})
