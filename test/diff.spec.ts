import { describe, expect, it } from 'vitest'
import { compare, isRepeated, missingAuxiliaries, negationChanged, score, words } from '../app/utils/diff'

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

  it('writes numbers as digits, compounds included', () => {
    expect(words('She will be twenty next month.')).toEqual(['she', 'will', 'be', '20', 'next', 'month'])
    expect(words('all three hundred pages')).toEqual(['all', '300', 'pages'])
    expect(words('twenty-one or forty five')).toEqual(['21', 'or', '45'])
    expect(words('since 2021 for 300 pages')).toEqual(['since', '2021', 'for', '300', 'pages'])
  })

  it('drops the possessive apostrophe that ends a word and spells it British', () => {
    expect(words('In two years\' time.')).toEqual(['in', '2', 'years', 'time'])
    expect(words('We will not be driving in two hours’ time.')).toEqual(['we', 'will', 'not', 'be', 'driving', 'in', '2', 'hours', 'time'])
    expect(words('my neighbor was traveling')).toEqual(['my', 'neighbour', 'was', 'travelling'])
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
      .toBe('the shop -opens +closes at 9')
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

  it.each([
    ['We are going to move to Valencia in June.', 'we going to move to valencia in june'],
    ['I am working from home this week.', 'I working from home this week'],
    ['They have just arrived at the airport.', 'they just arrived at the airport']
  ])('rejects "%s" without its auxiliary even above the threshold', (sentence, spoken) => {
    const diff = compare(sentence, spoken)

    expect(score(diff)).toBeGreaterThanOrEqual(0.8)
    expect(isRepeated(diff)).toBe(false)
  })

  it('rejects an auxiliary swapped for another tense', () => {
    expect(repeated('He is not going to come to the party tonight.', 'he was not going to come to the party tonight')).toBe(false)
  })

  it.each([
    ['She will be twenty next month.', 'She will be 20 next month'],
    ['The shop opens at nine on Saturdays.', 'the shop opens at 9 on Saturdays'],
    ['He will be teaching from nine to five.', 'he will be teaching from 9 to 5'],
    ['We will not be driving in two hours’ time.', 'we will not be driving in 2 hours time'],
    ['By noon, I will not have read all three hundred pages.', 'by noon I will not have read all 300 pages'],
    ['My neighbour waters the plants every morning.', 'my neighbor waters the plants every morning']
  ])('accepts "%s" transcribed with digits or US spelling', (sentence, spoken) => {
    const diff = compare(sentence, spoken)

    expect(diff.every(word => word.status === 'ok')).toBe(true)
    expect(isRepeated(diff)).toBe(true)
  })

  it('still marks a different number as a mistake', () => {
    expect(shape('I have been studying English for three years.', 'I have been studying English for 4 years'))
      .toBe('i have been studying english for -3 +4 years')
  })

  it('accepts the auxiliaries contracted', () => {
    expect(repeated('I am working from home this week.', 'I\'m working from home this week')).toBe(true)
    expect(repeated('They are not going to sell the house this year.', 'they\'re not going to sell the house this year')).toBe(true)
    expect(repeated('We haven\'t seen that film yet.', 'we have not seen that film yet')).toBe(true)
    expect(repeated('They have just arrived at the airport.', 'they\'ve just arrived at the airport')).toBe(true)
  })
})

describe('missingAuxiliaries', () => {
  const left = (sentence: string, spoken: string) => missingAuxiliaries(compare(sentence, spoken))

  it('names the auxiliaries of the sentence that were left out', () => {
    expect(left('They are going to move in two weeks.', 'they going to move in two weeks')).toEqual(['are'])
    expect(left('She has been working all day.', 'she working all day')).toEqual(['has', 'been'])
    expect(left('He is not going to come.', 'he was not going to come')).toEqual(['is'])
  })

  it('names nothing when only other words are missing or the auxiliary is contracted', () => {
    expect(left('They are going to move in two weeks.', 'they are going to move')).toEqual([])
    expect(left('I am working from home this week.', 'I\'m working from home this week')).toEqual([])
  })
})
