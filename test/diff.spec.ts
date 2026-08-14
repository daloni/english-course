import { describe, expect, it } from 'vitest'
import { compare, score, words } from '../app/utils/diff'

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

    // The extra word is not a hole in the sentence: every expected word is still right.
    expect(score(compare('I work in a small office.', 'I work in a very small office'))).toBe(1)
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
