// @vitest-environment node
import { describe, it, expect } from 'vitest'
// @ts-expect-error plain JS helper, no types
import { parseJson3, segmentSentences } from '../scripts/subtitles.mjs'

// What scripts/ingest.mjs turns a subtitle track into: the sentences /clips then writes gaps
// over. The filtering is the point — a line too short to hear or too long to hold in your head
// is not a card.

interface Token { text: string, startMs: number, endMs: number }

const json3 = (events: unknown[]) => JSON.stringify({ events })

describe('parseJson3', () => {
  it('flattens per-word segments into timed tokens', () => {
    const raw = json3([
      {
        tStartMs: 1000,
        dDurationMs: 900,
        segs: [
          { utf8: 'Hang', tOffsetMs: 0 },
          { utf8: ' on', tOffsetMs: 300 },
          { utf8: ' a', tOffsetMs: 500 },
          { utf8: ' second.', tOffsetMs: 600 }
        ]
      }
    ])
    const tokens = parseJson3(raw)
    expect(tokens.map(t => t.text)).toEqual(['Hang', 'on', 'a', 'second.'])
    expect(tokens[0]).toMatchObject({ startMs: 1000, endMs: 1300 })
    expect(tokens[3]).toMatchObject({ startMs: 1600, endMs: 1900 })
  })

  it('drops the rolling duplicates that auto-captions emit', () => {
    // This is the shape that makes VTT unusable: the same words re-sent with
    // identical timestamps as the caption window scrolls.
    const raw = json3([
      { tStartMs: 0, dDurationMs: 500, segs: [{ utf8: 'I', tOffsetMs: 0 }, { utf8: ' guess', tOffsetMs: 200 }] },
      { tStartMs: 0, dDurationMs: 900, segs: [{ utf8: 'I', tOffsetMs: 0 }, { utf8: ' guess', tOffsetMs: 200 }, { utf8: ' so.', tOffsetMs: 600 }] }
    ])
    expect(parseJson3(raw).map(t => t.text)).toEqual(['I', 'guess', 'so.'])
  })

  it('strips sound cues and speaker markers', () => {
    const raw = json3([
      { tStartMs: 0, dDurationMs: 500, segs: [{ utf8: '[Music]' }] },
      { tStartMs: 500, dDurationMs: 500, segs: [{ utf8: '>> Hello (laughs) there' }] }
    ])
    expect(parseJson3(raw).map(t => t.text)).toEqual(['Hello', 'there'])
  })

  it('ignores padding events with no segments', () => {
    const raw = json3([
      { tStartMs: 0, dDurationMs: 100 },
      { tStartMs: 100, dDurationMs: 100, segs: [] },
      { tStartMs: 200, dDurationMs: 300, segs: [{ utf8: 'Right' }] }
    ])
    expect(parseJson3(raw).map(t => t.text)).toEqual(['Right'])
  })

  it('falls back to the event duration when there are no per-word offsets', () => {
    const raw = json3([
      { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'No word timings here' }] }
    ])
    const tokens = parseJson3(raw)
    expect(tokens).toHaveLength(4)
    expect(tokens.every(t => t.startMs === 2000 && t.endMs === 3000)).toBe(true)
  })
})

// Helper: build a token stream with a fixed cadence, so tests read as words
// rather than timestamp arithmetic.
function tokens(words: string[], { start = 0, stepMs = 400, gapsAfter = {} as Record<number, number> } = {}): Token[] {
  let t = start
  return words.map((text, i) => {
    const token = { text, startMs: t, endMs: t + stepMs }
    t += stepMs + (gapsAfter[i] ?? 0)
    return token
  })
}

describe('segmentSentences', () => {
  it('splits on terminal punctuation', () => {
    const out = segmentSentences(tokens(['Give', 'it', 'a', 'shot.', 'You', 'will', 'be', 'fine.']))
    expect(out.map(s => s.text)).toEqual(['Give it a shot.', 'You will be fine.'])
  })

  it('keeps a sentence spread across several caption cues intact', () => {
    // Cues break mid-sentence constantly; the segmenter must ignore cue
    // boundaries entirely and only look at punctuation and pauses.
    const stream = [
      ...tokens(['I', 'have', 'never'], { start: 0 }),
      ...tokens(['seen', 'anything'], { start: 1200 }),
      ...tokens(['like', 'that', 'before.'], { start: 2000 })
    ]
    const out = segmentSentences(stream)
    expect(out).toHaveLength(1)
    expect(out[0]!.text).toBe('I have never seen anything like that before.')
  })

  it('splits on a long pause even without punctuation', () => {
    const stream = tokens(
      ['So', 'what', 'do', 'you', 'reckon', 'about', 'this', 'whole', 'thing'],
      { gapsAfter: { 4: 1500 } }
    )
    const out = segmentSentences(stream)
    expect(out.map(s => s.text)).toEqual(['So what do you reckon', 'about this whole thing'])
  })

  it('reports the start of the first word and the end of the last', () => {
    const out = segmentSentences(tokens(['This', 'is', 'the', 'one.'], { start: 5000, stepMs: 500 }))
    expect(out[0]).toMatchObject({ startMs: 5000, endMs: 7000 })
  })

  it('drops sentences that are too short to be a card', () => {
    expect(segmentSentences(tokens(['Yeah', 'sure.']))).toEqual([])
  })

  it('drops sentences that run longer than the max duration', () => {
    const long = tokens(['One', 'two', 'three', 'four', 'five'], { stepMs: 3000 })
    expect(segmentSentences(long)).toEqual([])
  })

  it('never emits a sentence longer than maxWords', () => {
    const words = Array.from({ length: 30 }, (_, i) => `w${i}`)
    const out = segmentSentences(tokens(words, { stepMs: 200 }), { maxDurationMs: 60000 })
    expect(out.length).toBeGreaterThan(0)
    expect(Math.max(...out.map(s => s.wordCount))).toBeLessThanOrEqual(25)
  })

  it('cuts a runaway line rather than swallowing the rest of the video', () => {
    // No punctuation, no pauses, 60 words: without the cut this would produce
    // one useless mega-sentence and lose everything after it.
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`)
    const out = segmentSentences(tokens(words, { stepMs: 200 }), { maxDurationMs: 60000 })
    expect(out.length).toBeGreaterThan(1)
    expect(out.every(s => s.wordCount <= 25)).toBe(true)
  })
})
