---
description: Genera frases con hueco para un tiempo verbal en content/exercises/
argument-hint: <tiempo> <nivel> <n>
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Genera **$3** frases con hueco de nivel **$2** para el tiempo verbal **$1** y añádelas a
`content/exercises/$1.json`.

## Pasos

1. Lee `content/tenses/$1.json` para ajustarte a la estructura, los time markers y los
   ejemplos de ese tiempo. Si el fichero no existe, para y dilo: el `tenseId` tiene que
   ser un tiempo que exista (`/teoria` lo crea).
2. Lee `content/exercises/$1.json` si ya existe, para no repetir frases ni ids.
3. Escribe las frases nuevas en `/tmp/frases.json` con el esquema de abajo.
4. Fusiona sin sobrescribir el fichero:
   `node scripts/merge-content.mjs content/exercises/$1.json < /tmp/frases.json`
5. Ejecuta `pnpm test test/content.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/exercises/<tiempo>.json` es un **array** de objetos:

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

- `id`: `<tiempo>-<nnn>` con tres dígitos. **Único en todo `content/exercises/`**: continúa
  la numeración a partir del id más alto que ya haya en el fichero (si el último es
  `present-simple-012`, la siguiente frase es `present-simple-013`).
- `tenseId`: exactamente `$1`.
- `prompt`: la frase en inglés con **un solo hueco** marcado con `___` y, entre paréntesis,
  el infinitivo del verbo que hay que conjugar: `They ___ (not / work) on Sundays.`
- `solution`: solo lo que va en el hueco (`lives`, `didn't go`, `have you seen`), no la frase
  entera.
- No hay campo de nivel: **$2** decide el vocabulario y la longitud de la frase (A1-A2 frases
  cortas y cotidianas, B1+ frases más largas, con subordinadas o phrasal verbs).

## Reglas

- Vocabulario y verbos variados: no diez frases con el mismo verbo ni todas afirmativas.
  Reparte entre afirmativa, negativa e interrogativa.
- Cada frase debe tener una única solución correcta: incluye el time marker o el contexto que
  obliga a usar ese tiempo (*yesterday*, *every day*, *since 2010*...).
- Si una frase que ibas a escribir ya está en el fichero, sustitúyela por otra distinta.
- Nunca reescribas ni borres entradas existentes: el script de fusión se encarga de añadir.
