import { describe, expect, it } from 'vitest'
import { isCorrect, normalize, thirdPerson } from '../app/utils/check'

describe('normalize', () => {
  it('ignores capitals and surrounding spaces', () => {
    expect(normalize('  Went ')).toBe('went')
    expect(normalize('HAS GONE')).toBe('has gone')
  })

  it('collapses the extra spaces inside the answer', () => {
    expect(normalize('has   gone')).toBe('has gone')
  })

  it('writes contractions in full, with any kind of apostrophe', () => {
    expect(normalize('doesn\'t')).toBe('does not')
    expect(normalize('doesn’t')).toBe('does not')
    expect(normalize('won\'t')).toBe('will not')
    expect(normalize('can\'t')).toBe('can not')
    expect(normalize('cannot')).toBe('can not')
    expect(normalize('I\'m')).toBe('i am')
    expect(normalize('they\'ve')).toBe('they have')
    expect(normalize('we\'ll')).toBe('we will')
  })

  it('leaves the ambiguous contractions alone', () => {
    // "he's" is he is or he has, "he'd" is he would or he had: expanding them would
    // accept a wrong answer.
    expect(normalize('he\'s')).toBe('he\'s')
    expect(normalize('he\'d')).toBe('he\'d')
  })
})

describe('isCorrect', () => {
  it('accepts the answer whatever the capitals and spaces', () => {
    expect(isCorrect('  Went  ', 'went')).toBe(true)
    expect(isCorrect('has  Gone', 'has gone')).toBe(true)
  })

  it('accepts both the contracted and the full form', () => {
    expect(isCorrect('don\'t', 'do not')).toBe(true)
    expect(isCorrect('do not', 'don\'t')).toBe(true)
    expect(isCorrect('doesn\'t go', 'does not go')).toBe(true)
  })

  it('accepts any of the alternatives of the solution', () => {
    expect(isCorrect('was', 'was / were')).toBe(true)
    expect(isCorrect('were', 'was / were')).toBe(true)
    expect(isCorrect('was / were', 'was / were')).toBe(true)
  })

  it('does not take a slash glued to the text as a list of alternatives', () => {
    expect(isCorrect('9', '9/11')).toBe(false)
    expect(isCorrect('9/11', '9/11')).toBe(true)
    // The documented format, with spaces around the slash, keeps working.
    expect(isCorrect('Lisboa', 'Lisbon / Lisboa')).toBe(true)
  })

  it('rejects a wrong or empty answer', () => {
    expect(isCorrect('goed', 'went')).toBe(false)
    expect(isCorrect('', 'went')).toBe(false)
    expect(isCorrect('   ', 'was / were')).toBe(false)
    expect(isCorrect('go', 'went')).toBe(false)
  })
})

describe('thirdPerson', () => {
  it.each([
    ['work', 'works'],
    ['play', 'plays'],
    ['study', 'studies'],
    ['try', 'tries'],
    ['watch', 'watches'],
    ['finish', 'finishes'],
    ['pass', 'passes'],
    ['fix', 'fixes'],
    ['go', 'goes'],
    ['do', 'does'],
    ['focus', 'focuses'],
    ['video', 'videos'],
    ['shampoo', 'shampoos'],
    ['be', 'is'],
    ['have', 'has']
  ])('%s → %s', (infinitive, expected) => {
    expect(thirdPerson(infinitive)).toBe(expected)
  })
})
