#!/usr/bin/env node
// Merges a JSON patch (stdin) into a content file, instead of overwriting it.
// Shared by the Claude Code commands and Codex skills that generate course content.
//
//   node scripts/merge-content.mjs content/exercises/present-simple.json < patch.json
//
// Arrays are merged by id (or infinitive): an entry whose key already exists is
// completed field by field, a new key is appended. So running the same command
// twice adds nothing the second time.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEYS = ['id', 'infinitive']

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The field that identifies an entry inside an array, if any. */
const keyOf = items => KEYS.find(key => items.some(item => isObject(item) && key in item))

function mergeArrays(base, patch, stats) {
  const key = keyOf([...base, ...patch])
  if (!key) return [...base, ...patch.filter(item => !base.some(seen => JSON.stringify(seen) === JSON.stringify(item)))]

  const merged = [...base]
  for (const item of patch) {
    const i = merged.findIndex(seen => isObject(seen) && seen[key] === item[key])
    if (i === -1) {
      merged.push(item)
      stats.added++
    } else {
      merged[i] = merge(merged[i], item, stats)
      stats.updated++
    }
  }
  return merged
}

/** Deep merge where the patch wins on scalars and arrays are merged by key. */
export function merge(base, patch, stats = { added: 0, updated: 0 }) {
  if (Array.isArray(base) && Array.isArray(patch)) return mergeArrays(base, patch, stats)
  if (!isObject(base) || !isObject(patch)) return patch

  const merged = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = key in merged ? merge(merged[key], value, stats) : value
  }
  return merged
}

function main([target]) {
  if (!target) throw new Error('usage: node scripts/merge-content.mjs <file.json> < patch.json')

  const patch = JSON.parse(readFileSync(0, 'utf8'))
  const base = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : Array.isArray(patch) ? [] : {}
  const stats = { added: 0, updated: 0 }
  const merged = merge(base, patch, stats)

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`)
  console.log(`${target}: ${stats.added} new, ${stats.updated} merged into existing entries`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
