---
description: Turns ingested sentences into clips with gaps in content/clips/
argument-hint: [file from data/candidates/ | --all]
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Turn the sentences in `data/candidates/` into publishable clips in
`content/clips/<source>.json`. With no `$ARGUMENTS`, take the first file in alphabetical order;
with `--all`, walk them all.

The ingest has to run first: `node scripts/ingest.mjs <source>`, and that **only works on a
machine with a home connection** (YouTube blocks the player and subtitle endpoints from datacenter
IPs). If `data/candidates/` is empty, say so and stop: do not invent clips.

## Steps

1. Read the file from `data/candidates/`. It carries `videoId`, `source`, `channel`, `title` and a
   list of sentences with `startMs`, `endMs` and `text`.
2. Drop the sentences that are not worth it (the discard rule, below). **Being strict here is the
   right call**: a confusing card does more harm than one card fewer. Keeping less than half is
   normal.
3. Write the surviving clips into `/tmp/clips.json`, with the schema below.
4. Merge without overwriting what is already there:
   `node scripts/merge-content.mjs content/clips/<source>.json < /tmp/clips.json`
5. Run `pnpm test test/clips.spec.ts`. If it fails, fix the JSON and repeat.
6. Delete the file from `data/candidates/` you have just processed and report: how many sentences
   went in, how many were dropped and why, and how many files are left.

Work file by file, writing and deleting on each pass: if the session is cut short, what is
already done stays saved and the next run picks up on its own.

## Schema

`content/clips/<source>.json` is an **array** of clips:

```json
[
  {
    "id": "mgYE-v02kds:12340",
    "videoId": "mgYE-v02kds",
    "startMs": 12340,
    "endMs": 15120,
    "text": "I've been meaning to call you back",
    "level": "B1",
    "channel": "Easy English",
    "exercises": [
      {
        "id": "verb",
        "tenseId": "present-perfect",
        "prompt": "I ___ to call you back",
        "solution": "have been meaning"
      },
      {
        "id": "mean-to",
        "tenseId": "",
        "prompt": "I've been ___ call you back",
        "solution": "meaning to",
        "explanation": "«Mean to» es tener intención de hacer algo, no significar."
      }
    ]
  }
]
```

- `id` is **always** `` `${videoId}:${startMs}` ``. Do not invent it: it is what keeps a second
  ingest of the same source from breaking the review history already stored.
- `startMs`, `endMs` and `text` are copied **untouched** from the candidate. They are the
  coordinates of the clip: alter them and the video no longer matches the sentence.
- `channel` is copied from the candidate; the file name is the `source`.

### `prompt` and `solution`

The `prompt` is the sentence **with the gap already in it**: `___` where the answer goes. Do not
work out character positions; there is no `charStart` to fill in.

The invariant `test/clips.spec.ts` validates: **the `prompt` with the `solution` in it has to be
the sentence of the clip**, compared through `normalize()` (`app/utils/check.ts`). That forgives
capitals, the final punctuation and contractions —`We're` ↔ `We are`— and nothing else.

- The verb gap takes the auxiliaries with it: in *"I have been waiting"*, the solution is
  `"have been waiting"`, not `"waiting"`.
- If the text carries a contraction, the full form is fine: `"I've been meaning"` with the gap
  `"I ___ to call you back"` and the solution `"have been meaning"` passes validation.
- One single `___` per exercise.
- The exercise `id`: short and descriptive (`verb`, `mean-to`), unique within the clip.

### `tenseId`

The tense the gap drills, and it **has to exist** in `content/tenses/`. If the tense of the verb
has not been created yet, use `/teoria <tense>` to create it first, or pick another gap in the
same sentence.

For expressions —phrasal verbs, idioms, fixed collocations— use `tenseId: ""`: they drill no
tense, like the reading questions. In those, `explanation` carries the meaning **in Spanish and in
context**, not a literal translation.

### `level`

The level of somebody who could **understand the sentence on hearing it**, not that of the verb on
its own. One of `A1`, `A2`, `B1`, `B2`, `C1`.

| Level | Criterion | Example |
|---|---|---|
| A1 | Present and imperative, basic vocabulary | *"Where do you live?"* |
| A2 | Past simple and future, routines | *"I went to the shop yesterday."* |
| B1 | Perfect tenses, conditional, common phrasal verbs | *"I've already sorted it out."* |
| B2 | Nuanced modals, passive, transparent idioms | *"It should have been dealt with by now."* |
| C1 | Opaque idioms, dense colloquial register, irony | *"Don't give me that — you're winding me up."* |

### The discard rule

Out goes any sentence that cannot be understood without having seen what came before:

- it leans on a pronoun with no referent: *"He said he'd do it then."*
- it is a fragment cut in half: *"...and that's why we"*
- it is pure filler: *"Yeah. Right. Okay."*
- it has no conjugated verb and no expression worth a gap

## Consistency

The rubric above is the criterion, not a suggestion. Do not relax it or extend it on the fly
between files: the reason it is written down is that conversational tagging drifts from one batch
to the next. If you hit a case it does not cover, resolve it as best you can, **note it in the
final report** and let the user decide whether the rubric needs changing.
