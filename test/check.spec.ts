import { describe, expect, it } from 'vitest'
import { checkExercise, isCorrect, normalize, thirdPerson } from '../app/utils/check'
import { exercises, type Exercise } from '../app/utils/content'

describe('normalize', () => {
  it('ignores capitals and surrounding spaces', () => {
    expect(normalize('  Went ')).toBe('went')
    expect(normalize('HAS GONE')).toBe('has gone')
  })

  it('ignores accents', () => {
    expect(normalize('Pastéis de nata')).toBe('pasteis de nata')
    expect(isCorrect('Pasteis de nata', 'Pastéis de nata')).toBe(true)
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

  it('ignores the punctuation inside the answer', () => {
    // "Yes, she does" and "Yes she does" are the same answer: the comma is not the mistake
    // being corrected.
    expect(normalize('Yes, she does.')).toBe('yes she does')
    expect(normalize('Yes she does')).toBe('yes she does')
    expect(normalize('First, we ate; then we left')).toBe('first we ate then we left')
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

  it('accepts the answer with or without its commas', () => {
    expect(isCorrect('Yes, she does', 'Yes she does')).toBe(true)
    expect(isCorrect('Yes she does', 'Yes, she does')).toBe(true)
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

  it('checks each answer of a multiple-gap solution by position', () => {
    expect(isCorrect('Are / waiting', 'Are / waiting', 2)).toBe(true)
    expect(isCorrect('are/waiting', 'Are / waiting', 2)).toBe(true)
    expect(isCorrect('are', 'Are / waiting', 2)).toBe(false)
    expect(isCorrect('waiting', 'Are / waiting', 2)).toBe(false)
    expect(isCorrect('are they waiting', 'Are / waiting', 2)).toBe(false)
  })

  it('rejects a wrong or empty answer', () => {
    expect(isCorrect('goed', 'went')).toBe(false)
    expect(isCorrect('', 'went')).toBe(false)
    expect(isCorrect('   ', 'was / were')).toBe(false)
    expect(isCorrect('go', 'went')).toBe(false)
  })
})

describe('checkExercise', () => {
  const twoGaps: Exercise = {
    id: 'two-gaps',
    tenseId: 'past-simple',
    prompt: 'It ___ raining, so they ___ inside.',
    solution: 'was / were'
  }

  it('counts a clip with two gaps by the gaps in its prompt, not the whole exercise', () => {
    // The regression of #84: this used to fall through to the single-gap branch, which reads
    // " / " as alternatives instead of positional answers.
    expect(checkExercise('was / were', twoGaps)).toBe(true)
    expect(checkExercise('was', twoGaps)).toBe(false)
  })
})

// "'s" can mean is or has, so normalize leaves it alone: negative transformations with is and has
// list the "'s not" form as an explicit alternative of their solution instead.
describe('the negative transformations with is and has', () => {
  const cases: [id: string, right: string[], wrong: string[]][] = [
    ['be-going-to-008', [
      'He is not going to study Italian next summer.',
      'He isn\'t going to study Italian next summer.',
      'He\'s not going to study Italian next summer.',
      'He’s not going to study Italian next summer.'
    ], [
      'He has not going to study Italian next summer.',
      'He hasn\'t going to study Italian next summer.',
      'He\'s going to study Italian next summer.'
    ]],
    ['present-continuous-020', [
      'Nina isn\'t reading a report at the moment.',
      'Nina is not reading a report at the moment.',
      'Nina\'s not reading a report at the moment.',
      'Nina’s not reading a report at the moment.'
    ], [
      'Nina hasn\'t reading a report at the moment.',
      'Nina has not reading a report at the moment.',
      'Nina\'s reading a report at the moment.'
    ]],
    ['present-perfect-continuous-008', [
      'Nora hasn\'t been using the meeting room all morning.',
      'Nora has not been using the meeting room all morning.',
      'Nora\'s not been using the meeting room all morning.',
      'Nora’s not been using the meeting room all morning.'
    ], [
      'Nora isn\'t been using the meeting room all morning.',
      'Nora is not been using the meeting room all morning.',
      'Nora\'s been using the meeting room all morning.'
    ]],
    ['present-perfect-continuous-020', [
      'Maya has not been writing emails all morning.',
      'Maya hasn\'t been writing emails all morning.',
      'Maya\'s not been writing emails all morning.',
      'Maya’s not been writing emails all morning.'
    ], [
      'Maya isn\'t been writing emails all morning.',
      'Maya is not been writing emails all morning.',
      'Maya\'s been writing emails all morning.'
    ]],
    ['present-perfect-008', [
      'Tom hasn\'t washed the car this morning.',
      'Tom has not washed the car this morning.',
      'Tom\'s not washed the car this morning.',
      'Tom’s not washed the car this morning.'
    ], [
      'Tom isn\'t washed the car this morning.',
      'Tom is not washed the car this morning.',
      'Tom\'s washed the car this morning.'
    ]],
    ['present-perfect-019', [
      'Laura has not cleaned the kitchen yet.',
      'Laura hasn\'t cleaned the kitchen yet.',
      'Laura\'s not cleaned the kitchen yet.',
      'Laura’s not cleaned the kitchen yet.'
    ], [
      'Laura isn\'t cleaned the kitchen yet.',
      'Laura is not cleaned the kitchen yet.',
      'Laura\'s cleaned the kitchen yet.'
    ]]
  ]

  // Each answer is typed on its own, never the whole list of alternatives.
  it.each(cases)('%s', (id, right, wrong) => {
    const exercise = exercises.find(candidate => candidate.id === id)

    expect(exercise, `${id} must keep its id, the progress is stored under it`).toBeDefined()
    for (const answer of right) {
      expect(checkExercise(answer, exercise!), answer).toBe(true)
    }
    for (const answer of wrong) {
      expect(checkExercise(answer, exercise!), answer).toBe(false)
    }
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
