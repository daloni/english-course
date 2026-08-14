// Word by word comparison between the target sentence and what the microphone transcribed,
// used by /speaking to paint the repetition green and red.
import { normalize } from './check'

export type WordStatus = 'ok' | 'missing' | 'extra'

export interface WordDiff {
  word: string
  /** 'ok' and 'missing' are words of the sentence, 'extra' words only the learner said. */
  status: WordStatus
}

/**
 * The words that are worth comparing: no capitals, no punctuation and contractions written
 * in full, because the recognizer writes "I am" where the sentence says "I'm" and back.
 */
export function words(sentence: string): string[] {
  return normalize(sentence)
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .filter(word => word !== '' && word !== '\'')
}

/**
 * Aligns both sentences on their longest common subsequence, so that a single missing word
 * does not turn every word after it into a mistake. The result reads left to right: the
 * words of the sentence in order, with the ones that were said wrong marked as missing and
 * whatever was said on top of them marked as extra.
 */
export function compare(sentence: string, spoken: string): WordDiff[] {
  const expected = words(sentence)
  const said = words(spoken)

  // common[i][j]: how many words expected[i..] and said[j..] still share.
  const common: number[][] = Array.from(
    { length: expected.length + 1 },
    () => new Array<number>(said.length + 1).fill(0)
  )

  for (let i = expected.length - 1; i >= 0; i--) {
    for (let j = said.length - 1; j >= 0; j--) {
      common[i]![j] = expected[i] === said[j]
        ? common[i + 1]![j + 1]! + 1
        : Math.max(common[i + 1]![j]!, common[i]![j + 1]!)
    }
  }

  const diff: WordDiff[] = []
  let i = 0
  let j = 0

  while (i < expected.length && j < said.length) {
    if (expected[i] === said[j]) {
      diff.push({ word: expected[i]!, status: 'ok' })
      i++
      j++
    } else if (common[i + 1]![j]! >= common[i]![j + 1]!) {
      diff.push({ word: expected[i]!, status: 'missing' })
      i++
    } else {
      diff.push({ word: said[j]!, status: 'extra' })
      j++
    }
  }

  while (i < expected.length) {
    diff.push({ word: expected[i++]!, status: 'missing' })
  }

  while (j < said.length) {
    diff.push({ word: said[j++]!, status: 'extra' })
  }

  return diff
}

/** Share of the sentence that was said right, 0 to 1. An empty sentence scores 0. */
export function score(diff: WordDiff[]): number {
  const expected = diff.filter(word => word.status !== 'extra').length
  const hits = diff.filter(word => word.status === 'ok').length

  return expected === 0 ? 0 : hits / expected
}
