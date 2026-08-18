#!/usr/bin/env node
// Turns YouTube subtitle tracks into candidate sentences for /clips to write gaps over.
//
//   node scripts/ingest.mjs                    # every source in data/sources.json
//   node scripts/ingest.mjs easy-english       # one source
//   node scripts/ingest.mjs easy-english --limit 3
//
// RUN THIS ON A MACHINE WITH A HOME CONNECTION. YouTube blocks the player and timedtext
// endpoints from datacenter IPs — verified against yt-dlp with a Deno runtime and five
// extractor clients, plus youtube-transcript-api; all returned "Sign in to confirm you're not
// a bot". Listing a channel and oEmbed do work from anywhere, which is why discovery succeeds
// and extraction then fails if this is run on a server.
//
// Nothing here downloads video: only metadata and the subtitle track. The candidates it writes
// are throwaway (data/ is gitignored); what gets versioned is what /clips puts in content/clips/.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseJson3, segmentSentences } from './subtitles.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcesFile = join(root, 'data', 'sources.json')
const candidatesDir = join(root, 'data', 'candidates')
const rawDir = join(root, 'data', 'raw')

/** Enough sentences to be worth a pass, few enough that tagging them is one sitting. */
const perFile = 60

const args = process.argv.slice(2)
const wanted = args.find(arg => !arg.startsWith('--'))
const limit = Number(args[args.indexOf('--limit') + 1]) || 5

/** yt-dlp, or null when it fails: every call here has a sensible "skip this video" answer. */
function ytDlp(argv) {
  try {
    return execFileSync('yt-dlp', argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    return null
  }
}

function preflight() {
  const version = ytDlp(['--version'])

  if (!version) {
    console.error('yt-dlp no está instalado o no está en el PATH.')
    console.error('  brew install yt-dlp    |    pipx install yt-dlp')
    process.exit(1)
  }

  console.log(`yt-dlp ${version.trim()}`)
}

function loadSources() {
  const sources = JSON.parse(readFileSync(sourcesFile, 'utf8'))

  if (!wanted) return sources

  const one = sources.find(source => source.id === wanted)

  if (!one) {
    console.error(`Fuente desconocida: ${wanted}`)
    console.error(`Disponibles: ${sources.map(source => source.id).join(', ')}`)
    process.exit(1)
  }

  return [one]
}

/** Videos already ingested or already published, so re-running is cheap and additive. */
function alreadySeen() {
  const ids = new Set()

  if (existsSync(candidatesDir)) {
    for (const file of readdirSync(candidatesDir)) {
      if (file.endsWith('.json')) ids.add(file.split('--')[0])
    }
  }

  const published = join(root, 'content', 'clips')

  if (existsSync(published)) {
    for (const file of readdirSync(published)) {
      if (!file.endsWith('.json')) continue

      for (const clip of JSON.parse(readFileSync(join(published, file), 'utf8'))) {
        ids.add(clip.videoId)
      }
    }
  }

  return ids
}

const discover = (source, count) =>
  (ytDlp(['--flat-playlist', '-I', `1:${count}`, '--print', '%(id)s', source.url]) ?? '')
    .trim().split('\n').filter(Boolean)

function fetchMeta(videoId) {
  const raw = ytDlp(['-J', '--skip-download', `https://www.youtube.com/watch?v=${videoId}`])

  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Rejects anything that cannot be played back. An age-gated video refuses to load in an embed
 * at all, so a clip from one is a dead card: better to find that out here than in a round.
 */
function rejectReason(meta) {
  if (meta.playable_in_embed !== true) return 'no permite embed'
  if (meta.age_limit > 0) return `restringido por edad (${meta.age_limit}+)`

  const manual = Object.keys(meta.subtitles ?? {}).some(lang => lang.startsWith('en'))
  const auto = Object.keys(meta.automatic_captions ?? {}).some(lang => lang === 'en')

  if (!manual && !auto) return 'sin subtítulos en inglés'

  return null
}

/** A human-written track when there is one; the automatic one otherwise. */
function fetchSubtitles(videoId, meta) {
  const manual = Object.keys(meta.subtitles ?? {}).find(lang => lang.startsWith('en'))

  mkdirSync(rawDir, { recursive: true })

  const flags = manual ? ['--write-subs', '--sub-langs', manual] : ['--write-auto-subs', '--sub-langs', 'en']
  const done = ytDlp([
    '--skip-download', ...flags, '--sub-format', 'json3',
    '-o', join(rawDir, videoId), `https://www.youtube.com/watch?v=${videoId}`
  ])

  if (done === null) return null

  const track = readdirSync(rawDir).find(file => file.startsWith(videoId) && file.endsWith('.json3'))

  return track ? readFileSync(join(rawDir, track), 'utf8') : null
}

function writeCandidates(meta, source, sentences) {
  mkdirSync(candidatesDir, { recursive: true })

  let written = 0

  for (let i = 0; i < sentences.length; i += perFile) {
    const name = `${meta.id}--${String(i / perFile).padStart(3, '0')}.json`
    const candidate = {
      videoId: meta.id,
      source: source.id,
      channel: meta.channel,
      title: meta.title,
      sentences: sentences.slice(i, i + perFile)
        .map(sentence => ({ startMs: sentence.startMs, endMs: sentence.endMs, text: sentence.text }))
    }

    writeFileSync(join(candidatesDir, name), `${JSON.stringify(candidate, null, 2)}\n`)
    written++
  }

  return written
}

function main() {
  preflight()

  const seen = alreadySeen()
  let files = 0
  let total = 0

  for (const source of loadSources()) {
    console.log(`\n${source.id}`)

    let accepted = 0

    // Over-fetch: a good share of what a channel lists gets rejected, age-gated films above all.
    for (const videoId of discover(source, limit * 4)) {
      if (accepted >= limit) break
      if (seen.has(videoId)) continue

      const meta = fetchMeta(videoId)

      if (!meta) {
        console.log(`  ${videoId}  ✗ metadatos ilegibles`)
        continue
      }

      const reason = rejectReason(meta)

      if (reason) {
        console.log(`  ${videoId}  ✗ ${reason}`)
        continue
      }

      const raw = fetchSubtitles(videoId, meta)

      if (!raw) {
        console.log(`  ${videoId}  ✗ no se pudieron bajar los subtítulos`)
        continue
      }

      const sentences = segmentSentences(parseJson3(raw))

      if (sentences.length === 0) {
        console.log(`  ${videoId}  ✗ ninguna frase aprovechable`)
        continue
      }

      const written = writeCandidates(meta, source, sentences)

      accepted++
      files += written
      total += sentences.length
      console.log(`  ${videoId}  ✓ ${sentences.length} frases → ${written} fichero(s)  ${meta.title.slice(0, 50)}`)
    }
  }

  // The raw tracks are only an intermediate step: what matters is in data/candidates/.
  rmSync(rawDir, { recursive: true, force: true })

  console.log(`\n${total} frases en ${files} ficheros nuevos en data/candidates/`)
  if (files > 0) console.log('Siguiente paso: /clips')
}

main()
