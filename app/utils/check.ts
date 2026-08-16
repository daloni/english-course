// Correction of the written answers: what the learner types is compared with the solution
// after normalizing what is not a mistake (capitals, extra spaces, contractions).

/**
 * Contractions expanded so that "don't" and "do not" are the same answer.
 * Order matters: the irregular ones go before the generic "n't" rule.
 * "'s" and "'d" are left alone: they can be is/has and would/had, so expanding them
 * would accept answers that are wrong.
 */
const contractions: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/'m\b/g, ' am'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will']
]

/**
 * Lowercase, single spaces, straight apostrophes and contractions written in full.
 * The punctuation is dropped: the final full stop or question mark, and the commas and
 * semicolons inside, so that "Yes, she does" and "Yes she does" are the same answer.
 * Rewriting a sentence is about the auxiliary and the word order, not about the punctuation.
 */
export function normalize(answer: string): string {
  const text = answer
    .toLowerCase()
    .replace(/[’‘´`]/g, '\'')
    .replace(/[,;]/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()

  return contractions
    .reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
    .replace(/\s+/g, ' ')
}

/**
 * A solution may list alternatives separated by " / ", as in "was / were". The spaces are
 * part of the separator: a slash glued to the text ("9/11") is one answer, not two.
 */
export const alternatives = (solution: string) =>
  solution.split(/\s+\/\s+/).map(normalize).filter(alternative => alternative !== '')

/** True when the answer matches the solution, or any of its alternatives. */
export function isCorrect(answer: string, solution: string): boolean {
  const given = normalize(answer)

  return given !== '' && (given === normalize(solution) || alternatives(solution).includes(given))
}

/** Third person singular of the present simple: goes, studies, watches. */
const irregularThirdPerson: Record<string, string> = { be: 'is', have: 'has' }

export function thirdPerson(infinitive: string): string {
  const verb = normalize(infinitive)

  if (irregularThirdPerson[verb]) {
    return irregularThirdPerson[verb]
  }

  // Sibilants take -es (watches, passes, fixes), and so does consonant + o (goes, does);
  // vowel + o only takes -s (videos, shampoos).
  if (/(ch|sh|s|x|z)$|[^aeiou]o$/.test(verb)) {
    return `${verb}es`
  }

  // Consonant + y turns into -ies (study → studies), vowel + y does not (play → plays).
  if (/[^aeiou]y$/.test(verb)) {
    return `${verb.slice(0, -1)}ies`
  }

  return `${verb}s`
}
