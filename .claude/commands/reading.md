---
description: Generates a reading text with questions in content/readings/
argument-hint: <topic> <level>
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Write a reading about **$1** of level **$2** in `content/readings/<slug>.json`, where `<slug>` is
**$1** in lowercase and with hyphens (`city life` → `city-life.json`).

The text and the questions are in English; the `topic` and the `explanation` of each question are
in Spanish, because that is what the learner reads around the exercise.

## Steps

1. Read `content/readings/<slug>.json` if it is already there: keep the text and the questions it
   has and add only new questions (or extend the text if the user asks for it).
2. Write the reading into `/tmp/reading.json` with the schema below.
3. Merge: `node scripts/merge-content.mjs content/readings/<slug>.json < /tmp/reading.json`
4. Run `pnpm test test/reading.spec.ts`. If it fails, fix the JSON and repeat.

## Schema

`content/readings/<slug>.json` is an **object**:

```json
{
  "id": "travel",
  "title": "A weekend in Lisbon",
  "topic": "Viajes",
  "level": "A2",
  "text": "Last spring I spent three days in Lisbon...\n\nThe second morning...",
  "glossary": [
    { "en": "tram", "es": "tranvía" }
  ],
  "questions": [
    {
      "id": "travel-q1",
      "question": "How long did the writer stay in Lisbon?",
      "options": ["One day", "Three days", "Two weeks"],
      "answer": "Three days",
      "explanation": "La primera frase lo dice: «my sister and I spent three days in Lisbon»."
    },
    {
      "id": "travel-q2",
      "question": "Which city is the text about?",
      "answer": "Lisbon / Lisboa",
      "explanation": "El texto nombra Alfama y Belém, dos barrios de Lisboa."
    }
  ]
}
```

- `id`: the slug, **the same as the file name** without `.json`. The test checks it.
- `title`: the title, in English.
- `topic`: the topic **in Spanish**, as it shows in the `/reading` list (`travel` → `Viajes`).
  Here: **$1** translated, capitalised.
- `level`: one of `A1`, `A2`, `B1`, `B2`, `C1`. Here: **$2**.
- `text`: the text in English, in Markdown, with the paragraphs separated by `\n\n`. Rough
  length: 120-150 words at A1-A2, 200-300 at B1-B2, 350+ at C1.
- `glossary`: between 5 and 10 key words of the text with their translation (`en`, `es`). Only
  vocabulary that appears in the text and that is hard at level **$2**.
- `questions`: between 4 and 6 comprehension questions, in English, **never fewer than 3**.
  - `id`: `<slug>-q<n>`, **unique**; if the file already exists, carry on the numbering.
  - `options`: 3 options (4 from B1 on) if the question is multiple choice. The distractors have
    to be plausible and related to the text, not absurd filler. **Omit `options`** for a
    short-answer question, which is typed in.
  - `answer`: with `options`, **one of its strings, copied literally**; the test fails if it does
    not match. Without `options`, the written answer, with the valid variants separated by `/`
    (`"Lisbon / Lisboa"`): capitals and contractions are already forgiven by the correction.
  - `explanation`: **required**, in Spanish: why that is the answer, quoting the fragment of the
    text that says it. It is shown when correcting, hit or miss.
  - Leave at least one short-answer question: they are answered by typing, so the answer has to
    be one or two words taken from the text, not a long sentence.

## Rules

- The answer to every question has to be deducible from the text, with no prior knowledge.
- Fit the English to the level: at A1-A2, present and past simple, short sentences and frequent
  vocabulary; no idioms and no conditionals.
- On merge, the new text replaces the previous one and the questions are added by `id`: running
  the command again with the same questions leaves the file unchanged.
