---
description: Generates gap-fill sentences for a tense in content/exercises/
argument-hint: <tense> <level> <n>
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Generate **$3** gap-fill sentences of level **$2** for the tense **$1** and add them to
`content/exercises/$1.json`.

The sentences are in English; whatever is written in Spanish —the `explanation`— stays in
Spanish: it is what the learner reads.

## Steps

1. Read `content/tenses/$1.json` to keep to the structure, the time markers and the examples of
   that tense. If the file does not exist, stop and say so: the `tenseId` has to be a tense that
   exists (`/theory` creates it).
2. Read `content/exercises/$1.json` if it is already there, so as not to repeat sentences or ids.
3. Write the new sentences into `/tmp/sentences.json` with the schema below.
4. Merge without overwriting the file:
   `node scripts/merge-content.mjs content/exercises/$1.json < /tmp/sentences.json`
5. Run `pnpm test test/content.spec.ts`. If it fails, fix the JSON and repeat.

## Schema

`content/exercises/<tense>.json` is an **array** of objects:

```json
[
  {
    "id": "present-simple-001",
    "tenseId": "present-simple",
    "prompt": "She ___ (live) in Madrid.",
    "solution": "lives"
  }
]
```

- `id`: `<tense>-<nnn>` with three digits. **Unique across all of `content/exercises/`**: carry
  on the numbering from the highest id already in the file (if the last one is
  `present-simple-012`, the next sentence is `present-simple-013`).
- `tenseId`: exactly `$1`.
- `prompt`: the English sentence with **a single gap** marked with `___` and, in brackets, the
  infinitive of the verb to conjugate: `They ___ (not / work) on Sundays.`
- `solution`: only what goes in the gap (`lives`, `didn't go`, `have you seen`), not the whole
  sentence.
- There is no level field: **$2** decides the vocabulary and the length of the sentence (A1-A2
  short, everyday sentences; B1+ longer ones, with subordinate clauses or phrasal verbs).

### The other exercise types

With no `type` the sentence is a gap-fill. The other two types live in the same file and use
`prompt` for the **whole** sentence, with no `___`:

```json
[
  {
    "id": "present-simple-011",
    "tenseId": "present-simple",
    "type": "transform",
    "form": "negative",
    "prompt": "Sarah works in a bank.",
    "solution": "Sarah doesn't work in a bank.",
    "explanation": "La -s de la tercera persona pasa al auxiliar: doesn't work."
  },
  {
    "id": "present-simple-012",
    "tenseId": "present-simple",
    "type": "choice",
    "prompt": "My brother gets up at seven every morning.",
    "options": ["Present Simple", "Present Continuous", "Past Simple"],
    "solution": "Present Simple",
    "explanation": "every morning describe una rutina."
  }
]
```

- `transform`: `form` is the form the sentence has to be turned into (`negative` or
  `interrogative`) and `solution` is the whole sentence rewritten.
- `choice`: `options` are the tenses to pick from (one of them is `solution`, and it is the name
  of the tense **$1**); the others have to be plausible.
- `explanation`: one line **in Spanish** with the why, shown after a miss. Optional on the
  gap-fill sentences, where the structure of the tense is shown when it is missing.

## Rules

- Varied vocabulary and verbs: not ten sentences with the same verb, nor all of them
  affirmative. Spread them across affirmative, negative and interrogative.
- Every sentence must have a single correct solution: include the time marker or the context
  that forces that tense (*yesterday*, *every day*, *since 2010*...).
- If a sentence you were about to write is already in the file, replace it with a different one.
- Never rewrite or delete existing entries: the merge script takes care of adding.
