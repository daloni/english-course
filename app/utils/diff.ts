// Word by word comparison between the target sentence and what the microphone transcribed,
// used by /speaking to paint the repetition green and red.
import { normalize } from './check'

export type WordStatus = 'ok' | 'missing' | 'extra'

export interface WordDiff {
  word: string
  /** 'ok' and 'missing' are words of the sentence, 'extra' words only the learner said. */
  status: WordStatus
}

const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

const value = (word: string) => units.includes(word) ? units.indexOf(word) : 20 + 10 * tens.indexOf(word)

const compoundNumber = new RegExp(`\\b(${tens.join('|')}) +(${units.slice(1, 10).join('|')})\\b`, 'g')
const numberWord = new RegExp(`\\b(${[...units, ...tens].join('|')})\\b`, 'g')

/**
 * The recognizer speaks en-US, the examples are written in British English.
 * ponytail: only the British spellings of the current examples; a new one in content needs its entry.
 */
const spellings: Record<string, string> = {
  traveling: 'travelling',
  traveled: 'travelled',
  neighbor: 'neighbour',
  neighborhood: 'neighbourhood'
}

/**
 * The words that are worth comparing: no capitals, no punctuation and contractions written
 * in full, because the recognizer writes "I am" where the sentence says "I'm" and back.
 * Numbers are digits, because it writes "3" where the sentence says "three"; a possessive
 * apostrophe that ends a word ("two hours' time") goes, because it is not heard.
 */
export function words(sentence: string): string[] {
  return normalize(sentence)
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/'(?= |$)/g, '')
    .replace(compoundNumber, (_, ten: string, unit: string) => String(value(ten) + value(unit)))
    .replace(numberWord, word => String(value(word)))
    .replace(/\b(\d+) +hundred\b/g, (_, count: string) => String(Number(count) * 100))
    .split(/\s+/)
    .filter(word => word !== '')
    .map(word => spellings[word] ?? word)
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

/**
 * Share of the words involved that were said right, 0 to 1. Words said on top count against
 * it like the omitted ones do, so an insertion never scores a perfect repetition.
 * An empty sentence scores 0.
 */
export function score(diff: WordDiff[]): number {
  const expected = diff.filter(word => word.status !== 'extra').length
  const hits = diff.filter(word => word.status === 'ok').length
  const extra = diff.length - expected

  return expected === 0 ? 0 : hits / (expected + extra)
}

/** True when "not" or "never" was added or left out: the sentence now says the opposite. */
export const negationChanged = (diff: WordDiff[]): boolean =>
  diff.some(word => word.status !== 'ok' && (word.word === 'not' || word.word === 'never'))

/**
 * The auxiliaries the theory examples build their tenses with. Leaving one out loses the tense
 * being practised ("we going to move", "they just arrived"), however many other words are right.
 */
const auxiliaries = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will'])

/** The auxiliaries of the sentence that were not said where they go. */
export const missingAuxiliaries = (diff: WordDiff[]): string[] =>
  diff.filter(word => word.status === 'missing' && auxiliaries.has(word.word)).map(word => word.word)

/** What counts as a good repetition: enough of the words, the same negation and every auxiliary. */
export const isRepeated = (diff: WordDiff[], threshold = 0.8): boolean =>
  score(diff) >= threshold && !negationChanged(diff) && missingAuxiliaries(diff).length === 0
