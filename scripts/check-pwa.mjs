#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

function normalizeBase(value) {
  if (!value || !value.startsWith('/')) throw new Error(`NUXT_APP_BASE_URL must be an absolute path, got ${value || '<empty>'}`)

  const path = value.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
  return path ? `/${path}/` : '/'
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function artifactPath(artifact, url, base, from = `${base}index.html`) {
  const resolved = new URL(url, `https://pwa.invalid${from}`)

  if (resolved.origin !== 'https://pwa.invalid' || !resolved.pathname.startsWith(base)) return null

  const path = decodeURIComponent(resolved.pathname.slice(base.length))
  const candidate = resolve(artifact, path || 'index.html')
  const inside = relative(artifact, candidate)

  return inside.startsWith('..') || inside.includes(`..${'/'}`) ? null : candidate
}

function fileExists(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function findArtifactFile(artifact, path) {
  if (fileExists(path)) return path
  if (fileExists(`${path}.html`)) return `${path}.html`
  if (fileExists(join(path, 'index.html'))) return join(path, 'index.html')
  return null
}

function checkHtmlReferences(artifact, base, files, errors) {
  let manifestLink = null

  const checkUrl = (value, source) => {
    if (/^(?:[a-z]+:|\/\/|#|data:|javascript:)/i.test(value)) {
      if (/^https?:\/\//i.test(value)) return
      if (!value.startsWith('/')) return
    }

    const resolved = new URL(value, `https://pwa.invalid${source}`)
    if (resolved.origin !== 'https://pwa.invalid') return
    if (!resolved.pathname.startsWith(base)) errors.push(`${source} references ${value} outside ${base}`)
  }

  for (const file of files.filter(file => file.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8')
    const relativeFile = relative(artifact, file).replace(/^index\.html$/, '').replace(/\/index\.html$/, '').replace(/\\/g, '/')
    const pagePath = `${base}${relativeFile}`
    const pageUrl = pagePath.endsWith('/') ? pagePath : `${pagePath}/`
    const links = [...html.matchAll(/<link\b[^>]*>/gi)]

    for (const link of links) {
      const rel = link[0].match(/\brel=["']([^"']+)["']/i)?.[1].split(/\s+/) ?? []
      const href = link[0].match(/\bhref=["']([^"']+)["']/i)?.[1]
      if (rel.includes('manifest') && href) manifestLink = { href, pageUrl }
    }

    for (const match of html.matchAll(/\b(?:href|src|action|poster|cite|formaction)=["']([^"']+)["']/gi)) checkUrl(match[1], pageUrl)

    for (const match of html.matchAll(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const imports = JSON.parse(match[1]).imports ?? {}
        for (const value of Object.values(imports)) if (typeof value === 'string') checkUrl(value, pageUrl)
      } catch {
        errors.push(`${relative(artifact, file)} contains an invalid importmap`)
      }
    }
  }

  if (!manifestLink) {
    errors.push('generated HTML does not link a web manifest')
  } else if (!artifactPath(artifact, manifestLink.href, base, manifestLink.pageUrl)) {
    errors.push(`manifest link ${manifestLink.href} is outside ${base}`)
  }
}

export function validateArtifact(artifact, baseValue = process.env.NUXT_APP_BASE_URL || '/') {
  const errors = []
  const base = normalizeBase(baseValue)
  const files = walk(artifact)
  const manifestFile = join(artifact, 'manifest.webmanifest')
  const serviceWorkerFile = join(artifact, 'sw.js')
  const manifest = fileExists(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null

  if (!fileExists(manifestFile)) errors.push('manifest.webmanifest is missing from the generated artifact')
  if (!fileExists(serviceWorkerFile)) errors.push('sw.js is missing from the generated artifact')

  if (manifest) {
    for (const field of ['name', 'description', 'lang', 'display', 'theme_color', 'background_color', 'id', 'start_url', 'scope']) {
      if (!manifest[field]) errors.push(`manifest is missing ${field}`)
    }

    if (manifest.lang !== 'es') errors.push(`manifest lang must be es, got ${manifest.lang}`)
    if (manifest.display !== 'standalone') errors.push(`manifest display must be standalone, got ${manifest.display}`)

    for (const field of ['id', 'start_url', 'scope']) {
      const path = artifactPath(artifact, manifest[field], base, `${base}manifest.webmanifest`)
      if (!path || (new URL(manifest[field], `https://pwa.invalid${base}`).pathname !== base)) {
        errors.push(`manifest ${field} must resolve to ${base}, got ${manifest[field]}`)
      }
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : []
    const requiredIcons = [
      ['192x192', 'icon-192.png'],
      ['512x512', 'icon-512.png'],
      ['maskable', 'icon-maskable-512.png']
    ]

    for (const [requirement, fallback] of requiredIcons) {
      const icon = icons.find(entry => requirement === 'maskable'
        ? entry.sizes === '512x512' && entry.purpose?.split(/\s+/).includes('maskable')
        : entry.sizes === requirement)
      if (!icon) {
        errors.push(`manifest is missing the ${requirement} icon`)
        continue
      }

      const path = artifactPath(artifact, icon.src, base, `${base}manifest.webmanifest`)
      if (!path || !findArtifactFile(artifact, path)) errors.push(`manifest icon ${icon.src || fallback} is missing from the artifact`)
      if (!icon.src || icon.src.startsWith('/')) errors.push(`manifest icon ${icon.src || '<empty>'} must be relative`)
    }
  }

  if (fileExists(serviceWorkerFile)) {
    const serviceWorker = readFileSync(serviceWorkerFile, 'utf8')
    const precacheUrls = [...serviceWorker.matchAll(/url:["']([^"']+)["']/g)].map(match => match[1])

    if (precacheUrls.length === 0) errors.push('sw.js does not contain a precache manifest')
    for (const url of precacheUrls) {
      const path = artifactPath(artifact, url, base, `${base}sw.js`)
      if (!path || !findArtifactFile(artifact, path)) errors.push(`service worker precache entry ${url} is missing from the artifact`)
    }

    const workboxImport = serviceWorker.match(/\.[/\\](workbox[^"']+)/)?.[1]
    const workbox = workboxImport && (workboxImport.endsWith('.js') ? workboxImport : `${workboxImport}.js`)
    if (!workbox || !fileExists(join(artifact, workbox))) errors.push(`service worker dependency ${workbox || '<unknown>'} is missing from the artifact`)
  }

  const registrations = files.filter(file => file.endsWith('.js') || file.endsWith('.html')).flatMap((file) => {
    const source = readFileSync(file, 'utf8')
    return [...source.matchAll(/(["'`])([^"'`]*sw\.js)\1/g)].map(match => match[2])
  })
  if (registrations.length === 0) {
    errors.push('generated JavaScript does not register a service worker')
  } else {
    for (const url of registrations) {
      if (!artifactPath(artifact, url, base, `${base}index.html`)) errors.push(`service worker registration ${url} is outside ${base}`)
    }
  }

  checkHtmlReferences(artifact, base, files, errors)

  return errors
}

function main() {
  const artifact = resolve(process.argv[2] || join(root, '..', '.output', 'public'))
  if (!fileExists(artifact) && !existsSync(artifact)) throw new Error(`artifact directory does not exist: ${artifact}`)

  const errors = validateArtifact(artifact)
  if (errors.length > 0) {
    console.error('PWA artifact check failed:')
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`PWA artifact check passed: ${artifact}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
