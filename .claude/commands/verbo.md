---
description: Adds or completes a verb in content/verbs.json
argument-hint: <infinitive>
allowed-tools: Read, Write, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Add the verb **$1** to `content/verbs.json`, or complete its entry if it is already there.

## Steps

1. Read `content/verbs.json` and look for `$1`. If it exists and is complete, say so and touch
   nothing.
2. Write the entry into `/tmp/verbo.json` (an array of one element) with the schema below.
3. Merge: `node scripts/merge-content.mjs content/verbs.json < /tmp/verbo.json`
4. Run `pnpm test test/content.spec.ts`. If it fails, fix the JSON and repeat.

## Schema

`content/verbs.json` is an **array** of objects:

```json
[
  { "infinitive": "go", "past": "went", "participle": "gone", "regular": false, "es": "ir" }
]
```

- `infinitive`: the verb in lowercase and without `to`. It is the key: **it cannot repeat**.
- `past`: past simple. If there are two forms, separate them with ` / ` (`was / were`).
- `participle`: past participle.
- `regular`: `true` only if `past` and `participle` are the same `-ed` form. The test checks it,
  so an irregular verb marked as regular leaves the build red.
- `es`: the Spanish translation, separating senses with a comma (`saber, conocer`). This field is
  in Spanish: it is what the learner reads.

## Rules

- The script merges by `infinitive`: if the verb is already there, only the missing fields are
  filled in and the rest of the list stays as it was. Never rewrite the whole file by hand.
- British spelling on the doubled irregular forms (`got`, not `gotten`), consistent with the rest
  of the list.
