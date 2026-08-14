// @vitest-environment node
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS helper, no types
import { merge } from '../scripts/merge-content.mjs'

// The content commands rely on this: running the same command twice must not duplicate anything.
describe('merge-content', () => {
  const exercises = [{ id: 'present-simple-001', tenseId: 'present-simple', prompt: 'She ___ here.', solution: 'lives' }]

  it('appends entries with a new id', () => {
    const patch = [{ id: 'present-simple-002', tenseId: 'present-simple', prompt: 'They ___ tea.', solution: 'drink' }]
    expect(merge(exercises, patch).map((e: { id: string }) => e.id)).toEqual(['present-simple-001', 'present-simple-002'])
  })

  it('is idempotent', () => {
    expect(merge(exercises, exercises)).toEqual(exercises)
  })

  it('completes an existing entry instead of duplicating it', () => {
    const verbs = [{ infinitive: 'go', past: 'went' }]
    expect(merge(verbs, [{ infinitive: 'go', participle: 'gone', es: 'ir' }]))
      .toEqual([{ infinitive: 'go', past: 'went', participle: 'gone', es: 'ir' }])
  })

  it('overwrites scalars and merges nested question lists', () => {
    const reading = { id: 'travel', text: 'old', questions: [{ id: 'travel-q1', question: 'Where?' }] }
    const patch = { text: 'new', questions: [{ id: 'travel-q1', question: 'Where?' }, { id: 'travel-q2', question: 'When?' }] }
    expect(merge(reading, patch)).toEqual({
      id: 'travel',
      text: 'new',
      questions: [{ id: 'travel-q1', question: 'Where?' }, { id: 'travel-q2', question: 'When?' }]
    })
  })
})
