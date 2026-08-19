---
description: Writes or extends the theory of a tense in content/tenses/
argument-hint: <tense>
allowed-tools: Read, Write, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Write the theory of the tense **$1** in `content/tenses/$1.json` (slug in lowercase and with
hyphens: `present-perfect`). If the file already exists, **extend** what is there instead of
rewriting it from scratch.

The theory is written **in Spanish**, with the examples in English and their translation: this is
a platform for Spanish speakers.

## Steps

1. Read `content/tenses/$1.json` if it exists, and `content/tenses/present-simple.json` as a
   reference for tone and format.
2. Write the object into `/tmp/teoria.json`: if the file was already there, include only the
   fields that change (usually `theory`, or `examples` to add examples).
3. Merge: `node scripts/merge-content.mjs content/tenses/$1.json < /tmp/teoria.json`
4. Run `pnpm test test/content.spec.ts`. If it fails, fix the JSON and repeat.

## Schema

`content/tenses/<slug>.json` is an **object**:

```json
{
  "id": "present-simple",
  "name": "Present Simple",
  "nameEs": "Presente simple",
  "level": "A1",
  "theory": "## Cuándo se usa\n\n...",
  "structure": {
    "affirmative": "Sujeto + verbo en infinitivo (+ -s en 3.ª persona)",
    "negative": "Sujeto + do / does + not + verbo en infinitivo",
    "interrogative": "Do / Does + sujeto + verbo en infinitivo + ?"
  },
  "timeMarkers": ["always", "every day", "on Mondays"],
  "examples": [
    { "form": "affirmative", "en": "I work in a small office.", "es": "Trabajo en una oficina pequeña." }
  ]
}
```

- `id`: the slug, **the same as the file name** without `.json`. The test checks it.
- `name` / `nameEs`: the name in English and in Spanish.
- `level`: one of `A1`, `A2`, `B1`, `B2`, `C1`.
- `theory`: Markdown in Spanish with at least these headings: `## Cuándo se usa`,
  `## Cómo se forma` and `## Errores frecuentes`. The English examples go in *italics*, and the
  corrections with ❌ / ✅. Line breaks are escaped as `\n` inside the JSON.
- `structure`: the three forms, described in Spanish. All three are required.
- `timeMarkers`: at least 5 typical time markers, in English.
- `examples`: at least 5 of each `form` (`affirmative`, `negative`, `interrogative`), with `en`
  and `es`.

## Rules

- On merge, the text fields (`theory`, `structure`...) are replaced by the new value, and the
  lists (`examples`, `timeMarkers`) are appended without duplicating: an example identical to one
  already there is not repeated.
- If the tense is new, fill in every field: an incomplete object leaves `pnpm test` red.
