// Parsing and sentence-segmentation of YouTube json3 subtitle tracks, for scripts/ingest.mjs.
//
// json3 is asked for instead of VTT on purpose: auto-generated VTT arrives as a rolling window
// where every line is repeated as it scrolls, and untangling that from plain text is guesswork.
// json3 gives structured events with per-word offsets, so the duplicates are identifiable by
// their timestamps instead.

/** @typedef {{ text: string, startMs: number, endMs: number }} Token */
/** @typedef {{ text: string, startMs: number, endMs: number, wordCount: number }} Sentence */

/** `[Music]`, `[Applause]`, `♪` and `>>` speaker markers carry no language. */
const NOISE = /\[[^\]]*\]|\([^)]*\)|♪|»|>>/g

/**
 * Flattens a json3 track into a stream of timed word tokens.
 *
 * Auto-captions repeat words across rolling events with *identical* timestamps; that pair
 * (text, startMs) is what is deduped on. Doing it here rather than in the segmenter keeps the
 * boundary logic honest: it only ever sees each word once.
 *
 * @param {string} raw
 * @returns {Token[]}
 */
export function parseJson3(raw) {
  const doc = JSON.parse(raw)
  const tokens = []
  const seen = new Set()

  for (const event of doc.events ?? []) {
    if (!event.segs?.length) continue

    const eventStart = event.tStartMs ?? 0
    const eventEnd = eventStart + (event.dDurationMs ?? 0)

    for (let i = 0; i < event.segs.length; i++) {
      const text = event.segs[i].utf8.replace(NOISE, ' ').trim()
      if (!text) continue

      const startMs = eventStart + (event.segs[i].tOffsetMs ?? 0)
      // The next segment's offset is this one's end; without per-word timings (manual subs)
      // the event duration is all there is.
      const nextOffset = event.segs[i + 1]?.tOffsetMs
      const endMs = nextOffset === undefined ? eventEnd : eventStart + nextOffset

      for (const word of text.split(/\s+/)) {
        const key = `${word}@${startMs}`
        if (seen.has(key)) continue

        seen.add(key)
        tokens.push({ text: word, startMs, endMs: Math.max(endMs, startMs) })
      }
    }
  }

  return tokens
}

/** A pause longer than `gapMs` ends the sentence even without punctuation. */
const DEFAULTS = {
  gapMs: 700,
  minDurationMs: 1500,
  maxDurationMs: 12_000,
  minWords: 4,
  maxWords: 25
}

const SENTENCE_END = /[.!?]["')\]]?$/

/**
 * Groups tokens into sentences and keeps only the ones that work as a card. Anything too short
 * to hear or too long to hold in your head is dropped: that filter is the whole point, not an
 * optimisation.
 *
 * @param {Token[]} tokens
 * @param {Partial<typeof DEFAULTS>} [options]
 * @returns {Sentence[]}
 */
export function segmentSentences(tokens, options = {}) {
  const opts = { ...DEFAULTS, ...options }
  const sentences = []
  let current = []

  const flush = () => {
    if (!current.length) return

    const text = current.map(token => token.text).join(' ')
    const startMs = current[0].startMs
    const endMs = current[current.length - 1].endMs
    const wordCount = current.length

    current = []

    const durationMs = endMs - startMs
    if (durationMs < opts.minDurationMs || durationMs > opts.maxDurationMs) return
    // No upper word check here: the runaway cut below already caps every sentence at maxWords,
    // so testing for it again would be unreachable.
    if (wordCount < opts.minWords) return

    sentences.push({ text, startMs, endMs, wordCount })
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    current.push(token)

    const next = tokens[i + 1]
    if (!next) break

    // A runaway line with no punctuation and no pause is cut loose rather than left to swallow
    // the rest of the video.
    if (SENTENCE_END.test(token.text) || next.startMs - token.endMs > opts.gapMs || current.length >= opts.maxWords) {
      flush()
    }
  }

  flush()

  return sentences
}
