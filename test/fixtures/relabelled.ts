import type { Form } from '../../app/utils/content'

/**
 * Theory examples whose form was reviewed by hand: `form` is the right one, `was` the label they
 * used to carry, and the one their Speaking attempts may still be stored under. Reviewed cases
 * instead of a rule on the text: a question can be followed by another sentence, and "never"
 * makes a sentence negative in meaning but not in form.
 */
export const relabelled: { tenseId: string, en: string, form: Form, was: Form }[] = [
  { tenseId: 'be-going-to', en: 'They are going to move in two weeks.', form: 'affirmative', was: 'negative' },
  { tenseId: 'be-going-to', en: 'Look at that glass! It is going to fall.', form: 'affirmative', was: 'negative' },
  { tenseId: 'be-going-to', en: 'We are not going to travel next summer.', form: 'negative', was: 'interrogative' },
  { tenseId: 'future-continuous', en: 'At midnight, the city will be sleeping.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-perfect-continuous', en: 'He will have been running all morning by the race.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-perfect', en: 'By the end of the week, we will have moved house.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-perfect', en: 'By 2030, the town will have changed completely.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-perfect', en: 'I will have sent the invitation by then.', form: 'affirmative', was: 'interrogative' },
  { tenseId: 'future-simple', en: 'She probably will choose the green dress.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-simple', en: 'I think he will understand soon.', form: 'affirmative', was: 'negative' },
  { tenseId: 'future-simple', en: 'The children will be excited tonight.', form: 'affirmative', was: 'interrogative' },
  { tenseId: 'past-continuous', en: 'We were having dinner at that moment.', form: 'affirmative', was: 'negative' },
  { tenseId: 'past-perfect-continuous', en: 'We had been walking for two hours when it rained.', form: 'affirmative', was: 'negative' },
  { tenseId: 'past-perfect', en: 'They had never travelled abroad until then.', form: 'affirmative', was: 'negative' },
  { tenseId: 'past-perfect', en: 'He had forgotten the address before the meeting.', form: 'affirmative', was: 'negative' },
  { tenseId: 'past-perfect', en: 'It was the first time she had spoken in public.', form: 'affirmative', was: 'interrogative' },
  { tenseId: 'past-simple', en: 'I lost my ticket that morning.', form: 'affirmative', was: 'negative' },
  { tenseId: 'past-simple', en: 'We never visited that village before the move.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-continuous', en: 'We are staying with friends this week.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-perfect-continuous', en: 'He has been learning Japanese since January.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-perfect', en: 'She has lived in this flat since 2020.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-perfect', en: 'The team has won three matches this week.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-simple', en: 'I rarely watch television before dinner.', form: 'affirmative', was: 'negative' },
  { tenseId: 'present-simple', en: 'She never forgets her keys.', form: 'affirmative', was: 'negative' }
]
