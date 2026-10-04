import { describe, expect, it } from 'vitest'
import { compare, isRepeated, negationChanged, score, words } from '../app/utils/diff'

/** Compact view of a diff: "word" for a hit, "-word" missing, "+word" said on top. */
const shape = (sentence: string, spoken: string) =>
  compare(sentence, spoken)
    .map(({ word, status }) => `${status === 'ok' ? '' : status === 'missing' ? '-' : '+'}${word}`)
    .join(' ')

describe('words', () => {
  it('drops capitals and punctuation, and writes contractions in full', () => {
    expect(words('Do you live near the station?')).toEqual(['do', 'you', 'live', 'near', 'the', 'station'])
    expect(words('We don\'t watch television, really.')).toEqual(['we', 'do', 'not', 'watch', 'television', 'really'])
  })
})

describe('compare', () => {
  it('marks every word right when the repetition matches', () => {
    expect(shape('She studies English every morning.', 'she studies english every morning'))
      .toBe('she studies english every morning')

    expect(score(compare('She studies English.', 'she studies english'))).toBe(1)
  })

  it('accepts the contracted and the full form as the same word', () => {
    expect(shape('He doesn\'t like coffee.', 'he does not like coffee'))
      .toBe('he does not like coffee')
  })

  it('marks an omitted word without breaking the words after it', () => {
    expect(shape('I work in a small office.', 'I work in a office'))
      .toBe('i work in a -small office')

    expect(score(compare('I work in a small office.', 'I work in a office'))).toBeCloseTo(5 / 6)
  })

  it('marks a word said on top of the sentence', () => {
    expect(shape('I work in a small office.', 'I work in a very small office'))
      .toBe('i work in a +very small office')

    // Every expected word is right, but the insertion still costs: it is not a perfect repetition.
    expect(score(compare('I work in a small office.', 'I work in a very small office'))).toBeCloseTo(6 / 7)
  })

  it('marks a replaced word as missing and extra', () => {
    expect(shape('The shop opens at nine.', 'the shop closes at nine'))
      .toBe('the shop -opens +closes at nine')
  })

  it('marks the whole sentence missing when nothing was heard', () => {
    expect(shape('Does your brother speak French?', ''))
      .toBe('-does -your -brother -speak -french')

    expect(score(compare('Does your brother speak French?', ''))).toBe(0)
  })
})

describe('isRepeated', () => {
  const repeated = (sentence: string, spoken: string) => isRepeated(compare(sentence, spoken))

  it('rejects an added negation even when every other word is right', () => {
    expect(repeated('I work in a small office.', 'I do not work in a small office.')).toBe(false)
    expect(negationChanged(compare('I work in a small office.', 'I never work in a small office'))).toBe(true)
  })

  it('rejects an omitted negation even when it stays above the threshold', () => {
    const diff = compare('He doesn\'t like coffee.', 'He does like coffee.')

    expect(score(diff)).toBeCloseTo(0.8)
    expect(isRepeated(diff)).toBe(false)
  })

  it('accepts a faithful repetition, contractions included', () => {
    expect(repeated('He doesn\'t like coffee.', 'he does not like coffee')).toBe(true)
    expect(repeated('He does not like coffee.', 'He doesn\'t like coffee')).toBe(true)
    expect(repeated('I work in a small office.', 'I work in a small office')).toBe(true)
  })

  it('still tolerates a small slip that keeps the meaning', () => {
    expect(repeated('She studies English every single morning.', 'she studies english every morning')).toBe(true)
  })
})
