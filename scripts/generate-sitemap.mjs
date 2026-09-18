#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

/** Writes sitemap.xml and robots.txt into the artifact: every index.html that is not noindex. */
export function generateSitemap(artifact, siteUrl) {
  if (!siteUrl) throw new Error('NUXT_PUBLIC_SITE_URL is required to generate the sitemap')

  const site = siteUrl.replace(/\/$/, '')
  const urls = walk(artifact)
    .filter(path => path.endsWith(`${sep}index.html`))
    .filter(path => !/<meta name="robots" content="noindex/.test(readFileSync(path, 'utf8')))
    .map((path) => {
      const dir = relative(artifact, join(path, '..')).split(sep).join('/')
      return `${site}/${dir ? `${dir}/` : ''}`
    })
    .sort()

  const loc = urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')
  writeFileSync(join(artifact, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${loc}\n</urlset>\n`)
  writeFileSync(join(artifact, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)

  return urls
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.loadEnvFile?.()
  } catch { /* no .env: the variables come from the environment */ }
  const urls = generateSitemap('.output/public', process.env.NUXT_PUBLIC_SITE_URL)
  console.log(`sitemap.xml: ${urls.length} URLs`)
}
