#!/usr/bin/env node
// Builds the small review index used before a clip page loads the clip corpus.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const clipsDir = join(root, 'content', 'clips')
const target = join(root, 'content', 'clip-index.json')

const index = readdirSync(clipsDir)
  .filter(file => file.endsWith('.json'))
  .sort()
  .flatMap(file => JSON.parse(readFileSync(join(clipsDir, file), 'utf8')))
  .flatMap(clip => clip.exercises.map(exercise => ({
    id: `clips:${clip.id}:${exercise.id}`,
    tenseId: exercise.tenseId
  })))

writeFileSync(target, `${JSON.stringify(index)}\n`)
console.log(`content/clip-index.json: ${index.length} items`)
