// @vitest-environment node
import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The manifest is built from nuxt.config.ts, so what it promises and what public/ ships can drift
// apart without anything looking broken: a renamed icon just leaves the site uninstallable, with
// no error anywhere. This is the check that catches it.

const config = readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')

/** The icons the manifest declares, read off the config rather than duplicated here. */
const icons = [...config.matchAll(/src: '([^']+\.png)'/g)].map(match => match[1]!)

describe('the PWA manifest', () => {
  it('declares the three icons an installable app needs', () => {
    expect(icons).toEqual(['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'])
  })

  it.each(icons)('ships %s in public/', (icon) => {
    const file = new URL(`../public/${icon}`, import.meta.url)

    expect(() => statSync(file), `public/${icon} is declared in the manifest but not there`).not.toThrow()
    // A truncated or empty PNG passes `statSync` and fails on the phone.
    expect(statSync(file).size).toBeGreaterThan(1000)
  })

  // Relative paths are what makes the manifest work under the /english-course/ base of GitHub
  // Pages: an absolute /icon-192.png would point outside the site.
  it('keeps the icon paths relative to the manifest', () => {
    for (const icon of icons) {
      expect(icon.startsWith('/'), `${icon} must not start with a slash`).toBe(false)
    }
  })

  it('scopes the app to the base the workflow passes in', () => {
    expect(config).toContain('const base = process.env.NUXT_APP_BASE_URL || \'/\'')
    // start_url and scope both come from it: either one left at '/' breaks the install on Pages.
    expect(config).toContain('start_url: base')
    expect(config).toContain('scope: base')
  })
})
